# SMB Voice Agent — SPEC.md

## What it does
AI voice agent that answers inbound calls for small businesses (HVAC, plumbing, pest control), books appointments, handles FAQs, and sends SMS confirmations — all while the owner is busy or after hours.

## Target Customer
- HVAC, plumbing, electrical, pest control, cleaning businesses
- 1-10 employees, no receptionist
- Losing leads to missed calls after 5pm and voicemail abandonment
- India market + English/Hindi bilingual

## Core Flow
```
Inbound Call (Twilio)
    ↓
Webhook → /answer
    ↓
Record caller speech → Sarvam STT
    ↓
LLM (Gemini 2.0 Flash) → Intent Classification + Response
    ↓
Tool Calls → appointment_booking | customer_lookup | route_emergency
    ↓
MiniMax TTS → speak response back to caller
    ↓
Twilio SMS → send confirmation
    ↓
SQLite → log call, transcript, outcome
```

## Tech Stack

| Layer | Tech |
|---|---|
| Phone | Twilio |
| STT | Sarvam API |
| LLM | Gemini 2.0 Flash (function calling) |
| TTS | MiniMax Speech-02 HD |
| DB | SQLite (calls, customers, appointments) |
| Backend | FastAPI |
| Frontend | React 19 + Vite + TypeScript + Tailwind v4 |
| Animations | Framer Motion |

## Aesthetic — "Molten Dark"
- Background: #1a1a2e (dark blue-purple)
- Primary: #4361ee (blue)
- Accent: #ffd60a (yellow)
- Glass cards: rgba(255,255,255,0.05) with blur
- Blob glow effects, rounded-2xl cards
- Same visual language as AstroEngine web UI

## Directory Structure
```
smb-voice-agent/
├── SPEC.md
├── README.md
├── web/                        # React dashboard
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── Dashboard.tsx
│   │       ├── CallLog.tsx
│   │       ├── AppointmentCard.tsx
│   │       └── StatusBadge.tsx
├── api/                        # FastAPI backend
│   ├── main.py
│   ├── voice_pipeline.py
│   ├── twilio_server.py
│   ├── kits/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── hvac.py
│   │   └── plumber.py
│   ├── db.py
│   └── models.py
└── requirements.txt
```

## API Endpoints
- `POST /webhook/twilio` — Twilio inbound call webhook
- `POST /webhook/twilio/status` — Call status callbacks
- `GET /api/calls` — List all calls (paginated)
- `GET /api/calls/{id}` — Single call detail
- `GET /api/appointments` — List appointments
- `POST /api/appointments` — Create appointment
- `GET /api/customers` — List customers
- `GET /api/stats` — Dashboard stats
- `POST /api/test/voice` — Test TTS/STT pipeline

## TODO <!-- slop-allow: H2 historical v1 prototype specification roadmap -->
- [x] Scaffold project + SPEC.md
- [ ] Build React dashboard with blob UI
- [ ] Build FastAPI voice pipeline (Twilio → STT → LLM → TTS)
- [ ] Build industry kits (HVAC, plumber, electrician)
- [ ] DB models + migrations
- [ ] Wire frontend to backend
- [ ] Test with real Twilio number
