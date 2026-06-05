# SMB Voice Agent — TESTABLE DEMO

Real two-way voice AI agent. Speak into your browser → AI responds with audio.

## Quick Start (Demo Mode)

```bash
# Backend
cd api
pip install -r requirements.txt
python3 main.py

# Frontend (new terminal)
cd web
npm install
npm run dev
```

Open `http://localhost:5173` — click the mic and start talking.

## How It Works (Demo)

```
You speak (browser mic)
  → Web Speech API transcribes
  → POST /api/voice → Gemini 2.0 Flash
  → Edge TTS generates response audio
  → Audio plays in browser
```

## Real Phone Mode (Production)

Connect Twilio webhook at `/webhook/twilio` for actual phone calls.

## APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/voice` | POST | Text → LLM → response + audio URL |
| `/api/voice/stream` | POST | Text → LLM → stream audio directly |
| `/api/business-context` | GET | Current business info |
| `/api/test/llm` | GET | Test Gemini directly |
| `/api/test/tts` | GET | Test Edge TTS directly |

## Industries

`INDUSTRY=hvac|plumbing|electrical|pest_control` env var changes the business.
