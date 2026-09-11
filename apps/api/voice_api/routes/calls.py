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


class CreateCallRequest(BaseModel):
    version_id: str
    caller_phone: str = ""
    status: str = "completed"
    started_at: Optional[str] = None
    ended_at: Optional[str] = None


class CreateTurnTraceRequest(BaseModel):
    turn_id: int
    transcript: str = ""
    assistant_text: str = ""
    llm_ttft_ms: int = 0
    ttfa_ms: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    tool_ms: list = []


class TurnTraceResponse(BaseModel):
    id: str
    call_id: str
    turn_id: int
    transcript: str
    assistant_text: str
    llm_ttft_ms: int
    ttfa_ms: int
    prompt_tokens: int
    completion_tokens: int
    tool_ms: list
    created_at: str


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


@router.post("/calls", response_model=CallResponse, status_code=status.HTTP_201_CREATED)
def create_call(
    req: CreateCallRequest,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("calls:read")),
) -> CallResponse:
    """Record a call session for the current tenant."""
    import datetime as dt
    import uuid

    call_id = f"call_{uuid.uuid4().hex[:12]}"
    now = dt.datetime.now(dt.timezone.utc)
    start_dt = dt.datetime.fromisoformat(req.started_at.replace("Z", "+00:00")) if req.started_at else now
    end_dt = dt.datetime.fromisoformat(req.ended_at.replace("Z", "+00:00")) if req.ended_at else None

    call = Call(
        id=call_id,
        tenant_id=principal.tenant_id,
        version_id=req.version_id,
        caller_phone=req.caller_phone,
        started_at=start_dt,
        ended_at=end_dt,
        status=req.status,
    )
    session.add(call)
    session.commit()
    session.refresh(call)

    return CallResponse(
        id=call.id,
        version_id=call.version_id,
        caller_phone=call.caller_phone,
        started_at=call.started_at.isoformat(),
        ended_at=call.ended_at.isoformat() if call.ended_at else None,
        status=call.status,
    )


@router.post(
    "/calls/{call_id}/traces",
    response_model=TurnTraceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_turn_trace(
    call_id: str,
    req: CreateTurnTraceRequest,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("calls:read")),
) -> TurnTraceResponse:
    """Record turn-level telemetry for a call."""
    import uuid

    call = (
        session.query(Call)
        .filter(Call.id == call_id, Call.tenant_id == principal.tenant_id)
        .first()
    )
    if not call:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Call not found")

    trace_id = f"tr_{uuid.uuid4().hex[:12]}"
    trace = TurnTrace(
        id=trace_id,
        call_id=call_id,
        turn_id=req.turn_id,
        transcript=req.transcript,
        assistant_text=req.assistant_text,
        llm_ttft_ms=req.llm_ttft_ms,
        ttfa_ms=req.ttfa_ms,
        prompt_tokens=req.prompt_tokens,
        completion_tokens=req.completion_tokens,
        tool_ms=req.tool_ms,
    )
    session.add(trace)
    session.commit()
    session.refresh(trace)

    return TurnTraceResponse(
        id=trace.id,
        call_id=trace.call_id,
        turn_id=trace.turn_id,
        transcript=trace.transcript,
        assistant_text=trace.assistant_text,
        llm_ttft_ms=trace.llm_ttft_ms,
        ttfa_ms=trace.ttfa_ms,
        prompt_tokens=trace.prompt_tokens,
        completion_tokens=trace.completion_tokens,
        tool_ms=trace.tool_ms,
        created_at=trace.created_at.isoformat(),
    )


@router.get(
    "/calls/{call_id}/traces",
    response_model=List[TurnTraceResponse],
)
def get_turn_traces(
    call_id: str,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("calls:read")),
) -> List[TurnTraceResponse]:
    """Retrieve turn telemetry traces for a call."""
    call = (
        session.query(Call)
        .filter(Call.id == call_id, Call.tenant_id == principal.tenant_id)
        .first()
    )
    if not call:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Call not found")

    traces = (
        session.query(TurnTrace)
        .filter(TurnTrace.call_id == call_id)
        .order_by(TurnTrace.turn_id.asc())
        .all()
    )
    return [
        TurnTraceResponse(
            id=t.id,
            call_id=t.call_id,
            turn_id=t.turn_id,
            transcript=t.transcript,
            assistant_text=t.assistant_text,
            llm_ttft_ms=t.llm_ttft_ms,
            ttfa_ms=t.ttfa_ms,
            prompt_tokens=t.prompt_tokens,
            completion_tokens=t.completion_tokens,
            tool_ms=t.tool_ms or [],
            created_at=t.created_at.isoformat(),
        )
        for t in traces
    ]
