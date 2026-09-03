"""Calls and telemetry traces routes (§2.15, §2.21)."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from voice_api.auth import Principal, require_scope
from voice_api.db import get_session
from voice_api.models import Call, TurnTrace

router = APIRouter(prefix="", tags=["calls"])


class CallResponse(BaseModel):
    id: str
    version_id: str
    caller_phone: str
    started_at: str
    ended_at: Optional[str] = None
    status: str


@router.get("/calls", response_model=List[CallResponse])
def list_calls(
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("calls:read")),
) -> List[CallResponse]:
    """List calls for the current tenant."""
    rows = (
        session.query(Call)
        .filter(Call.tenant_id == principal.tenant_id)
        .order_by(Call.started_at.desc())
        .limit(100)
        .all()
    )
    return [
        CallResponse(
            id=r.id,
            version_id=r.version_id,
            caller_phone=r.caller_phone,
            started_at=r.started_at.isoformat(),
            ended_at=r.ended_at.isoformat() if r.ended_at else None,
            status=r.status,
        )
        for r in rows
    ]
