#!/usr/bin/env python3
"""P2 acoustic TTFA probe — real STT/LLM/TTS on chomp (RTX 4060 Laptop, 8 GB). v2.

Measures ttfa_ms = t_first_pcm_out - t_eou_commit, the formula pinned in
docs/ENGINEERING_PLAN_v2.md §2.13, by driving the repository's own
runtime_contracts modules (FasterWhisperSTT, LlamaServerClient, PiperTTS,
SentenceAggregator) against a live llama-server on the local GPU.

v2 fixes a fidelity bug in v1: v1 buffered the whole LLM stream before starting
TTS, which is NOT how the system is designed. The real design (sentence
aggregator + streaming TTS) speaks sentence 1 while sentence 2 is still being
generated, so v2 starts Piper the moment the first complete sentence is emitted
and stamps the first PCM byte with its own wall-clock timestamp. Both readings
are kept: `ttfa_slo_ms` (concurrent, faithful) and `derived_sequential_ms`.

Honesty rules honoured by this script:
  * every latency value comes from time.perf_counter() around a real call
  * caller audio is Piper-synthesised scripted speech (labelled as such, NOT a
    human caller); a separate arm runs real human recordings through the same
    STT leg so the acoustic front end is not only tested on synthetic speech
  * no number is written that was not produced by this run on this host
"""
from __future__ import annotations

import argparse
import array as arr
import asyncio
import json
import os
import subprocess
import sys
import time
import wave
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

BASE = Path("/home/knamant/p2-probe")
sys.path.insert(0, str(BASE))

from runtime_contracts.llm_client import LlamaServerClient  # noqa: E402
from runtime_contracts.stt import FasterWhisperSTT  # noqa: E402
from runtime_contracts.sentence_aggregator import SentenceAggregator  # noqa: E402

LLM_URL = "http://127.0.0.1:8083/v1"
API_KEY = "change-me-high-entropy"
PIPER_BIN = "/usr/local/bin/piper"
PIPER_VOICE = "/home/knamant/models/piper/en_US-amy-low.onnx"
EOU_SILENCE_MS = 450.0  # §2.13: balanced silence_ms
PIPER_RATE = 16000  # en_US-amy-low.onnx audio.sample_rate (verified in its .onnx.json)
VRAM_CEILING_MIB = 7372  # §2.13 peak <= 7.2 GB

SYSTEM_PROMPT = (
    "You are the front desk voice agent for CoolAir Services, an air-conditioning "
    "repair shop in Bangalore. Answer in one or two short spoken sentences. "
    "No lists, no markdown, no emoji."
)

STREAM_SCRIPT = [
    "Hi, are you open on Sunday?",
    "My AC is not cooling at all, it is blowing warm air.",
    "How much do you charge for a gas refill?",
    "I am in Whitefield, do you cover that area?",
    "Can someone come today evening?",
    "The outdoor unit is making a loud rattling noise.",
    "Do you provide an annual maintenance contract?",
    "The unit is a Voltas one point five ton, about four years old.",
    "What time does the technician usually arrive?",
    "Okay, please book the first slot tomorrow morning.",
]

TOOL_SCRIPT = [
    "Book an AC repair for tomorrow at 10 am for Naman, phone 98765 43210.",
    "I need a gas refill on Saturday morning, name Priya, 98111 22334.",
    "Please schedule a deep clean for Friday at 4 pm, name Ravi, 99000 11122.",
    "Book pest control for Monday 9 am, name Anil, 97000 55566.",
    "Can you book an AMC visit next Tuesday at 11, name Sunita, 98888 77766.",
    "Book the earliest slot today, name Meera, 98123 45678.",
]

BOOK_TOOL = {
    "type": "function",
    "function": {
        "name": "book_appointment",
        "description": "Book a customer appointment",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_name": {"type": "string"},
                "customer_phone": {"type": "string"},
                "service_type": {"type": "string"},
                "scheduled_time": {"type": "string"},
            },
            "required": ["customer_name", "service_type"],
        },
    },
}


