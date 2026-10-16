# Anti-Slop Audit Plan — Bellmaker (smb-voice-agent v0.2.0)

Status: prepared 2026-09-20 (IST). Scope of this document: the audit plan only.
It executes nothing. Each phase below is a gate with an artifact, not a time box.

## 0. What is being audited, and what is not

Audited surfaces:

| Surface | Path | Tree |
|---|---|---|
| Runtime + API + packages | `apps/`, `packages/`, `tests/`, `deploy/`, `scripts/` | flex `/home/knamant/smb-voice-agent` @ `c41e4be` (master, clean) |
| Console web app | `web/` | same tree |
| Landing page + art pipeline | `web/` in the `char` worktree | flex `/home/knamant/orca/workspaces/smb-voice-agent/char` @ `33852c7` (K-naman-T/char, 7 untracked paths) |
| Claims and copy | README, docs, console copy, landing copy | both trees |

Not in scope: re-planning the product. `docs/ENGINEERING_PLAN_v2.md` (v2.1),
`docs/PRODUCT_SPEC.md`, `DESIGN.md` and `docs/HUMAN_ACCEPTANCE_CHECKLIST.md`
already exist and are the standard. The audit's job is to check that the gates
those documents promise actually fire, and that nothing shipped contradicts them.

## 1. Baseline measured today (2026-09-19/20, flex, no changes made)

- `python3 -m pytest -q` -> **97 passed, 5 failed**; all 5 failures are
  `tests/contract/test_llama_server.py` (C1-C5) and require `llama-server` on
  chomp:8083. Host-blocked, not yet proven to be code failures.
- `npm run build` in `web/` -> **fails: `tsc: not found`** (no `node_modules`).
  The console build is unverified in this tree.
- Anti-slop gate (seeded scripts run read-only):
  - backend tree: **11 hard / 92 warn** over 118 files. Hard set: 5x H4
    (placeholder keys like `change-me-high-entropy` in `scripts/` and
    `tests/contract/`), 3x H3 (`ACME HVAC` test fixtures), 1x H2, 2x H6
    (`web/index.html` title).
  - `char` worktree: **71 hard / 118 warn** over 141 files. Hard set includes
    39x H6 (em dashes in shipped copy), 19x H5 (swallowed errors), 7x H4, 3x H3,
    2x H7, 1x H2.
  - Default-warnings are dominated by D2 (44x `transition-all`), D1 (19x
    gradient), D6 (12x glass/blur), D5 (Inter/Geist), D10 (7x `100vh`),
    D8 (6x `grid-cols-3`).
- Dependency audit: **cannot run for Python**. The only manifest in the tree is
  `web/package-lock.json`. `pyproject.toml` declares `pydantic` alone, while the
  code imports `fastapi`, `uvicorn`, `sqlalchemy`, `httpx`, `faster_whisper`.
- Host: **chomp is offline** (tailscale: last seen 2 days ago). Any gate needing
  GPU, `llama-server`, LiveKit or a real call is blocked until it returns.
- Naming drift: `web/index.html` says "SMB Voice Agent - Control Console"; the
  landing worktree already says Bellmaker. Rename is not wired through.
- Nothing is currently serving: `:8190` and `:8083` are both down.

## 2. Rules of engagement

1. **Evidence over assertion.** Every PASS carries an artifact: raw command
   output, a screenshot path, a recording, a trace. A PASS without an artifact is
   a FAIL.
2. **The auditor is not the builder.** The tree was written mainly by Command
   Code / OpenCode lanes. The audit runs on a different model family, fresh
   context. Same-weights review is theater.
3. **No rule is disabled.** A finding is disposed as fixed, argued in writing, or
   scoped out with a config exemption that names the reason. `.slop.json` may
   exempt `tests/**` and `docs/design/**` (fixtures and reference material);
   nothing in `apps/`, `packages/` or `web/src/` gets exempted.
4. **Tier A is absolute.** Tier B findings need a written reason naming what is
   specific to Bellmaker, or they get removed.
5. **Findings are tracked, not narrated.** ID `AS-###`, severity, evidence,
   disposition, re-verify artifact. Reopened findings keep their ID.

