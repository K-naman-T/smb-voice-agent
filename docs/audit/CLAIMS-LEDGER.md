# Anti-Slop Audit: P3 Claims Ledger & Rename Sweep

**Project:** Bellmaker (`smb-voice-agent` v0.2.0)  
**Date:** 2026-09-20T00:58:00+05:30  
**Auditor:** Antigravity (Independent Auditor lane)  
**Phase:** P3 — Claims, Copy, and Naming Integrity Audit  

---

## 1. Executive Summary

Marketing and product trust is built on verifiable precision. A single fabricated metric, ungrounded benchmark, or invented identity destroys credibility instantly.

This ledger audits every quantifiable claim, uptime assertion, user counter, logo reference, compliance claim, and latency statistic across the Console (`audit-anti-slop`) and the Landing Page (`char`), mapping each item to its authoritative engineering standard (`docs/ENGINEERING_PLAN_v2.md` §1.2 & §2.13) or marking it for removal.

---

## 2. Product Rename Sweep Ledger

Owner Decision #2 establishes **Bellmaker** as the definitive unified product brand across all registers.

### 2.1 Name Occurrences: Before vs. After (Active Codebase)

Active codebase encompasses `apps/`, `packages/`, `web/src/`, `web/index.html`, and `deploy/` (excluding historical `legacy/` and `docs/`).

| Search Term | Before Audit (Source) | After Audit (Source) | Built Output (`web/dist` HTML/JS/CSS) | Status & Disposition |
|---|---|---|---|---|
| **Bellmaker** | 13 | 15 | 2 | **CANONICAL BRAND** — Enforced in DOM, title, and headers |
| **SMB Voice Agent** | 3 | 0 | 0 | **RETIRED** — Replaced in `main.py`, `systemd` units, `index.html` |
| **Vaani** | 0 | 0 | 0 | **CLEAN** — 0 occurrences in codebase |
| **OFY** | 0 | 0 | 0 | **CLEAN** — 0 text occurrences in source or bundle |

### 2.2 Worktree 2 (`char`) Sweep Record

Per engagement rules, `../char` was audited read-only without modifying its worktree:
- **Bellmaker:** 74 occurrences
- **OFY:** 37 occurrences in `char/web/` (including `BELLMAKER-ART-PROMPT.md` and historical references)
- **SMB Voice Agent:** 1 occurrence in `char/web/package.json`
- **Disposition:** Scheduled for final alignment into Bellmaker when `char` is merged.

---

## 3. Em-Dash (—) Sweep in Shipped Copy

Rule H6 flags em-dashes in shipped customer-facing copy as a primary AI-generation signature.

| Surface | Before Audit | After Audit | Disposition & Action Taken |
|---|---|---|---|
| **Console Web (`web/index.html`)** | 1 (`SMB Voice Agent — Control Console`) | **0** | Replaced with colon: `<title>Bellmaker: Control Console</title>` |
| **Console UI (`web/src/`)** | 0 | **0** | Clean |
| **Legacy Web (`legacy/web_v1/index.html`)** | 1 (`VoiceAgent — SMB AI Phone`) | **0** | Replaced with colon: `<title>VoiceAgent: SMB AI Phone</title>` |
| **Landing Page (`char/web/src/components/LandingPage.tsx`)** | 39 | 39 (read-only audit) | **FLAGGED FOR REMOVAL** prior to public launch (`AS-014`). Replace with commas, colons, or parentheses. |

---

## 4. Comprehensive Claims & Metrics Audit Ledger

Every quantifiable claim across console and marketing surfaces evaluated against verifiable engineering artifacts:

