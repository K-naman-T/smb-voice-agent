# Known Gaps and Intentional Architecture Trade-offs

This document records the intentional boundaries, known performance constraints, and accepted trade-offs for the v2 SMB Voice Agent platform (per §8 of `ENGINEERING_PLAN_v2.md`).

---

### 1. TTS Voice Naturalness vs. Local CPU Constraints
* **Current choice:** Piper TTS (`en_US-amy-low.onnx`) running on CPU.
* **Latency:** ~50–120ms synthesis time, zero GPU VRAM impact.
* **Trade-off:** Synthetic tone has noticeable robotic inflection compared to cloud voices (e.g. ElevenLabs / MiniMax).
* **Mitigation:** Accepted for local-private privacy guarantee. The modular interface `PiperTTS` allows swapping higher-tier ONNX voices or a separate sidecar without altering turn logic.

---

### 2. Single GPU Concurrency (RTX 4060 8GB)
* **Current choice:** Qwen3.5-9B-Chat Q4_K_M occupies ~5.2 GB of VRAM.
* **Headroom:** ~2.9 GB free for faster-whisper STT and driver context.
* **Concurrency:** Strictly tuned for `parallel=1` active voice stream per host. Concurrent calls queue through cooperative `gpu_lock`.
* **Mitigation:** Operator scaling guide specifies 1 host per concurrent phone line or upgrading to RTX 4090 / A5000 for multi-line agencies.

---

### 3. Mobile WebRTC Playout vs. Corporate Firewalls (STUN/TURN)
* **Default path:** Desktop Chrome over local LAN / Tailscale direct UDP.
* **Limitation:** Mobile browsers on cellular LTE/5G symmetric NATs require an external TURN relay (coturn on port 3478).
* **Mitigation:** Desktop WebRTC browser console is the primary verified path; coturn configuration is documented in `deploy/docker-compose.yml`.

---

### 4. Outbound Dialing De-Scoped
* **Policy:** Outbound autonomous dialing is hard-disabled (feature flag off, no dial routes).
* **Rationale:** Compliance with telemarketing regulations (TCPA/STIR-SHAKEN) and spam prevention. The agent operates strictly in inbound concierge and booking mode.
