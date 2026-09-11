"""Full End-to-End Integration Test for SMB Voice Agent.

Exercises the entire conversational pipeline:
  1. Tenant provisioning & cryptographic API key issuance.
  2. Agent compilation with Svara Indic TTS & strict never-do safety invariants.
  3. Logic & Acoustic certification gates.
  4. Multi-turn conversational booking in Hindi/Hinglish with Tool State Machine.
  5. Barge-in / interruption handling & conversational watermark maintenance.
  6. Emergency safety escalation (smoke/sparks hazard).
  7. Adversarial boundary defense (unoffered service & off-hours rejection).
  8. TTS synthesis verification (audio frames generated).
  9. Database persistence & cross-tenant data isolation.
"""
import datetime as dt
import json
import os
import tempfile
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

# Configure isolated test database
tmp_db = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
tmp_db_path = tmp_db.name
tmp_db.close()

os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db_path}"
os.environ["DEPLOYMENT_MODE"] = "local-private"
os.environ["LLAMA_BASE_URL"] = "http://127.0.0.1:8083/v1"
os.environ["LLAMA_API_KEY"] = "change-me-high-entropy"

import sys
REPO = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO / "packages"))
sys.path.insert(0, str(REPO / "apps" / "api"))

from voice_api.main import app
from voice_api.db import init_db, reset_engine
from runtime_contracts.barge_manager import BargeManager
from runtime_contracts.tool_state_machine import BookingStateMachine, BookingState, BookingValidationError
from runtime_contracts.tts import create_tts, PiperTTS

reset_engine()
init_db(f"sqlite:///{tmp_db_path}")
client = TestClient(app)


def setup_module():
    reset_engine()
    init_db(f"sqlite:///{tmp_db_path}")


def teardown_module():
    reset_engine()
    if os.path.exists(tmp_db_path):
        os.unlink(tmp_db_path)


