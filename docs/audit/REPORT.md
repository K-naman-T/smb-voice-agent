# Anti-Slop Audit Report: Bellmaker (smb-voice-agent v0.2.0)

**1. Verdict:** FIX-THEN-SHIP (Logic, UI, architecture, and continuous verification pass; live customer calls gated on P2 acoustic hardware)  
**2. Blocking list:** B1 (`chomp:8083` offline; acoustic smoke gates C1–C5 unverified on target GPU hardware; live calls require `certified-acoustic` status per Invariant I5)  
**3. The one number that matters:** 97 of 97 logic tests passing; 9 of 9 normative invariants passing in 4.0s; TTFA target SLO ≤ 1600ms (P2 unverified until chomp returns)  
**4. Findings count by severity:** 1 Blocker, 4 High, 6 Medium, 3 Low (Total: 14 findings)  
**5. Signature:** 2026-09-20 | Auditor: DeepMind Antigravity | Commit audited: `c312568`

---

## 1. Findings Ledger

| Finding ID | Severity | Surface | What Was Found | Disposition | Re-Verify Artifact |
|---|---|---|---|---|---|
| **AS-001** | **Blocker** | Hardware Contract | `chomp:8083` unreachable on host flex; acoustic smoke contract tests (C1–C5) fail with connection refused. | **Deferred**. No fake calls or fabricated latencies created. Documented in `P2-RUNBOOK.md` for execution when chomp returns. Logic CI isolated from acoustic hardware. | [`P2-RUNBOOK.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/P2-RUNBOOK.md), [`RUN-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/RUN-EVIDENCE.md) |
| **AS-002** | **High** | Brand Identity / Surface | Tree split across 4 contradictory product names (*SmartFlow*, *Scribe*, *Voice Studio*, *SMB Voice Agent*). | **Fixed**. Unified under canonical product identity **Bellmaker** (`smb-voice-agent` v0.2.0) across UI headers, landing page, API title, systemd units, and README. | [`CLAIMS-LEDGER.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/CLAIMS-LEDGER.md), [`console_desktop_1440x900.png`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/screenshots/console_desktop_1440x900.png) |
| **AS-003** | **High** | Console UI (`web/`) | Dead controls: Appointments, Knowledge Base, and Audit Trail tabs had unrendered stub views; dialer button was inert. | **Fixed**. Implemented functional views for all 3 tabs (calendar booking grid, document index with upload zone, tamper-evident SHA-256 event audit trail). Wired realistic test call audio replay (`SIM-001` through `SIM-004`). | [`console_crop_telephony_studio.png`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/screenshots/console_crop_telephony_studio.png), [`RUN-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/RUN-EVIDENCE.md) |
| **AS-004** | **High** | Web Bundle (`web/`) | Eight unreferenced dead legacy components (`BusinessPortal`, `ExecutiveDashboard`, `NeuralVoiceOrb`, etc.) bloated bundle and leaked Tier B violations. | **Fixed**. Purged all 8 dead components. CSS bundle dropped from 65.46 kB to 24.48 kB (62.6% reduction); production Vite build completes in ~5.3s. | [`RUN-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/RUN-EVIDENCE.md), [`DESIGN-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/DESIGN-EVIDENCE.md) |
| **AS-005** | **Medium** | Architecture / Design | Landing page (1-bit specimen sheet) and Console (Linear-dark workbench) had no documented relationship or shared identity motif. | **Documented & Enforced**. Formalized "Dual Registers & Unified Identity Motif" in `DESIGN.md` per Owner Decision #2. Shared anchors: Bell Mark, single lavender accent (`#5e6ad2`), and mandatory tabular numerics (`tnum`). | [`DESIGN.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/DESIGN.md), [`DESIGN-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/DESIGN-EVIDENCE.md) |
| **AS-006** | **High** | Dependencies / Python | Core runtime imports (`fastapi`, `uvicorn`, `sqlalchemy`, `httpx`, `faster-whisper`) missing from `pyproject.toml` dependencies. | **Fixed**. Declared all core packages in `pyproject.toml` and pinned exact runtime versions in `requirements.txt` from verified active Python 3.14 environment. | [`pyproject.toml`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/pyproject.toml), [`requirements.txt`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/requirements.txt), [`CI-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/CI-EVIDENCE.md) |
| **AS-007** | **Medium** | Tooling | `tools/registry_audit.py` falsely flagged established packages with recent patch updates as new packages, and misclassified `httpx` as local. | **Fixed**. Updated age calculation to inspect earliest release timestamp across PyPI releases, and restricted `LOCAL_PREFIXES` to `"http://"` / `"https://"`. Passes 6/6 dependencies in CI. | [`tools/registry_audit.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/tools/registry_audit.py), [`CI-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/CI-EVIDENCE.md) |
| **AS-008** | **Low** | UI Styling | Reflex Tier B defaults in active code: `transition-all` on interactive cards, unchosen default fonts `Inter`/`Roboto`, and `100vh` hero clipping. | **Fixed**. Replaced with explicit `transition-colors`, adopted SF Pro Display / ui-monospace stack, and enforced `100dvh` and tabular numerals across CSS and components. | [`web/src/index.css`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/web/src/index.css), [`DESIGN-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/DESIGN-EVIDENCE.md) |
| **AS-009** | **Medium** | Telephony Studio | Console telemetry displayed simulated active GPU metrics (2.1GB VRAM, 180ms TTFT) while host was disconnected, creating deceptive impression. | **Fixed**. Replaced with honest standby telemetry: `chomp:8083 (Host Standby)`, Piper CPU model badge, explicit target SLO ceilings (`SLO ≤1600ms`, `SLO ≤200ms`), and simulated fixture call tags (`SIM-001` through `SIM-004`). | [`console_crop_telephony_studio.png`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/screenshots/console_crop_telephony_studio.png), [`DESIGN-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/DESIGN-EVIDENCE.md) |
| **AS-010** | **Medium** | Marketing / Claims | Unsubstantiated claims in copy ("Trusted by 500+ local businesses", "99.9% uptime", placeholder testimonials). | **Struck**. Purged all invented social proof and numbers. Active claims restricted strictly to proven architectural capabilities (local-private execution, deterministic tool state machine). | [`CLAIMS-LEDGER.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/CLAIMS-LEDGER.md) |
| **AS-011** | **High** | Engineering Plan | Normative invariants (I1–I9) from `ENGINEERING_PLAN_v2.md` §1.2 existed only in prose without automated verification checks. | **Fixed**. Implemented executable verification scripts `i1_colocation.py` through `i9_english_only.py` and `run_all.py` in `tools/invariants/`. Enforced in automated CI runner. | [`tools/invariants/run_all.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/tools/invariants/run_all.py), [`CI-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/CI-EVIDENCE.md) |
| **AS-012** | **Low** | Shipped Copy | Em-dashes (`—`) present in shipped user-facing UI copy, triggering AI tell heuristic H6. | **Fixed**. Replaced em-dashes in shipped UI with colons, commas, or parentheses. Shipped console copy has 0 em-dashes. | [`CLAIMS-LEDGER.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/CLAIMS-LEDGER.md) |
| **AS-013** | **Medium** | Repository Layout | Retired v1 stack (`legacy/`) lacked clear historical provenance banner, causing confusion with active v2 architecture. | **Documented**. Added prominent historical banner in `legacy/README.md` explaining retired v1 status per Owner Decision #1. Preserved for provenance and exempted in `.slop.json`. | [`legacy/README.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/legacy/README.md), [`.slop.json`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/.slop.json), [`BASELINE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/BASELINE.md) |
| **AS-014** | **Medium** | Continuous Verification | No single unified command existed to run the complete anti-slop verification suite. | **Fixed**. Implemented `tools/run_ci.sh` running slop gate, invariants I1–I9, registry audit, pytest logic/security suite, and frontend build in 26s, emitting `audit-report.json`. | [`tools/run_ci.sh`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/tools/run_ci.sh), [`audit-report.json`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/audit-report.json), [`CI-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/CI-EVIDENCE.md) |

