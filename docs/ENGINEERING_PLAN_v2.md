# ENGINEERING PLAN v2.1 — Voice Agent Creator (HARDENED)

**Status:** Post-adversarial revision (3 independent audits: SRE, security/product, voice-ML)  
**Date:** 2026-08-11  
**LLM runtime:** **llama.cpp `llama-server`** (OpenAI `/v1`) — **Ollama is forbidden**  
**Host:** `chomp` · RTX 4060 8GB · ~14GB RAM · ~50GB free · Tailscale  
**Supersedes:** SESSION.md stack notes that mentioned Ollama; old SPEC.md cloud path is **historical only**

---

## 0. Document control

| Field | Value |
|-------|--------|
| Product (v1) | Local-private **voice agent creator** demo + self-deploy skeleton |
| GTM honesty | **Not** “fire your agency / legal warranty.” Badge = automated sim + on-box gates only |
| Budget | $0 required path |
| Human ear | Final checklist; **plus mandatory P3.5 GPU reality gate** (not ear — metrics) |
| Outbound | **Compiled out** of worker binary/feature flag `false` — no dial routes in v1 |

### 0.1 Non-goals (v1) — exhaustive

- Ollama or any other LLM daemon  
- Production PSTN / Twilio as required path  
- Outbound dialer / AMD  
- Hindi/Hinglish/bilingual STT (English-only freeze)  
- 7B LLM + CUDA Whisper simultaneously without measured exception  
- Multi-tenant production isolation on shared chomp laptop  
- Mobile WebRTC without TURN green  
- Native S2S default  
- Split STT/LLM/TTS across Tailscale  
- Agency-killer marketing claims beyond “demo creator + local inference”  
- Hybrid stream+tools as certifiable path  

### 0.2 Success definition (v1 Done)

1. GUI on chomp: brief → AgentVersion draft → edit → browser test call (desktop Chrome on Tailscale)  
2. Call plane: streaming cascade when **no tools**; tools path when intent requires  
3. `book_appointment` only via **PROPOSED→CONFIRMED→COMMITTED**; DB state asserted  
4. `docker compose` or systemd stack reproduces; **disk preflight** passes  
5. `local-private`: empty egress allowlist; runtime fail-closed  
6. CI logic green + **chomp-smoke artifact** attached for any `certified-acoustic`  
7. `KNOWN_GAPS.md` + `HUMAN_ACCEPTANCE_CHECKLIST.md`  

**Not success:** “any phone, any device, agency-grade voice.”

---

## 1. High-level design

### 1.1 Planes

```
CONTROL PLANE                          CALL PLANE (chomp only)
─────────────                          ──────────────────────
GUI (3190)                             LiveKit SFU (7880+)
API (8190) ──AuthZ──►                  Session worker
  AgentVersion store                     VAD · STT · turn machine
  Compiler · Sim · Certify               LLM client → llama-server :8083
  Appointments · Calls                   TTS Piper (CPU)
  Privacy map (runtime-backed)           Tool state machine
```

### 1.2 Invariants (normative — fail build if violated)

| ID | Invariant |
|----|-----------|
| **I1 Colocation** | Media, STT, llama-server, TTS, worker on **one host**. No Tailscale hop between stages. |
| **I2 Artifact** | Live sessions load **immutable** AgentVersion; checksum server-computed. |
| **I3 Registry** | STT/LLM/TTS behind interfaces; default local; cloud adapters cannot import into `local-private`. |
| **I4 Dual test** | Logic CI always; **acoustic/GPU certify separate status**. |
| **I5 Certified bind** | Live load requires `status∈{certified-acoustic,live}` AND matching `agent_checksum` AND `model_sha256` of **running** GGUF AND `suite_record` hash. Logic-only cert ≠ live. |
| **I6 Tool state machine** | Mutating tools: PROPOSED → CONFIRMED → COMMITTED only. Speech templates for bookings **from tool results**, never free-form model text. |
| **I7 Privacy fail-closed** | `local-private`: egress allowlist empty; enforced (network + config scan); map derived from **runtime**, not marketing JSON alone. |
| **I8 Single GPU consumer policy** | One concurrent **call session**; GPU lock between Whisper decode and llama decode. |
| **I9 English-only v1** | No distill-en path for Hinglish claims. |

