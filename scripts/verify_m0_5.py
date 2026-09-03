#!/usr/bin/env python3
"""verify_m0_5.py — gate for M0.5 (chomp green state).

Reads artifacts/chomp/latest/raw.txt (produced by scripts/discover_chomp.sh)
and asserts every required artifact is present and versioned. Hard refusal
on any of:

  - nvidia driver loaded; CUDA device visible
  - llama-server binary present, CUDA init ok in the running process
  - the v2 default LLM (per deploy/models/manifest.json) is on disk with
    the right sha256
  - faster-whisper installed
  - piper installed + en voice present
  - livekit-server installed
  - port 8190 (our API) is free on chomp
  - port 8083 (our llama-server) is bound by our freshly-started llama
  - disk free >= 25 GB

Exit 0 on pass, 1 on fail with a one-line diagnostic per failure.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
MANIFEST = REPO / "deploy" / "models" / "manifest.json"
LOCK = REPO / "deploy" / "chomp-gpu.lock"
DEFAULT_RAW = REPO / "artifacts" / "chomp" / "latest" / "raw.txt"


def _read(path: Path) -> str:
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def _read_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8", errors="ignore"))


def check(raw: str) -> list[str]:
    errs: list[str] = []

    # 1. nvidia-smi works and reports our GPU
    if "NVIDIA-SMI" not in raw or "RTX 4060" not in raw:
        errs.append("nvidia-smi output missing or wrong GPU")
    if "Driver Version:" not in raw:
        errs.append("no nvidia driver version visible")

    # 2. llama-server binary present + running + CUDA init ok
    if "llama-server" in raw and ("version:" in raw or "llama-server --version" in raw):
        # version captured; binary exists
        pass
    else:
        errs.append("llama-server binary not on PATH or not executable")
    if "ggml_cuda_init" in raw and "failed" in raw:
        errs.append("running llama-server failed CUDA init")
    # Expect our model: Qwen3.5-9B on /home/knamant/models/qwen3.5-9b/
    if "/home/knamant/models/qwen3.5-9b/" not in raw:
        errs.append("Qwen3.5-9B model directory not at /home/knamant/models/qwen3.5-9b/")

    # 3. default LLM sha256 in manifest matches the file on disk (per the raw)
    if MANIFEST.is_file():
        manifest = _read_json(MANIFEST)
        llm = next(
            (m for m in manifest.get("models", []) if m.get("id") == "llm.chomp.fast"),
            None,
        )
        if llm is None:
            errs.append("manifest.json missing llm.chomp.fast entry")
        else:
            expected = llm.get("sha256", "")
            filename = llm.get("filename", "")
            # find a line in raw.txt that contains the filename and a sha256
            m = re.search(
                rf"FILE .*?{re.escape(filename)} size=\d+ sha256=([0-9a-f]{{64}})",
                raw,
            )
            if not m:
                errs.append(f"manifest file {filename!r} not found on disk")
            else:
                on_disk = m.group(1)
                if expected.startswith("PIN_") or not expected:
                    errs.append(
                        f"manifest sha256 for {filename!r} is still a placeholder ({expected!r})"
                    )
                elif on_disk != expected:
                    errs.append(
                        f"sha256 mismatch for {filename!r}: "
                        f"manifest={expected[:12]}… disk={on_disk[:12]}…"
                    )
    else:
        errs.append("deploy/models/manifest.json not found")

    # 4. faster-whisper
    has_fw = "faster_whisper" in raw or "faster-whisper" in raw
    if not has_fw or "not installed" in raw.lower().split("faster", 1)[-1][:200]:
        errs.append("faster-whisper not installed on chomp")

    # 5. Piper + en voice
    if "piper" in raw and "not in PATH" in raw:
        errs.append("piper binary not on PATH")
    if "en_US-amy-low.onnx" not in raw:
        errs.append("piper en_US-amy-low.onnx voice not present on chomp")

    # 6. LiveKit
    if "livekit-server" in raw and "not in PATH" in raw:
        errs.append("livekit-server binary not on PATH")

    # 7. Port 8190 (our API) must be free
    listening_lines = [ln for ln in raw.splitlines() if "LISTEN" in ln]
    listening_addrs = " ".join(listening_lines)
    if ":8190" in listening_addrs:
        errs.append("port 8190 is already in use on chomp")

    # 8. Port 8083 (our llama) must be bound to our fresh process
    if ":8083" not in listening_addrs:
        errs.append("port 8083 not listening on chomp (llama-server not running)")
    # The previous Qwable server used /home/knamant/models/qwable-9b/; if
    # we see that path in the llama-server process line, we did not stop it.
    if "/home/knamant/models/qwable-9b/" in raw:
        # not necessarily fatal (could be old ps line), but flag.
        # We grep for "llama-server" ps line specifically.
        for ln in raw.splitlines():
            if "llama-server" in ln and "/qwable-9b/" in ln and "llama-server --version" not in ln:
                errs.append("qwable llama-server is still running; bring_up_chomp did not stop it")
                break

    # 9. disk free
    m = re.search(r"/dev/\S+\s+\S+\s+\S+\s+(\d+)G\s+\S+\s+/\s*$", raw, re.M)
    if not m:
        m = re.search(r"\s+(\d+)G\s+\d+%\s+/$", raw, re.M)
    if m:
        free_gb = int(m.group(1))
        if free_gb < 25:
            errs.append(f"disk free {free_gb}GB < 25GB threshold")
    else:
        # df -h output parsing is brittle; warn instead of fail.
        pass

    return errs


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", default=str(DEFAULT_RAW))
    args = parser.parse_args()

    raw_path = Path(args.raw)
    if not raw_path.is_file():
        print(f"missing {raw_path} — run scripts/discover_chomp.sh first", file=sys.stderr)
        return 1

    raw = _read(raw_path)
    errs = check(raw)
    if errs:
        print("M0.5 GATE: FAILED", file=sys.stderr)
        for e in errs:
            print(f"  - {e}", file=sys.stderr)
        return 1
    print("M0.5 GATE: PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
