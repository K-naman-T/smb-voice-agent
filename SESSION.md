# SESSION.md

**Source of truth for engineering:** [`docs/ENGINEERING_PLAN_v2.md`](docs/ENGINEERING_PLAN_v2.md) (v2.1 hardened)

## One-liner

Agency-oriented **voice agent creator** (honest scope: local demo + self-deploy skeleton), inference on **chomp**, LLM via **llama.cpp llama-server** (not Ollama), STT faster-whisper, TTS Piper, LiveKit worker, FastAPI + React.

## Do not use

- Ollama  
- Old SPEC.md stack (Twilio/Sarvam/Gemini/MiniMax) as architecture — historical only  
- Stream+tools hybrid as v1 cert path  

## Host

chomp · 4060 8GB · llama-server `127.0.0.1:8081` · API `8090` · avoid ports 3000/8000/8080/4096  

## Next

Read ENGINEERING_PLAN_v2.md §0–§4; execute P0→P1.