### 1.3 Trust domain (honest)

**chomp is a single-trust-domain dev host** (OpenCode, getrole, this stack). It is **not** multi-tenant production isolation. Self-deploy customer host is a separate trust domain with digest-pinned images.

### 1.4 Product flow

```
Brief → Compiler → draft AgentVersion
  → GUI edit (structured business profile + never_do rules + KB)
  → Sim (logic) → status certified-logic
  → chomp-smoke acoustic gates → status certified-acoustic
  → Session (API mints LiveKit token) → worker re-fetches version by id (service auth)
  → Call → traces → appointments via state machine only
```

---

## 2. Low-level design

### 2.1 Measured ports (chomp 2026-08-28)

| Occupied | Service |
|----------|---------|
| 3000 | getrole-web |
| 8000 | getrole-api |
| 8080 | uvicorn (other) |
| 8090 | **unknown listener** (do not use) |
| 4096 | OpenCode web |
| 5432 | postgres loopback |

| Ours | Bind | Port |
|------|------|------|
| Control API | default **127.0.0.1**; Tailscale only with key | **8190** |
| GUI | 127.0.0.1 / TS | **3190** |
| LiveKit | 0.0.0.0 | **7880**, **7881**, UDP **50000–50100** |
| **llama-server** | **127.0.0.1 only** | **8083** |
| coturn (required for mobile claim) | 127.0.0.1 or host | **3478** |
| Optional STT sidecar | 127.0.0.1 | **8091** |

> **Note (M0.5):** Qwable-9B service was replaced by Qwen3.5-9B-Chat on port 8083.
> Port 8090 is occupied by an unknown listener; API moved to 8190.

### 2.2 llama.cpp (not Ollama)

#### 2.2.1 Why

Explicit GGUF pin, VRAM flags, OpenAI `/v1`, no daemon abstraction. Ollama is out of scope.

#### 2.2.2 Binary lock

```text
deploy/chomp-gpu.lock (normative fields):
  nvidia_driver: "595.x"          # exact from nvidia-smi on green host
  cuda_arch: "89"                 # Ada 4060
  llama_cpp_git_sha: "<pin>"
  llama_server_path: ".tools/llama.cpp/build/bin/llama-server"
  ctranslate2_version: "<pin>"
  faster_whisper_version: "<pin>"
  CMAKE_CUDA_ARCHITECTURES: "89"
```

Build: `scripts/build-llama.sh` with `-DGGML_CUDA=ON`.  
**Either** host systemd binary **or** compose image — pick one in `deploy/MODE` file; do not dual-undefined.

#### 2.2.3 Models

| Profile | GGUF | Rules |
|---------|------|--------|
| `llm.chomp.fast` (default) | Qwen2.5-3B-Instruct **Q4_K_M or better if tool bake-off fails** | Must pass tool_json_valid ≥0.99 |
| `llm.chomp.balanced` | 7B Q4 | **Whisper must be CPU or unloaded** during LLM; measured only |

`models/manifest.json`: every entry **sha256 required** (no placeholder). `ExecStartPre` verifies or **refuse boot**.

Download: `scripts/download-models.sh --verify` only.

#### 2.2.4 llama-server launch

```bash
llama-server \
  --model /abs/path/model.gguf \
  --host 127.0.0.1 --port 8083 \
  --ctx-size 4096 \
  --n-gpu-layers 99 \
  --parallel 1 \
  --jinja \
  --api-key "${LLAMA_API_KEY}" \    # MANDATORY high-entropy; never empty in non-dev
  --metrics
# NO --cont-batching at parallel=1
# flash-attn: only if pinned commit supports; else omit
```

