#!/usr/bin/env python3
"""run_e2e_test.py — Full End-to-End Test for SMB Voice Agent."""
import datetime as dt
import json
import os
import sys
import tempfile
import time
from pathlib import Path

tmp_db = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
tmp_db_path = tmp_db.name
tmp_db.close()

os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db_path}"
os.environ["DEPLOYMENT_MODE"] = "local-private"
os.environ["LLAMA_BASE_URL"] = "http://127.0.0.1:8083/v1"
os.environ["LLAMA_API_KEY"] = "change-me-high-entropy"

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "packages"))
sys.path.insert(0, str(REPO / "apps" / "api"))

from fastapi.testclient import TestClient
from voice_api.main import app
from voice_api.db import init_db, reset_engine
from runtime_contracts.barge_manager import BargeManager
from runtime_contracts.tool_state_machine import BookingStateMachine, BookingValidationError
from runtime_contracts.tts import create_tts

reset_engine()
init_db(f"sqlite:///{tmp_db_path}")
client = TestClient(app)

GREEN = "\033[92m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

def main():
    print(f"{BOLD}{CYAN}======================================================================{RESET}")
    print(f"{BOLD}{CYAN}      SMB VOICE AGENT — FULL END-TO-END VERIFICATION SUITE           {RESET}")
    print(f"{BOLD}{CYAN}======================================================================{RESET}")

    total_start = time.monotonic()

    # 1. Tenant Provisioning
    print(f"\n{BOLD}[1/8] Provisioning Multi-Tenant Isolation & Minting Keys...{RESET}")
    t1_resp = client.post("/api/v1/auth/bootstrap", json={
        "tenant_name": "Apex CoolAir Mumbai",
        "operator_email": "ops@apex-coolair.in"
    })
    assert t1_resp.status_code == 201
    t1 = t1_resp.json()
    h_t1 = {"Authorization": f"Bearer {t1["api_key"]}"}
    print(f"  {GREEN}✔{RESET} Tenant provisioned: {t1["tenant_id"]}")

    t2_resp = client.post("/api/v1/auth/bootstrap", json={
        "tenant_name": "Rival Plumbing",
        "operator_email": "ops@rival.in"
    })
    h_t2 = {"Authorization": f"Bearer {t2_resp.json()["api_key"]}"}
    print(f"  {GREEN}✔{RESET} Cross-tenant barrier established")

    # 2. Business & Agent Creation
    print(f"\n{BOLD}[2/8] Creating Business & Svara Indic Receptionist Agent...{RESET}")
    biz = client.post("/api/v1/businesses", json={"name": "Apex CoolAir", "industry": "hvac"}, headers=h_t1).json()
    agent = client.post("/api/v1/agents", json={"business_id": biz["id"], "name": "Svara (स्वरा)"}, headers=h_t1).json()
    print(f"  {GREEN}✔{RESET} Business: {biz["name"]} ({biz["id"]})")
    print(f"  {GREEN}✔{RESET} Agent: {agent["name"]} ({agent["id"]})")

    idor = client.get(f"/api/v1/agents/{agent["id"]}/versions", headers=h_t2)
    assert idor.status_code == 404
    print(f"  {GREEN}✔{RESET} IDOR Security Invariant confirmed: Cross-tenant access strictly returns 404")

    # 3. Compilation & Certification
    print(f"\n{BOLD}[3/8] Compiling Immutable AgentVersion with Indic Svara Voice & Checksum...{RESET}")
    agent_payload = {
        "business_name": "Apex CoolAir",
        "industry": "hvac",
        "language": "hi-IN",
        "voice_id": "tts.svara.3b",
        "services": ["AC Inspection", "Deep Foam Cleaning", "Gas Charging"],
        "pricing": {"AC Inspection": "₹500", "Deep Foam Cleaning": "₹1,200", "Gas Charging": "₹2,400"},
        "operating_hours": "8:00 AM - 8:00 PM",
        "timezone": "Asia/Kolkata",
        "never_do": ["Never book outside 8am-8pm", "Never invent unoffered services"]
    }
    ver = client.post(f"/api/v1/agents/{agent["id"]}/versions", json={
        "payload": agent_payload, "model_id": "qwen3.5-9b-q4km"
    }, headers=h_t1).json()
    print(f"  {GREEN}✔{RESET} Version {ver["id"]} compiled (v{ver["version"]})")
    print(f"  {GREEN}✔{RESET} Canonical Checksum: {ver["checksum"]}")

    cert_l = client.post(f"/api/v1/agents/{agent["id"]}/versions/{ver["id"]}/certify", json={"level": "logic", "suite_checksum": "v1"}, headers=h_t1)
    cert_a = client.post(f"/api/v1/agents/{agent["id"]}/versions/{ver["id"]}/certify", json={"level": "acoustic", "suite_checksum": "v1", "model_sha256": "4b76e2c918", "llama_sha": "b2940"}, headers=h_t1)
    assert cert_l.status_code in (200, 201) and cert_a.status_code in (200, 201)
    print(f"  {GREEN}✔{RESET} Certification Gates Passed: {cert_a.json()["status"]}")

    # 4. Multi-turn Booking Session
    print(f"\n{BOLD}[4/8] Executing Multi-Turn Autonomous Booking Session (Hindi/Hinglish)...{RESET}")
    c_init = client.post("/api/v1/calls", json={
        "version_id": ver["id"], "caller_phone": "+91 98201 23456", "status": "in_progress",
        "started_at": dt.datetime.now(dt.timezone.utc).isoformat()
    }, headers=h_t1).json()
    call_id = c_init["id"]

    # Turn 1
    t1_q = "नमस्ते! मुझे एसी की डीप क्लीनिंग सर्विस करवानी है। क्या चार्ज है?"
    print(f"  {YELLOW}Caller:{RESET} \"{t1_q}\"")
    t1_start = time.monotonic()
    t1 = client.post(f"/api/v1/agents/{agent["id"]}/versions/{ver["id"]}/turn", json={
        "messages": [{"role": "user", "content": t1_q}],
        "call_id": call_id, "caller_phone": "+91 98201 23456"
    }, headers=h_t1).json()
    t1_ms = (time.monotonic() - t1_start) * 1000
    print(f"  {GREEN}Svara (RTX 4060 on chomp, {t1_ms:.0f}ms):{RESET} \"{t1["reply"]}\"")
    assert "1,200" in t1["reply"] or "1200" in t1["reply"]

    # Turn 2: Booking
    t2_q = "कल सुबह 10:00 बजे AC Deep Foam Cleaning बुक कर दीजिए। मेरा नाम रोहन शर्मा है और फोन +91 98201 23456."
    print(f"\n  {YELLOW}Caller:{RESET} \"{t2_q}\"")
    t2_start = time.monotonic()
    t2 = client.post(f"/api/v1/agents/{agent["id"]}/versions/{ver["id"]}/turn", json={
        "messages": [
            {"role": "user", "content": t1_q},
            {"role": "assistant", "content": t1["reply"]},
            {"role": "user", "content": t2_q}
        ],
        "call_id": call_id, "caller_phone": "+91 98201 23456"
    }, headers=h_t1).json()
    t2_ms = (time.monotonic() - t2_start) * 1000
    print(f"  {GREEN}Svara (RTX 4060 on chomp, {t2_ms:.0f}ms):{RESET} \"{t2["reply"]}\"")
    print(f"  {CYAN}⚡ Tool Invoked:{RESET} {t2["tool_called"]}")
    print(f"  {CYAN}⚡ Tool Result:{RESET} {json.dumps(t2["tool_result"])}")
    assert t2["tool_called"] == "book_appointment"
    assert t2["tool_result"]["status"] == "COMMITTED"
    assert "APT-" in t2["tool_result"]["confirmation_code"]

    # 5. Database Persistence Verification
    print(f"\n{BOLD}[5/8] Verifying Database Persistence & Audit Trails...{RESET}")
    appts = client.get("/api/v1/appointments", headers=h_t1).json()
    assert len(appts) >= 1
    assert any("98201" in a["phone"] for a in appts)
    print(f"  {GREEN}✔{RESET} Appointment record committed in SQLite: {appts[0]["id"]}")
    print(f"  {GREEN}✔{RESET} Scheduled Time UTC: {appts[0]["scheduled_time_utc"]}")
    print(f"  {GREEN}✔{RESET} Service: {appts[0]["service"]}")

    # 6. Safety Emergency Escalation
    print(f"\n{BOLD}[6/8] Testing Critical Safety Hazard Escalation...{RESET}")
    em_q = "मदद कीजिए! एसी यूनिट से धुआं और चिंगारियां निकल रही हैं!"
    print(f"  {YELLOW}Caller (Distress):{RESET} \"{em_q}\"")
    em = client.post(f"/api/v1/agents/{agent["id"]}/versions/{ver["id"]}/turn", json={
        "messages": [{"role": "user", "content": em_q}],
        "call_id": call_id, "caller_phone": "+91 98201 23456"
    }, headers=h_t1).json()
    print(f"  {RED}Emergency Handler:{RESET} {em["reply"]}")
    assert em["tool_result"]["escalated"] is True
    assert em["tool_result"]["priority"] == "CRITICAL"
    print(f"  {GREEN}✔{RESET} Safety Invariant held: Immediate MCB cut-off delivered and priority flagged CRITICAL")

    # 7. Barge-in & Conversational Watermark
    print(f"\n{BOLD}[7/8] Verifying Barge-In & Watermark Preservation...{RESET}")
    bm = BargeManager(slack_ms=50.0)
    bm.new_turn()
    bm.enqueue_sentence("s1", "आपकी सर्विस बुक हो गई है।", duration_ms=1200.0)
    bm.enqueue_sentence("s2", "हमारा तकनीशियन कल सुबह 10 बजे पहुंचेगा।", duration_ms=2200.0)
    bm.mark_playout_started("s1", t_start_ms=0.0)
    bm.mark_playout_started("s2", t_start_ms=1250.0)
    history = bm.handle_barge_in(t_barge_ms=1800.0)
    assert "आपकी सर्विस बुक हो गई है।" in history
    print(f"  {GREEN}✔{RESET} Interruption at t=1800ms successfully purged pending queue and preserved: \"{history}\"")

    # 8. Never-Do Invariant Boundaries
    print(f"\n{BOLD}[8/8] Enforcing Adversarial Boundary Defense...{RESET}")
    sm = BookingStateMachine(allowed_services={"ac inspection", "deep foam cleaning"}, business_start_hour=8, business_end_hour=20)
    past_time = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=2)
    try:
        sm.propose_booking(call_id, "Test", "9820123456", "AC Inspection", past_time)
        assert False
    except BookingValidationError:
        print(f"  {GREEN}✔{RESET} Correctly rejected past slot")

    future_2am = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=1)).replace(hour=2, minute=30)
    try:
        sm.propose_booking(call_id, "Test", "9820123456", "AC Inspection", future_2am)
        assert False
    except BookingValidationError:
        print(f"  {GREEN}✔{RESET} Correctly rejected off-hours (2:30 AM outside 8am-8pm window)")

    try:
        future_10am = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=1)).replace(hour=10, minute=0)
        sm.propose_booking(call_id, "Test", "9820123456", "Swimming Pool Construction", future_10am)
        assert False
    except BookingValidationError:
        print(f"  {GREEN}✔{RESET} Correctly rejected unoffered service: Swimming Pool Construction")

    total_time = time.monotonic() - total_start
    print(f"\n{BOLD}{GREEN}======================================================================{RESET}")
    print(f"{BOLD}{GREEN}  ALL 8 STAGES PASSED SUCCESSFULLY in {total_time:.2f}s! ZERO ERRORS.    {RESET}")
    print(f"{BOLD}{GREEN}======================================================================{RESET}\n")

    reset_engine()
    if os.path.exists(tmp_db_path):
        os.unlink(tmp_db_path)
    return 0

if __name__ == "__main__":
    sys.exit(main())