Severity: **Blocker** = breaks a phase exit · **High** = Tier A violation ·
**Medium** = Tier B default with no reason · **Low** = cosmetic.

## 3. Phases

### P0 — Freeze and triage the baseline (no code changes)

- Confirm commits and dirty state in both trees; snapshot the untracked set in
  `char` (7 paths incl. `scripts/build_*.py`, `docs/design/`, `web/public/assets/art/`).
- Take the gate output as a frozen artifact: `docs/audit/BASELINE.md` with raw
  JSON pasted, both trees.
- Triage every hard finding into: true positive / test fixture / doc reference.
  The test-fixture and doc classes get config scoping, not rule disabling.
- Exit: every hard finding has a disposition; zero undecided.
- Artifact: `docs/audit/BASELINE.md`.

### P1 — Does it actually run (Tier A7)

- `cd web && npm ci && npm run build` -> artifact: build log + `dist/` listing.
- `python3 -m pytest -q` on a clean env -> artifact: full summary line and the
  named list of host-blocked tests.
- Boot `apps/api` locally on flex with the LLM client stubbed (no chomp):
  `/health` 200, create a business, compile an agent version, hit the certify
  endpoint. A stub must return a structural response, never a fabricated PASS.
- Exit: build green, every failing test classified as code-defect or host-blocked
  with proof, API boots headless on flex.
- Artifact: `docs/audit/RUN-EVIDENCE.md` (raw outputs, timestamped).

### P2 — The call path (needs chomp online)

- Bring up `deploy/MODE=compose`: postgres, llama-server, api, worker, livekit,
  coturn. Artifact: `docker compose ps` output + `artifacts/chomp/<ts>/` bundle.
- Run `docs/HUMAN_ACCEPTANCE_CHECKLIST.md` Phase A-D as written, item by item,
  each with its own evidence line.
- Items the existing checklist does not cover, added by this audit:
  - TTFA: p50 **and** p95 over 10 scripted calls, not one call.
  - Barge-in: measured stop latency, not the word "instantly".
  - Barge-in hallucination check: the method for "history does not hallucinate"
    must be stated, then executed.
  - Privacy claim: verify with an egress trace that no PII leaves the host;
    `packages/privacy/forbidden_providers.py` passing is a unit test, not proof.
  - GPU lock: two concurrent calls, verify the second queues cleanly instead of
    degrading both (KNOWN_GAPS says `parallel=1` with cooperative queue).
  - Honest voice labelling: `docs/KNOWN_GAPS.md` admits Piper sounds robotic.
    Confirm no shipping copy claims natural or human-level voice.
- Exit: checklist complete with evidence; measured TTFA p95 meets the repo's own
  SLO in `ENGINEERING_PLAN_v2.md` §2.13; zero unexplained egress.
- Artifact: recordings + transcript JSON + latency table + trace excerpts.

### P3 — Claims and copy audit (the tier that kills trust fastest)

- Build a claims ledger: every number, uptime, rating, user count, logo,
  testimonial, compliance or performance statement across console, landing,
  README and docs -> source artifact or delete.
