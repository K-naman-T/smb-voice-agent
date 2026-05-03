# SMB Voice Agent

AI phone agent for small businesses — answers calls, books appointments, handles FAQs, sends SMS confirmations.

## Quick Start

### Backend
```bash
cd api
pip install -r requirements.txt

# Set env vars
export TWILIO_ACCOUNT_SID=ACxxxxxxxx
export TWILIO_AUTH_TOKEN=xxxxxxxx
export TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
export SARVAM_API_KEY=xxxxxxxx
export GEMINI_API_KEY=xxxxxxxx
export MINIMAX_API_KEY=xxxxxxxx

# Run
python main.py
```

### Frontend
```bash
cd web
npm install
npm run dev
```

### Ngrok (for Twilio webhooks)
```bash
ngrok http 8000
# Copy HTTPS URL → Set as Twilio webhook
```

## Project Structure
```
smb-voice-agent/
├── web/                    # React dashboard
│   └── src/App.tsx         # Full dashboard with calls, appointments, stats
├── api/                    # FastAPI backend
│   ├── main.py             # Twilio webhooks + REST API
│   └── kits/               # Industry-specific business logic
└── SPEC.md                 # Full specification
```

## Twilio Setup
1. Create Twilio account + buy a phone number
2. Set webhook URL: `https://your-ngrok-url/webhook/twilio`
3. Set status callback: `https://your-ngrok-url/webhook/twilio/status`

## Environment Variables
| Variable | Description |
|---|---|
| TWILIO_ACCOUNT_SID | From Twilio Console |
| TWILIO_AUTH_TOKEN | From Twilio Console |
| TWILIO_PHONE_NUMBER | Your Twilio phone number |
| SARVAM_API_KEY | For Indic speech-to-text |
| GEMINI_API_KEY | For intent classification + response |
| MINIMAX_API_KEY | For voice output |
| DB_PATH | SQLite database path (default: voice_agent.db) |
