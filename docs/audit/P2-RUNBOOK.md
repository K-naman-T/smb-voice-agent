# P2 Execution Runbook: End-to-End Acoustic Call Path Verification

**Status:** BLOCKED (Host `chomp` is offline; last seen 2 days ago on Tailscale).  
**Execution Condition:** To be executed sequentially on `chomp` immediately upon host restoration.  
**Strict Mandate:** Never fabricate a call, a latency number, or an audio recording. Every metric must be produced by running instruments against live hardware.

---

## 1. Preflight & Infrastructure Bring-up

### Step 1.1: Tailscale & Host Verification
Verify `chomp` host health and physical GPU allocation:
```bash
# Verify Tailscale connectivity and latency
ping -c 5 chomp
ssh chomp "uname -a && tailscale status"

# Verify NVIDIA RTX 4060 GPU state and driver
ssh chomp "nvidia-smi --query-gpu=driver_version,name,memory.total,memory.free,utilization.gpu --format=csv"
```
**Required Exit Criteria:** Driver >= 550.x, GPU RTX 4060 8GB, Idle VRAM usage < 150 MiB, Free disk space >= 25 GB.

### Step 1.2: Container Stack Deployment
Bring up the production compose stack in local-private mode:
```bash
cd /home/knamant/smb-voice-agent/deploy
echo "compose" > MODE
docker compose -f docker-compose.yml up -d

# Verify container statuses and port bindings
docker compose ps
netstat -tulpn | grep -E '8190|8083|7880|3478'
```
**Required Ports:**
- `:8190` — Control Plane API (127.0.0.1)
- `:8083` — llama-server (127.0.0.1 only, OpenAI /v1 endpoint)
- `:7880` / `:7881` — LiveKit SFU (WebRTC signaling and media)
- `:3478` — coturn STUN/TURN daemon

### Step 1.3: Verify Contract Tests C1–C5
Run the live contract tests against `http://127.0.0.1:8083/v1`:
```bash
LLAMA_SERVER_URL="http://127.0.0.1:8083/v1" pytest tests/contract/test_llama_server.py -v
```
All 5 tests (C1 models list, C2 stream no tools, C3 tools non-stream, C4 cancel mid-stream, C5 auth 401) must PASS.

---

## 2. Rigorous End-to-End Call Evaluation Protocol

The audit requires 10 scripted calls executed across realistic conversational scenarios to measure statistical distributions (p50 and p95), not single anecdotal runs.

### Step 2.1: 10 Scripted Evaluation Calls (p50 & p95 Measurement)

Execute the test driver:
```bash
python scripts/run_acoustic_eval_suite.py \
  --calls 10 \
  --agent-version-id <certified-version-id> \
  --output-dir artifacts/chomp/$(date +%Y%m%d_%H%M%S)/
```

For each call, record the span events and calculate:
$$\text{TTFA} = t_{\text{first\_pcm\_out}} - t_{\text{eou\_commit}}$$

**SLO Thresholds (from `ENGINEERING_PLAN_v2.md` §2.13):**
- `ttfa_stream` (pure conversation, no tools): **p50 <= 1600ms**, **p95 <= 2800ms**
- `ttfa_tools` (booking/catalog lookup): **p50 <= 2500ms**, **p95 <= 4500ms**
- `warm_llm_ttft`: **p50 <= 500ms**, **p95 <= 800ms**

### Step 2.2: Barge-in Stop Latency Measurement
Do not accept the qualitative claim "stops instantly".
1. Stream synthetic user audio into active agent turn.
2. Signal Silero VAD speech event at timestamp $T_0$.
3. Measure timestamp $T_{\text{stop}}$ when worker issues `AudioTrack.stop()` and cancels llama generation slot via HTTP abort.
4. Calculate:
$$\text{barge\_stop\_ms} = T_{\text{stop}} - T_0$$
**SLO Threshold:** **p50 <= 200ms**, **p95 <= 400ms**.

### Step 2.3: Barge-In Hallucination & Watermark Rebuild Check
**Methodology:**
1. Let the agent begin speaking a 3-sentence synthesized response.
2. Trigger user barge-in precisely during sentence 2 (e.g. after word 4).
3. Inspect `turn_machine.get_history()` for subsequent turn.
4. **Validation Assertion:** The chat history must contain *only* sentence 1 (the fully-played sentence watermark). Sentence 2 and sentence 3 must NOT appear in the prompt context sent to llama-server.
5. If the truncated sentence 2 is recorded as having been heard by the caller, flag as a **Hallucination State Violation**.

### Step 2.4: Zero-Egress Network Packet Trace
Verify the privacy invariant I7 with an active packet capture during live voice conversations:
```bash
# Capture network traffic on external interface during test calls
sudo tcpdump -i eth0 -n -s 0 -w artifacts/chomp/traffic_audit.pcap &
TCPDUMP_PID=$!

# Run 3 live voice turns with booking
python scripts/run_acoustic_eval_suite.py --calls 3

kill $TCPDUMP_PID

# Inspect pcap for external DNS, HTTP, or TLS connections outside local network / Tailscale
tshark -r artifacts/chomp/traffic_audit.pcap -Y "ip.dst != 127.0.0.1 and ip.dst != 100.64.0.0/10 and not arp"
```
**Exit Criterion:** Zero outbound packets to external IPs or third-party cloud APIs (OpenAI, Anthropic, Google, Sarvam, MiniMax).

### Step 2.5: GPU Lock & Concurrency Contention Gate
Verify the single GPU consumer policy (invariant I8):
1. Spawn Call Session 1 (`CS-1`) and initiate active speech streaming.
2. Concurrently spawn Call Session 2 (`CS-2`) on the same host.
3. Assert:
   - `CS-2` receives `HTTP 429` or is placed into cooperative FIFO queue.
   - `CS-1` experiences zero frame drops or VRAM thrashing (peak VRAM <= 7.2 GB).
   - `CS-2` does not crash or corrupt `CS-1` audio context.

---

## 3. Human Acceptance Checklist Sign-off (Phase A–D)

Follow `docs/HUMAN_ACCEPTANCE_CHECKLIST.md` step-by-step:
1. **Phase A (Hardware):** Attach `nvidia-smi` and `df -h /` command logs.
2. **Phase B (Security):** Verify high-entropy keys in `.env` and `verify_p0.py` PASS.
3. **Phase C (Blueprint & Certify):** Verify simulation >= 90% across 3 seeds (`certified-logic`), then real acoustic gate (`certified-acoustic`).
4. **Phase D (Live Call Smoke Test):**
   - Conduct real desktop Chrome WebRTC test call.
   - Speak: *"I need to book an AC repair appointment for tomorrow at 10 AM."*
   - Measure real TTFA (must comply with §2.13 SLO, NOT the fabricated "sub-500ms" marketing claim).
   - Verify appointment confirmation code `APT-XXXXXX` matches SQLite database row in `appointments` table.

---

## 4. Evidence Package Assembly

All evidence from this run must be packaged under:
`artifacts/chomp/<timestamp>/`
Containing:
1. `environment.txt` (`uname`, `nvidia-smi`, `tailscale status`, `docker compose ps`)
2. `contract_tests.log` (pytest C1–C5 stdout)
3. `eval_10_calls_metrics.json` (per-turn `ttfa_ms`, `barge_stop_ms`, `llm_ttft_ms`)
4. `call_recordings/` (dual-channel 16kHz WAV files for all 10 calls)
5. `traffic_audit.pcap` (tcpdump network capture proving 0 external egress)
6. `transcripts.json` (raw JSON transcripts of each turn)
7. `human_acceptance_signed.md` (itemized checklist with artifact links)
