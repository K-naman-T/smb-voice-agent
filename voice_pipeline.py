"""
Voice Pipeline — Core product logic
Handles: Record → Transcribe → Understand → Act → Speak → SMS
"""
import os
import json
import uuid
import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

import httpx
from dotenv import load_dotenv

load_dotenv()

# --- Config ---
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_TTS_URL = "https://api.minimax.io/v2/t2a_v2"  # Native TTS endpoint

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")

DB_PATH = os.getenv("DB_PATH", "voice_agent.db")

# Thread pool for sync operations
executor = ThreadPoolExecutor(max_workers=4)

# --- DB Helpers ---
def get_db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def upsert_customer(phone: str, name: Optional[str] = None) -> str:
    db = get_db()
    c = db.cursor()
    c.execute("SELECT id FROM customers WHERE phone = ?", (phone,))
    row = c.fetchone()
    if row:
        c.execute("UPDATE customers SET total_calls = total_calls + 1 WHERE phone = ?", (phone,))
        cust_id = row[0]
    else:
        cust_id = str(uuid.uuid4())
        c.execute(
            "INSERT INTO customers (id, phone, name, total_calls) VALUES (?, ?, ?, 1)",
            (cust_id, phone, name or "Unknown")
        )
    db.commit()
    db.close()
    return cust_id

def create_appointment(call_id: str, customer_name: str, customer_phone: str,
                       service_type: str, scheduled_time: str, notes: str = "") -> str:
    db = get_db()
    c = db.cursor()
    apt_id = str(uuid.uuid4())
    c.execute("""
        INSERT INTO appointments (id, call_id, customer_name, customer_phone, service_type, scheduled_time, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    """, (apt_id, call_id, customer_name, customer_phone, service_type, scheduled_time, notes))
    db.commit()
    db.close()
    return apt_id

def update_call(call_id: str, transcript: str = "", intent: str = "",
                outcome: str = "", recording_url: str = ""):
    db = get_db()
    c = db.cursor()
    c.execute("""
        UPDATE calls SET transcript = ?, intent = ?, outcome = ?, recording_url = ?
        WHERE id = ?
    """, (transcript, intent, outcome, recording_url, call_id))
    db.commit()
    db.close()

# --- STT: Sarvam ---
async def transcribe(audio_url: str) -> str:
    """
    Transcribe audio using Sarvam AI STT API.
    Supports: en-IN, hi-IN, bn, mr, ta, te, kn, ml, gu, pa, ml (Indic languages)
    """
    if not SARVAM_API_KEY:
        return "[Sarvam API key not configured]"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Download audio from Twilio URL
            audio_resp = await client.get(audio_url)
            if audio_resp.status_code != 200:
                return f"[Audio download failed: {audio_resp.status_code}]"

            audio_data = audio_resp.content

            # Sarvam STT v1 endpoint
            files = {
                "file": ("recording.wav", audio_data, "audio/wav")
            }
            data = {
                "api_key": SARVAM_API_KEY,
                "model": "saarika:2.0",
                "language_code": "en-IN",
                "punctuate": True
            }

            resp = await client.post(
                "https://api.sarvam.ai/speech-to-text",
                files=files,
                data=data
            )

            if resp.status_code != 200:
                return f"[Sarvam error: {resp.status_code}] {resp.text}"

            result = resp.json()
            transcript = result.get("transcript", "").strip()

            if not transcript:
                return "[No speech detected]"

            return transcript

    except httpx.TimeoutException:
        return "[STT timeout]"
    except Exception as e:
        return f"[STT error: {str(e)}]"


