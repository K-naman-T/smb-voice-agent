# Human Acceptance & Operator Go-Live Checklist

Complete every item sequentially before promoting an agent to `live` status.

---

### Phase A: Hardware & Host Health
- [ ] Host `chomp` reachable over Tailscale (`ssh chomp nvidia-smi`).
- [ ] GPU device `/dev/nvidia0` healthy and free (VRAM usage < 100 MiB idle).
- [ ] Disk space on `/` is >= 25 GB free (`df -h /`).
- [ ] `scripts/discover_chomp.sh` and `scripts/verify_m0_5.py` report `PASS`.

---

### Phase B: Security & Secrets Rotation
- [ ] `.env` created from `deploy/.env.example` with high-entropy keys.
- [ ] `LLAMA_API_KEY` rotated away from defaults.
- [ ] `DATABASE_URL` configured and migrations applied.
- [ ] `scripts/verify_p0.py` passes with zero forbidden provider violations.

---

### Phase C: Agent Blueprint & Certification
- [ ] Business profile configured in Agent Studio (Hours, Services, Pricing).
- [ ] `never_do` rules reviewed and verified for industry vertical.
- [ ] Core evaluation suite run via `POST /api/v1/agents/{id}/versions/{v}/certify`.
- [ ] Simulation score is >= 90% across 3 seeds (`certified-logic`).
- [ ] Real GGUF acoustic gate verified via `scripts/verify_p3_5_gpu_gate.py` (`certified-acoustic`).
- [ ] Operator review performed before promoting status to `live`.

---

### Phase D: End-to-End Live Call Smoke Test
- [ ] Open Control Console at `http://localhost:3190`.
- [ ] Initiate WebRTC audio call in browser.
- [ ] Speak test sentence: *"I need to book an AC repair appointment for tomorrow at 10 AM."*
- [ ] Verify agent responds within sub-500ms TTFA.
- [ ] Interrupt agent mid-sentence; verify audio stops instantly and history does not hallucinate.
- [ ] Confirm appointment and verify unique confirmation code (`APT-XXXXXX`) in Appointments tab.