---

## 2. Phase Summaries

### Phase 0: Baseline Freeze & Reconnaissance
- Frozen pre-audit repository state recorded in [`BASELINE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/BASELINE.md).
- Gzipped machine-readable scans archived in [`baseline_audit_tree.json.gz`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/baseline_audit_tree.json.gz) and [`baseline_char_tree.json.gz`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/baseline_char_tree.json.gz).
- Established strict scope boundary: worktree 1 (`audit-anti-slop`) active for fixes; worktree 2 (`char`) strictly read-only.
- Applied Owner Decision #1: `legacy/` preserved for provenance with disclaimer banner.

### Phase 1: Build & Headless Logic Verification
- Full evidence and verbatim outputs recorded in [`RUN-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/RUN-EVIDENCE.md).
- Python test execution: 97 logic & security tests passed in 2.8s; 5 chomp contract tests failed due to offline GPU host (classified as host-blocked, not logic defects).
- Headless API boot verified on `http://127.0.0.1:8190/health` returning `200 OK` and `"status": "ok"`.
- Web production bundle: 8 dead components purged; CSS bundle cut by 62.6% (24.48 kB); build completed in 5.3s.

### Phase 2: Acoustic Contract & Hardware Verification (Blocked)
- Target host `chomp:8083` is offline; per core doctrine, zero fake calls or fabricated latencies were created.
- Detailed step-by-step procedures for acoustic validation once chomp returns are documented in [`P2-RUNBOOK.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/P2-RUNBOOK.md).
- Covers systemd service restarts, contract test execution (`test_llama_server.py`), 10-turn synthetic call battery, TTFA p95 latency verification against SLO ≤ 1600ms, and artifact registration.

### Phase 3: Claims Ledger & Typography Audit
- Comprehensive claim inventory recorded in [`CLAIMS-LEDGER.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/CLAIMS-LEDGER.md).
- Purged unprovable marketing claims (500+ businesses, 99.9% uptime, fake social proof).
- Sweep across repo unified product naming to **Bellmaker** (`smb-voice-agent` v0.2.0), eliminating legacy remnants.
- Em-dash typography audit: removed unicode em-dashes from active shipped UI copy.

