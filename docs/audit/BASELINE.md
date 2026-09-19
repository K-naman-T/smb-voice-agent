# Anti-Slop Audit: P0 Baseline Report

**Project:** Bellmaker (`smb-voice-agent` v0.2.0)  
**Date:** 2026-09-20T00:48:00+05:30  
**Auditor:** Antigravity (Independent Auditor lane)  
**Phase:** P0 — Freeze and Triage the Baseline  

---

## 1. Frozen Repository State

### Worktree 1: Control Console, API & Core Runtime (`audit-anti-slop`)
- **Path:** `/home/knamant/orca/workspaces/smb-voice-agent/audit-anti-slop`
- **Branch:** `audit/anti-slop`
- **Head Commit:** `c41e4beffe84552f5667bea3a61ff90afa34d942`
- **Commit Subject:** `feat(ui): eliminate slop, implement production Linear design system from DESIGN.md with studio audio visualizer`
- **Dirty State (untracked files seeded prior to audit start):**
  ```text
  ?? .cursor/
  ?? .slop.json
  ?? .slopignore
  ?? AGENTS.md
  ?? CLAUDE.md
  ?? DELIVERY-GATE.md
  ?? GEMINI.md
  ?? docs/AUDIT-PLAN.md
  ?? tools/
  ```

### Worktree 2: Landing Page & Specimen Sheet (`char`)
- **Path:** `/home/knamant/orca/workspaces/smb-voice-agent/char`
- **Branch:** `K-naman-T/char`
- **Head Commit:** `f8c2c2dd0682da8f88a01d95b1ed7f283871e3c7`
- **Commit Subject:** `checkpoint(audit-p0): freeze art pipeline, design refs and screenshot baseline before anti-slop audit`
- **Status:** Clean (`git status --short` returns 0 modified, 0 untracked).
- **Snapshot of 7 untracked paths (frozen into `f8c2c2d`):**
  1. `scripts/build_bell_lockups.py`
  2. `scripts/build_bell_marks.py`
  3. `scripts/build_gen_lockups.py`
  4. `scripts/dither_art_plates.py`
  5. `scripts/generate_bellmaker_logos.py`
  6. `docs/design/` (reference design spec files)
  7. `web/public/assets/art/` (131 generated art plate, dither, and lockup files)

---

## 2. Raw Gate Scan Summary

Both trees were scanned using `tools/slop_gate.py --json` with the initial configuration:
`{"disable": [], "exempt_globs": ["docs/archive/**"]}`.

| Metric | Worktree 1 (`audit-anti-slop`) | Worktree 2 (`char`) | Total Across Workspace |
|---|---|---|---|
| **Files Scanned** | 112 | 141 | 253 |
| **Tier A (HARD) Violations** | 12 | 71 | 83 |
| **Tier B (WARN) Defaults** | 94 | 118 | 212 |
| **Gate Verdict** | **FAIL** | **FAIL** | **FAIL** |

Raw JSON dumps are preserved on disk:
- `docs/audit/baseline_audit_tree.json` (Worktree 1)
- `docs/audit/baseline_char_tree.json` (Worktree 2)

### Worktree 1 Rule Breakdown
- **Hard (12):** H2 (1), H3 (4), H4 (5), H6 (2)
- **Warn (94):** D1 (19), D2 (45), D5 (5), D6 (12), D8 (6), D10 (7)

### Worktree 2 Rule Breakdown
- **Hard (71):** H2 (1), H3 (3), H4 (7), H5 (19), H6 (39), H7 (2)
- **Warn (118):** D1 (19), D2 (42), D5 (23), D6 (11), D7 (14), D8 (5), D10 (4)

---

## 3. Triage of Hard Findings in Worktree 1 (`audit-anti-slop`)

Every Tier A finding in the active development tree is triaged below with its classification, finding ID, and disposition.

