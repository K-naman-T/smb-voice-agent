# legacy/ — v1 prototype (historical)

These files describe the **v1 prototype** of the SMB Voice Agent
(Twilio + Sarvam + Gemini + MiniMax). They are kept for historical reference
only and **must not be imported by the v2 source tree** under `apps/`,
`packages/`, `deploy/`, `scripts/`, `tests/`, or `docs/`.

The v2 product contract lives at `../docs/PRODUCT_SPEC.md`. The v2 engineering
plan lives at `../docs/ENGINEERING_PLAN_v2.md`. The v2 import boundary is
enforced by `../scripts/check_no_legacy_imports.sh`.

## Layout

- `api_main.py` — Twilio webhook + FastAPI dashboard from v1.
- `industry_kit_abc.py` — abstract `IndustryKit` base class.
- `voice_pipeline.py` — v1 STT/LLM/TTS pipeline (Sarvam / Gemini / MiniMax).
- `api_requirements.txt` — v1 Python dependencies (twilio, etc.).
- `setup_v1.sh` — v1 launch script (ngrok, port 8000, Twilio env).
- `web_v1/` — v1 React 19 dashboard (port 5173, axios → `http://localhost:8000`).
- `README_v1.md`, `SPEC_v1.md` — v1 marketing/spec docs.

## What is NOT in legacy/

- `api/kits/` (industry kit subclasses) — the v1 `kits/` package was removed at
  commit `fa98505`. The abstract base class lives here for reference; the
  concrete HVAC/plumbing/pest/cleaning kits from the v1 Phase 2 commit
  (`44607a5`) were never ported to v2 and are not preserved in this tree.