# --- LLM: Gemini Function Calling ---
async def understand(transcript: str, business_context: dict) -> dict:
    """
    Use Gemini with function calling to classify intent and extract structured data.
    Returns: {intent, response, action: {type, ...}}
    """
    if not GEMINI_API_KEY:
        return {
            "intent": "error",
            "response": "AI service not configured. Please call back later.",
            "action": None
        }

    if not transcript or transcript.startswith("["):
        return {
            "intent": "unknown",
            "response": "I didn't catch that clearly. Could you please repeat?",
            "action": None
        }

    services_list = ", ".join(business_context.get("services", []))
    pricing_list = "\n".join(
        f"- {k}: {v}" for k, v in business_context.get("pricing", {}).items()
    )

    system_prompt = f"""You are a professional AI phone assistant for a small business in India.
Business Name: {business_context.get('name', 'Local Service Business')}
Industry: {business_context.get('industry', 'service')}
Services: {services_list}
Pricing:\n{pricing_list}
Operating Hours: {business_context.get('hours', '9 AM to 6 PM')}

RULES:
- Be brief and natural on the phone — max 2 sentences per response
- Always confirm details before booking
- If booking, extract: customer name, phone, preferred time, service type
- Classify intent accurately
- If Hindi or mixed Hindi-English is used, respond in the same language

INTENTS:
- service_request: Caller wants a service (repair, installation, maintenance)
- pricing_inquiry: Caller wants to know prices
- booking_status: Checking existing appointment
- emergency: Urgent/critical issue
- complaint: Not happy with previous service
- general_inquiry: Other questions
- goodbye: Call ending
- unknown: Couldn't understand

Respond ONLY with valid JSON matching this schema:
{{"intent": "string", "response": "string (2 sentences max, spoken language)", "action": {{"type": "string", "service_type": "string", "customer_name": "string", "customer_phone": "string", "scheduled_time": "string", "notes": "string"}}}}}"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v2beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
                json={
                    "contents": [{
                        "parts": [{
                            "text": f"{system_prompt}\n\nCaller said: {transcript}"
                        }]
                    }],
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.3
                    }
                }
            )

            if resp.status_code != 200:
                return {
                    "intent": "error",
                    "response": "I'm having trouble processing your request. Please try again.",
                    "action": None
                }

            result = resp.json()
            raw_text = result["candidates"][0]["content"]["parts"][0]["text"]

            # Parse JSON
            try:
                parsed = json.loads(raw_text)
                return parsed
            except json.JSONDecodeError:
                # Try to extract JSON from text
                import re
                json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                return {
                    "intent": "unknown",
                    "response": raw_text[:200],
                    "action": None
                }

    except Exception as e:
        return {
            "intent": "error",
            "response": f"Sorry, I encountered an issue. Please call back or leave a message.",
            "action": None
        }


# --- TTS: MiniMax ---
async def speak(text: str) -> bytes:
    """
    Convert text to speech using MiniMax Speech-02 HD.
    Returns WAV audio bytes.
    """
    if not MINIMAX_API_KEY:
        return b""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            payload = {
                "model": "speech-02-hd",
                "text": text,
                "voice_setting": {
                    "voice_id": "male-qn-qingse",
                    "speed": 0.95,
                    "pitch": 0,
                    "volume": 0,
                    "api_version": "v2"
                },
                "request_json": 1,
                "audio_type": "wav"
            }

            headers = {
                "Authorization": f"Bearer {MINIMAX_API_KEY}",
                "Content-Type": "application/json"
            }

            resp = await client.post(MINIMAX_TTS_URL, headers=headers, json=payload)

            if resp.status_code == 200:
                return resp.content
            else:
                print(f"MiniMax TTS error: {resp.status_code} {resp.text[:200]}")
                return b""

    except Exception as e:
        print(f"MiniMax TTS exception: {e}")
        return b""


# --- SMS: Twilio ---
async def send_sms(to: str, body: str):
    """Send SMS confirmation via Twilio."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print("Twilio not configured for SMS")
        return

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
                data={
                    "To": to,
                    "From": os.getenv("TWILIO_PHONE_NUMBER", ""),
                    "Body": body
                },
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            )

            if resp.status_code == 201:
                print(f"SMS sent to {to}")
            else:
                print(f"SMS failed: {resp.status_code} {resp.text[:200]}")

    except Exception as e:
        print(f"SMS exception: {e}")


# --- Main Pipeline ---
async def run_pipeline(audio_url: str, call_sid: str, from_phone: str,
                      business_context: dict) -> dict:
    """
    Run the complete voice pipeline for a single call.

    Args:
        audio_url: Twilio recording URL
        call_sid: Twilio call SID
        from_phone: Caller's phone number
        business_context: Business details (name, services, pricing, hours, industry)

    Returns:
        dict with: transcript, intent, response, action_taken, audio_bytes
    """
    result = {
        "transcript": "",
        "intent": "unknown",
        "response": "",
        "action_taken": None,
        "audio_bytes": b""
    }

    # Step 1: Transcribe
    transcript = await transcribe(audio_url)
    result["transcript"] = transcript

    if transcript.startswith("["):
        # Transcription failed
        result["intent"] = "error"
        result["response"] = "Sorry, I couldn't understand that clearly. Please try again or call back. Goodbye."
        result["audio_bytes"] = await speak(result["response"])
        return result

    # Step 2: Understand + Act
    understanding = await understand(transcript, business_context)
    result["intent"] = understanding.get("intent", "unknown")
    result["response"] = understanding.get("response", "")

    action = understanding.get("action")
    if action:
        action_type = action.get("type", "")

        if action_type == "book_appointment":
            # Book the appointment
            service_type = action.get("service_type", "General Service")
            customer_name = action.get("customer_name", "Customer")
            scheduled_time = action.get("scheduled_time", "")

            apt_id = create_appointment(
                call_id=call_sid,
                customer_name=customer_name,
                customer_phone=from_phone,
                service_type=service_type,
                scheduled_time=scheduled_time,
                notes=f"Booked via voice AI: {transcript[:100]}"
            )
            result["action_taken"] = f"appointment_booked:{apt_id}"

            # Send SMS confirmation
            sms_body = (
                f"Hi {customer_name}, your {service_type} appointment with "
                f"{business_context.get('name', 'us')} is confirmed for {scheduled_time}. "
                f"We'll call you to confirm 30 mins before. Thanks!"
            )
            await send_sms(from_phone, sms_body)

            # Add confirmation to response
            result["response"] = (
                f"Perfect. I've booked your {service_type} appointment for {scheduled_time}. "
                f"You'll receive an SMS confirmation shortly. Is there anything else I can help with?"
            )

        elif action_type == "give_info":
            # Just provide information
            result["action_taken"] = "information_provided"

        elif action_type == "route_emergency":
            result["action_taken"] = "emergency_routed"

    # Step 3: Generate TTS
    if result["response"]:
        result["audio_bytes"] = await speak(result["response"])

    # Step 4: Update call record
    update_call(
        call_id=call_sid,
        transcript=transcript,
        intent=result["intent"],
        outcome=str(result["action_taken"] or ""),
        recording_url=audio_url
    )

    return result


# --- Business Context Loader ---
def load_business_context(industry: str = "hvac") -> dict:
    """
    Load business context for a given industry.
    This would normally come from a database or config.
    """
    from api.kits import get_kit

    kit = get_kit(industry)

    return {
        "name": kit.business_name,
        "industry": kit.industry,
        "services": kit.services,
        "pricing": kit.pricing,
        "hours": kit.hours,
    }
