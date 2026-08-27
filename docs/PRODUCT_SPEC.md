# PRODUCT_SPEC — Voice-Agent Configurator (v2)

**Status:** v2.1 — implementation contract
**Audience:** product, engineering, QA, agency operators
**Replaces:** legacy SPEC.md (historical only)
**Source of truth for engineering:** [docs/ENGINEERING_PLAN_v2.md](ENGINEERING_PLAN_v2.md)

## 1. What this is

A **local-private, agency-operated voice-agent configurator** for small and mid-sized businesses.

- Operators (agency staff) author, simulate, certify, and promote voice agents.
- End customers interact with a live agent through a browser (desktop Chrome primary).
- All inference happens on-host (`chomp`) via **llama.cpp `llama-server`**, **faster-whisper**, and **Piper**. No third-party model APIs in the default mode.
- Outbound dialing is compiled out. The product is **inbound-only** for v1.

## 2. Product modes

### 2.1 `local-private` (default)

- No cloud model, telephony, SMS, calendar, or external DB.
- Egress allowlist is empty. Network policy fails closed.
- Browser voice and local booking are fully functional.
- Twilio/Sarvam/Gemini/MiniMax code in the legacy tree is **historical** and must not be imported into v2.

### 2.2 `local-plus-integrations` (operator-enabled)

- Optional adapters for Twilio PSTN, Twilio SMS, calendar, CRM/webhook, and cloud STT/LLM/TTS.
- Each adapter is **audited, tenant-scoped, and policy-validated**.
- Optional cloud adapters translate external events into internal contracts — they cannot bypass booking or policy.

## 3. Personas

| Persona | What they do |
|---------|--------------|
| Agency operator | Owns tenants; creates/imports briefs; compiles drafts; runs sim; certifies; promotes; monitors live calls |
| Business owner (read-only) | Reviews transcripts, appointments, audit log; cannot edit agent behavior |
| End caller | Interacts with a live agent through the browser |

## 4. Core flows

### 4.1 Authoring

```
Brief (free text + structured fields)
  → Compiler
  → draft AgentVersion (immutable, checksummed)
  → Structured editor (services, hours, never_do, KB, voice, etc.)
  → Logic simulation (deterministic, temp=0, fixed seeds)
  → status: certified-logic
```

### 4.2 Acoustic certification

```
certified-logic
  → chomp-smoke (real GGUF, LiveKit browser call, English + Hindi if enabled)
  → status: certified-acoustic
```

### 4.3 Live promotion

```
certified-acoustic
  → Operator promote
  → status: live
```

Live sessions **re-fetch** AgentVersion by id with service credentials and verify checksum, model SHA, and runtime lock. Browser-supplied prompts and overrides are ignored.

### 4.4 Call lifecycle

```
Chrome → LiveKit → worker → faster-whisper → llama-server → Piper → LiveKit → Chrome
  · Intent router decides: stream speech (no tools) vs. tool completion (book/hours/transfer/kb)
  · Booking: PROPOSED → CONFIRMED → COMMITTED (only COMMITTED triggers "you're booked" speech)
  · Atomic barge-in: stop TTS, cancel LLM, invalidate stale work, rebuild history from fully-played sentence watermarks
```

## 5. Feature inventory (v1)

Required:

- Brief → AgentVersion compiler
- Rich editor: identity, services, hours, pricing, FAQs/KB, greeting, disclosure, languages, voice, escalation, booking, never_do, channels, SMS templates, privacy/retention
- Deterministic simulation
- Separate logic and acoustic certification with immutable evidence
- Browser voice (desktop Chrome over Tailscale to chomp)
- Local llama.cpp llama-server, faster-whisper, Piper, Silero VAD
- Booking state machine with idempotency, timezone handling, and stale-generation protection
- Calls, turn traces, transcripts, appointments, audits, runtime health, certification views
- Auth, roles, multi-tenant isolation, API keys, scoped access
- Docker Compose self-deployment with GPU/model verification, backups, health checks, privacy enforcement
- Optional PSTN/Twilio, SMS, calendar, CRM/webhook, cloud model adapters under strict integration boundary
- English + Hindi language and voice profiles, independently certified
- Export/import of portable agent deployment bundles

Industry kits are optional templates, not a release blocker.

## 6. Non-goals (v1)

- Outbound dialing / AMD / campaign manager
- Mobile WebRTC without TURN proven
- Multi-tenant production isolation on shared chomp
- Hybrid stream+tools as a certified path
- Bilingual simultaneous STT (English-only freeze at v1; Hindi as independent profile)
- 7B LLM + CUDA Whisper simultaneously
- Native S2S default

## 7. Success criteria

A release is "done" when:

1. Operator creates a tenant, compiles a draft from a brief, edits it, simulates it, certifies it (logic + acoustic), promotes it to `live`, places a browser call, books an appointment, and inspects the trace — all on chomp.
2. The same workflow works for a second tenant with strict cross-tenant isolation.
3. Privacy map shows no third-party model calls; egress allowlist is empty in `local-private`.
4. CI gates pass: forbidden-provider scan, IDOR A/B, auth middleware coverage, booking transition tests, model/tool JSON bake-off.
5. `KNOWN_GAPS.md` and `HUMAN_ACCEPTANCE_CHECKLIST.md` are complete and accurate.

## 8. Honesty commitments

- The badge does not say "fire your agency." It says "local inference, automated sim + on-box gates."
- Piper is acknowledged as robotic in `KNOWN_GAPS.md`.
- The product is not multi-tenant production on a shared laptop. It is a single-trust-domain dev host.
- Outbound is compiled out. Period.

## 9. References

- Engineering plan: [docs/ENGINEERING_PLAN_v2.md](ENGINEERING_PLAN_v2.md)
- Architecture: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Privacy model: [docs/PRIVACY_MODEL.md](PRIVACY_MODEL.md)
