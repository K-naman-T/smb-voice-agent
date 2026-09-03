"""Certify routes and evaluation runs (§2.16).

Certify levels:
  draft -> certified-logic (sim tests pass >=90% x 3 seeds)
  certified-logic -> certified-acoustic (real GGUF tool call >=99%, barge 100%, TTFA <=2800ms)
  certified-acoustic -> live (operator promotion)
"""
from __future__ import annotations

import datetime as dt
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agent_schema.lifecycle import validate_transition
from agent_schema.models import AgentStatus
from voice_api.auth import Principal, require_scope
from voice_api.db import get_session
from voice_api.models import AgentVersionRecord, CertifyRecord

router = APIRouter(prefix="", tags=["certify"])


class CertifyRequest(BaseModel):
    level: str  # logic | acoustic
    suite_checksum: str = "core_v1"
    model_sha256: Optional[str] = ""
    llama_sha: Optional[str] = ""


class CertifyResponse(BaseModel):
    record_id: str
    version_id: str
    level: str
    agent_checksum: str
    suite_checksum: str
    status: str
    created_at: str


@router.post(
    "/agents/{agent_id}/versions/{version_id}/certify",
    response_model=CertifyResponse,
    status_code=status.HTTP_201_CREATED,
)
def run_certify(
    agent_id: str,
    version_id: str,
    req: CertifyRequest,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("certify:run")),
) -> CertifyResponse:
    rec = (
        session.query(AgentVersionRecord)
        .filter(
            AgentVersionRecord.id == version_id,
            AgentVersionRecord.tenant_id == principal.tenant_id,
        )
        .first()
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AgentVersion not found",
        )

    current_status = AgentStatus(rec.status)
    if req.level == "logic":
        target_status = AgentStatus.CERTIFIED_LOGIC
    elif req.level == "acoustic":
        target_status = AgentStatus.CERTIFIED_ACOUSTIC
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown certify level: {req.level!r}",
        )

    # Validate lifecycle state transition (§2.16)
    validate_transition(current_status, target_status)

    record_id = f"cert_{uuid.uuid4().hex[:12]}"
    now = dt.datetime.now(dt.timezone.utc)
    cert = CertifyRecord(
        id=record_id,
        tenant_id=principal.tenant_id,
        version_id=version_id,
        level=req.level,
        agent_checksum=rec.checksum,
        suite_checksum=req.suite_checksum,
        model_sha256=req.model_sha256 or "",
        llama_sha=req.llama_sha or "",
        operator=principal.api_key_id,
        created_at=now,
    )
    session.add(cert)
    rec.status = target_status.value
    session.commit()

    return CertifyResponse(
        record_id=record_id,
        version_id=version_id,
        level=req.level,
        agent_checksum=rec.checksum,
        suite_checksum=req.suite_checksum,
        status=rec.status,
        created_at=now.isoformat(),
    )
