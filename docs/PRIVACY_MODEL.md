# PRIVACY_MODEL — Voice-Agent Configurator (v2)

**Status:** v2.1 — implementation contract
**Source of truth:** [docs/ENGINEERING_PLAN_v2.md](ENGINEERING_PLAN_v2.md) §2.17, invariant I7
**Companions:** [PRODUCT_SPEC.md](PRODUCT_SPEC.md), [ARCHITECTURE.md](ARCHITECTURE.md)

## 1. Promise

In `local-private` mode the product runs without contacting any third-party model, telephony, messaging, calendar, or storage provider. The egress allowlist is empty. The runtime fails closed: if a cloud endpoint is configured, the system refuses to start.

In `local-plus-integrations` mode the operator explicitly enables external adapters. Each adapter is tenant-scoped, audit-logged, and policy-validated. Adapters cannot mutate state without a committed local tool result.

## 2. Data flow & residency

| Data class | Where stored | Where it can go |
|------------|--------------|------------------|
| Call audio | LiveKit on chomp (loopback) | Caller's browser only |
| Transcripts | Postgres (chomp) | Never sent in `local-private` |
| Customer phone | Postgres (chomp), redacted in logs | Never sent in `local-private` |
| Agent config (AgentVersion) | Postgres (chomp) | Never sent in `local-private` |
| Model weights (GGUF) | chomp filesystem (`models/`, root:llama 0640) | Never downloaded at runtime in `local-private` |
| API keys | Postgres (SHA-256 hash) | Never logged in plaintext |
| Operator credentials | Postgres (bcrypt/argon2 hash) | Never logged |

In `local-plus-integrations`:

- Twilio audio/media: goes to Twilio (PSTN infrastructure), documented in `INTEGRATIONS.md`.
- Twilio SMS: tenant-owned, allowlisted templates only — no free-form model SMS.
- Calendar: provider sees booking summary only; never the full transcript.
- CRM/webhook: tenant-configured endpoints receive approved event types.

## 3. Enforcement

### 3.1 Configuration scan (I7)

`packages/privacy/forbidden_providers.py` provides `scan_for_forbidden_providers(config, env=...)` that detects:

- Cloud base URLs (OpenAI, Anthropic, Google, Azure, AWS, Cohere, Mistral, Groq, Replicate, Together, Ollama)
- Cloud API-key env vars (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `AZURE_OPENAI_API_KEY`, `AWS_*`, `COHERE_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `REPLICATE_API_TOKEN`, `TOGETHER_API_KEY`)
- Cloud model prefixes (e.g. `gpt-`, `claude-`, `gemini-`, `command-`, `mistral-`, Ollama model families)

### 3.2 Deployment policy (I3, I7)

`packages/runtime_contracts/deployment.py` provides `DeploymentPolicy`:

- `validate_base_url(url)` — raises `CloudProviderError` on cloud URL in `local-private`
- `validate_env_vars(env)` — raises on any cloud env var in `local-private`
- `validate_config(config)` — recursive scan; raises on any cloud artifact
- `egress_allowed` — always `False` in `local-private`

### 3.3 CI gates

- `forbidden-provider scan` runs on every PR and fails the build on any violation.
- IDOR A/B tests across tenants must pass.
- `local-private` startup asserts the egress allowlist is empty.

## 4. Privacy map (runtime-backed, not marketing)

The privacy map shown in the GUI is **derived at runtime** from:

- The deployment policy and adapter registry
- The actual egress probes run during smoke tests
- The network policy of the running compose stack

Marketing JSON alone cannot satisfy I7. The runtime must produce the evidence.

## 5. Consent & recording

- Recording requires `disclosure_completed` before `record_audio` is invoked.
- Disclosure text is part of the AgentVersion and cannot be edited by the model.
- The disclosure spans the call's beginning; barge-in is suppressed until the disclosure completes (compliance first), after which normal barge-in is allowed.
- Consent events are written to the `consent_events` table with a tamper-evident chain.

## 6. PII handling

- Phone numbers are redacted in logs by default (`***-***-1234`).
- Transcripts are redacted for phone, email, and card-like sequences in shared views.
- Retention is enforced by a scheduled job (`retention_days` per tenant).
- Operators can request hard delete of a call; deletion cascades to transcripts and audit events.

## 7. Network policy

In Compose, the worker and llama-server are on an internal network with no public egress. The API and web are exposed only on the loopback interface or via Tailscale with a key.

The llama-server binds to `127.0.0.1` only and requires `--api-key`. There is no public model download endpoint.

## 8. Auditing

- Every mutating tool call (booking, escalation, SMS send, calendar write) emits an audit event with actor, tenant, call_id, agent_version checksum, and result.
- API key usage is logged (without the key value).
- Live promotion emits a promotion event with operator, certify-record hash, and timestamp.

## 9. Failure modes

| Failure | Behavior |
|---------|----------|
| Cloud URL in `local-private` | Refuse to start; raise `CloudProviderError` |
| Cloud env var set in `local-private` | Refuse to start |
| Adapter not in `enabled_adapters` | Refuse to load at worker startup |
| Adapter tries to mutate state without a committed local tool | Refused; event logged |
| OOM during LLM decode | Circuit breaker; static Piper fallback speech; no data egress |
| Certify record missing for live load | Refused |
| Checksum mismatch on AgentVersion load | Refused |

## 10. References

- [docs/ENGINEERING_PLAN_v2.md](ENGINEERING_PLAN_v2.md) §2.17, invariant I7
- [packages/privacy/forbidden_providers.py](../packages/privacy/forbidden_providers.py)
- [packages/runtime_contracts/deployment.py](../packages/runtime_contracts/deployment.py)
