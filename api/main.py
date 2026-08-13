"""SMB Voice Agent v2.2 — Voice Agent Creator.

v2.1 + agent registry:
- /configure : configurator page (owner defines their agent)
- POST /api/agent : create/update agent profile (name, services, pricing, voice, language, rules)
- GET  /api/agents : list agents
- /call?agent=<id> : orb UI bound to that agent
- voice/audio + voice take agent_id; prompt + TTS voice come from the profile
"""
import os
import re
import tempfile
import uuid

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from providers import load_config, create_all_providers
from providers.base import Message

CONFIG_PATH = os.getenv("CONFIG_PATH", "config.local.toml")
app = FastAPI(title="SMB Voice Agent Creator", version="2.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cfg = load_config(CONFIG_PATH)
PROVIDERS = create_all_providers(cfg)
LLM = PROVIDERS["llm"]
STT = PROVIDERS["stt"]
TTS = PROVIDERS["tts"]
SMS = PROVIDERS["sms"]
MEMORY = PROVIDERS["memory"]

from agent_store import (  # noqa: E402
    DEFAULT_AGENT_ID,
    VOICES,
    all_agents,
    get_agent,
    create_agent,
    build_system_prompt,
)

# ---- in-memory session store (per preview-link visitor) ----
SESSIONS: dict[str, list] = {}
BOOKED: set[str] = set()
MAX_HISTORY = 10


def get_session(sid: str) -> list:
    return SESSIONS.setdefault(sid, [])


def persist_booking(agent_id: str, service: str, time_slot: str, name: str) -> None:
    import sqlite3

    db_path = cfg.get("server", {}).get("db_path", "voice_agent.db")
    conn = sqlite3.connect(db_path)
    conn.execute(
        """INSERT INTO appointments (id, call_id, customer_name, customer_phone,
           service_type, scheduled_time, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            str(uuid.uuid4()),
            agent_id,
            name or "Walk-in",
            "",
            service,
            time_slot,
            "pending",
        ),
    )
    conn.commit()
    conn.close()


BOOK_RE = re.compile(r"\[BOOK:\s*([^|]+)\|([^|]+)\|([^\]]+)\]", re.IGNORECASE)


async def run_agent_turn(sid: str, text: str, agent_id: str = DEFAULT_AGENT_ID) -> tuple[str, str | None]:
    agent = get_agent(agent_id) or get_agent(DEFAULT_AGENT_ID)
    session = get_session(sid)
    session.append(Message(role="user", content=text))

    messages = [Message(role="system", content=build_system_prompt(agent))] + session[-MAX_HISTORY:]
    result = await LLM.chat(messages)
    reply = result.content.strip()

    booking = None
    m = BOOK_RE.search(reply)
    if m:
        service, time_slot, name = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
        if sid not in BOOKED:
            persist_booking(agent_id, service, time_slot, name)
            BOOKED.add(sid)
            booking = (service, time_slot, name)
        reply = BOOK_RE.sub("", reply).strip()

    session.append(Message(role="assistant", content=reply))
    return reply, booking


# ============ pages ============

@app.get("/")
async def root():
    return {"status": "ok", "service": "SMB Voice Agent Creator", "version": "2.2.0"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "2.2.0",
        "llm": type(LLM).__name__,
        "stt": type(STT).__name__,
        "tts": type(TTS).__name__,
        "sessions": len(SESSIONS),
        "agents": len(all_agents()),
    }


@app.get("/call")
async def call_page():
    page = os.path.join(os.path.dirname(__file__), "..", "web", "call.html")
    return FileResponse(page)


@app.get("/configure")
async def configure_page():
    page = os.path.join(os.path.dirname(__file__), "..", "web", "configure.html")
    return FileResponse(page)


# ============ agent configurator ============

@app.get("/api/agents")
async def agents_list():
    agents = all_agents()
    return [
        {
            "id": a["id"],
            "name": a["name"],
            "industry": a["industry"],
            "services": a["services"],
            "voice": a["voice"],
            "language": a["language"],
            "greeting": a["greeting"],
            "preview": f"/call?agent={a['id']}",
        }
        for a in agents.values()
    ]


@app.get("/api/agent/{agent_id}")
async def agent_get(agent_id: str):
    agent = get_agent(agent_id)
    if not agent:
        return {"error": "not found"}
    return agent


@app.post("/api/agent")
async def agent_create(
    name: str = Form(...),
    industry: str = Form("general"),
    tagline: str = Form("AI receptionist"),
    services: str = Form(""),
    pricing: str = Form(""),
    hours: str = Form(""),
    emergency: str = Form(""),
    voice: str = Form("en-US-AriaNeural"),
    language: str = Form("hinglish"),
    greeting: str = Form(""),
    never_do: str = Form(""),
    kb: str = Form(""),
):
    agent = create_agent({
        "id": "",  # minted from name
        "name": name,
        "industry": industry,
        "tagline": tagline,
        "services": services,
        "pricing": pricing,
        "hours": hours,
        "emergency": emergency,
        "voice": voice,
        "language": language,
        "greeting": greeting,
        "never_do": never_do,
        "kb": kb,
    })
    return {"id": agent["id"], "preview": f"/call?agent={agent['id']}", "agent": agent}


@app.get("/api/voices")
async def voices():
    return VOICES


# ============ voice endpoints ============

@app.get("/api/audio/{filename}")
async def get_audio(filename: str):
    audio_dir = "/tmp/smb_voice_audio"
    path = os.path.join(audio_dir, filename)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return StreamingResponse(open(path, "rb"), media_type="audio/mpeg")
    return {"error": "not found"}


@app.post("/api/voice/audio")
async def voice_audio(
    session_id: str = Form(""),
    agent_id: str = Form(""),
    audio: UploadFile = File(...),
):
    sid = session_id or str(uuid.uuid4())
    agent = get_agent(agent_id) or get_agent(DEFAULT_AGENT_ID)
    data = await audio.read()
    if not data:
        return {"error": "empty audio", "session_id": sid}

    transcript = await STT.transcribe(data)
    reply, booking = await run_agent_turn(sid, transcript, agent["id"])

    # per-agent voice
    from providers.tts import EdgeTTS

    tts = EdgeTTS(voice=agent.get("voice", "en-US-AriaNeural"))
    mp3 = await tts.synthesize(reply)
    audio_url = None
    if mp3:
        os.makedirs("/tmp/smb_voice_audio", exist_ok=True)
        path = os.path.join("/tmp/smb_voice_audio", f"{uuid.uuid4().hex}.mp3")
        with open(path, "wb") as f:
            f.write(mp3)
        audio_url = f"/api/audio/{os.path.basename(path)}"

    return {
        "session_id": sid,
        "agent_id": agent["id"],
        "agent_name": agent["name"],
        "transcript": transcript,
        "response": reply,
        "audio_url": audio_url,
        "booking": list(booking) if booking else None,
    }


@app.post("/api/voice")
async def voice_text(session_id: str = Form(""), agent_id: str = Form(""), text: str = Form("")):
    if not text:
        return {"error": "text required"}
    sid = session_id or str(uuid.uuid4())
    reply, booking = await run_agent_turn(sid, text, agent_id)
    return {"session_id": sid, "response": reply, "booking": list(booking) if booking else None}


@app.get("/api/appointments")
async def appointments():
    import sqlite3

    db_path = cfg.get("server", {}).get("db_path", "voice_agent.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM appointments ORDER BY created_at DESC LIMIT 30").fetchall()
    conn.close()
    return [dict(r) for r in rows]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8090")))