**UNIX user `llama`:** model files `0640` root:llama; worker in group `llama`.  
Base URL: `http://127.0.0.1:8083/v1`  
Model id: **exactly** `/v1/models` reported id (often stem of filename).

#### 2.2.5 Stream vs tools (v1.1 — product-correct)

| Mode | When | API |
|------|------|-----|
| `stream_content` | Default speech turns | `stream=true`, **`tool_choice: none`** |
| `tools_complete` | Intent router hits book/hours/transfer/kb | Non-stream completion with tools; grammar/JSON schema if available; then **stream or Piper-template speech** from tool result |
| `hybrid` | **Forbidden in v1** | — |

**Intent router (pre-LLM, cheap):** regex/keywords + optional tiny rules on last user final transcript. Only then attach tool schemas.

**Sampling:** tools `temperature=0`; speech may use 0.3–0.6.

**Parse fail:** 1 repair completion max → else spoken fallback (Piper static). Never silent drop.

**Bake-off:** before locking Q4_K_M, measure tool_json_valid on 200 calls vs Q5_K_M; ship lowest VRAM with ≥0.99.

#### 2.2.6 Warmup & ready

`/v1/models` up ≠ warm.  
`ExecStartPost` / ready probe: one completion `max_tokens=16` until warm TTFT < 500ms (3B). Whisper: 1s silence + 2s speech fixture.  
Ready only after both warm.

#### 2.2.7 OOM / circuit breaker

- Mutating tools: **fail closed**  
- Spoken fallback: **pre-rendered Piper PCM** only (no LLM)  
- systemd `StartLimitBurst=3`  
- After N OOMs: refuse new sessions; demote STT to CPU if configured  

### 2.3 STT

| Item | Spec |
|------|------|
| Engine | faster-whisper |
| Default | `small`, prefer `int8_float16` if VRAM tight |
| Device | CUDA (or CPU under 7B profile) |
| To LLM | **Finals only** |
| Partials | UI + EOT stability only — never in `messages[]` |

**EOT commit requires all of:**

1. Silence ≥ profile threshold (number-aware)  
2. Partial text stable ≥ **250ms**  
3. Not in phone/date capture state  
4. Energy below threshold  

**Number capture:** if ≥2 digit-like tokens, silence threshold **1500–2000ms** until complete or 2500ms hard stop.

### 2.4 TTS (Piper)

- CPU only by default  
- Explicit resample → LiveKit rate (e.g. 48k)  
- Peak normalize ~-3 dBFS  
- Text norm: phones as groups, strip markdown/emoji  
- **KNOWN_GAPS:** robotic vs commercial TTS  

### 2.5 Sentence aggregation

```text
Flush on .?! only if NOT:
  - abbreviation (Mr.|Mrs.|Dr.|St.|Ave.|etc.|approx.|No.)
  - decimal/money (\d+\.\d+)
Max hold: max_chars=100 OR max_ms_since_token=400
Golden tests ≥30 strings including Dr., $12.50, 3.5 ton
```

### 2.6 Session state machine

```
INIT→READY→LISTENING⇄SPEAKING
         ↓           ↓
      THINKING←INTERRUPTED
         ↓
      TOOL_LOOP (optional)
         ↓
      SPEAKING→LISTENING→ENDING→CLOSED
```

### 2.7 Barge-in (atomic)

1. Stop TTS playout (CPU)  
2. Cancel llama HTTP stream; wait ≤100ms  
3. Mark in-flight tools **stale** if generation_id ≠ current; **never COMMIT** on stale  
4. Acquire **gpu_lock** → STT  
5. **History:** sentence-level spoken watermark only  

```text
On sentence flush to TTS: enqueue {text, duration_ms, t_play_start}
On barge at t_b:
  spoken = sentences fully played (t_play_start + duration ≤ t_b + 50ms)
  partial sentence: DROP (no half-commit)
  assistant history = join(spoken)
```

**No** char/ms word guessing for mutating turns.