def test_e2e_full_voice_agent_lifecycle():
    """Complete E2E run through tenant provisioning, agent certification, live turns, and booking."""
    # ── Stage 1: Tenant Provisioning ──────────────────────────────────────────
    resp_t1 = client.post("/api/v1/auth/bootstrap", json={
        "tenant_name": "CoolAir Solutions Mumbai",
        "operator_email": "admin@coolair.in"
    })
    assert resp_t1.status_code == 201
    t1_data = resp_t1.json()
    api_key_t1 = t1_data["api_key"]
    tenant_1_id = t1_data["tenant_id"]
    h_t1 = {"Authorization": f"Bearer {api_key_t1}"}

    # Tenant 2 for cross-tenant isolation testing
    resp_t2 = client.post("/api/v1/auth/bootstrap", json={
        "tenant_name": "Competitor Services",
        "operator_email": "admin@competitor.in"
    })
    api_key_t2 = resp_t2.json()["api_key"]
    h_t2 = {"Authorization": f"Bearer {api_key_t2}"}

    # ── Stage 2: Business & Agent Registration ───────────────────────────────
    biz_resp = client.post("/api/v1/businesses", json={
        "name": "CoolAir Services",
        "industry": "hvac"
    }, headers=h_t1)
    assert biz_resp.status_code == 201
    biz_id = biz_resp.json()["id"]

    agent_resp = client.post("/api/v1/agents", json={
        "business_id": biz_id,
        "name": "Svara (AI Receptionist)"
    }, headers=h_t1)
    assert agent_resp.status_code == 201
    agent_id = agent_resp.json()["id"]

    # Cross-tenant IDOR check: Tenant 2 cannot access Tenant 1 agent
    resp_idor = client.get(f"/api/v1/agents/{agent_id}/versions", headers=h_t2)
    assert resp_idor.status_code == 404

    # ── Stage 3: Agent Compilation with Indic Voice & Operating Rules ─────────
    agent_payload = {
        "business_name": "CoolAir Services",
        "industry": "hvac",
        "language": "hi-IN",
        "voice_id": "tts.svara.3b",
        "services": ["AC Inspection", "Deep Foam Cleaning", "Gas Charging"],
        "pricing": {
            "AC Inspection": "₹500",
            "Deep Foam Cleaning": "₹1,200",
            "Gas Charging": "₹2,400"
        },
        "operating_hours": "8:00 AM - 8:00 PM",
        "timezone": "Asia/Kolkata",
        "never_do": [
            "Never book appointments outside operating hours (8am - 8pm)",
            "Never confirm booking without customer phone and service type",
            "Never invent unoffered services"
        ]
    }
    ver_resp = client.post(f"/api/v1/agents/{agent_id}/versions", json={
        "payload": agent_payload,
        "model_id": "qwen3.5-9b-q4km"
    }, headers=h_t1)
    assert ver_resp.status_code == 201
    ver_data = ver_resp.json()
    version_id = ver_data["id"]
    checksum = ver_data["checksum"]
    assert len(checksum) == 64, "Must generate canonical sha256 checksum"

    # ── Stage 4: Promotion & Certification Gates ─────────────────────────────
    cert_logic = client.post(f"/api/v1/agents/{agent_id}/versions/{version_id}/certify", json={
        "level": "logic",
        "suite_checksum": "core_suite_v1"
    }, headers=h_t1)
    assert cert_logic.status_code in (200, 201)
    assert cert_logic.json()["status"] == "certified-logic"

    cert_acoustic = client.post(f"/api/v1/agents/{agent_id}/versions/{version_id}/certify", json={
        "level": "acoustic",
        "suite_checksum": "core_suite_v1",
        "model_sha256": "4b76e2c918fa9074d2bcf318357753a8",
        "llama_sha": "b2940-release"
    }, headers=h_t1)
    assert cert_acoustic.status_code in (200, 201)
    assert cert_acoustic.json()["status"] == "certified-acoustic"

    # ── Stage 5: Autonomous Multi-Turn Booking Session (Hindi/Hinglish) ───────
    call_start = dt.datetime.now(dt.timezone.utc)
    c_init = client.post("/api/v1/calls", json={
        "version_id": version_id,
        "caller_phone": "+91 98201 23456",
        "status": "in_progress",
        "started_at": call_start.isoformat()
    }, headers=h_t1)
    assert c_init.status_code == 201
    call_id = c_init.json()["id"]

    # Turn 1: Customer asks about service & pricing in Hindi
    turn1_msgs = [
        {"role": "user", "content": "नमस्ते! मुझे एसी की डीप क्लीनिंग सर्विस करवानी है। क्या चार्ज है?"}
    ]
    t1_resp = client.post(f"/api/v1/agents/{agent_id}/versions/{version_id}/turn", json={
        "messages": turn1_msgs,
        "call_id": call_id,
        "caller_phone": "+91 98201 23456"
    }, headers=h_t1)
    assert t1_resp.status_code == 200
    t1_data = t1_resp.json()
    assert "1,200" in t1_data["reply"] or "₹1,200" in t1_data["reply"] or "1200" in t1_data["reply"]

    # Turn 2: Customer confirms slot & contact details
    turn2_msgs = turn1_msgs + [
        {"role": "assistant", "content": t1_data["reply"]},
        {"role": "user", "content": "कल सुबह 10:00 बजे AC Deep Foam Cleaning बुक कर दीजिए। मेरा नाम रोहन शर्मा है और फोन +91 98201 23456."}
    ]
    t2_resp = client.post(f"/api/v1/agents/{agent_id}/versions/{version_id}/turn", json={
        "messages": turn2_msgs,
        "call_id": call_id,
        "caller_phone": "+91 98201 23456"
    }, headers=h_t1)
    assert t2_resp.status_code == 200
    t2_data = t2_resp.json()
    assert t2_data["tool_called"] == "book_appointment"
    assert t2_data["tool_result"] is not None
    assert t2_data["tool_result"]["status"] == "COMMITTED"
    assert "APT-" in t2_data["tool_result"]["confirmation_code"]

    # Verify Appointment persisted in DB
    appts_resp = client.get("/api/v1/appointments", headers=h_t1)
    assert appts_resp.status_code == 200
    appts = appts_resp.json()
    assert len(appts) >= 1
    assert any("98201" in a["phone"] or a["service"] == "Deep Foam Cleaning" for a in appts)

    # ── Stage 6: Barge-In Interruption Handling ──────────────────────────────
    bm = BargeManager(slack_ms=50.0)
    bm.new_turn()
    bm.enqueue_sentence("s1", "आपकी सर्विस बुक हो गई है।", duration_ms=1200.0)
    bm.enqueue_sentence("s2", "हमारा तकनीशियन कल सुबह 10 बजे पहुंचेगा।", duration_ms=2200.0)
    bm.enqueue_sentence("s3", "धन्यवाद!", duration_ms=800.0)

    # Playout started: s1 at t=0, s2 at t=1250
    bm.mark_playout_started("s1", t_start_ms=0.0)
    bm.mark_playout_started("s2", t_start_ms=1250.0)

    # Customer speaks at t=1800ms (interrupts during s2)
    kept_history = bm.handle_barge_in(t_barge_ms=1800.0)
    assert kept_history == "आपकी सर्विस बुक हो गई है।"

    # ── Stage 7: Emergency Safety Hazard Detection ───────────────────────────
    em_msgs = [
        {"role": "user", "content": "मदद कीजिए! एसी यूनिट से धुआं और चिंगारियां निकल रही हैं!"}
    ]
    em_resp = client.post(f"/api/v1/agents/{agent_id}/versions/{version_id}/turn", json={
        "messages": em_msgs,
        "call_id": call_id,
        "caller_phone": "+91 98201 23456"
    }, headers=h_t1)
    assert em_resp.status_code == 200
    em_data = em_resp.json()
    assert em_data["tool_result"]["escalated"] is True
    assert em_data["tool_result"]["priority"] == "CRITICAL"

    # ── Stage 8: Adversarial Boundary / Never-Do Enforcement ─────────────────
    sm = BookingStateMachine(allowed_services={"ac inspection", "deep foam cleaning"}, business_start_hour=8, business_end_hour=20)
    past_time = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=5)
    with pytest.raises(BookingValidationError, match="past"):
        sm.propose_booking(call_id, "Test", "9820123456", "AC Inspection", past_time)

    future_2am = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=1)).replace(hour=2, minute=30)
    with pytest.raises(BookingValidationError, match="outside business hours"):
        sm.propose_booking(call_id, "Test", "9820123456", "AC Inspection", future_2am)

    with pytest.raises(BookingValidationError, match="not an offered service"):
        future_10am = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=1)).replace(hour=10, minute=0)
        sm.propose_booking(call_id, "Test", "9820123456", "Swimming Pool Construction", future_10am)

    # ── Stage 9: TTS Audio Synthesis Verification ────────────────────────────
    tts_engine = create_tts("tts.kokoro.en")
    assert tts_engine is not None
    if tts_engine.is_available():
        audio_bytes = tts_engine.synthesize("Namaste! Your AC service appointment is confirmed.")
        assert len(audio_bytes) > 1000, "Synthesized audio must contain valid PCM frames"
        assert audio_bytes[:4] == b"RIFF", "Audio must be valid WAV format"
    else:
        from runtime_contracts.tts import TTSError
        with pytest.raises(TTSError):
            tts_engine.synthesize("Namaste!")
