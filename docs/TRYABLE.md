# SMB Voice Agent — Voice Agent Creator (v2.2)

**Describe a business → get a live voice agent link → talk to it.**
Local, private, self-hosted. No cloud dependency (except free edge-tts for voice).

## What it does

- `/configure` — business owner fills a form (name, services, pricing, hours, voice, language, rules, KB)
- POST `/api/agent` — server mints an agent id, builds a per-business system prompt
- `/call?agent=<id>` — ChatGPT-style orb UI; hold-to-talk, replies out loud
- Agent books appointments → sqlite (`voice_agent.db`), confirmed in voice
- Multi-agent: every business gets its own prompt, voice, and booking stream

## Try it (2 commands)

```bash
# 1) start the stack: local LLM (llama-server) + API
./start-smb-stack.sh          # or: systemctl start smb-llama smb-voice-api

# 2) open the configurator
open https://<your-host>:8090/configure
```

Create an agent, hit the preview link, tap the orb, talk.
No API keys required. Everything runs locally.

## Quick API

```bash
# create an agent
curl -X POST http://localhost:8090/api/agent \
  -d "name=Patel Dental Clinic" \
  -d "services=Tooth Cleaning, Root Canal, Crown" \
  -d "pricing=Consultation: ₹500; Root Canal: ₹6,000" \
  -d "hours=10 AM to 8 PM, Tuesday to Sunday" \
  -d "voice=en-US-JennyNeural" -d "language=hinglish"

# → {"id":"patel-dental-clinic","preview":"/call?agent=patel-dental-clinic"}

# list agents
curl http://localhost:8090/api/agents

# voice roundtrip (multipart audio)
curl -X POST http://localhost:8090/api/voice/audio \
  -F "session_id=demo" -F "agent_id=patel-dental-clinic" \
  -F "audio=@clip.webm"   # → {transcript, response, audio_url}

# text fallback
curl -X POST http://localhost:8090/api/voice \
  -d "agent_id=patel-dental-clinic&text=hi, I want to book a root canal"
```

## Stack (all local, zero keys)

| Stage | Provider |
|-------|----------|
| STT | faster-whisper (base, CPU) |
| LLM | llama.cpp llama-server (any OpenAI-compatible endpoint; tested Qwable-9B) |
| TTS | edge-tts (free; 7 voices incl. Hindi) |
| Booking | sqlite |
| Orchestration | FastAPI + systemd (`smb-llama`, `smb-voice-api`) |

## Config

- `config.local.toml` — provider + business defaults (not tracked; copy from template)
- `agent_store.py` + `agents_registry.json` — agent profiles (registry not tracked)
- `api/kits/__init__.py` — industry kits (HVAC/Plumbing/Electrical/Pest Control)

## Honest scope

- Web preview only — **no telephony** yet (LiveKit worker skeleton exists, untested)
- Per-session memory — cross-call memory not built
- 3 languages (English/Hinglish/Hindi prompts; EN + HI TTS voices)
- Edge-tts requires internet for voice output; STT/LLM are fully local

## Security

`setup.sh` installs with env-var placeholders — **bring your own keys**.
`GEMINI_API_KEY` in setup.sh is intentionally blank; never commit real keys.