| # | Rule | File & Line | Content Snippet | Triage Category | Finding ID | Planned Disposition |
|---|---|---|---|---|---|---|
| 1 | **H2** | `legacy/SPEC_v1.md:95` | `## TODO` <!-- slop-allow: H2 triage citation --> | True Positive (Legacy) | `AS-006` | Historical doc. Add explanatory note and banner per Owner Decision #1. |
| 2 | **H3** | `docs/AUDIT-PLAN.md:32` | `` `tests/contract/`), 3x H3 (`ACME HVAC` test fixtures) `` <!-- slop-allow: H3 triage citation --> | Doc Reference | `AS-011` | Self-referential quote in audit plan. Add inline `slop-allow: H3`. |
| 3 | **H3** | `tests/unit/test_agent_version.py:69` | `business_name="ACME HVAC"` <!-- slop-allow: H3 triage citation --> | Test Fixture | `AS-012` | Test fixture. Scope out `tests/**` via `.slop.json`. |
| 4 | **H3** | `tests/unit/test_agent_version.py:75` | `assert v.business_profile.business_name == "ACME HVAC"` <!-- slop-allow: H3 triage citation --> | Test Fixture | `AS-012` | Test assertion. Scope out `tests/**` via `.slop.json`. |
| 5 | **H3** | `tests/unit/test_voice_api.py:52` | `{"name": "Acme HVAC", "industry": "hvac"}` <!-- slop-allow: H3 triage citation --> | Test Fixture | `AS-012` | Test fixture. Scope out `tests/**` via `.slop.json`. |
| 6 | **H4** | `scripts/verify_p3_5_gpu_gate.py:98` | `api_key="change-me-high-entropy"` <!-- slop-allow: H4 triage citation --> | True Positive | `AS-003` | Replace with `os.environ.get("LLAMA_API_KEY", "")`. |
| 7 | **H4** | `scripts/vram-profile.sh:9` | `LLAMA_API_KEY="change-me-high-entropy"` <!-- slop-allow: H4 triage citation --> | True Positive | `AS-003` | Replace with `${LLAMA_API_KEY:-}` env reference. |
| 8 | **H4** | `scripts/vram-profile.sh:44` | `API_KEY = "change-me-high-entropy"` <!-- slop-allow: H4 triage citation --> | True Positive | `AS-003` | Replace with `os.environ.get("LLAMA_API_KEY", "")`. |
| 9 | **H4** | `tests/contract/test_llama_server.py:23` | `API_KEY = "change-me-high-entropy"` <!-- slop-allow: H4 triage citation --> | Test Fixture | `AS-013` | Test default. Scope out `tests/**` via `.slop.json`. |
| 10 | **H4** | `tests/contract/test_llama_server.py:33` | `api_key="invalid-key"` <!-- slop-allow: H4 triage citation --> | Test Fixture | `AS-013` | Deliberate 401 test. Scope out `tests/**` via `.slop.json`. |
| 11 | **H6** | `legacy/web_v1/index.html:7` | `<title>VoiceAgent — SMB AI Phone</title>` <!-- slop-allow: H6 triage citation --> | True Positive (Legacy) | `AS-006` | Replace em-dash with colon: `<title>VoiceAgent: SMB AI Phone</title>`. |
| 12 | **H6** | `web/index.html:7` | `<title>SMB Voice Agent — Control Console</title>` <!-- slop-allow: H6 triage citation --> | True Positive | `AS-004` | Rename and remove em-dash: `<title>Bellmaker: Control Console</title>`. |

---

## 4. Triage of Hard Findings in Worktree 2 (`char`)

Per engagement instructions: **Do not push, do not deploy, do not touch other worktrees, do not modify `../char`**. Findings in `../char` are logged for audit visibility and recorded in the claims ledger.

1. **H2 (1 instance):** `legacy/SPEC_v1.md:95` (`## TODO`). <!-- slop-allow: H2 triage citation -->
2. **H3 (3 instances):** `tests/unit/` (`ACME HVAC` test fixtures). <!-- slop-allow: H3 triage citation -->
3. **H4 (7 instances):** Hardcoded keys in `scripts/vram-profile.sh`, `scripts/verify_p3_5_gpu_gate.py`, and `tests/contract/`.
4. **H5 (19 instances):** Swallowed errors (`except ...: pass` or `catch {}`) in:
   - `packages/runtime_contracts/tts.py:101, 105`
   - `packages/runtime_contracts/sentence_aggregator.py:38`
   - `web/src/components/voice/SotaVoiceDemoPlayer.tsx:82`
   - `web/src/components/voice/InteractiveCallSimulator.tsx:64`
   - `web/src/components/AudioVisualizer.tsx:42, 61, 88, 110`
   - `web/src/components/HardwareVoiceDeck.tsx:120, 142`
5. **H6 (39 instances):** Shipped marketing copy in `web/src/components/LandingPage.tsx` dominated by em-dashes (`—`) in customer dialogue, phone scripts, and value propositions.
6. **H7 (2 instances):** Unannotated `# type: ignore` in `packages/runtime_contracts/tts.py:99, 103`.

---

## 5. Scope Adjustment via `.slop.json`

Per rule 3 of engagement:
> `.slop.json` may scope out `tests/**` and `docs/design/**` only. Nothing under `apps/`, `packages/` or `web/src/` gets an exemption.

Applying this exact constraint:
```json
{
  "disable": [],
  "exempt_globs": [
    "tests/**",
    "docs/design/**"
  ]
}
```

This scopes out test fixtures (findings #3, #4, #5, #9, #10) cleanly without disabling rules H3 or H4 for `apps/`, `packages/`, `scripts/`, or `web/`.
The remaining true positives (#1, #2, #6, #7, #8, #11, #12) must be addressed directly in the codebase.
