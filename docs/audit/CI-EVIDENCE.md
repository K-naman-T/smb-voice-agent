# Anti-Slop Audit: P5 Continuous Verification & CI Evidence Report

**Project:** Bellmaker (`smb-voice-agent` v0.2.0)  
**Host:** `flex` (Linux x86_64, Python 3.14, Node v22.14.0)  
**Audit Timestamp:** 2026-09-20T01:12:00+05:30  
**Status:** PASS (All 5 automated CI verification batteries passed in 26s; zero hard slop findings; 9/9 invariants enforced)

---

## 1. Executive Summary

Phase 5 transitions the one-off anti-slop audit into an automated, re-runnable continuous verification pipeline. The suite is encapsulated in a single top-level runner:
```bash
bash tools/run_ci.sh
```

### 1.1 CI Battery Overview

| Battery Step | Command | Target / Scope | Result | Duration |
|---|---|---|---|---|
| **1. Slop Gate** | `python3 tools/slop_gate.py --ci` | 79 repository files (`web/`, `apps/`, `packages/`, `tools/`) | **PASS** (0 hard, 0 warn) | ~0.8s |
| **2. Invariants** | `python3 tools/invariants/run_all.py` | 9 normative invariants (I1–I9) from `ENGINEERING_PLAN_v2.md` §1.2 | **PASS** (9/9 passed) | ~4.0s |
| **3. Registry Audit** | `python3 tools/registry_audit.py --ci` | Pinned PyPI dependencies (`requirements.txt`, `pyproject.toml`) | **PASS** (6/6 exist, 0 missing) | ~3.1s |
| **4. Logic CI** | `python3 -m pytest -q tests/unit tests/security` | Headless unit & security contract tests | **PASS** (97/97 passed) | ~2.8s |
| **5. Frontend Build** | `npm --prefix web run build` | TypeScript typecheck (`tsc`) + Vite production bundle | **PASS** (CSS: 24.48 kB, JS: 250.12 kB) | ~5.6s |
| **Total Pipeline** | `bash tools/run_ci.sh` | End-to-end continuous verification suite | **PASS** | **26s** |

---

## 2. Verbatim CI Execution Transcript

The following stdout/stderr was produced by running `bash tools/run_ci.sh` on the active audit branch:

```text
=================================================================
 Bellmaker Continuous Verification & Anti-Slop CI Suite
 Host: flex | Date: 2026-09-19T19:41:29Z
=================================================================

[1/5] Running Slop Gate...
slop gate: 79 files, 0 hard, 0 warn

PASS
✔ Slop Gate PASS

[2/5] Running Normative Invariants (I1–I9)...
[PASS] I1 Colocation              (490.34ms)
[PASS] I2 Immutable Artifact      (398.63ms)
[PASS] I3 Registry Boundary       (139.05ms)
[PASS] I4 Dual Test               (418.64ms)
[PASS] I5 Certified Bind          (430.91ms)
[PASS] I6 Tool State Machine      (501.88ms)
[PASS] I7 Privacy Fail-Closed     (526.85ms)
[PASS] I8 Single GPU Policy       (624.75ms)
[PASS] I9 English-Only v1         (487.97ms)

Invariants: 9/9 passed in 4019.91ms
Verdict: PASS
✔ Invariants PASS (9/9 passed)

[3/5] Running Registry Audit (PyPI / npm existence)...
registry audit: 6 dependencies, 6 exist, 0 missing, 0 unreachable
PASS
✔ Registry Audit PASS

[4/5] Running Headless Logic & Security Pytest Suite...
........................................................................ [ 74%]
.........................                                                [100%]
=============================== warnings summary ===============================
../../../../.local/lib/python3.14/site-packages/fastapi/testclient.py:1
  /home/knamant/.local/lib/python3.14/site-packages/fastapi/testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient as TestClient  # noqa

apps/api/voice_api/main.py:62
  /home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/apps/api/voice_api/main.py:62: DeprecationWarning: 
          on_event is deprecated, use lifespan event handlers instead.
  
          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).
          
    @app.on_event("startup")

../../../../.local/lib/python3.14/site-packages/fastapi/applications.py:4598
  /home/knamant/.local/lib/python3.14/site-packages/fastapi/applications.py:4598: DeprecationWarning: 
          on_event is deprecated, use lifespan event handlers instead.
  
          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).
          
    return self.router.on_event(event_type)  # ty: ignore[deprecated]

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
97 passed, 3 warnings in 2.81s
✔ Logic CI PASS (97/97 passed)

[5/5] Verifying Web Console Frontend Build...

> smb-voice-agent-web@2.0.0 build
> tsc && vite build

vite v6.4.3 building for production...
transforming (1) src/main.tsx
transforming (5) src/index.css
transforming (8) node_modules/react/index.js
transforming (18) node_modules/scheduler/cjs/scheduler.production.js
transforming (24) src/components/linear/LinearAudioVisualizer.tsx
transforming (26) node_modules/lucide-react/dist/esm/icons/alarm-clock-check.js
transforming (799) node_modules/lucide-react/dist/esm/icons/folder-up.js
transforming (1033) node_modules/lucide-react/dist/esm/icons/message-circle-heart.js
transforming (1591) node_modules/lucide-react/dist/esm/shared/src/utils.js
✓ 1592 modules transformed.
rendering chunks (1)...
computing gzip size (0)...
computing gzip size (1)...
computing gzip size (2)...
computing gzip size (3)...
dist/index.html                   0.51 kB │ gzip:  0.33 kB
dist/assets/index-CS-q12Vp.css   24.48 kB │ gzip:  5.55 kB
dist/assets/index-Bk8VvIao.js   250.12 kB │ gzip: 73.83 kB
✓ built in 5.66s
✔ Frontend Build PASS (tsc + vite)

=================================================================
 CI Battery Finished in 26s
 Machine report written to: /home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop/audit-report.json
 CI Verdict: PASS
=================================================================
```

---

## 3. Normative Invariants Verification (I1–I9)

Per `ENGINEERING_PLAN_v2.md` §1.2, every invariant is implemented as an executable script in `tools/invariants/`:

1. **`i1_colocation.py` (Invariant I1 Colocation)**:
   - *Rule*: Media, STT, llama-server, TTS, worker on one host. No Tailscale hop between stages.
   - *Assertion*: Validates that `Settings` defaults in `local-private` bind `api_host` to `127.0.0.1`, `llama_base_url` to loopback (`127.0.0.1:8083`), and `livekit_url` to loopback (`127.0.0.1:7880`).
   - *Result*: **PASS** (490ms).

2. **`i2_immutable_artifact.py` (Invariant I2 Artifact)**:
   - *Rule*: Live sessions load immutable AgentVersion; checksum server-computed.
   - *Assertion*: Verifies canonical lexicographic JSON encoding, confirms client-supplied `checksum` fields are ignored during computation, and verifies mutations change checksums.
   - *Result*: **PASS** (398ms).

3. **`i3_registry_boundary.py` (Invariant I3 Registry)**:
   - *Rule*: STT/LLM/TTS behind interfaces; default local; cloud adapters cannot import into `local-private`.
   - *Assertion*: AST walk of `packages/` and `apps/api/` ensuring zero imports of `openai`, `anthropic`, `google.generativeai`, `sarvamai`, `cohere`, `mistralai`, or `groq`.
   - *Result*: **PASS** (139ms).

4. **`i4_dual_test.py` (Invariant I4 Dual Test)**:
   - *Rule*: Logic CI always; acoustic/GPU certify separate status.
   - *Assertion*: Asserts distinct `AgentStatus.CERTIFIED_LOGIC` and `AgentStatus.CERTIFIED_ACOUSTIC` enum values; validates segregation of `tests/unit/` and `tests/contract/`; asserts zero hardcoded `chomp:8083` dependencies in headless logic tests.
   - *Result*: **PASS** (418ms).