- Em-dash sweep in shipped copy: backend 2, landing 39. Fix or justify each.
- Placeholder identity sweep: no invented names, no fabricated logo wall, no
  fake testimonial (the gate's H3).
- Name sweep: Bellmaker vs "SMB Voice Agent" vs Vaani, case-insensitive, across
  `web/`, `deploy/`, `docs/`, `package.json`, `index.html`, systemd unit names and
  compose service names. Exit is 0 occurrences of retired names in shipped
  surfaces, verified in the rendered DOM and the page title, not just in grep.
- Exit: ledger complete, every remaining claim traceable to an artifact.
- Artifact: `docs/audit/CLAIMS-LEDGER.md`.

### P4 — Design audit (Tier B defaults + render proof)

- Re-render both surfaces fresh at 1440x900 and 390x844 (console and landing),
  plus per-section crops. Old screenshot sets (Sep 11-13, 36 files) are baseline
  only, not evidence of current state.
- Programmatic audits in the same pass: contrast ratios, font resolution, console
  and network errors. Zero failures to exit.
- Triage the 92 + 118 default-warnings: each is removed, or carries a written
  reason in `DESIGN.md` naming what is Bellmaker-specific.
- Coherence decision, then enforcement: the landing is a 1-bit specimen sheet,
  the console is Linear-dark. Decide the relationship (same identity motif, two
  registers) and write it in `DESIGN.md`; right now the two surfaces read as two
  products.
- Exit: fresh renders reviewed; identified defaults list empty of unexplained
  entries; contrast and font audits pass.
- Artifact: `docs/audit/DESIGN-EVIDENCE.md` + the new screenshot set.

### P5 — Make it stick (seed the rules)

- Seed `tools/slop_gate.py`, `tools/registry_audit.py`, `AGENTS.md`, `DESIGN.md`
  gate section, `DELIVERY-GATE.md`, `.slop.json` and the pre-commit hook into
  both trees.
- Add the missing **Python dependency manifest** (requirements or lock) so the
  registry audit can run at all; then run it and clear 404s.
- Convert the normative invariants in `ENGINEERING_PLAN_v2.md` §1.2 ("fail build
  if violated") into executable `tools/invariants/*.py`. Prose does not fail a
  build; a script does.
- Wire CI: gate + tests + registry audit on push. There is no CI in this repo.
- Exit: one script takes a fresh clone to install -> gate -> tests -> registry
  audit, and its pasted output is the artifact.
- Artifact: `docs/audit/CI-EVIDENCE.md`.

### P6 — Exposure readiness (only after P1-P5 hold)

- `legacy/` still carries the v1 stack: a `TwiMLResponse` import that does not
  exist and a placeholder `AIzaSy...` key in `legacy/setup_v1.sh`. Decide delete
  or keep-behind-a-historical-banner, then verify a repo-wide secret scan is
  clean.
- IP provenance check before any public release (portfolio-ip-audit).
- Landing goes public only after the claims ledger is clean and the console demo
  plays from a labelled recording.

## 4. What you see as the first user

This is the audit's own end-to-end experience, in order:

1. **The report.** One file, `docs/audit/REPORT.md`, opening with a five-line
   verdict: ship / fix-then-ship / not shippable, the blocking list, and the
   single number that matters. Below it: baseline counts, the finding table
   (`AS-### | severity | surface | disposition`), the claims ledger, and the
   pasted evidence blocks.
2. **The console, live.** `http://100.97.168.52:3190` on the tailnet (flex),
   where you click through Agent Studio and the call simulator yourself.
3. **The screenshots.** Console and landing, desktop and mobile, delivered in
   chat as images, not described in prose.
4. **One real recorded call** with its transcript and p50/p95 latency table,
   once chomp is back.
5. **The gate output**, pasted raw, so you can see exactly what passed and what
   did not.

Every phase stands alone: stop after P1 and you still have a running API and a
build log. Stop after P3 and you have a claims ledger you can hand to a customer.

## 5. Blockers that exist before the audit starts

| # | Blocker | Effect | Unblock |
|---|---|---|---|
| B1 | chomp offline (tailscale, last seen 2d) | P2 fully blocked; 5 contract tests unverifiable | power on + tailscale up on chomp |
| B2 | `web/node_modules` absent | console build unverified | `npm ci` on flex |
| B3 | no Python manifest/lock | registry audit impossible; installs unreproducible | declare deps, then lock |
| B4 | name drift (SMB Voice Agent vs Bellmaker) | shipped surface contradicts the product name | rename sweep, then verify in DOM |
| B5 | 7 untracked paths in `char` worktree, 36 stale screenshots | audit baseline is not a fixed commit | commit or discard before P0 freezes |

## 6. Open decisions for the owner

1. `legacy/`: delete, or keep as a labelled historical directory?
2. Console vs landing coherence: same identity motif in two registers, or keep
   two deliberately different languages? This changes P4's exit criteria.
3. Does the audit run as one pass to P6, or phase by phase with your review
   between phases? Phases are gated so either works; phase-by-phase keeps you in
   the loop on claims and design, which are the judgement calls.
