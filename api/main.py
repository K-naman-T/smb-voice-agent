import os, uuid, tempfile
from datetime import datetime
from contextlib import contextmanager
import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SMB Voice Agent Dashboard", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

INDUSTRY = os.getenv("INDUSTRY", "hvac")
DB_PATH = os.getenv("DB_PATH", "voice_agent.db")


def get_db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)


@contextmanager
def get_cursor():
    db = get_db()
    cursor = db.cursor()
    try:
        yield cursor
        db.commit()
    finally:
        db.close()


def init_db():
    db = get_db()
    c = db.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY, from_phone TEXT, to_phone TEXT,
        duration REAL DEFAULT 0, status TEXT DEFAULT 'in_progress',
        transcript TEXT DEFAULT '', intent TEXT DEFAULT '',
        outcome TEXT DEFAULT '', recording_url TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY, call_id TEXT, customer_name TEXT,
        customer_phone TEXT, service_type TEXT, scheduled_time TEXT,
        status TEXT DEFAULT 'pending', notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY, phone TEXT UNIQUE, name TEXT,
        total_calls INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
    db.commit()
    db.close()

init_db()


class AppointmentCreate(BaseModel):
    customer_name: str
    customer_phone: str
    service_type: str
    scheduled_time: str
    notes: str = ""


@app.get("/")
async def root():
    return {"status": "ok", "service": "SMB Voice Agent v2", "industry": INDUSTRY}


@app.get("/health")
async def health():
    gemini_ok = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "healthy",
        "version": "2.0.0",
        "industry": INDUSTRY,
        "gemini_configured": gemini_ok,
        "agents": ["receptionist", "booking", "faq", "emergency"],
        "providers": {"llm": "gemini" if gemini_ok else "ollama (fallback)", "tts": "edge_tts", "stt": "whisper"},
    }


@app.post("/api/appointments")
async def create_appointment(apt: AppointmentCreate):
    apt_id = str(uuid.uuid4())
    with get_cursor() as c:
        c.execute("""INSERT INTO appointments (id, customer_name, customer_phone, service_type, scheduled_time, notes)
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  (apt_id, apt.customer_name, apt.customer_phone, apt.service_type, apt.scheduled_time, apt.notes))
    return {"id": apt_id, "status": "created"}


@app.get("/api/calls")
async def list_calls(limit: int = 50):
    with get_cursor() as c:
        c.execute("SELECT * FROM calls ORDER BY created_at DESC LIMIT ?", (limit,))
        cols = [col[0] for col in c.description]
        return {"calls": [dict(zip(cols, row)) for row in c.fetchall()]}


@app.get("/api/stats")
async def get_stats():
    with get_cursor() as c:
        c.execute("SELECT COUNT(*) FROM calls"); total = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM appointments"); bookings = c.fetchone()[0]
        today = datetime.utcnow().date().isoformat()
        c.execute("SELECT COUNT(*) FROM calls WHERE date(created_at) = ?", (today,)); today_ct = c.fetchone()[0]
        c.execute("""SELECT intent, COUNT(*) as cnt FROM calls WHERE intent != ''
                     GROUP BY intent ORDER BY cnt DESC LIMIT 5""")
        top_intents = [{"intent": r[0], "count": r[1]} for r in c.fetchall()]
    return {"total_calls": total, "appointments_booked": bookings, "calls_today": today_ct, "top_intents": top_intents}


# ── Demo HTTP endpoints (for dev, real calls use LiveKit Agents) ──

from providers import load_config, create_all_providers

DEMO_CFG = load_config()
DEMO_PROVIDERS = create_all_providers(DEMO_CFG)
DEMO_BIZ = {
    "name": "CoolAir Services", "industry": "hvac",
    "services": ["AC Repair", "AC Installation", "AC Servicing", "AC Gas Refilling"],
    "hours": "8 AM to 8 PM, Monday to Sunday",
}


class VoiceRequest(BaseModel):
    text: str


@app.post("/api/voice")
async def voice_endpoint(req: VoiceRequest):
    from providers.base import Message
    result = await DEMO_PROVIDERS["llm"].chat([Message(role="user", content=req.text)])
    response_text = result.content
    audio_url = None
    audio_size = 0
    mp3_data = await DEMO_PROVIDERS["tts"].synthesize(response_text)
    if mp3_data:
        os.makedirs("/tmp/smb_voice_audio", exist_ok=True)
        fd, path = tempfile.mkstemp(suffix=".mp3", dir="/tmp/smb_voice_audio")
        os.write(fd, mp3_data)
        os.close(fd)
        audio_url = f"/api/audio/{os.path.basename(path)}"
        audio_size = len(mp3_data)
    return {"transcript": req.text, "intent": "demo", "response": response_text, "audio_url": audio_url, "audio_size": audio_size, "gemini_used": True}


@app.get("/api/audio/{filename}")
async def get_audio(filename: str):
    audio_path = os.path.join("/tmp/smb_voice_audio", filename)
    if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
        return StreamingResponse(open(audio_path, "rb"), media_type="audio/mpeg")
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Audio not found")


@app.get("/api/business-context")
async def business_context():
    return DEMO_BIZ


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