5. **`i5_certified_bind.py` (Invariant I5 Certified Bind)**:
   - *Rule*: Live load requires `status∈{certified-acoustic,live}` AND matching checksums. Logic-only cert ≠ live.
   - *Assertion*: Enforces that `validate_transition` rejects moves from `DRAFT -> LIVE` and `CERTIFIED_LOGIC -> LIVE`, permitting only `CERTIFIED_ACOUSTIC -> LIVE`.
   - *Result*: **PASS** (430ms).

6. **`i6_tool_state_machine.py` (Invariant I6 Tool State Machine)**:
   - *Rule*: Mutating tools: PROPOSED → CONFIRMED → COMMITTED only. Speech templates for bookings from tool results, never free-form model text.
   - *Assertion*: Runs end-to-end appointment lifecycle through `BookingStateMachine`; validates refusal of past bookings and non-existent services; asserts that verbal confirmation raises `RuntimeError` unless state is `COMMITTED` with valid confirmation code.
   - *Result*: **PASS** (501ms).

7. **`i7_privacy_fail_closed.py` (Invariant I7 Privacy Fail-Closed)**:
   - *Rule*: `local-private`: egress allowlist empty; enforced (network + config scan); map derived from runtime, not marketing JSON alone.
   - *Assertion*: Tests `scan_for_forbidden_providers` against clean configs (0 violations) and tainted env (catches injected keys); asserts `DeploymentPolicy.egress_allowed == False` and rejects cloud base URLs in `local-private`.
   - *Result*: **PASS** (526ms).

8. **`i8_single_gpu_policy.py` (Invariant I8 Single GPU Policy)**:
   - *Rule*: One concurrent call session; GPU lock between Whisper decode and llama decode.
   - *Assertion*: Verifies cooperative `GPULock` with `fcntl.flock`; asserts that a second consumer attempting lock acquisition raises `GPULockTimeoutError`.
   - *Result*: **PASS** (624ms).

9. **`i9_english_only.py` (Invariant I9 English-Only v1)**:
   - *Rule*: No distill-en path for Hinglish claims in v1.
   - *Assertion*: Validates that all starter kits (`HVAC`, `Plumbing`, `Electrician`, `Pest Control`) compile English voice prompts and contain no `distill-en` or Hinglish heuristic references.
   - *Result*: **PASS** (487ms).

---

## 4. Dependency Registry Audit

Run against official PyPI registry (`https://pypi.org/pypi/<pkg>/json`):
- `fastapi` == 0.136.1 (First published: 2018-12-08) -> **EXISTS** (Status 200)
- `faster-whisper` == 1.2.1 (First published: 2023-03-22) -> **EXISTS** (Status 200)
- `httpx` == 0.28.1 (First published: 2019-07-19) -> **EXISTS** (Status 200)
- `pydantic` == 2.13.4 (First published: 2017-05-03) -> **EXISTS** (Status 200)
- `sqlalchemy` == 2.0.52 (First published: 2006-02-14) -> **EXISTS** (Status 200)
- `uvicorn` == 0.47.0 (First published: 2017-06-05) -> **EXISTS** (Status 200)

**Result:** Zero missing dependencies, zero dependency-confusion vulnerabilities, zero phantom packages.

---

## 5. Machine-Readable Artifact: `audit-report.json`

Generated automatically at repo root upon CI completion:

```json
{
  "timestamp": "2026-09-19T19:41:55Z",
  "verdict": "PASS",
  "duration_seconds": 26,
  "host": "flex",
  "steps": {
    "slop_gate": true,
    "invariants": true,
    "registry_audit": true,
    "pytest_logic": true,
    "frontend_build": true
  },
  "failed_steps": []
}
```