# ---------------------------------------------------------------- audio helpers
def wav_ms(path: Path) -> float:
    with wave.open(str(path)) as w:
        return 1000.0 * w.getnframes() / w.getframerate()


def piper_batch(text: str, out_path: Path) -> float:
    """Batch synth exactly as runtime_contracts.PiperTTS.synthesize does."""
    t0 = time.perf_counter()
    p = subprocess.run(
        [PIPER_BIN, "-m", PIPER_VOICE, "-f", str(out_path)],
        input=text, text=True, capture_output=True, check=False, timeout=30,
    )
    ms = (time.perf_counter() - t0) * 1000.0
    if p.returncode != 0:
        raise RuntimeError(f"piper failed: {p.stderr[:300]}")
    return ms


def piper_first_pcm(text: str, first_bytes: int = 2048) -> tuple[float, bytes]:
    """Raw-PCM streaming path.

    Returns (ms_to_first_bytes, full_raw_pcm). The caller stamps the absolute
    time the first bytes were read, so the metric does not depend on how long
    the rest of the utterance took to synthesise.
    """
    t0 = time.perf_counter()
    p = subprocess.Popen(
        [PIPER_BIN, "-m", PIPER_VOICE, "--output-raw"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )
    assert p.stdin and p.stdout
    p.stdin.write((text + "\n").encode())
    p.stdin.close()
    head = p.stdout.read(first_bytes)
    t_first = (time.perf_counter() - t0) * 1000.0
    rest = p.stdout.read()
    p.wait()
    return t_first, head + rest


def piper_first_pcm_timed(text: str, first_bytes: int = 2048) -> dict:
    """Same as piper_first_pcm but returns the absolute first-PCM timestamp."""
    t0 = time.perf_counter()
    p = subprocess.Popen(
        [PIPER_BIN, "-m", PIPER_VOICE, "--output-raw"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )
    assert p.stdin and p.stdout
    p.stdin.write((text + "\n").encode())
    p.stdin.close()
    head = p.stdout.read(first_bytes)
    t_first_abs = time.perf_counter()
    rest = p.stdout.read()
    p.wait()
    return {
        "ms_to_first": (t_first_abs - t0) * 1000.0,
        "t_first_abs": t_first_abs,
        "raw": head + rest,
    }


def inproc_first_pcm(voice, text: str) -> dict:
    """In-process PiperVoice: no per-sentence process/ONNX startup cost."""
    t0 = time.perf_counter()
    raw = bytearray()
    t_first_abs = None
    rate = getattr(getattr(voice, "config", None), "sample_rate", PIPER_RATE)
    for chunk in voice.synthesize(text):
        if t_first_abs is None:
            t_first_abs = time.perf_counter()
        raw += chunk.audio_int16_bytes
    if t_first_abs is None:
        t_first_abs = time.perf_counter()
    return {"ms_to_first": (t_first_abs - t0) * 1000.0, "t_first_abs": t_first_abs,
            "raw": bytes(raw), "rate": rate}


def raw_to_wav(raw: bytes, path: Path, rate: int = PIPER_RATE) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(raw)


def vram_mib() -> float | None:
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10, check=False)
        return float(out.stdout.strip().splitlines()[0])
    except Exception:  # noqa: BLE001
        return None


def percentile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    return float(np.percentile(np.asarray(values, dtype=float), q))


def stats(rows: list[dict], key: str) -> dict:
    vals = [r[key] for r in rows if r.get(key) is not None]
    return {"n": len(vals), "p50": percentile(vals, 50), "p95": percentile(vals, 95),
            "min": min(vals) if vals else None, "max": max(vals) if vals else None}


def p95_le(vals: list[float], limit: float) -> bool | None:
    p = percentile(vals, 95)
    return None if p is None else p <= limit


# ------------------------------------------------------------------ the probe
async def run(args) -> dict:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    outdir = Path(args.outdir) if args.outdir else (BASE / "artifacts" / stamp)
    outdir.mkdir(parents=True, exist_ok=True)
    wavdir = outdir / "caller_audio"
    agentdir = outdir / "agent_audio"
    wavdir.mkdir(exist_ok=True)
    agentdir.mkdir(exist_ok=True)

    llm = LlamaServerClient(base_url=LLM_URL, api_key=API_KEY, timeout=60.0)
    stt = FasterWhisperSTT(model_size_or_path=args.stt_model, device=args.stt_device,
                           compute_type=args.stt_compute, language="en")
    loop = asyncio.get_running_loop()
    records: list[dict] = []
    cold: dict = {}

    # ---- cold start, measured separately from the arms
    t0 = time.perf_counter()
    cold["warmup_ok"] = await llm.warmup()
    cold["llm_warmup_cold_ms"] = round((time.perf_counter() - t0) * 1000.0, 1)
    t0 = time.perf_counter()
    await llm.warmup()
    cold["llm_warmup_warm_ms"] = round((time.perf_counter() - t0) * 1000.0, 1)

    warm_wav = wavdir / "warmup.wav"
    piper_batch("Are you open today?", warm_wav)

    # ---- TTS leg: one-shot calibration of both paths (cli process vs in-process)
    calib_text = "Yes, we are open on Sundays for emergency repairs."
    calib = {"cli_batch_ms": round(piper_batch(calib_text, outdir / "calib_cli.wav"), 1)}
    ms_first, _raw = piper_first_pcm(calib_text)
    calib["cli_first_pcm_ms"] = round(ms_first, 1)
    voice = None
    if args.tts_mode == "inproc":
        from piper import PiperVoice
        t0 = time.perf_counter()
        voice = PiperVoice.load(PIPER_VOICE)
        calib["inproc_model_load_ms"] = round((time.perf_counter() - t0) * 1000.0, 1)
        r = inproc_first_pcm(voice, calib_text)
        calib["inproc_first_pcm_ms"] = round(r["ms_to_first"], 1)
    cold["tts_calibration"] = calib
    t0 = time.perf_counter()
    stt.transcribe(warm_wav)
    cold["stt_cold_transcribe_ms"] = round((time.perf_counter() - t0) * 1000.0, 1)
    t0 = time.perf_counter()
    stt.transcribe(warm_wav)
    cold["stt_warm_transcribe_ms"] = round((time.perf_counter() - t0) * 1000.0, 1)

    history: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    async def one_turn(idx: int, arm: str, caller_text: str,
                       agg_chars: int = 100, agg_hold: float = 400.0) -> dict:
        rec: dict = {"turn": idx, "arm": arm, "caller_script_text": caller_text,
                     "agg_max_chars": agg_chars, "agg_max_hold_ms": agg_hold}

        caller_wav = wavdir / f"{arm}_{idx:02d}_caller.wav"
        rec["caller_synth_ms"] = round(piper_batch(caller_text, caller_wav), 1)
        rec["caller_audio_ms"] = round(wav_ms(caller_wav), 1)

        # caller stops speaking -> EOU commit after the real silence window
        t_speech_end = time.perf_counter()
        await asyncio.sleep(EOU_SILENCE_MS / 1000.0)
        t_eou = time.perf_counter()

        # STT leg (batch, exactly as runtime_contracts.stt implements it)
        t_stt0 = time.perf_counter()
        heard = stt.transcribe(caller_wav)
        t_stt_done = time.perf_counter()
        rec["stt_text"] = heard
        rec["stt_ms"] = round((t_stt_done - t_stt0) * 1000.0, 1)
        rec["stt_fits_in_eou_window"] = rec["stt_ms"] <= (
            rec["caller_audio_ms"] + EOU_SILENCE_MS)

        # agent reasoning (with a real tool round trip in the tools arm)
        turn_msgs = history + [{"role": "user", "content": heard}]
        if arm == "tools":
            t_tool0 = time.perf_counter()
            choice = await llm.call_tools(turn_msgs, [BOOK_TOOL], max_tokens=200)
            rec["tool_roundtrip_ms"] = round((time.perf_counter() - t_tool0) * 1000.0, 1)
            msg = choice.get("message", {})
            calls = msg.get("tool_calls") or []
            rec["tool_calls"] = [c.get("function", {}) for c in calls]
            rec["tool_finish_reason"] = choice.get("finish_reason")
            # the runtime answers the tool locally; that answer is what the
            # caller hears next, so the continuation belongs to ttfa_tools
            result = {"status": "confirmed", "appointment_ref": f"APT-{idx:06d}",
                      "slot": "next available"}
            turn_msgs = turn_msgs + [msg] + [{
                "role": "tool",
                "tool_call_id": (calls[0].get("id") if calls else "call_0"),
                "content": json.dumps(result),
            }]
        else:
            rec["tool_roundtrip_ms"] = None

        # streaming generation with TTS starting on the first complete sentence
        agg = SentenceAggregator(max_chars=agg_chars, max_hold_ms=agg_hold)

        def _synth(sentence: str) -> dict:
            if args.tts_mode == "inproc" and voice is not None:
                return inproc_first_pcm(voice, sentence)
            out = piper_first_pcm_timed(sentence)
            out["rate"] = PIPER_RATE
            return out
        t_llm0 = time.perf_counter()
        ttft = None
        ntokens = 0
        t_first_sentence = None
        tts_task: asyncio.Task | None = None
        tts_started_at = None
        first_sentence = None
        text_parts: list[str] = []

        async for token in llm.stream_chat(turn_msgs, max_tokens=160, temperature=0.3):
            if ttft is None:
                ttft = (time.perf_counter() - t_llm0) * 1000.0
            ntokens += 1
            text_parts.append(token)
            for sentence in agg.push(token):
                if first_sentence is None:
                    first_sentence = sentence
                    t_first_sentence = time.perf_counter()
                    tts_started_at = t_first_sentence
                    tts_task = loop.run_in_executor(
                        None, _synth, first_sentence)
        for sentence in agg.flush():
            if first_sentence is None:
                first_sentence = sentence
                t_first_sentence = time.perf_counter()
                tts_started_at = t_first_sentence
                tts_task = loop.run_in_executor(None, _synth, first_sentence)
        t_llm_end = time.perf_counter()

        rec["llm_ttft_ms"] = round(ttft, 1) if ttft else None
        rec["llm_tokens"] = ntokens
        rec["llm_total_ms"] = round((t_llm_end - t_llm0) * 1000.0, 1)
        rec["agent_text"] = "".join(text_parts).strip()

        if not first_sentence or tts_task is None:
            rec["error"] = "no sentence produced"
            return rec

        rec["first_sentence"] = first_sentence
        rec["first_sentence_chars"] = len(first_sentence)
        rec["t_first_sentence_from_eou_ms"] = round(
            (t_first_sentence - t_eou) * 1000.0, 1)

        tts = await tts_task  # TTS ran concurrently with the rest of generation
        t_first_pcm = tts["t_first_abs"]
        agent_wav = agentdir / f"{arm}_{idx:02d}_agent.wav"
        raw_to_wav(tts["raw"], agent_wav, tts.get("rate", PIPER_RATE))
        rec["agent_wav"] = str(agent_wav)
        rec["tts_first_pcm_ms"] = round(tts["ms_to_first"], 1)
        rec["agent_audio_ms"] = round(wav_ms(agent_wav), 1)
        rec["tts_overlapped_generation"] = t_first_pcm < t_llm_end

        # §2.13 metric: first PCM out minus EOU commit
        rec["ttfa_slo_ms"] = round((t_first_pcm - t_eou) * 1000.0, 1)
        # same thing if STT had been streaming during speech (caught up by EOU)
        rec["ttfa_if_stt_streamed_ms"] = round((t_first_pcm - t_stt_done) * 1000.0, 1)
        rec["caller_perceived_ms"] = round((t_first_pcm - t_speech_end) * 1000.0, 1)
        # sequential-wiring bound: STT + full generation + TTS, nothing overlapped
        rec["derived_sequential_ms"] = round(
            rec["stt_ms"] + rec["llm_total_ms"] + rec["tts_first_pcm_ms"], 1)
        rec["vram_mib_after_turn"] = vram_mib()
        rec["recorded_at_utc"] = datetime.now(timezone.utc).isoformat()

        history.append({"role": "user", "content": heard})
        history.append({"role": "assistant", "content": rec["agent_text"]})
        if len(history) > 5:
            history[:] = [history[0]] + history[-4:]
        return rec

    # ---- arm A: conversational, no tools
    for i, line in enumerate(STREAM_SCRIPT[: args.calls_stream], start=1):
        records.append(await one_turn(i, "stream", line))

    # ---- arm B: booking with a real tool round trip
    history[:] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for i, line in enumerate(TOOL_SCRIPT[: args.calls_tools], start=1):
        records.append(await one_turn(i, "tools", line))

    # ---- arm C: real human speech through the same STT leg (grounding)
    human: list[dict] = []
    for wav in sorted(Path(args.human_dir).glob("*.wav"))[: args.calls_human]:
        t0 = time.perf_counter()
        try:
            text = stt.transcribe(wav)
        except Exception as exc:  # noqa: BLE001
            text = f"<error: {exc}>"
        human.append({
            "file": wav.name,
            "audio_ms": round(wav_ms(wav), 1),
            "stt_ms": round((time.perf_counter() - t0) * 1000.0, 1),
            "text": text,
        })

    # ---- arm D: aggregator configuration sweep (does it move ttfa?)
    sweep: list[dict] = []
    history[:] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if args.agg_sweep:
        for chars, hold in ((100, 400.0), (60, 200.0), (40, 120.0)):
            for i, line in enumerate(STREAM_SCRIPT[: args.sweep_turns], start=1):
                rec = await one_turn(1000 + i, f"sweep{chars}_{int(hold)}", line,
                                     agg_chars=chars, agg_hold=hold)
                records.append(rec)
                sweep.append({"chars": chars, "hold_ms": hold,
                              "first_sentence_from_eou_ms":
                                  rec.get("t_first_sentence_from_eou_ms"),
                              "ttfa_slo_ms": rec.get("ttfa_slo_ms")})

    # ---- arm E: barge-in legs that actually exist in this tree
    barge = await barge_probe(llm)

    slow = [r for r in records if r["arm"] == "stream" and "ttfa_slo_ms" in r]
    toolrecs = [r for r in records if r["arm"] == "tools" and "ttfa_slo_ms" in r]
    sweep_groups: dict[str, list[dict]] = {}
    for r in records:
        if r["arm"].startswith("sweep") and "ttfa_slo_ms" in r:
            sweep_groups.setdefault(r["arm"], []).append(r)

    summary = {
        "run_utc": datetime.now(timezone.utc).isoformat(),
        "host": os.uname().nodename,
        "gpu": "NVIDIA GeForce RTX 4060 Laptop GPU 8188 MiB",
        "llm_endpoint": LLM_URL,
        "llm_model": "Qwen3.5-9B-Q4_K_M (llama.cpp, -ngl 99, ctx 4096, parallel 1)",
        "stt": {"model": args.stt_model, "device": args.stt_device,
                "compute_type": args.stt_compute},
        "tts": {"engine": "piper", "voice": os.path.basename(PIPER_VOICE),
                "mode": args.tts_mode,
                "path": "raw-stream, starts on first complete sentence"},
        "eou_silence_ms": EOU_SILENCE_MS,
        "caller_audio_source": "piper-synthesised scripted speech (not a human caller)",
        "cold_start": cold,
        "peak_vram_mib": max([r["vram_mib_after_turn"] for r in records
                              if r.get("vram_mib_after_turn")] or [0]),
        "vram_ceiling_mib": VRAM_CEILING_MIB,
        "arm_stream_ttfa_slo_ms": stats(slow, "ttfa_slo_ms"),
        "arm_stream_ttfa_if_stt_streamed_ms": stats(slow, "ttfa_if_stt_streamed_ms"),
        "arm_stream_caller_perceived_ms": stats(slow, "caller_perceived_ms"),
        "arm_stream_stt_ms": stats(slow, "stt_ms"),
        "arm_stream_llm_ttft_ms": stats(slow, "llm_ttft_ms"),
        "arm_stream_llm_total_ms": stats(slow, "llm_total_ms"),
        "arm_stream_first_sentence_from_eou_ms": stats(slow, "t_first_sentence_from_eou_ms"),
        "arm_stream_tts_first_pcm_ms": stats(slow, "tts_first_pcm_ms"),
        "arm_stream_derived_sequential_ms": stats(slow, "derived_sequential_ms"),
        "arm_tools_ttfa_slo_ms": stats(toolrecs, "ttfa_slo_ms"),
        "arm_tools_tool_roundtrip_ms": stats(toolrecs, "tool_roundtrip_ms"),
        "arm_tools_llm_ttft_ms": stats(toolrecs, "llm_ttft_ms"),
        "arm_tools_llm_total_ms": stats(toolrecs, "llm_total_ms"),
        "agg_sweep": {k: stats(v, "ttfa_slo_ms") for k, v in sweep_groups.items()},
        "human_speech_stt": human,
        "barge": barge,
        "slo_verdicts": {
            "ttfa_stream_p50_le_1600": percentile([r["ttfa_slo_ms"] for r in slow], 50)
            is not None and percentile([r["ttfa_slo_ms"] for r in slow], 50) <= 1600,
            "ttfa_stream_p95_le_2800": p95_le([r["ttfa_slo_ms"] for r in slow], 2800),
            "ttfa_tools_p50_le_2500": percentile(
                [r["ttfa_slo_ms"] for r in toolrecs], 50) is not None
            and percentile([r["ttfa_slo_ms"] for r in toolrecs], 50) <= 2500,
            "ttfa_tools_p95_le_4500": p95_le([r["ttfa_slo_ms"] for r in toolrecs], 4500),
            "warm_llm_ttft_p50_le_500": p95_le([r["llm_ttft_ms"] for r in slow], 500),
            "warm_llm_ttft_p95_le_800": p95_le([r["llm_ttft_ms"] for r in slow], 800),
            "vram_under_7_2gb": (max([r["vram_mib_after_turn"] for r in records
                                      if r.get("vram_mib_after_turn")] or [0])
                                 <= VRAM_CEILING_MIB),
        },
    }

    (outdir / "eval_metrics.json").write_text(json.dumps(records, indent=2))
    (outdir / "summary.json").write_text(json.dumps(summary, indent=2))
    build_call_recordings(records, outdir)
    print(json.dumps(summary, indent=2))
    print(f"\nARTIFACTS: {outdir}")
    return summary


async def barge_probe(llm: LlamaServerClient) -> dict:
    """Measure the barge-in legs that exist here: stream cancel + slot recovery.

    The full barge_stop_ms = VAD speech event -> AudioTrack.stop() -> llama abort
    cannot be measured in this tree: apps/ holds only the control-plane API, no
    agent worker exists to emit it. What IS measured: the HTTP abort leg against
    the live llama-server, and whether the single GPU slot is reusable right after.
    """
    out: dict = {}
    messages = [{"role": "user", "content": "Describe the water cycle in detail."}]
    gen = llm.stream_chat(messages, max_tokens=200)
    got = 0
    async for _tok in gen:
        got += 1
        if got >= 3:
            break
    t_abort = time.perf_counter()
    await gen.aclose()
    out["cancel_close_ms"] = round((time.perf_counter() - t_abort) * 1000.0, 1)
    out["tokens_before_abort"] = got
    t_next = time.perf_counter()
    out["slot_reusable"] = await llm.warmup()
    out["slot_reuse_after_cancel_ms"] = round((time.perf_counter() - t_next) * 1000.0, 1)
    out["note"] = ("measures the llama-server abort leg only; the Silero VAD onset "
                   "leg and the LiveKit AudioTrack.stop() leg are not measurable "
                   "here because no agent worker exists in this tree")
    return out


def build_call_recordings(records: list[dict], outdir: Path) -> None:
    """Stereo 16 kHz WAV per turn: caller left, agent right, offset by measured TTFA.

    The offset is the measured ttfa_slo_ms for that turn, so the file is a
    time-aligned reconstruction of the measured timeline, not a re-recording.
    """
    rec_dir = outdir / "call_recordings"
    rec_dir.mkdir(exist_ok=True)
    for rec in records:
        if "ttfa_slo_ms" not in rec or "agent_wav" not in rec:
            continue
        label = rec["arm"]
        turn = rec["turn"]
        # sweep arms reuse turn ids offset by 1000; recover the caller file name
        cand = None
        for p in (outdir / "caller_audio").glob("*_caller.wav"):
            if p.name.startswith(f"{label}_{turn:02d}_"):
                cand = p
                break
        if cand is None:
            continue
        try:
            with wave.open(str(cand)) as wc:
                rate, nch = wc.getframerate(), wc.getnchannels()
                c = np.frombuffer(wc.readframes(wc.getnframes()), dtype=np.int16).astype(np.float32)
                if nch > 1:
                    c = c.reshape(-1, nch).mean(axis=1)
            with wave.open(rec["agent_wav"]) as wa:
                if wa.getframerate() != rate:
                    continue
                a = np.frombuffer(wa.readframes(wa.getnframes()), dtype=np.int16)
            gap = int(rate * rec["ttfa_slo_ms"] / 1000.0)
            total = max(len(c) + gap + len(a), len(c))
            left = np.zeros(total, dtype=np.int16)
            right = np.zeros(total, dtype=np.int16)
            left[: len(c)] = c.astype(np.int16)
            right[len(c) + gap: len(c) + gap + len(a)] = a
            with wave.open(str(rec_dir / f"call_{label}_{turn:02d}.wav"), "wb") as w:
                w.setnchannels(2)
                w.setsampwidth(2)
                w.setframerate(rate)
                w.writeframes(np.stack([left, right], axis=1).reshape(-1).tobytes())
        except Exception:  # noqa: BLE001
            continue


def collect_human(args) -> None:
    """Pick real human recordings (not synthetic) for the grounding arm."""
    humdir = BASE / "human_audio"
    humdir.mkdir(exist_ok=True)
    for old in humdir.glob("*.wav"):
        old.unlink()
    picked = 0
    for pat in ("*/audio.wav", "*/tmp_test.wav"):
        for src in sorted(Path(args.human_dir).glob(pat)):
            if picked >= args.calls_human:
                break
            try:
                with wave.open(str(src)) as w:
                    dur = w.getnframes() / w.getframerate()
                    frames = w.readframes(w.getnframes())
                samples = arr.array("h")
                samples.frombytes(frames[: len(frames) // 2 * 2])
                stride = samples[::17] or [0]
                rms = (sum(s * s for s in stride) / max(1, len(stride))) ** 0.5
            except Exception:  # noqa: BLE001
                continue
            if 0.8 <= dur <= 12.0 and rms > 120:
                (humdir / f"human_{picked:02d}.wav").write_bytes(src.read_bytes())
                picked += 1
    args.human_dir = str(humdir)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--calls-stream", type=int, default=10)
    ap.add_argument("--calls-tools", type=int, default=6)
    ap.add_argument("--calls-human", type=int, default=6)
    ap.add_argument("--human-dir", default="/home/knamant/stt-pipeline/runs/ui")
    ap.add_argument("--stt-model", default="small")
    ap.add_argument("--stt-device", default="cpu")
    ap.add_argument("--stt-compute", default="int8")
    ap.add_argument("--tts-mode", choices=("cli", "inproc"), default="cli")
    ap.add_argument("--agg-sweep", action="store_true")
    ap.add_argument("--sweep-turns", type=int, default=5)
    ap.add_argument("--outdir", default=None)
    args = ap.parse_args()
    collect_human(args)
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