### Phase 4: Visual Architecture, Dual Registers & Design Audit
- Contrast measurements, font verification, and Tier B dispositions detailed in [`DESIGN-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/DESIGN-EVIDENCE.md).
- Fresh screenshots rendered in Chromium headless across desktop (1440x900) and mobile (390x844) under [`screenshots/`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/screenshots/).
- Measured WCAG 2.1 AA contrast: Console title (18.8:1), Active tabs (17.2:1), Landing wordmark (17.6:1), CTA button (17.6:1).
- Enforced Owner Decision #2: Dual Registers (Specimen Sheet + Linear Dark Workbench) unified by Bell Mark, Lavender accent (`#5e6ad2`), and Tabular Numerics (`tnum`).

### Phase 5: Continuous Verification & Normative Invariants
- Execution logs and invariant results documented in [`CI-EVIDENCE.md`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/docs/audit/CI-EVIDENCE.md).
- Core dependencies declared in `pyproject.toml` and pinned in `requirements.txt`.
- Executable invariant battery in `tools/invariants/`: all 9 normative invariants (I1–I9) passing in 4.0s.
- Dependency registry audit verified 6/6 dependencies on PyPI with zero 404s and zero missing packages.
- Top-level CI runner [`tools/run_ci.sh`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/tools/run_ci.sh) executes entire battery in 26s, emitting [`audit-report.json`](file:///home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/audit-report.json).

---

## 3. How to Re-Verify

Run the complete verification battery with a single command:

```bash
# 1. Full automated CI suite (slop gate, invariants, registry audit, logic tests, build)
bash tools/run_ci.sh

# 2. Re-run normative invariants independently
python3 tools/invariants/run_all.py

# 3. Re-run slop gate across active application code
python3 tools/slop_gate.py --ci

# 4. When chomp returns online, execute Phase 2 acoustic certification:
bash docs/audit/P2-RUNBOOK.md
```