**Legal vs safety:** non-interruptible disclosure for recording consent; **safety barge** still allowed for true user speech after min_speech_ms **except** during mandatory disclosure until `disclosure_completed` span — document product choice: disclosure completes first (compliance), then normal barge.

### 2.8 GPU lock

```text
Single-flight: only one of {whisper_infer, llama_decode}
Metric: gpu_lock_wait_ms p95 ≤ 50; cuda_oom_count == 0
```

### 2.9 Tools state machine (I6)

```text
PROPOSED  — server mints proposal_id, validates schema + business rules
            (hours, service enum, E.164 phone, future window, timezone)
CONFIRMED — confirm_booking(proposal_id) or DTMF 1; TTL 5 min; bound call_id
COMMITTED — single INSERT with idempotency_key UNIQUE
            (call_id, phone, scheduled_time_utc, service)
```

- Speech “you're booked” **only** from COMMITTED template  
- Rate limit mutating tools per session  
- Tool timeout 2000ms  
- v1 tools **serial only**  
- `never_do`: hard rules + prompt (not prompt alone)  

**Appointments schema:**

```text
scheduled_time_utc, timezone (IANA), slot uniqueness,
idempotency_key UNIQUE, status
```

Host: **chrony/NTP** required in runbook; sim covers TZ + double-book.

### 2.10 Intent router → tools

Attach tools only when user final matches booking/hours/transfer/kb intents. Else `tool_choice: none` + stream.

### 2.11 Context management (4096)

- Never evict system + never_do + tool schemas (re-inject if shift)  
- Keep last 8 turns + summary ≤300 tokens  
- Tool results: 1-line in chat; full in DB  
- Alert if prompt_tokens > 0.85 * ctx  
- Soft max ~40 turns → wrap-up  

### 2.12 VRAM & RAM (measured, not guessed)

```text
scripts/vram-profile.sh  # mandatory P1
  Load Whisper + llama; run STT∩cancel-LLM path; record nvidia-smi peak

Admission before session:
  free_vram_mb >= 1200
  not throttled (temp/clock)
  active_sessions < 1

7B: Whisper CPU or unload; smi proof required in profile file

RAM 14GB:
  budget OS + LiveKit + llama mmap + ctranslate2 + worker + one Chrome
  prefer no --mlock unless free RAM ≥ model+2GB
  swap-in metric in smoke
```

### 2.13 Latency SLOs (honest 4060)

**Formula:** `ttfa_ms = t_first_pcm_out - t_eou_commit`

| SLO | P50 | P95 |
|-----|-----|-----|
| `ttfa_stream` (no tools) | ≤1600ms | ≤2800ms |
| `ttfa_tools` | ≤2500ms | ≤4500ms |
| `barge_stop_ms` | ≤200ms | ≤400ms |
| warm `llm_ttft` after warmup | ≤500ms | ≤800ms |

Cold start reported separately; **certify on warm only**.  
EOU: `silence_ms` balanced **450**; number state 1500–2000.

### 2.14 LiveKit

- Self-host; worker uses OpenAI-compatible client → llama  
- **coturn** for any mobile claim; desktop Chrome TS = primary success path  
- Control API sole token issuer; TTL ≤5m; room-scoped  
- Worker **re-fetches** AgentVersion from API with service auth (ignore client prompts)  
- Fallback: Pipecat within 48h if LiveKit blocked — schema unchanged  

**Contract tests P1:** models list, stream no tools, tools non-stream, cancel mid-stream, API key required.

### 2.15 Control API

| Rule | Spec |
|------|------|
| Auth | Per-tenant API keys, **stored sha256**, scopes |
| Scopes | `agents:write`, `sessions:create`, `calls:read`, `appointments:write`, `certify:run` |
| Middleware | All `/api/v1/*` except `/health` |
| IDOR | Every query `tenant_id = principal.tenant_id`; CI A/B tenant tests |
| Rate limit | `sessions:create`, certify, mutating tools |
| Bind | 127.0.0.1 default |
| CORS | Explicit origins, no `*` with credentials |