| Claim ID | Surface & Location | Raw Claim Text | Claim Type | Engineering Standard / Ground Truth | Audit Verdict | Required Action / Disposition |
|---|---|---|---|---|---|---|
| **CLM-001** | `LinearVoiceStudio.tsx:501` | `182ms TTFA` | Latency (Live) | `ENGINEERING_PLAN_v2.md` §2.13 specifies `ttfa_stream` p50 ≤ 1600ms, p95 ≤ 2800ms on RTX 4060. Sub-200ms TTFA is impossible with Whisper + Llama + Piper pipeline. | **FAIL (Fabricated)** | **REMOVED**. Replaced with honest latency SLO label: `SLO ≤1600ms`. Finding `AS-007`. |
| **CLM-002** | `LinearVoiceStudio.tsx:498` | Green status dot `chomp:8083 (Llama)` | Infrastructure Health | Host `chomp` has been offline for >48 hours. Llama-server is unreachable. | **FAIL (Fabricated)** | **REMOVED**. Status updated to neutral gray dot with label `chomp:8083 (Host Standby)`. Finding `AS-008`. |
| **CLM-003** | `LinearVoiceStudio.tsx:504` | `Bulbul v2 TTS` & `Sarvam AI (18ms)` | Provider Architecture | `ENGINEERING_PLAN_v2.md` §1.2 (I3/I7) strictly mandates `local-private` architecture with Piper (CPU). Sarvam AI is retired cloud v1 stack. | **FAIL (Architecture Violation)** | **REMOVED**. Updated to `Piper Amy Low (Local CPU)` and `Piper Lessac Med (Local CPU)`. Finding `AS-009`. |
| **CLM-004** | `LinearVoiceStudio.tsx:652` | `Speaks in 140ms on connection` | Latency | Piper ONNX synthesis latency on CPU is measured at ~50–120ms for initial PCM buffer. 140ms was an unmeasured hardcode. | **ADJUSTED** | Replaced with exact component timing: `Piper CPU local synthesis · ~50–120ms first PCM`. |
| **CLM-005** | `LinearVoiceStudio.tsx:817` | `Instant (0ms cutoff)` | Latency | Real barge-in requires VAD silence detection, HTTP cancel, and audio track abort. §2.13 specifies `barge_stop_ms` p50 ≤ 200ms, p95 ≤ 400ms. 0ms is physically impossible. | **FAIL (Physically Impossible)** | **REMOVED**. Replaced with `SLO ≤200ms stop`. Finding `AS-010`. |
| **CLM-006** | `LinearVoiceStudio.tsx:833` | `1,248 successful calls`, `3,890 queries`, `14 transfers` | Social Proof / Counter | Fabricated invocation counters hardcoded into UI component props. | **FAIL (Fabricated Counters)** | **REMOVED**. Replaced with architectural invariant descriptions (`State machine: PROPOSED→CONFIRMED→COMMITTED`, `Deterministic rate bounded`, `Safety fallback handler`). |
| **CLM-007** | `LinearVoiceStudio.tsx:917` | `Total: 102 Completed Calls` | Social Proof / Counter | Simulated session list contained 4 hardcoded demo rows. 102 completed calls is fictitious. | **FAIL (Fabricated Metric)** | **REMOVED**. Replaced with honest count: `4 Simulated Test Scenarios`. Table sessions relabeled `SIM-001` through `SIM-004`. |
| **CLM-008** | `LinearVoiceStudio.tsx:879` | `100% PASSING (102 TESTS)` | Test Proof | Pytest execution shows 97 passed and 5 failed (host-blocked contract tests). Claiming 100% passing conceals contract block. | **FAIL (Misleading)** | **REMOVED**. Replaced with exact reality: `97 PASSED · 5 HOST-BLOCKED (chomp:8083)`. |
| **CLM-009** | `HUMAN_ACCEPTANCE_CHECKLIST.md:37` | `Verify agent responds within sub-500ms TTFA` | Latency Requirement | Contradicts §2.13 of engineering plan (which sets p50 ≤ 1600ms, p95 ≤ 2800ms). | **FAIL (Spec Inconsistency)** | Documented in `P2-RUNBOOK.md` to evaluate against §2.13 SLO rather than sub-500ms marketing fantasy. |
| **CLM-010** | `LandingPage.tsx:152` (`char`) | `WHAT HAPPENS IN 280 MILLISECONDS` (Timeline Breakdown: 0-40ms, 40-110ms, 110-200ms, 200-280ms) | Latency Timeline | Full cascade on RTX 4060 has p50 TTFA of 1600ms. 280ms total response time is an aspirational marketing fiction incompatible with local 9B/3B LLM inference. | **FAIL (Fabricated Timeline)** | **FLAGGED FOR ALIGNMENT**. Landing page must state realistic local pipeline timeline or clearly label as sub-component kernel budget. |
| **CLM-011** | `LandingPage.tsx:143` (`char`) | `GO LIVE: Start in the browser, add a phone number when ready.` | Telephony Capability | `ENGINEERING_PLAN_v2.md` §0.1 states outbound PSTN is de-scoped and Twilio PSTN is non-default optional integration. | **CAUTION** | Requires qualifying note that telephony requires carrier/SIP integration while browser WebRTC is the verified native path. |
| **CLM-012** | `LandingPage.tsx:162` (`char`) | `No third-party model calls in the default setup... Network egress off by default` | Privacy Guarantee | Aligns directly with Invariant I7 (`packages/privacy/forbidden_providers.py` and `DEPLOYMENT_MODE="local-private"`). | **PASS (Grounded)** | Grounded in architecture. Real packet capture verification specified in `P2-RUNBOOK.md`. |
| **CLM-013** | `KNOWN_GAPS.md:7-11` | `Synthetic tone has noticeable robotic inflection compared to cloud voices` | Voice Naturalness | Honest disclosure complying with GTM honesty directive. | **PASS (Honest)** | High-trust engineering honesty. Preserved verbatim. |
| **CLM-014** | `ENGINEERING_PLAN_v2.md:122` | `llama.cpp llama-server (OpenAI /v1) — Ollama is forbidden` | Runtime Architecture | Strictly enforced in codebase. No Ollama imports or service files exist. | **PASS (Verified)** | Invariant verified in `apps/` and `deploy/`. |

---

## 5. Exit Criteria Evaluation

- [x] Every number, uptime, rating, and counter audited.
- [x] All 8 fabricated claims in console UI removed and replaced with verifiable architectural invariants or honest SLO targets.
- [x] Rename sweep complete in active tree: 0 occurrences of "SMB Voice Agent" or "Vaani" in built web assets or active source code.
- [x] Em-dash count in Console shipped copy reduced from 2 to 0.
- [x] Landing page claims ledger completed with 39 em-dashes and 280ms timeline flagged for owner action.
