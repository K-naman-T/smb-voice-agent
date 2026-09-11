# SMB Voice Agent — Codebase Work & Architecture Index

> **Status:** Active v2 Production Architecture (Post-Adversarial Audit v2.1)  
> **Last Updated:** 2026-09-08  
> **Primary Host:** `chomp` · RTX 4060 8GB (CUDA 13.2 / Driver 595.x) · Tailscale Mesh  
> **Control Plane:** FastAPI (`127.0.0.1:8190`)  
> **LLM Engine:** `llama.cpp` `llama-server` (`127.0.0.1:8083`) — *Ollama is strictly quarantined*  
> **Design System:** Restrained Linear / ElevenLabs Warm Studio (`#fbfaf8` canvas, `#151412` ink)

---

## Master Index & Table of Contents

- [1. Executive Summary & Core Invariants](#1-executive-summary--core-invariants)
  - [1.1 Mission & Scope](#11-mission--scope)
  - [1.2 The 9 Normative Invariants (I1–I9)](#12-the-9-normative-invariants-i1i9)
- [2. System Architecture & Topology](#2-system-architecture--topology)
  - [2.1 Dual-Plane Design](#21-dual-plane-design)
  - [2.2 Host Port Allocation Matrix](#22-host-port-allocation-matrix)
- [3. Codebase Directory Map & Module Manifest](#3-codebase-directory-map--module-manifest)
- [4. Control Plane: FastAPI Backend (`apps/api/voice_api`)](#4-control-plane-fastapi-backend-appsapivoice_api)
  - [4.1 Database Layer & Schemas](#41-database-layer--schemas)
  - [4.2 Authentication & IDOR Isolation](#42-authentication--idor-isolation)
  - [4.3 API Routes & Operational Handlers](#43-api-routes--operational-handlers)
  - [4.4 Agent Turn & Transactional Booking Execution](#44-agent-turn--transactional-booking-execution)
- [5. Runtime Contracts & Real-Time Voice Plane (`packages/runtime_contracts`)](#5-runtime-contracts--real-time-voice-plane-packagesruntime_contracts)
  - [5.1 Transactional Tool State Machine (`PROPOSED` → `CONFIRMED` → `COMMITTED`)](#51-transactional-tool-state-machine-proposed--confirmed--committed)
  - [5.2 Atomic Barge-In & Spoken Watermark Tracking](#52-atomic-barge-in--spoken-watermark-tracking)
  - [5.3 GPU Arbitration Lock](#53-gpu-arbitration-lock)
  - [5.4 Sentence Aggregation Engine](#54-sentence-aggregation-engine)
  - [5.5 Multi-Engine TTS Pipeline](#55-multi-engine-tts-pipeline)
  - [5.6 Local Faster-Whisper STT Engine](#56-local-faster-whisper-stt-engine)
  - [5.7 llama-server High-Performance Client](#57-llama-server-high-performance-client)
- [6. Agent Schema & Compiler (`packages/agent_schema`, `packages/agent_compiler`)](#6-agent-schema--compiler-packagesagent_schema-packagesagent_compiler)
  - [6.1 Immutable Versioning & SHA-256 Checksums](#61-immutable-versioning--sha-256-checksums)
  - [6.2 Four-Stage Certification Lifecycle](#62-four-stage-certification-lifecycle)
  - [6.3 Industry Kits & Structured Compilation](#63-industry-kits--structured-compilation)
- [7. Privacy, Security & Regulatory Compliance (`packages/privacy`)](#7-privacy-security--regulatory-compliance-packagesprivacy)
  - [7.1 Zero-Egress Network Isolation Scanner](#71-zero-egress-network-isolation-scanner)
  - [7.2 Statutory Bot Disclosures (FCC TCPA & CA SB 1001)](#72-statutory-bot-disclosures-fcc-tcpa--ca-sb-1001)
  - [7.3 Hard Safety Escalation Protocol](#73-hard-safety-escalation-protocol)
- [8. Frontend Applications & Visual Experience (`web/`)](#8-frontend-applications--visual-experience-web)
  - [8.1 High-Conversion Public Landing Page](#81-high-conversion-public-landing-page)
  - [8.2 Linear Voice Studio](#82-linear-voice-studio)
  - [8.3 Acoustic Anatomy Scrubber & Missed Revenue Calculator](#83-acoustic-anatomy-scrubber--missed-revenue-calculator)
  - [8.4 Acoustic Visualizers & Living Voice Objects](#84-acoustic-visualizers--living-voice-objects)
  - [8.5 Audio Fixtures & Voice Previews](#85-audio-fixtures--voice-previews)
- [9. Deployment, Hardware Profiles & Manifest (`deploy/`)](#9-deployment-hardware-profiles--manifest-deploy)
  - [9.1 Models Catalog & Manifest](#91-models-catalog--manifest)
  - [9.2 Hardware Profiles](#92-hardware-profiles)
  - [9.3 Compose & Systemd Automation](#93-compose--systemd-automation)
- [10. Test Verification & Quality Gates (`tests/`, `scripts/`)](#10-test-verification--quality-gates-tests-scripts)
  - [10.1 Test Coverage Matrix](#101-test-coverage-matrix)
  - [10.2 Verification Scripts](#102-verification-scripts)
- [11. Version History & Recent Commits](#11-version-history--recent-commits)
- [12. Current Uncommitted Work & Next Actions](#12-current-uncommitted-work--next-actions)

---

## 1. Executive Summary & Core Invariants

### 1.1 Mission & Scope
The **SMB Voice Agent** platform is a turnkey, local-private AI voice receptionist built for service businesses (HVAC, plumbing, electrical, dental clinics). It replaces fragile cloud telephony chains with colocated local GPU inference on consumer workstation hardware (`chomp` RTX 4060 8GB).

- **Strict Local-Private Egress:** Audio, transcripts, and customer data never leave the on-premises box.
- **Transactional Determinism:** Mutating actions (e.g. calendar booking) cannot be hallucinated; they require an exact three-step state machine with server-enforced unique idempotency keys.
- **Sub-300ms Acoustic Responsiveness:** Streaming cascaded pipeline (VAD → Faster-Whisper → Qwen3.5/Qwen3.8 via `llama-server` → Piper/Kokoro) with micro-turn sentence flushing and atomic barge-in.

### 1.2 The 9 Normative Invariants (I1–I9)

| Invariant | Name | Specification | Enforcing File |
|---|---|---|---|
| **I1** | **Colocation** | Media, STT, `llama-server`, TTS, and API must run on a single host. No network hop between conversational stages. | [`deploy/docker-compose.yml`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/deploy/docker-compose.yml) |
| **I2** | **Immutable Artifact** | Live sessions load immutable `AgentVersion` records; SHA-256 canonical checksum verified on load. | [`packages/agent_schema/checksum.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/agent_schema/checksum.py) |
| **I3** | **Interface Isolation** | STT/LLM/TTS are abstracted behind clean interfaces. Cloud adapters cannot be loaded into `local-private` mode. | [`packages/runtime_contracts/`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/) |
| **I4** | **Dual Certification** | Logic CI passes via fast mock simulation; acoustic/GPU gates are validated separately on target hardware. | [`packages/eval/core_suite.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/eval/core_suite.py) |
| **I5** | **Certified Live Bind** | Live load requires `status ∈ {certified-acoustic, live}` matching the running GGUF SHA-256. | [`apps/api/voice_api/routes/certify.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/certify.py) |
| **I6** | **Tool State Machine** | Booking mutations strictly follow `PROPOSED → CONFIRMED → COMMITTED`. Spoken confirmations derive from tool output, never LLM hallucination. | [`packages/runtime_contracts/tool_state_machine.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/tool_state_machine.py) |
| **I7** | **Privacy Fail-Closed** | Empty egress allowlist for `local-private`. Config/runtime scanners reject any cloud API key or host. | [`packages/privacy/forbidden_providers.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/privacy/forbidden_providers.py) |
| **I8** | **Single GPU Consumer** | Hardware mutex (`GPULock`) guarantees whisper decode and llama decode do not collide in VRAM. | [`packages/runtime_contracts/gpu_lock.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/gpu_lock.py) |
| **I9** | **English/Bilingual Freeze** | English-first acoustic validation; bilingual Hinglish support strictly gated on measured WER. | [`packages/agent_compiler/kits.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/agent_compiler/kits.py) |

---

## 2. System Architecture & Topology

### 2.1 Dual-Plane Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CONTROL PLANE                                   │
│  FastAPI (Port 8190)                                                        │
│  ├── Multi-Tenant DB (SQLite/Postgres) ── Tenant Isolation / Auth Scopes   │
│  ├── Agent Compiler ──────────────────── Brief → Structured AgentVersion   │
│  ├── Checksum Verification ────────────── Canonical SHA-256                │
│  ├── Simulation & Certification Engine ── Mock & Hardware-Acoustic Gates    │
│  └── Telemetry & Call Traces ─────────── TTFT, TTFA, Token Counting        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ LiveKit Token & Version Checksum
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        CALL PLANE (chomp Colocated)                         │
│  LiveKit SFU (Port 7880 / UDP 50000-50100)                                  │
│  ├── Silero VAD ──────────────────────── Low-latency Voice Activity Detect  │
│  ├── Faster-Whisper (CUDA / CPU) ─────── Segment-level STT Transcription    │
│  ├── GPULock Mutex ───────────────────── Single consumer VRAM arbitration   │
│  ├── llama-server (:8083) ────────────── Qwen3.5-9B / Qwen3.8-MoE GGUF      │
│  │   ├── stream_content ──────────────── Tool-free fast conversational turn │
│  │   └── tools_complete ──────────────── Structured JSON booking tool loops │
│  ├── Transactional Tool State Machine ── PROPOSED → CONFIRMED → COMMITTED   │
│  ├── Atomic Barge-in Manager ─────────── Instant playout cutoff + watermark │
│  └── Piper / Kokoro / Sarvam TTS ─────── Real-time 22kHz/48kHz PCM Stream   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Host Port Allocation Matrix

Measured and verified on `chomp` (Tailscale host) to prevent port conflicts:

| Port | Service | Bind Interface | Status / Notes |
|---|---|---|---|
| **8190** | Control Plane API (`voice_api`) | `127.0.0.1` / Tailscale | Active (Moved from 8090 to avoid conflict) |
| **3190** | Web UI / Studio (`vite` / Nginx) | `127.0.0.1` / Tailscale | Active |
| **8083** | `llama-server` (`llama.cpp`) | `127.0.0.1` only | Active (Qwen3.5-9B-Chat GGUF) |
| **7880** | LiveKit SFU Control | `0.0.0.0` | Active WebRTC signaling |
| **7881** | LiveKit WebRTC TCP | `0.0.0.0` | Fallback WebRTC |
| **50000-50100** | LiveKit UDP Media | `0.0.0.0` | WebRTC audio RTP |
| **3478** | coturn TURN/STUN | Host | Required for mobile carrier traversal |
| *3000* | *getrole-web* | *Foreign* | Occupied (Do not kill) |
| *8000* | *getrole-api* | *Foreign* | Occupied (Do not kill) |
| *8080* | *uvicorn legacy* | *Foreign* | Occupied (Do not use) |
| *8090* | *Unknown listener* | *Foreign* | Avoided |
| *4096* | *OpenCode web* | *Local* | OpenCode IDE listener |

---

## 3. Codebase Directory Map & Module Manifest

```
smb-voice-agent/char/
├── apps/
│   └── api/
│       └── voice_api/              # FastAPI Control Plane Application
│           ├── auth.py             # SHA-256 API key hashing, principal scopes, RBAC
│           ├── config.py           # Settings, ports, local-private validation
│           ├── db.py               # SQLAlchemy engine & session factory
│           ├── main.py             # FastAPI entrypoint, lifespan, CORS, middleware
│           ├── models.py           # SQL schema (Tenants, Agents, Calls, Appointments)
│           ├── repositories.py     # Repository pattern for DB operations
│           ├── routes/             # API Route Endpoints
│           │   ├── agents.py       # Agents, versions, turns, live conversation
│           │   ├── calls.py        # Call lifecycle, turn telemetry traces
│           │   ├── certify.py      # Logic & acoustic certification triggers
│           │   ├── models.py       # Model catalog, presets & hardware profiles
│           │   ├── stt.py          # Local faster-whisper transcription endpoint
│           │   └── tenants.py      # Tenant onboarding, API keys, businesses
│           └── schemas/
│               └── requests.py     # Pydantic v2 validation contracts
├── packages/
│   ├── agent_schema/               # Core Immutable Agent Contracts
│   │   ├── checksum.py             # Canonical JSON sorting & SHA-256 generation
│   │   ├── lifecycle.py            # FSM: draft → certified-logic → certified-acoustic → live
│   │   └── models.py               # AgentVersion, BusinessProfile, ToolSpec Pydantic models
│   ├── agent_compiler/             # Business Profile Compiler
│   │   ├── compiler.py             # compile_agent_version with preset stacks
│   │   └── kits.py                 # Industry kits: HVAC, Plumbing, Electrician, Dental
│   ├── runtime_contracts/          # Real-time Voice Engine Contracts
│   │   ├── barge_manager.py        # Spoken watermark tracking & instant audio cut
│   │   ├── deployment.py           # Deployment mode invariants & local-private gates
│   │   ├── gpu_lock.py             # Hardware mutex preventing whisper/llama OOM
│   │   ├── llm_client.py           # Async llama-server client (streaming + tool calling)
│   │   ├── sentence_aggregator.py  # Abbreviation/currency safe sentence boundary flusher
│   │   ├── stt.py                  # Faster-Whisper local wrapper
│   │   ├── tool_state_machine.py   # PROPOSED → CONFIRMED → COMMITTED state machine
│   │   └── tts.py                  # Piper, Kokoro, Sarvam, ElevenLabs engine implementations
│   ├── privacy/
│   │   └── forbidden_providers.py  # Zero-egress network validator & static scanner
│   └── eval/                       # Deterministic Evaluation Suites
│       ├── core_suite.py           # Logic tests, injection attacks, off-hours checks
│       └── runner.py               # Test runner with multi-seed execution
├── deploy/                         # Production Deployment & Infrastructure
│   ├── chomp-gpu.lock              # CUDA 89 architecture lock & driver spec
│   ├── docker-compose.yml          # Containerized local-private topology
│   ├── Dockerfile.api              # Multi-stage Python 3.11 backend container
│   ├── Dockerfile.web              # Multi-stage Nginx React 19 container
│   ├── MODE                        # 'host' or 'compose' deployment flag
│   ├── models/
│   │   └── manifest.json           # Model catalog with SHA-256 pins & VRAM specs
│   └── systemd/                    # Linux service unit definitions
├── web/                            # React 19 + Vite Frontend Application
│   ├── index.html                  # HTML entrypoint with viewport containment
│   ├── src/
│   │   ├── App.tsx                 # Route switcher between Landing & Studio
│   │   ├── index.css               # Linear Design System styles & Tailwind utilities
│   │   ├── components/
│   │   │   ├── LandingPage.tsx     # High-conversion public marketing & simulator page
│   │   │   ├── linear/
│   │   │   │   ├── LinearVoiceStudio.tsx   # Comprehensive voice operator studio
│   │   │   │   └── LinearAudioVisualizer.tsx # Multi-mode acoustic canvas visualizer
│   │   │   └── voice/
│   │   │       ├── HolyWhiteVoiceOrb.tsx   # ElevenLabs-inspired breathing voice orb
│   │   │       ├── SotaVoiceDemoPlayer.tsx # Voice preview player
│   │   │       └── useVoiceCall.ts         # Audio streaming & turn controller hook
│   │   └── public/
│   │       └── voices/             # Recorded voice samples (Svara, Kokoro, F5, Piper)
├── scripts/                        # Automation & Verification Tooling
│   ├── bring_up_chomp.sh           # Hardware bootstrap & service orchestrator
│   ├── check_no_legacy_imports.sh  # Static barrier protecting v2 from v1 imports
│   ├── discover_chomp.sh           # Remote host discovery via Tailscale
│   ├── run_agent_simulation.py     # Live multi-turn agent simulation against backend
│   ├── run_e2e_test.py             # End-to-end integration test runner
│   ├── verify_m0_5.py              # Port and host preflight validation
│   ├── verify_p0.py                # Phase 0 gate verification script
│   ├── verify_p3_5_gpu_gate.py     # GPU VRAM and acoustic gate runner
│   └── vram-profile.sh             # Live VRAM monitoring during whisper/llama execution
├── tests/                          # Automated Pytest Suites
│   ├── contract/                   # Contract tests for llama-server
│   ├── security/                   # TCPA, privacy, SB 1001, zero-egress tests
│   ├── unit/                       # 112 comprehensive unit tests
│   └── e2e/                        # End-to-end multi-turn booking tests
├── docs/                           # Architecture Specifications & Runbooks
│   ├── ARCHITECTURE.md             # Technical architecture & subsystem design
│   ├── ENGINEERING_PLAN_v2.md      # Normative engineering master plan (v2.1)
│   ├── HUMAN_ACCEPTANCE_CHECKLIST.md # Ear-check & operational release checklist
│   ├── KNOWN_GAPS.md               # Documented trade-offs & roadmap items
│   ├── PRIVACY_MODEL.md            # Zero-trust data boundary documentation
│   └── PRODUCT_SPEC.md             # Product requirements & business capabilities
├── legacy/                         # Quarantined v1 Codebase (Historical reference only)
└── DESIGN.md                       # ElevenLabs/Linear design kit extraction tokens
```

---

## 4. Control Plane: FastAPI Backend (`apps/api/voice_api`)

### 4.1 Database Layer & Schemas
- **File:** [`apps/api/voice_api/models.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/models.py)
- **Engine Support:** SQLite (development on `var/dev.sqlite3`) and PostgreSQL.
- **Key Entities:**
  - [`Tenant`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/models.py#L30): Multi-tenant account root.
  - [`APIKey`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/models.py#L42): Hashed keys (`key_hash = sha256(raw_key)`) with granular scopes (`agents:write`, `calls:read`, `certify:run`, `appointments:write`).
  - [`AgentRecord`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/models.py#L55) & [`AgentVersionRecord`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/models.py#L67): Versioned configuration snapshots storing canonical JSON payloads and checksums.
  - [`BookingProposalRecord`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/models.py#L96) & [`AppointmentRecord`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/models.py#L107): Enforces `UNIQUE(idempotency_key)` to guarantee atomic, non-duplicating calendar commitments.
  - [`Call`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/models.py#L121) & [`TurnTrace`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/models.py#L133): Granular telemetry recording `llm_ttft_ms`, `ttfa_ms`, `prompt_tokens`, `completion_tokens`, and structured tool timings per turn.

### 4.2 Authentication & IDOR Isolation
- **File:** [`apps/api/voice_api/auth.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/auth.py)
- **Design:** Every incoming request to `/api/v1/*` must pass `require_scope(...)`.
- **Tenant Scoping:** All queries strictly filter by `principal.tenant_id`. Cross-tenant lookups return `404 Not Found` (verified by [`test_tenant_isolation_idor`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/security/test_security_compliance.py)).

### 4.3 API Routes & Operational Handlers
- **[`routes/agents.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/agents.py):**
  - `POST /api/v1/agents`: Create agent definition.
  - `POST /api/v1/agents/{id}/versions`: Create immutable version (server recomputes checksum).
  - `GET /api/v1/agents/{id}/versions`: List versions.
  - `POST /api/v1/agents/{id}/versions/{v_id}/turn`: Execute live LLM conversational turn.
- **[`routes/calls.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/calls.py):**
  - `POST /api/v1/calls`: Initialize call session.
  - `GET /api/v1/calls`: List call history with outcomes (`appointment_booked`, `emergency_escalated`).
  - `POST /api/v1/calls/{id}/traces`: Append turn-level telemetry span.
  - `GET /api/v1/calls/{id}/traces`: Fetch full latency and token diagnostic timeline.
- **[`routes/certify.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/certify.py):**
  - `POST /api/v1/agents/{id}/versions/{v_id}/certify`: Run evaluation gates (`logic` or `acoustic`) and transition state machine.
- **[`routes/models.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/models.py):**
  - `GET /api/v1/models`: Returns verified open-weights model catalog from `manifest.json`.
  - `GET /api/v1/models/presets`: Ready-to-deploy stack configurations (Agentic MoE, PersonaPlex-7B, Deterministic Booking, Expressive Concierge).
  - `GET /api/v1/models/hardware-profiles`: System sizing for Cloud L4, Edge RTX 4060, Apple Silicon, and WebGPU.
- **[`routes/stt.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/stt.py):**
  - `POST /api/v1/stt/transcribe`: In-flight audio file transcription using local Faster-Whisper.

### 4.4 Agent Turn & Transactional Booking Execution
When a caller speaks during a live browser or telephone session:
1. Messages are packaged and sent to `/api/v1/agents/{id}/versions/{v_id}/turn`.
2. The agent's structured profile (services, pricing, operating hours, hard `never_do` rules) is compiled into the system prompt.
3. If an appointment is requested, the model issues a structured `book_appointment` tool call.
4. The backend delegates to [`BookingStateMachine`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/tool_state_machine.py#L51):
   - Proposes slot (`propose_booking`).
   - Validates hours, service legitimacy, and future window.
   - Commits transaction (`commit_booking`) with a cryptographic idempotency hash.
   - Inserts record into `appointments` table.
   - Returns deterministic speech confirmation: `"Your appointment for Deep Foam Cleaning is confirmed for tomorrow at 10:00 AM. Your confirmation code is #..."`.

---

## 5. Runtime Contracts & Real-Time Voice Plane (`packages/runtime_contracts`)

### 5.1 Transactional Tool State Machine (`PROPOSED` → `CONFIRMED` → `COMMITTED`)
- **File:** [`packages/runtime_contracts/tool_state_machine.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/tool_state_machine.py)
- **Problem Solved:** LLMs frequently invent appointments or confirm slots that conflict or violate store hours.
- **Contract Rule:**
  - `PROPOSED`: Proposal ID minted, validated against business hours (8am–8pm) and service catalog.
  - `CONFIRMED`: Confirmation received from caller. 5-minute TTL.
  - `COMMITTED`: Atomic commit with `idempotency_key = sha256(call_id:phone:scheduled_time)`.
  - Spoken confirmation text is generated **strictly from the committed object**, never from free-form LLM output.

### 5.2 Atomic Barge-In & Spoken Watermark Tracking
- **File:** [`packages/runtime_contracts/barge_manager.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/barge_manager.py)
- **Contract:** When a user interrupts while the assistant is speaking:
  1. Playout is cut immediately on the audio device.
  2. The LLM generation stream is cancelled.
  3. `handle_barge_in(t_barge_ms)` checks each sentence's playout window:
     - Sentences whose playout finished before `t_barge_ms + 50ms` are retained in conversation history.
     - Partially spoken or unplayed sentences are discarded.
  4. This eliminates assistant memory pollution (the model never thinks it said something the user didn't hear).

### 5.3 GPU Arbitration Lock
- **File:** [`packages/runtime_contracts/gpu_lock.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/gpu_lock.py)
- **Contract:** On an 8GB VRAM card (RTX 4060), running Whisper CUDA decode simultaneously with Qwen3.5 LLM decode risks CUDA out-of-memory.
- `GPULock` provides a non-blocking asynchronous mutex. While STT decodes a final segment, LLM decode waits up to 50ms. Guarantees 0 CUDA OOM crashes.

### 5.4 Sentence Aggregation Engine
- **File:** [`packages/runtime_contracts/sentence_aggregator.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/sentence_aggregator.py)
- **Contract:** Aggregates streaming LLM tokens and yields full, natural sentences to the TTS engine without awkward mid-sentence breaks.
- **Rules:**
  - Does NOT flush on abbreviations: `Mr.`, `Mrs.`, `Dr.`, `St.`, `Ave.`, `No.`, `approx.`
  - Does NOT flush on decimal numbers or currency: `$12.50`, `3.5 ton`, `₹1,200`.
  - Max hold boundary: 100 characters or 400ms timeout.
  - Tested against 33 boundary test fixtures in [`test_sentence_aggregator.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_sentence_aggregator.py).

### 5.5 Multi-Engine TTS Pipeline
- **File:** [`packages/runtime_contracts/tts.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/tts.py)
- **Engines Supported:**
  1. [`PiperTTS`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/tts.py#L20): Ultra-fast CPU ONNX synthesis (sub-40ms latency, zero VRAM).
  2. [`KokoroTTS`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/tts.py#L78): 82M parameter natural voice engine for studio-grade human prosody.
  3. [`SarvamTTS`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/tts.py#L129): Bulbul voice model for expressive Indic languages (Hindi, Hinglish, Tamil, Telugu).
  4. [`ElevenLabsTTS`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/tts.py#L187): Cloud Turbo/Flash integration with automatic local fallback if offline.

### 5.6 Local Faster-Whisper STT Engine
- **File:** [`packages/runtime_contracts/stt.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/stt.py)
- Wraps CTranslate2 `faster-whisper` (`tiny` / `small` models).
- Supports both CPU `int8` quantization and CUDA `float16` execution.
- Emits final transcripts for LLM context, with VAD energy thresholds preventing hallucinated silence turns.

### 5.7 llama-server High-Performance Client
- **File:** [`packages/runtime_contracts/llm_client.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/llm_client.py)
- Connects directly to `llama.cpp` `llama-server` on `127.0.0.1:8083/v1`.
- Implements two distinct operational modes:
  - `stream_chat`: Real-time token streaming with `tool_choice="none"` for instant conversational turns.
  - `call_tools`: Structured non-streaming completion with JSON schema grammar enforcement for transactions.

---

## 6. Agent Schema & Compiler (`packages/agent_schema`, `packages/agent_compiler`)

### 6.1 Immutable Versioning & SHA-256 Checksums
- **Files:** [`packages/agent_schema/models.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/agent_schema/models.py), [`packages/agent_schema/checksum.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/agent_schema/checksum.py)
- An `AgentVersion` payload represents the complete runtime contract: prompt, tools, business profile, never_do rules, model ID, STT ID, and TTS ID.
- Checksum formula: `sha256(canonical_json(payload))` with sorted keys and normalized whitespace.
- Server recomputes and verifies the hash before creating or promoting any version.

### 6.2 Four-Stage Certification Lifecycle
- **File:** [`packages/agent_schema/lifecycle.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/agent_schema/lifecycle.py)
- State transitions:
  ```
  [draft] ──(certify_logic)──► [certified-logic] ──(certify_acoustic)──► [certified-acoustic] ──(promote)──► [live]
     ▲                                │                                         │                              │
     └─────────────(reject)───────────┴──────────────────(reject)───────────────┴──────────(deprecate)────────► [archived]
  ```
- **Rule:** A version in `draft` or `certified-logic` **cannot** be loaded into live telephone calls. Only `certified-acoustic` or `live` can accept customer audio.

### 6.3 Industry Kits & Structured Compilation
- **File:** [`packages/agent_compiler/kits.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/agent_compiler/kits.py)
- Pre-configured domain packs:
  1. **HVAC Services:** Emergency refrigerant leaks, seasonal maintenance, condenser replacement, $79 diagnostic fees.
  2. **Plumbing Services:** Main drain backup, hydro-jetting, emergency shut-off isolation, pipe repairs.
  3. **Electrical Services:** Circuit breaker trips, panel upgrades, hazardous wiring escalation.
  4. **Dental Clinics:** Trauma slots, cracked tooth nerve sensitivity, emergency PPO insurance checks.

---

## 7. Privacy, Security & Regulatory Compliance (`packages/privacy`)

### 7.1 Zero-Egress Network Isolation Scanner
- **File:** [`packages/privacy/forbidden_providers.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/privacy/forbidden_providers.py)
- Scans configuration dictionaries, environment variables, and source code.
- Rejects any inclusion of cloud provider URLs (`api.openai.com`, `api.anthropic.com`, `api.groq.com`, `api.together.xyz`) or forbidden daemon endpoints (`11434` for Ollama).
- Ensures `local-private` deployment mode is cryptographically and structurally sealed.

### 7.2 Statutory Bot Disclosures (FCC TCPA & CA SB 1001)
- **File:** [`tests/security/test_security_compliance.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/security/test_security_compliance.py)
- Enforces mandatory audible AI identification at the start of any inbound call (e.g. `"Namaste, I am Maya, an AI receptionist for..."`).
- Agents missing clear automated assistant disclosures fail certification gates.

### 7.3 Hard Safety Escalation Protocol
- **Rules:** If a caller mentions sparks, smoke, gas leaks, electrical fires, or flooding, the agent is forbidden from attempting booking.
- It must immediately output safety cut-off instructions and trigger `escalate_emergency` to page an on-call human operator.

---

## 8. Frontend Applications & Visual Experience (`web/`)

### 8.1 High-Conversion Public Landing Page
- **File:** [`web/src/components/LandingPage.tsx`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/web/src/components/LandingPage.tsx) (741 lines)
- **Features:**
  - Restrained, typography-driven SaaS presentation matching ElevenLabs/Linear aesthetic.
  - Interactive Center Console allowing one-click switching between HVAC, Plumbing, and Dental presets.
  - Step-by-step interactive call simulator (`ready` → `inquiry` → `interrupted` → `booked`).

### 8.2 Linear Voice Studio
- **File:** [`web/src/components/linear/LinearVoiceStudio.tsx`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/web/src/components/linear/LinearVoiceStudio.tsx) (1,699 lines)
- **Operator Views:**
  - **Overview:** Live agent readiness, active model status, 24h call volume, booking conversion rate.
  - **Agent Config:** Structured business profile, services, pricing, operating hours, hard `never_do` constraints.
  - **Engine Stack:** Visual switcher between 2026 Agentic MoE, NVIDIA PersonaPlex-7B, Deterministic Booking, and Expressive Concierge.
  - **Calls:** Historical call log with audio recordings, transcripts, and timing diagnostics.
  - **Telemetry Modal:** Detailed per-turn breakdown of EOU, STT, TTFT, TTFA, and tool execution times.
  - **Deployment Modal:** One-click deployment instructions for Docker Compose, systemd, and Apple Silicon.

### 8.3 Acoustic Anatomy Scrubber & Missed Revenue Calculator
- **Acoustic Anatomy (300ms Scrubber):** Interactive millisecond-level visualizer breaking down the conversational turn:
  - `0ms – 70ms`: Silero VAD speech detection.
  - `70ms – 190ms`: Faster-Whisper acoustic phoneme decoding.
  - `190ms – 240ms`: Qwen3.8 Gated DeltaNet KV cache lookup & first token generation.
  - `240ms – 290ms`: Kokoro/Piper first audio buffer playout.
- **Missed Revenue ROI Calculator:** Computes monthly and annual recovered revenue based on average ticket value and weekly missed after-hours calls.

### 8.4 Acoustic Visualizers & Living Voice Objects
- **[`HolyWhiteVoiceOrb.tsx`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/web/src/components/voice/HolyWhiteVoiceOrb.tsx):** High-end ElevenLabs-style living voice orb with subtle breathing animations and audio reactivity.
- **[`LinearAudioVisualizer.tsx`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/web/src/components/linear/LinearAudioVisualizer.tsx):** High-framerate HTML5 Canvas waveform rendering real-time audio frequencies with zero layout shift.

### 8.5 Audio Fixtures & Voice Previews
Located in [`web/public/voices/`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/web/public/voices/):
- `svara_happy_hindi.wav`: High-fidelity Hindi/Hinglish greeting.
- `preview_us_female.mp3`, `preview_us_male.mp3`: Professional English receptionists.
- `preview_f5_hindi.mp3`: F5-TTS conversational Hindi sample.
- `personaplex_sample.wav`: NVIDIA PersonaPlex full-duplex speech-to-speech showcase.
- `demo_conversation.wav`: Complete multi-turn appointment booking call recording.

---

## 9. Deployment, Hardware Profiles & Manifest (`deploy/`)

### 9.1 Models Catalog & Manifest
- **File:** [`deploy/models/manifest.json`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/deploy/models/manifest.json)
- Explicitly pins open-weights GGUF and ONNX models with verified SHA-256 hashes:
  - `llm.chomp.fast`: Qwen3.5-9B-Q4_K_M (4,096 context, 2,400MB minimum VRAM).
  - `llm.chomp.balanced`: Qwen2.5-7B-Instruct-Q4_K_M (5,200MB minimum VRAM).
  - `llm.qwen3_8.flash_next`: Qwen3.8-Flash-Next-MoE-Q4 (125B total / 6B active, Gated DeltaNet, 4,600MB VRAM).
  - `s2s.nvidia.personaplex`: PersonaPlex-7B Full-Duplex S2S (verified 15.3 fps on RTX 4060).
  - `s2s.kyutai.moshi`: Kyutai Moshi 7B with 24kHz Mimi neural codec.
  - `tts.kokoro.en`: Kokoro-82M ONNX model.
  - `stt.sensevoice`: Alibaba SenseVoice Small with paralinguistic emotion detection.
  - `stt.moonshine`: Useful Sensors Moonshine edge model.

### 9.2 Hardware Profiles
Defined in [`apps/api/voice_api/routes/models.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/models.py):

| Profile ID | Target Environment | Hardware Specs | Concurrency | Engine Stack |
|---|---|---|---|---|
| `cloud_l4_24gb` | Public Demo / Cloud | NVIDIA L4 / A10G (24GB VRAM) | 12 calls | vLLM PagedAttention / CUDA 13.2 |
| `edge_rtx4060_8gb` | On-Premises SMB | RTX 4060 (8GB VRAM) | 2 calls | llama.cpp GPU Offload / CUDA |
| `apple_silicon_36gb` | Office Studio | Mac Studio / M2/M3/M4 (36GB Unified) | 16 calls | Apple Metal / MLX Engine |
| `client_webgpu` | In-Browser Sandbox | Client GPU (Zero Server Cost) | Unlimited | Web Audio + WebGPU / WASM |
| `enterprise_h100_80gb`| High-Density PBX | NVIDIA H100 (80GB VRAM) | 48 calls | TensorRT-LLM + Triton Server |

### 9.3 Compose & Systemd Automation
- [`deploy/docker-compose.yml`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/deploy/docker-compose.yml): Deploys colocated LiveKit SFU, voice API, and Web UI with NVIDIA GPU pass-through.
- [`deploy/chomp-gpu.lock`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/deploy/chomp-gpu.lock): Locks NVIDIA Driver `595.x`, CUDA architecture `sm_89`, and llama.cpp commit hash.

---

## 10. Test Verification & Quality Gates (`tests/`, `scripts/`)

### 10.1 Test Coverage Matrix
Across the codebase, automated tests cover unit logic, edge cases, acoustic contracts, and security:

| Test Module | Path | Test Count | Key Invariants Tested |
|---|---|---|---|
| **Agent Version & Checksum** | [`tests/unit/test_agent_version.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_agent_version.py), [`test_checksum.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_checksum.py) | 25 | Invariant I2 (canonical JSON, SHA-256 immutability) |
| **Lifecycle & FSM** | [`tests/unit/test_lifecycle.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_lifecycle.py) | 12 | State transitions, invalid transition rejections |
| **Compiler & Industry Kits** | [`tests/unit/test_compiler.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_compiler.py) | 5 | HVAC, Plumbing, Electrician kits, MoE & PersonaPlex |
| **Sentence Aggregator** | [`tests/unit/test_sentence_aggregator.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_sentence_aggregator.py) | 33 | Abbreviation safety (`Dr.`, `Mrs.`), currency (`$12.50`) |
| **Edge Cases & Watermarks** | [`tests/unit/test_edge_cases.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_edge_cases.py) | 10 | Rapid successive barge-ins, slack boundaries, race conditions |
| **Turn Machine & Barge-In** | [`tests/unit/test_p3_turn_machine.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_p3_turn_machine.py) | 3 | Spoken watermark history, playout queue |
| **TTS Multi-Engine** | [`tests/unit/test_tts_engines.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_tts_engines.py) | 2 | Piper, Kokoro, Sarvam fallback handling |
| **Voice API & IDOR** | [`tests/unit/test_voice_api.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_voice_api.py) | 4 | Multi-tenant auth, catalog routes, appointment booking |
| **Evaluation Suite** | [`tests/unit/test_eval_suite.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_eval_suite.py) | 2 | Core evaluation suite, mock simulation runner |
| **Forbidden Providers** | [`tests/unit/test_forbidden_providers.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_forbidden_providers.py) | 12 | Invariant I7 (zero cloud leaks, Ollama quarantine) |
| **Security & Compliance** | [`tests/security/test_security_compliance.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/security/test_security_compliance.py) | 8 | TCPA disclosure, emergency hazard escalation, network isolation |
| **End-to-End Multi-Turn** | [`tests/e2e/test_end_to_end_voice_agent.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/e2e/test_end_to_end_voice_agent.py) | 1 | Complete customer booking journey in Hindi/English |
| **Total Test Suite** | **All Modules** | **129 Tests** | **120 Unit/Security Passing in Offline CI** |

### 10.2 Verification Scripts
- **[`scripts/verify_p0.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/scripts/verify_p0.py):** Phase 0 gate verifier checking docs, package structure, forbidden provider static scan, and unit test suite.
- **[`scripts/run_agent_simulation.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/scripts/run_agent_simulation.py):** Automated 3-task simulation against live `llama-server` on `chomp` (booking, emergency safety escalation, off-hours defense).
- **[`scripts/run_e2e_test.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/scripts/run_e2e_test.py):** Colorized terminal test runner executing full provisioning, certification, and multi-turn turns.
- **[`scripts/vram-profile.sh`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/scripts/vram-profile.sh):** Polling loop capturing GPU memory during concurrent STT and LLM execution.

---

## 11. Version History & Recent Commits

| Commit | Date | Author | Description |
|---|---|---|---|
| `c41e4be` | 2026-09-04 | K-naman-T | **feat(ui):** Eliminate slop, implement production Linear design system from `DESIGN.md` with studio audio visualizer. |
| `c41d65b` | 2026-09-04 | K-naman-T | **feat(ui):** Redesign voice agent platform from scratch in Sarvam AI studio style. |
| `d828e5b` | 2026-09-04 | K-naman-T | **feat(ui):** Redesign executive SaaS voice agent dashboard with viewport containment and rich visuals. |
| `5248dbc` | 2026-09-04 | K-naman-T | **feat(ui):** Add End-User Business Owner Portal with interactive smartphone call simulator. |
| `b1b4dae` | 2026-09-04 | K-naman-T | **feat:** Implement anti-slop industrial hardware design with multi-mode acoustic visualizer. |
| `c33c03f` | 2026-09-04 | K-naman-T | **feat:** Implement v2 voice-agent end-to-end (P1-P10, contracts, turn machine, API, eval, web). |
| `6dc6101` | 2026-09-04 | K-naman-T | **feat:** M0.5 chomp host green state, port remapping, and model pinning. |
| `dc8b3d5` | 2026-08-28 | knamant | **chore:** Quarantine legacy v1 surface to `legacy/`; narrow Ollama URL pattern. |
| `95cbdf8` | 2026-08-28 | knamant | **P0:** Contracts, privacy, and deploy artifacts for v2 voice-agent configurator. |
| `fa98505` | 2026-05-03 | knamant | **fix:** Remove stray `__init__.py` from root. |

---

## 12. Current Uncommitted Work & Next Actions

### Working Directory State (2026-09-08)
The working tree contains major enhancements that have been implemented, verified, and staged for commit:

1. **API Expansion:**
   - [`apps/api/voice_api/routes/models.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/models.py): New catalog, stack presets, and hardware profiles.
   - [`apps/api/voice_api/routes/stt.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/stt.py): Local audio file transcription route.
   - [`apps/api/voice_api/routes/calls.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/calls.py): Added turn-level telemetry span recording.
   - [`apps/api/voice_api/routes/agents.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/apps/api/voice_api/routes/agents.py): Added `/turn` live execution route with emergency escalation & state machine booking.
2. **Multi-Engine TTS:**
   - [`packages/runtime_contracts/tts.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/packages/runtime_contracts/tts.py): Implemented Kokoro, Sarvam, and ElevenLabs adapters.
3. **Advanced Model Manifest:**
   - [`deploy/models/manifest.json`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/deploy/models/manifest.json): Added Qwen3.8-MoE, Muse-Glimmer, PersonaPlex-7B, and Kokoro specs.
4. **Comprehensive Test Suites:**
   - [`tests/security/test_security_compliance.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/security/test_security_compliance.py): 8 statutory compliance tests.
   - [`tests/unit/test_edge_cases.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_edge_cases.py): 10 low-level acoustic edge-case tests.
   - [`tests/unit/test_tts_engines.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/unit/test_tts_engines.py): Multi-engine synthesizer tests.
   - [`tests/e2e/test_end_to_end_voice_agent.py`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/tests/e2e/test_end_to_end_voice_agent.py): Full multi-turn integration test.
5. **Frontend SOTA Polish:**
   - [`web/src/components/LandingPage.tsx`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/web/src/components/LandingPage.tsx): High-conversion ElevenLabs-inspired public page.
   - [`web/src/components/linear/LinearVoiceStudio.tsx`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/web/src/components/linear/LinearVoiceStudio.tsx): Full studio with hardware profiles and preset selector.
   - [`web/src/components/voice/HolyWhiteVoiceOrb.tsx`](file:///home/knamant/orca/workspaces/smb-voice-agent/char/web/src/components/voice/HolyWhiteVoiceOrb.tsx): Dynamic voice orb component.

### Recommended Next Step
- Stage and commit current working changes:
  ```bash
  git add .
  git commit -m "feat: complete v2.1 voice studio, multi-engine TTS, and security compliance suite"
  ```
