"""Appointments and booking routes (§2.15, §2.23).

Scoped by principal.tenant_id.
Enforces idempotency_key UNIQUE on appointments.
"""
from __future__ import annotations

import datetime as dt
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from voice_api.auth import Principal, require_scope
from voice_api.db import get_session
from voice_api.models import Appointment, BookingProposal

router = APIRouter(prefix="", tags=["appointments"])


class AppointmentResponse(BaseModel):
    id: str
    call_id: str
    phone: str
    service: str
    scheduled_time_utc: str
    timezone: str
    idempotency_key: str
    created_at: str


class CreateAppointmentRequest(BaseModel):
    call_id: str
    phone: str
    service: str
    scheduled_time_utc: str
    timezone: str = "UTC"
    idempotency_key: str
    proposal_id: Optional[str] = None


@router.get("/appointments", response_model=List[AppointmentResponse])
def list_appointments(
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("calls:read")),
) -> List[AppointmentResponse]:
    """List appointments for the current tenant."""
    rows = (
        session.query(Appointment)
        .filter(Appointment.tenant_id == principal.tenant_id)
        .order_by(Appointment.scheduled_time_utc.desc())
        .limit(100)
        .all()
    )
    return [
        AppointmentResponse(
            id=r.id,
            call_id=r.call_id,
            phone=r.phone,
            service=r.service,
            scheduled_time_utc=r.scheduled_time_utc.isoformat(),
            timezone=r.timezone,
            idempotency_key=r.idempotency_key,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    req: CreateAppointmentRequest,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("appointments:write")),
) -> AppointmentResponse:
    """Create an appointment with idempotency key enforcement."""
    # Check for existing idempotency key within tenant
    existing = (
        session.query(Appointment)
        .filter(
            Appointment.tenant_id == principal.tenant_id,
            Appointment.idempotency_key == req.idempotency_key,
        )
        .first()
    )
    if existing:
        return AppointmentResponse(
            id=existing.id,
            call_id=existing.call_id,
            phone=existing.phone,
            service=existing.service,
            scheduled_time_utc=existing.scheduled_time_utc.isoformat(),
            timezone=existing.timezone,
            idempotency_key=existing.idempotency_key,
            created_at=existing.created_at.isoformat(),
        )

    try:
        sched_dt = dt.datetime.fromisoformat(req.scheduled_time_utc.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ISO datetime string: {req.scheduled_time_utc!r}",
        )

    apt_id = f"apt_{uuid.uuid4().hex[:12]}"
    apt = Appointment(
        id=apt_id,
        tenant_id=principal.tenant_id,
        proposal_id=req.proposal_id,
        call_id=req.call_id,
        phone=req.phone,
        service=req.service,
        scheduled_time_utc=sched_dt,
        timezone=req.timezone,
        idempotency_key=req.idempotency_key,
    )
    session.add(apt)
    session.commit()
    session.refresh(apt)

    return AppointmentResponse(
        id=apt.id,
        call_id=apt.call_id,
        phone=apt.phone,
        service=apt.service,
        scheduled_time_utc=apt.scheduled_time_utc.isoformat(),
        timezone=apt.timezone,
        idempotency_key=apt.idempotency_key,
        created_at=apt.created_at.isoformat(),
    )