### 2.16 Certify levels

| Status | Means |
|--------|--------|
| `draft` | Editable |
| `certified-logic` | Mock-friendly sim ≥90% × 3 seeds, temp=0, fixed seeds; **cannot go live** |
| `certified-acoustic` | Logic + real GGUF tool_json ≥99%/200 + entity ≥95% + barge history 100% scripted + TTFA p95 + privacy egress 0 + vram smoke |
| `live` | Operator promote from certified-acoustic |

Certify record immutable: agent_checksum, suite_checksum, model_sha256, llama_sha, seeds, timestamp.  
Builtin **core suite** always required (adversarial book inject, double book, invent price, never_do).

### 2.17 Privacy (I7)

- Runtime allowlist empty for local-private  
- docker internal network / no egress for worker+llama  
- CI: fail if cloud base_url or OPENAI_API_KEY set in local-private  
- Map labels: “inference on-host; media to **call participants**; no third-party model APIs”  
- Transcripts: redact phones **default on** in logs; retention_days enforced by job  
- Recording: requires `disclosure_completed` span before record_audio  

### 2.18 Security host

- Users: `llama`, `voice-worker`, `voice-api`  
- OpenCode **must not** write `models/`, production `.env`, `deploy/` release pins  
- GGUF = product IP: no download endpoint  
- Secrets: systemd EnvironmentFile 0600  
- Risk **R-OPENCODE** accepted for dev host  

### 2.19 Outbound

Feature flag **off**; no dial routes; consent schema may exist but worker cannot dial.  
SMS: template allowlist only if enabled; no free-form model SMS.

### 2.20 Disk

Preflight free ≥ **25GB** after install inventory (build, one GGUF, whisper, piper, images, venv).  
Log rotate 500MB; one GGUF active; docker prune policy.

### 2.21 Observability spans

`call_id, turn_id, eou_ms, stt_ms, llm_ttft_ms, prompt_tokens, completion_tokens, ctx_frac, tts_ttfb_ms, ttfa_ms, barge_stop_ms, gpu_lock_wait_ms, gpu_temp_c, tool_ms[], generation_id, agent_version, checksum`

### 2.22 AgentVersion (checksum)

Server sets `checksum = sha256(canonical_json(payload without checksum))`.  
Reject load on mismatch.  
Export bundle: payload + model pins + suite id.  
Re-certify if model or llama sha changes.

### 2.23 Data model (additions)

```
api_keys(id, tenant_id, key_hash, prefix, scopes, created_at)
certify_records(...)
booking_proposals(id, call_id, payload, status, expires_at)
appointments(..., scheduled_time_utc, timezone, idempotency_key UNIQUE)
consent_events(...)  # when recording
```

---

## 3. Repo layout

```
smb-voice-agent/
  docs/ENGINEERING_PLAN_v2.md   # this file (source of truth)
  docs/SPEC-v2.md               # product freeze derived
  docs/KNOWN_GAPS.md
  docs/HUMAN_ACCEPTANCE_CHECKLIST.md
  apps/{api,web,worker}
  packages/{agent_schema,eval}
  kits/
  models/                       # gitignored + manifest
  scripts/{build-llama,download-models,vram-profile,chomp-smoke,bootstrap-chomp}
  deploy/{docker-compose.yml,systemd/,chomp-gpu.lock,MODE}
  tests/
  SESSION.md                    # pointer to this plan
  HANDOFF.md
```

---

## 4. Phases

| Phase | Exit |
|-------|------|
| **P0** | Docs aligned (no Ollama); plan v2.1; ports; feature flags |
| **P1** | llama-server + warmup + contract tests; vram-profile.sh |
| **P2** | Whisper + Piper + GPU lock smoke |
| **P3** | Worker duplex browser; barge watermark; intent router |
| **P3.5 GPU gate** | tool_json, TTFA warm, barge history, vram peak — **block** further polish if red |
| **P4** | Tool state machine + appointments TZ/idempotency |
| **P5** | Control API authZ + AgentVersion |
| **P6** | Compiler + HVAC kit + structured business profile |
| **P7** | GUI |
| **P8** | Eval suites + certify levels |
| **P9** | Compose/systemd self-deploy + privacy egress |
| **P10** | KNOWN_GAPS + human checklist |

