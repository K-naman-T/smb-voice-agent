# ARCHITECTURE — Voice-Agent Configurator (v2)

**Status:** v2.1 — implementation contract
**Source of truth:** [docs/ENGINEERING_PLAN_v2.md](ENGINEERING_PLAN_v2.md)
**Companions:** [PRODUCT_SPEC.md](PRODUCT_SPEC.md), [PRIVACY_MODEL.md](PRIVACY_MODEL.md)

## 1. System overview

Two planes on a single host (`chomp`):

```
CONTROL PLANE (operator UI)            CALL PLANE (live calls)
──────────────────────────            ────────────────────────
GUI (3090)                            LiveKit SFU (7880+)
API (8090) ──AuthZ──▶                 Session worker
  AgentVersion store                   VAD · STT · turn machine
  Compiler · Sim · Certify             LLM client → llama-server :8081
  Appointments · Calls                 TTS Piper (CPU)
  Privacy map (runtime-backed)         Tool state machine
```

## 2. Component map

| Component | Path | Role |
|-----------|------|------|
| API | `apps/api/` | FastAPI control plane; auth, tenancy, persistence, AgentVersion store, compiler, sim, sessions, appointments, audits |
| Worker | `apps/worker/` | LiveKit session worker; turn machine; local runtime; channels; tools; policy enforcement |
| Web | `apps/web/` | Operator configurator; test calls; certification; traces; operations views |
| agent_schema | `packages/agent_schema/` | Pydantic models, canonical JSON, SHA-256 checksum, lifecycle state machine |
| runtime_contracts | `packages/runtime_contracts/` | Provider/channel/tool/policy interfaces |
| booking | `packages/booking/` | Transactional booking state machine (PROPOSED→CONFIRMED→COMMITTED) and templates |
| eval | `packages/eval/` | Simulator, fixtures, scoring, certification |
| privacy | `packages/privacy/` | Egress policy, redaction, retention, consent |
| observability | `packages/observability/` | Events, spans, metrics |
| kits | `kits/` | Optional industry templates and fixtures (HVAC, dental, legal, restaurant) |
| deploy | `deploy/` | Compose, models, locks, privacy/network policy |
| scripts | `scripts/` | Build, model verification, warmup, profiling, smoke, export |

## 3. Data flow

### 3.1 Authoring

```
Operator → GUI → API /agents (POST draft)
  → API compiles brief → AgentVersion (checksummed, status=draft)
  → Operator edits via GUI → API /agents/{id}/versions (POST immutable)
  → Operator triggers /sim → packages/eval/ → result + score
  → If score ≥ threshold, /certify/logic → status=certified-logic
  → Operator triggers chomp-smoke → /certify/acoustic → status=certified-acoustic
  → Operator promote → status=live
```

### 3.2 Live call

```
Chrome → LiveKit → Worker session
  → Worker re-fetches AgentVersion by id via API (service auth)
  → API verifies checksum, model SHA, runtime lock (invariant I5)
  → Worker enters turn machine: INIT → READY → LISTENING ⇄ THINKING/SPEAKING
  → STT finals → intent router → either stream (no tools) or tools_complete
  → On tool completion, speech is rendered from tool result (never free-form model text)
  → Barge: stop TTS, cancel LLM, invalidate stale work (generation_id check)
  → History built from fully-played sentence watermarks only
  → Trace spans emitted on every turn (eou_ms, llm_ttft_ms, ttfa_ms, gpu_lock_wait_ms, etc.)
```

### 3.3 Booking

```
User final matches booking intent
  → Worker calls propose_booking via API
  → API validates: hours, service enum, E.164 phone, future window, timezone
  → API mints proposal_id, TTL=5min, bound to call_id + tenant + version
  → Worker speaks "shall I confirm?" (template)
  → User confirms (DTMF 1 or speech)
  → API confirm_booking → CONFIRMED
  → API commit_booking → INSERT with idempotency_key UNIQUE (call_id, phone, scheduled_time_utc, service)
  → Worker speaks "you're booked" (only from COMMITTED template)
  → Optional SMS via allowlisted template (operator-enabled)
```

## 4. Invariants (normative)

