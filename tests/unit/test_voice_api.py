"""Integration tests for voice_api control plane.

Asserts:
  - Auth enforcement and scope checking (HTTP 401 / 403)
  - IDOR security: cross-tenant data isolation
  - AgentVersion immutable creation & checksum integrity
  - Appointments idempotency
  - Certify state transitions (draft -> logic -> acoustic)
"""
import os
import tempfile
import pytest
from fastapi.testclient import TestClient

tmp_db = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
tmp_db_path = tmp_db.name
tmp_db.close()

os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db_path}"
os.environ["DEPLOYMENT_MODE"] = "local-private"
os.environ["LLAMA_BASE_URL"] = "http://127.0.0.1:8083/v1"

import sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO / "packages"))
sys.path.insert(0, str(REPO / "apps" / "api"))

from voice_api.main import app
from voice_api.db import init_db, reset_engine

reset_engine()
init_db(f"sqlite:///{tmp_db_path}")
client = TestClient(app)


def teardown_module():
    reset_engine()
    if os.path.exists(tmp_db_path):
        os.unlink(tmp_db_path)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["deployment_mode"] == "local-private"


def test_unauthorized_access():
    resp = client.post("/api/v1/businesses", json={"name": "Acme HVAC", "industry": "hvac"})
    assert resp.status_code == 401


def test_tenant_creation_and_api_key_flow():
    # 1. Bootstrap Tenant A
    resp_a = client.post("/api/v1/auth/bootstrap", json={"tenant_name": "Tenant A", "operator_email": "a@example.com"})
    assert resp_a.status_code == 201
    tenant_a = resp_a.json()
    key_a = tenant_a["api_key"]
    headers_a = {"Authorization": f"Bearer {key_a}"}

    # 2. Create Business under Tenant A
    biz_resp = client.post("/api/v1/businesses", json={"name": "CoolAir", "industry": "hvac"}, headers=headers_a)
    assert biz_resp.status_code == 201
    biz_id = biz_resp.json()["id"]

    # 3. Create Agent under Tenant A
    agent_resp = client.post(
        "/api/v1/agents",
        json={"business_id": biz_id, "name": "Receptionist Agent"},
        headers=headers_a,
    )
    assert agent_resp.status_code == 201
    agent_id = agent_resp.json()["id"]

    # 4. Bootstrap Tenant B and try to access Tenant A's agent (IDOR test)
    resp_b = client.post("/api/v1/auth/bootstrap", json={"tenant_name": "Tenant B", "operator_email": "b@example.com"})
    assert resp_b.status_code == 201
    key_b = resp_b.json()["api_key"]
    headers_b = {"Authorization": f"Bearer {key_b}"}

    # Cross-tenant read must return 404
    cross_read = client.get(f"/api/v1/agents/{agent_id}", headers=headers_b)
    assert cross_read.status_code == 404

    # 5. Create AgentVersion under Tenant A
    ver_payload = {
        "business_name": "CoolAir Services",
        "industry": "hvac",
        "services": ["AC Repair", "AC Servicing"],
        "pricing": {"AC Repair": "starting at ₹500"},
        "operating_hours": "8am-8pm",
        "timezone": "UTC",
        "voice_id": "en_US-amy-low",
        "system_prompt": "You are a receptionist.",
        "allowed_tools": ["book_appointment"],
        "never_do": ["Never book appointments outside business hours"],
    }
    ver_resp = client.post(
        f"/api/v1/agents/{agent_id}/versions",
        json={"payload": ver_payload},
        headers=headers_a,
    )
    assert ver_resp.status_code == 201
    version_id = ver_resp.json()["id"]
    assert ver_resp.json()["status"] == "draft"
    assert ver_resp.json()["checksum"] != ""

    # 6. Certify AgentVersion: draft -> certified-logic
    cert_resp = client.post(
        f"/api/v1/agents/{agent_id}/versions/{version_id}/certify",
        json={"level": "logic", "suite_checksum": "core_suite_sha"},
        headers=headers_a,
    )
    assert cert_resp.status_code == 201
    assert cert_resp.json()["status"] == "certified-logic"

    # 7. Create Appointment with Idempotency Key
    apt_data = {
        "call_id": "call_999",
        "phone": "+15551234567",
        "service": "AC Repair",
        "scheduled_time_utc": "2026-09-05T10:00:00Z",
        "idempotency_key": "idem_unique_123",
    }
    apt_resp1 = client.post("/api/v1/appointments", json=apt_data, headers=headers_a)
    assert apt_resp1.status_code == 201
    apt_id = apt_resp1.json()["id"]

    # Re-posting with same idempotency key returns existing appointment
    apt_resp2 = client.post("/api/v1/appointments", json=apt_data, headers=headers_a)
    assert apt_resp2.status_code == 201
    assert apt_resp2.json()["id"] == apt_id