---

## 5. Test gates (summary)

| Gate | Threshold |
|------|-----------|
| Logic booking sim | ≥90% × 3 seeds, temp=0 |
| Tool JSON real GGUF | ≥99% / 200 |
| Entity phone/time WAV | ≥95% |
| Barge history | 100% scripted |
| TTFA p95 warm stream | ≤2800ms |
| never_do critical | 0 |
| Privacy egress | 0 |
| CUDA OOM smoke | 0 |
| IDOR A/B tenants | 0 cross access |
| Auth middleware coverage | 100% /api/v1 |

---

## 6. Risk register (post-audit)

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Stream+tools | tools_complete only; no hybrid v1 |
| R2 | VRAM OOM | measured profile; GPU lock; admission |
| R3 | Disk | 25GB preflight |
| R4 | Ports | measured table |
| R5 | LiveKit | Pipecat fallback |
| R6 | Tool JSON weak | grammar; bake-off quant; repair |
| R7 | Thermal | inhibit sleep; temp admission; concurrency 1 |
| R8 | Tailscale split | I1 |
| R9 | Outbound creep | compiled out |
| R10 | False green | dual certify levels |
| R11 | CUDA matrix | chomp-gpu.lock |
| R12 | getrole fight | ports + don't kill |
| R13 | GGUF license | allowlist models |
| R14 | Human late | P3.5 metrics gate |
| R15 | TURN/mobile | coturn; desktop primary |
| R16 | Dual CUDA | lock + measure |
| R17 | Clock/TZ | NTP + utc fields |
| R18 | History skew | sentence watermark |
| R19 | IDOR/auth | hashed keys + middleware |
| R20 | Inject-book | state machine |
| R21 | Privacy lie | runtime egress |
| R22 | OpenCode | separate users; accept dev risk |
| R23 | TCPA | no dial routes |
| R24 | Support/GTM | honest badge text |
| R25 | Supply chain | digests + sha256 boot |

---

## 7. Stack table (final)

| Layer | Choice |
|-------|--------|
| GUI | React 19 + Vite + TS + Tailwind |
| API | FastAPI + Pydantic v2 |
| DB | SQLite (dev) / Postgres |
| Media | LiveKit (+ coturn); Pipecat fallback |
| **LLM** | **llama.cpp llama-server + pinned GGUF** |
| STT | faster-whisper |
| TTS | Piper CPU |
| VAD | Silero |
| Deploy | systemd and/or compose + nvidia |
| Host | chomp |

**Forbidden:** Ollama.

---

## 8. Adversarial audit disposition

Three audits (SRE, security, voice-ML) produced Critical/Major items.  
**v2.1 absorbs all Critical and Major patches** as normative text above.  
Residual intentional accepts:

- Dev host co-tenancy with OpenCode (documented, not multi-tenant prod)  
- Piper quality gap (KNOWN_GAPS)  
- Desktop Chrome primary; mobile only if TURN proven  
- GTM de-scoped from “kill agencies” warranty to demo+skeleton  

If a new audit finds a Critical not covered, update this file before code.

---

## 9. Decision log

| ID | Decision |
|----|----------|
| D-LLM | llama.cpp not Ollama |
| D-PORT | llama **8083** |
| D-STREAM | tool_choice none for stream; tools phase-gated |
| D-CERT | certified-logic vs certified-acoustic |
| D-BOOK | PROPOSED→CONFIRMED→COMMITTED |
| D-TTS | Piper CPU |
| D-CONC | 1 session |
| D-OUT | Compiled out |
| D-LANG | English v1 |

---

*End ENGINEERING_PLAN_v2.1 — source of truth for implementation*