| ID | Invariant | Where enforced |
|----|-----------|----------------|
| I1 | Media, STT, llama-server, TTS, worker colocated on one host | compose, chomp-gpu.lock |
| I2 | Live sessions load immutable AgentVersion; checksum server-computed | `packages/agent_schema/checksum.py`, API persistence |
| I3 | STT/LLM/TTS behind interfaces; default local; cloud adapters cannot import into local-private | `packages/runtime_contracts/`, import guards |
| I4 | Logic CI always; acoustic/GPU certify separate status | cert levels in `agent_schema/lifecycle.py` |
| I5 | Live load requires certified-acoustic|/live + matching checksums + running model SHA | API `/sessions/create` |
| I6 | Mutating tools: PROPOSED → CONFIRMED → COMMITTED | `packages/booking/` |
| I7 | `local-private`: egress allowlist empty; fail-closed | `packages/privacy/forbidden_providers.py`, `runtime_contracts/deployment.py` |
| I8 | Single concurrent call session; GPU lock between Whisper and llama | `apps/worker/.../gpu_lock.py` |
| I9 | English-only v1 freeze; Hindi as independent profile | language profile registry |

## 5. Provider and channel boundary

Interfaces in `packages/runtime_contracts/`:

```
LLMProvider, STTProvider, TTSProvider, VoiceChannel,
TelephonyProvider, MessagingProvider, CalendarProvider,
KnowledgeProvider, TransferProvider
```

Local implementations (default in `local-private`):

```
LlamaCppProvider, FasterWhisperProvider, PiperProvider,
LiveKitChannel, LocalBookingProvider, LocalKnowledgeProvider
```

Optional (only in `local-plus-integrations`):

```
TwilioPstnAdapter, TwilioSmsAdapter, CalendarAdapter,
CRM/WebhookAdapter, CloudLlmAdapter, CloudSttAdapter, CloudTtsAdapter
```

Provider resolution comes from **deployment policy**, never agent text:

```
deployment_mode
egress_allowlist
enabled_adapters
language_profiles
channel_policy
```

## 6. Persistence

- Default: PostgreSQL via SQLAlchemy + Alembic migrations.
- SQLite is permitted only for isolated tests and dev fixtures.
- Tenant isolation is enforced at the repository layer: every query is scoped by `tenant_id = principal.tenant_id`.
- API keys are stored as SHA-256 hashes; only the prefix is shown to operators.
- AgentVersion records are immutable once published; edits create new versions.
- Booking proposals have a 5-minute TTL and are bound to call_id, tenant, and version.

## 7. Observability

Span fields (every turn):

```
call_id, turn_id, eou_ms, stt_ms, llm_ttft_ms, prompt_tokens,
completion_tokens, ctx_frac, tts_ttfb_ms, ttfa_ms, barge_stop_ms,
gpu_lock_wait_ms, gpu_temp_c, tool_ms[], generation_id,
agent_version, checksum
```

## 8. Deployment topology (chomp)

| Service | Port | Bind | Note |
|---------|------|------|------|
| API | 8090 | 127.0.0.1 (TS with key) | FastAPI |
| Web | 3090 | 127.0.0.1 (TS with key) | React |
| LiveKit | 7880, 7881, UDP 50000–50100 | 0.0.0.0 | SFU |
| llama-server | 8081 | 127.0.0.1 | OpenAI /v1 |
| coturn | 3478 | 127.0.0.1 | Mobile (if claimed) |
| Postgres | 5432 | loopback | dev only |

Forbidden ports: 3000 (getrole-web), 8000 (getrole-api), 8080 (other uvicorn), 4096 (OpenCode).

## 9. Lifecycle (AgentVersion)

```
draft → certified-logic → certified-acoustic → live
```

Transitions are one-way. Demotion is not allowed in v1. Promotion requires matching runtime evidence (model SHA, llama SHA, suite checksum) and the appropriate certify record.

## 10. References

- [docs/ENGINEERING_PLAN_v2.md](ENGINEERING_PLAN_v2.md)
- [docs/PRODUCT_SPEC.md](PRODUCT_SPEC.md)
- [docs/PRIVACY_MODEL.md](PRIVACY_MODEL.md)
