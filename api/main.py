"""
SMB Voice Agent — FastAPI Backend
Handles Twilio webhooks, call routing, voice pipeline, and dashboard API.
"""
import os
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Optional
from contextlib import contextmanager

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import TwiMLResponse, JSONResponse
from pydantic import BaseModel
import httpx

from twilio.twiml.voice_response import VoiceResponse, Record, Dial, Number, Conference
from twilio.request_validator import RequestValidator

# Load env
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="SMB Voice Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Config ---
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_TTS_URL = "https://api.minimax.io/v1/t2a_v2"

DB_PATH = os.getenv("DB_PATH", "voice_agent.db")

# --- DB ---
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
    c.execute("""
        CREATE TABLE IF NOT EXISTS calls (
            id TEXT PRIMARY KEY,
            from_phone TEXT,
            to_phone TEXT,
            duration REAL DEFAULT 0,
            status TEXT DEFAULT 'in_progress',
            transcript TEXT DEFAULT '',
            intent TEXT DEFAULT '',
            outcome TEXT DEFAULT '',
            recording_url TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            call_id TEXT,
            customer_name TEXT,
            customer_phone TEXT,
            service_type TEXT,
            scheduled_time TEXT,
            status TEXT DEFAULT 'pending',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (call_id) REFERENCES calls(id)
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            phone TEXT UNIQUE,
            name TEXT,
            total_calls INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.commit()
    db.close()

init_db()

# --- Twilio Validator ---
def validate_twilio_request(request: Request) -> bool:
    if not TWILIO_AUTH_TOKEN:
        return True  # Skip validation in dev
    validator = RequestValidator(TWILIO_AUTH_TOKEN)
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    return validator.validate(url, await request.form(), signature)

# --- Pydantic Models ---
class AppointmentCreate(BaseModel):
    customer_name: str
    customer_phone: str
    service_type: str
    scheduled_time: str
    notes: str = ""

# --- Voice Pipeline ---
async def transcribe_audio(audio_url: str) -> str:
    """Transcribe audio using Sarvam STT API."""
    if not SARVAM_API_KEY:
        return "Sarvam API key not configured"
    
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            # Download audio first
            audio_resp = await client.get(audio_url)
            audio_data = audio_resp.content
            
            # Sarvam STT endpoint
            files = {"file": ("audio.wav", audio_data, "audio/wav")}
            data = {
                "api_key": SARVAM_API_KEY,
                "model": "saarika:2.0",
                "language_code": "en-IN"
            }
            resp = await client.post(
                "https://api.sarvam.ai/speech-to-text",
                files=files,
                data=data
            )
            result = resp.json()
            return result.get("transcript", "")
        except Exception as e:
            return f"Transcription error: {str(e)}"

async def understand_with_gemini(transcript: str, business_context: dict) -> dict:
    """Classify intent and generate response using Gemini function calling."""
    if not GEMINI_API_KEY:
        return {"intent": "error", "response": "Gemini API key not configured", "action": None}
    
    system_prompt = f"""You are an AI voice agent for a small business.
Business: {business_context.get('name', 'Local Service Business')}
Services: {', '.join(business_context.get('services', []))}
Hours: {business_context.get('hours', '9 AM - 6 PM')}
Pricing: {business_context.get('pricing', 'Varies by service')}

Classify the caller's intent and respond appropriately.
Intents: service_request, pricing_inquiry, booking_status, emergency, complaint, general_inquiry, unknown

Respond with JSON: {{"intent": "...", "response": "...", "action": {{"type": "book_appointment|give_info|route_emergency|take_message", ...}}}}"""

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v2beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": f"{system_prompt}\n\nCaller: {transcript}"}]}],
                    "generationConfig": {"responseMimeType": "application/json"}
                }
            )
            result = resp.json()
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except Exception as e:
            return {"intent": "error", "response": f"LLM error: {str(e)}", "action": None}

async def generate_tts(text: str) -> bytes:
    """Generate TTS audio using MiniMax."""
    if not MINIMAX_API_KEY:
        return b""
    
    headers = {
        "Authorization": f"Bearer {MINIMAX_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "speech-02-hd",
        "text": text,
        "voice_setting": {
            "voice_id": "male-qn-qingse",
            "speed": 1.0,
            "pitch": 0,
            "volume": 0,
            "api_version": "v2"
        },
        "request_json": 1,
        "audio_type": "wav"
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(MINIMAX_TTS_URL, headers=headers, json=payload)
            if resp.status_code == 200:
                return resp.content
            return b""
        except:
            return b""

# --- Webhook Endpoints ---
@app.get("/")
async def root():
    return {"status": "ok", "service": "SMB Voice Agent"}

@app.get("/health")
async def health():
    return {"status": "healthy", "db": DB_PATH}

@app.route("/webhook/twilio", methods=["GET", "POST"])
async def twilio_webhook(request: Request):
    """Main Twilio webhook for inbound calls."""
    # Validate request
    if not validate_twilio_request(request):
        return TwiMLResponse("<Response><Reject /></Response>")
    
    form = await request.form()
    from_phone = form.get("From", "")
    call_sid = form.get("CallSid", "")
    
    # Log the call
    import uuid
    call_id = str(uuid.uuid4())
    with get_cursor() as c:
        c.execute(
            "INSERT INTO calls (id, from_phone, to_phone, status, created_at) VALUES (?, ?, ?, ?, ?)",
            (call_id, from_phone, TWILIO_PHONE_NUMBER, "in_progress", datetime.utcnow().isoformat())
        )
    
    # Build TwiML response - greet and collect voice input
    response = VoiceResponse()
    
    # Greeting
    response.say(
        "Thanks for calling. I'm your AI assistant. Please tell me what you need in a few words.",
        voice="Polly.Neural",
        language="en-IN"
    )
    
    # Record caller's request (max 10 seconds)
    response.record(
        maxLength=10,
        playBeep=False,
        recordingStatusCallback="/webhook/twilio/recording",
        action="/webhook/twilio/handle-recording"
    )
    
    return TwiMLResponse(str(response))

@app.route("/webhook/twilio/recording", methods=["GET", "POST"])
async def twilio_recording(request: Request):
    """Called when recording is complete."""
    form = await request.form()
    recording_url = form.get("RecordingUrl", "")
    call_sid = form.get("CallSid", "")
    
    return TwiMLResponse("")

@app.route("/webhook/twilio/handle-recording", methods=["GET", "POST"])
async def handle_recording(request: Request):
    """Process the recorded audio and respond."""
    form = await request.form()
    recording_url = form.get("RecordingUrl", "")
    call_sid = form.get("CallSid", "")
    
    response = VoiceResponse()
    
    # Simple fallback response since we're still bootstrapping
    response.say(
        "I didn't catch that clearly. Please call back or leave a message. Goodbye.",
        voice="Polly.Neural"
    )
    response.hangup()
    
    return TwiMLResponse(str(response))

@app.post("/webhook/twilio/status")
async def twilio_status(request: Request):
    """Handle call status callbacks."""
    if not validate_twilio_request(request):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")
    
    form = await request.form()
    call_sid = form.get("CallSid", "")
    call_status = form.get("CallStatus", "")
    call_duration = float(form.get("CallDuration", 0) or 0)
    
    with get_cursor() as c:
        c.execute(
            "UPDATE calls SET status = ?, duration = ? WHERE from_phone = ? ORDER BY created_at DESC LIMIT 1",
            (call_status, call_duration, form.get("From", ""))
        )
    
    return {"status": "ok"}

# --- Dashboard API ---
@app.get("/api/calls")
async def list_calls(limit: int = 50, offset: int = 0):
    with get_cursor() as c:
        c.execute(
            "SELECT * FROM calls ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )
        columns = [col[0] for col in c.description]
        rows = c.fetchall()
        calls = [dict(zip(columns, row)) for row in rows]
    
    return {"calls": calls, "total": len(calls)}

@app.get("/api/calls/{call_id}")
async def get_call(call_id: str):
    with get_cursor() as c:
        c.execute("SELECT * FROM calls WHERE id = ?", (call_id,))
        columns = [col[0] for col in c.description]
        row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Call not found")
        call = dict(zip(columns, row))
    
    return call

@app.get("/api/appointments")
async def list_appointments(limit: int = 50):
    with get_cursor() as c:
        c.execute(
            "SELECT * FROM appointments ORDER BY scheduled_time DESC LIMIT ?",
            (limit,)
        )
        columns = [col[0] for col in c.description]
        rows = c.fetchall()
        appointments = [dict(zip(columns, row)) for row in rows]
    
    return {"appointments": appointments}

@app.post("/api/appointments")
async def create_appointment(apt: AppointmentCreate):
    import uuid
    apt_id = str(uuid.uuid4())
    with get_cursor() as c:
        c.execute(
            """INSERT INTO appointments (id, customer_name, customer_phone, service_type, scheduled_time, notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (apt_id, apt.customer_name, apt.customer_phone, apt.service_type, apt.scheduled_time, apt.notes)
        )
    
    return {"id": apt_id, "status": "created"}

@app.get("/api/customers")
async def list_customers(limit: int = 50):
    with get_cursor() as c:
        c.execute(
            "SELECT * FROM customers ORDER BY total_calls DESC LIMIT ?",
            (limit,)
        )
        columns = [col[0] for col in c.description]
        rows = c.fetchall()
        customers = [dict(zip(columns, row)) for row in rows]
    
    return {"customers": customers}

@app.get("/api/stats")
async def get_stats():
    with get_cursor() as c:
        # Total calls
        c.execute("SELECT COUNT(*) FROM calls")
        total_calls = c.fetchone()[0]
        
        # Missed calls
        c.execute("SELECT COUNT(*) FROM calls WHERE status = 'no-answer' OR status = 'missed'")
        missed_calls = c.fetchone()[0]
        
        # Appointments
        c.execute("SELECT COUNT(*) FROM appointments")
        appointments_booked = c.fetchone()[0]
        
        # Avg duration
        c.execute("SELECT AVG(duration) FROM calls WHERE duration > 0")
        avg_dur = c.fetchone()[0] or 0
        
        # Today's calls
        today = datetime.utcnow().date().isoformat()
        c.execute("SELECT COUNT(*) FROM calls WHERE date(created_at) = ?", (today,))
        calls_today = c.fetchone()[0]
        
        # Top intents
        c.execute("SELECT intent, COUNT(*) as cnt FROM calls WHERE intent != '' GROUP BY intent ORDER BY cnt DESC LIMIT 5")
        top_intents = [{"intent": row[0], "count": row[1]} for row in c.fetchall()]
    
    return {
        "total_calls": total_calls,
        "missed_calls": missed_calls,
        "appointments_booked": appointments_booked,
        "avg_duration": avg_dur,
        "calls_today": calls_today,
        "top_intents": top_intents
    }

@app.post("/api/test/voice")
async def test_voice(text: str = "Hello, this is a test of the voice agent system."):
    """Test TTS pipeline."""
    audio = await generate_tts(text)
    return {"text": text, "audio_generated": len(audio) > 0, "audio_size": len(audio)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
