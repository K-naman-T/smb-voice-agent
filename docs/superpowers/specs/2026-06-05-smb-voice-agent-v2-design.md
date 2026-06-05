# SMB Voice Agent v2 — Design Spec

> **Date:** 2026-06-05
> **Status:** Draft

## Overview

Rebuild SMB Voice Agent from a keyword-based STT→LLM→TTS pipeline to a **modular, OSS-first, multi-agent voice platform** using LiveKit Agents, Gemini 2.0 Flash (free tier), Whisper STT, edge-tts/Piper TTS, and pluggable provider interfaces.

## Why v2?

The current v1 uses a rigid keyword-classifier + hardcoded FastAPI pipeline. It's not extensible, doesn't support real-time voice (no barge-in), can't do multi-agent routing, and every integration is hardcoded. v2 makes every integration pluggable, adds real-time voice with interruption support, and introduces multi-agent routing.

## Principles

- **Zero paid dependencies** — All core services are OSS or free-tier
- **Provider abstraction** — Every integration point is an ABC; swap implementations via config
- **Modular agents** — Each agent handles one domain; handoff is seamless
- **Test-driven** — Every provider and agent has tests before implementation
- **Self-hosted** — Run everything on your own infra

## Architecture

### Layer 1: Audio Ingress
```
Browser mic → LiveKit WebRTC SDK (via @livekit/components-react)
Phone call → Twilio/Plivo → LiveKit SIP Trunk → LiveKit Room
```

Both paths converge into a LiveKit room. The agent joins as a participant.

### Layer 2: LiveKit Agents (Orchestrator)
- `AgentServer` — long-lived process, listens for dispatch requests
- `AgentSession` — manages turn-taking, VAD, interruption lifecycle
- Built-in ML-based turn detection (LiveKit's custom transformer model)
- Adaptive interruption handling + false interruption recovery

### Layer 3: Pipeline per Turn
```
Caller speaks
  → LiveKit VAD detects speech endpoint
  → Whisper STT (streaming transcription, local)
  → Gemini 2.0 Flash (intent + response + function calls)
  → edge-tts or Piper TTS (audio synthesis)
  → Audio played back to caller via LiveKit
  → Total: ~500-800ms end-to-end
```

### Layer 4: Multi-Agent System
```
ReceptionistAgent (classifies intent, identifies caller)
  ├── BookingAgent (schedules appointments via Cal.com)
  ├── FAQAgent (answers questions via RAG on business docs)
  ├── EmergencyAgent (triages urgent calls, routes to human)
  └── HumanHandoff (bridges to real person via SIP)
```

Handoff preserves full conversation history. Caller doesn't notice the switch.

### Layer 5: Provider Interfaces
Every integration point is an abstract base class with a default OSS implementation. Swap providers via `config.toml`.

## Provider Interfaces

### LLM Provider
```python
class LLMProvider(ABC):
    async def chat(self, messages: list[Message], tools: list[Tool]) -> LLMResult: ...
    async def stream(self, messages, tools) -> AsyncIterator[str]: ...
```
- **Default:** Gemini 2.0 Flash (free tier, 60 requests/min free)
- **Fallback:** Ollama (DeepSeek/Qwen/Llama, fully local)
- **Future:** OpenRouter (if user adds key)

### STT Provider
```python
class STTProvider(ABC):
    async def transcribe_stream(self, audio_stream) -> AsyncIterator[str]: ...
    async def transcribe(self, audio_bytes) -> str: ...
```
- **Default:** Whisper via `faster-whisper` (local, ~1GB RAM)
- **Fallback:** Browser-native `SpeechRecognition` API (zero server cost)
- **Available:** Sarvam API (key at `/home/knamant/api_keys.md`)

### TTS Provider
```python
class TTSProvider(ABC):
    async def synthesize(self, text: str, lang: str = "en") -> bytes: ...
```
- **Default:** `edge-tts` (free, no API key, ~300ms, good quality)
- **Fallback:** Piper TTS (fully offline, runs on CPU, ~100ms)
- **Future:** Sarvam TTS or Coqui

### Calendar Provider
```python
class CalendarProvider(ABC):
    async def get_slots(self, date: str, service: str) -> list[TimeSlot]: ...
    async def book(self, slot: TimeSlot, customer: Customer) -> Booking: ...
```
- **Default:** Cal.com API (OSS, self-host or SaaS free tier)
- **Fallback:** CalDAV (any calendar server)
- **Future:** Google Calendar, Outlook

### SMS Provider
```python
class SMSProvider(ABC):
    async def send(self, to: str, body: str) -> bool: ...
```
- **Default:** Email-to-SMS gateway (free, carrier-dependent)
- **Fallback:** Log to console (for development)
- **Future:** Twilio, Plivo, TextBelt

### Memory Provider
```python
class MemoryProvider(ABC):
    async def lookup(self, phone: str) -> CustomerProfile | None: ...
    async def store(self, call_id: str, transcript: str, summary: str): ...
    async def search(self, query: str, limit: int = 5) -> list[MemoryDoc]: ...
```
- **Default:** SQLite + `sqlite-vec` (vector search in DB, zero infra)
- **Fallback:** JSON file storage
- **Future:** PostgreSQL + pgvector, ChromaDB

## File Structure

```
smb-voice-agent/
├── agents/
│   ├── __init__.py
│   ├── server.py              # AgentServer entrypoint, dispatch config
│   ├── base.py                # Base agent class with shared helpers
│   ├── receptionist.py        # Main agent: greet, classify, route
│   ├── booking_agent.py       # Appointment booking sub-agent
│   ├── faq_agent.py           # FAQ answering with RAG
│   ├── emergency_agent.py     # Emergency triage + human handoff
│   └── instructions/          # System prompts per agent
│       ├── receptionist.md
│       ├── booking.md
│       ├── faq.md
│       └── emergency.md
├── providers/
│   ├── __init__.py            # Provider enum + factory
│   ├── base.py                # All ABCs
│   ├── llm.py                 # LLM implementations
│   ├── stt.py                 # STT implementations
│   ├── tts.py                 # TTS implementations
│   ├── calendar.py            # Calendar implementations
│   ├── sms.py                 # SMS implementations
│   └── memory.py              # Memory implementations
├── api/
│   ├── main.py                # Dashboard API (stripped of voice pipeline)
│   ├── kits/                  # Business context (unchanged)
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── ...industry kits...
│   └── requirements.txt
├── web/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── lib/
│       │   └── utils.ts
│       └── components/
│           ├── VoiceAgentUI.tsx     # UPGRADED: LiveKit SDK
│           └── agents-ui/           # KEEP existing components
├── tests/
│   ├── providers/
│   │   ├── test_llm.py
│   │   ├── test_stt.py
│   │   ├── test_tts.py
│   │   ├── test_calendar.py
│   │   ├── test_sms.py
│   │   └── test_memory.py
│   ├── agents/
│   │   ├── test_receptionist.py
│   │   ├── test_booking.py
│   │   ├── test_faq.py
│   │   └── test_emergency.py
│   └── integration/
│       └── test_full_pipeline.py
├── config.toml
├── setup.sh
├── README.md
├── SPEC.md
└── voice_pipeline.py           # ARCHIVED: old pipeline, kept as reference
```

## Data Flow (Detailed)

### Inbound Call Flow
```
1. Caller dials Twilio number (or opens browser mic)
2. Twilio Conversation Relay / LiveKit WebRTC creates a room
3. LiveKit dispatches a job → AgentServer spawns ReceptionistAgent
4. Agent joins room as participant
5. Agent plays greeting via TTS
6. Agent enters LISTENING state
7. LiveKit VAD detects when caller stops speaking
8. Whisper transcribes the audio chunk (streaming)
9. Agent sends transcript + conversation history to Gemini
10. Gemini classifies intent, generates response, optionally calls tools
11. If intent matches sub-agent → handoff
12. Agent speaks response via TTS
13. Loop 6-12 until call ends
14. Agent stores conversation summary via Memory provider
```

### Tool Call Flow (e.g., booking)
```
1. Caller says "Book AC repair for tomorrow at 2pm"
2. Gemini returns: intent="booking", action={type: "book_appointment", ...}
3. Agent calls CalendarProvider.book(slot, customer)
4. CalendarProvider returns booking confirmation
5. Agent calls SMSProvider.send(customer.phone, confirmation)
6. Agent responds: "Your AC repair is confirmed for tomorrow at 2pm"
7. Agent stores appointment in local DB
```

## Frontend Changes

The current React UI (VoiceAgentUI.tsx) uses `webkitSpeechRecognition` + raw Audio API + HTTP polling to `localhost:8000`. v2 replaces this with:

- `@livekit/components-react` for real-time audio
- LiveKit room connection instead of HTTP polling
- Real-time transcript streaming (word-by-word from LiveKit)
- Agent state synced via LiveKit room events (not local state machine)

The existing UI components (AgentAudioVisualizer, AgentControlBar, ConversationTranscript, MessageBubble, StatusBadge) are reused with minimal changes — they render from LiveKit state instead of local state.

## State Machine

```
IDLE ──→ (incoming call/browser connect) ──→ CONNECTING
  │                                                │
  │                                          (room joined)
  │                                                │
  │                                                ▼
  │                                           LISTENING
  │                                                │
  │                                          (speech detected by VAD)
  │                                                │
  │                                                ▼
  │                                           PROCESSING
  │                                                │
  │                                          (response ready)
  │                                                │
  │                                                ▼
  │                                           SPEAKING
  │                                                │
  │                                   (interruption) │ (speech done)
  │                                          ┌──────┘
  │                                          ▼
  │                                     LISTENING
  │
  └── (call end / disconnect) ──→ IDLE
```

## Error Handling

- **STT failure:** Agent says "Sorry, I didn't catch that. Could you please repeat?" and re-enters LISTENING
- **LLM failure:** Agent says "I'm having trouble processing that. Let me try again." Retry once, then apologize and offer human handoff
- **TTS failure:** Log error, send transcript response as chat message in browser UI
- **Calendar API down:** Agent says "I'm unable to check my calendar right now. Could you call back later or I can take your details manually?"
- **SMS failure:** Log error, agent says "I've booked your appointment" (treats SMS as non-critical)
- **Provider not configured:** Agent handles gracefully with appropriate message ("Calendar booking is not available right now")

## Testing Strategy

### Unit Tests (pytest)
Each provider implementation gets:
- Test with mock data
- Test for each error path
- Test for edge cases (empty input, special characters, long input)

### Agent Tests (LiveKit test framework)
LiveKit Agents has a built-in test framework using `session.run()` + assertions:
- Test receptionist intent classification
- Test booking flow end-to-end
- Test emergency detection
- Test handoff between agents
- Test interruption handling

### Integration Tests
- Start a LiveKit server (test container)
- Connect a virtual participant
- Send pre-recorded audio
- Assert expected response audio is generated
- Assert DB state after call

## Configuration

```toml
# config.toml
[server]
host = "0.0.0.0"
port = 8000
livekit_url = "ws://localhost:7880"
livekit_api_key = ""
livekit_api_secret = ""

[agents]
receptionist_prompt = "agents/instructions/receptionist.md"
booking_prompt = "agents/instructions/booking.md"
faq_prompt = "agents/instructions/faq.md"
emergency_prompt = "agents/instructions/emergency.md"

[providers]
llm = "gemini"          # gemini | ollama | openrouter
stt = "whisper"         # whisper | browser | sarvam
tts = "edge_tts"        # edge_tts | piper | sarvam
calendar = "cal_com"    # cal_com | caldav | none
sms = "console"         # console | email_gateway | twilio
memory = "sqlite_vec"   # sqlite_vec | json | postgres

[llm.gemini]
model = "gemini-2.0-flash"
api_key = ""  # from env GEMINI_API_KEY

[llm.ollama]
model = "qwen2.5:7b"
base_url = "http://localhost:11434"

[stt.whisper]
model = "base"  # base | small | medium | large-v3
device = "cpu"

[tts.edge_tts]
voice = "en-US-AriaNeural"

[calendar.cal_com]
api_url = "https://api.cal.com/v1"
api_key = ""

[memory.sqlite_vec]
db_path = "memory.db"
```

## Migration from v1

### What stays:
- `api/kits/` — all 4 industry kits with services, pricing, hours
- `web/src/components/agents-ui/` — all 6 UI components (modified for LiveKit)
- `api/requirements.txt` — updated with new deps
- `web/package.json` — updated with LiveKit deps

### What changes:
- `api/main.py` — voice pipeline removed, only dashboard/stats endpoints remain
- `web/src/App.tsx` — wraps VoiceAgentUI with LiveKit room provider
- `web/src/components/VoiceAgentUI.tsx` — uses LiveKit SDK instead of raw Web Audio API

### What's archived (not deleted):
- `voice_pipeline.py` — kept as reference, not imported anywhere
- Keyword-classifier logic in `api/main.py` — removed from active code

### What's new:
- `agents/` — entire LiveKit agent system
- `providers/` — entire provider abstraction layer
- `tests/` — test suite
- `config.toml` — configuration
