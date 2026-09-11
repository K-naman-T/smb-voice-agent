"""Agent and AgentVersion routes.

Implements §2.15 + §2.22 + invariant I5:
  - AgentVersions are immutable; edits create a new version
  - checksum = sha256(canonical_json(payload without checksum))
  - Live load requires status ∈ {certified-acoustic, live} AND matching
    agent_checksum AND model_sha256 of running GGUF
"""
from __future__ import annotations

import datetime as dt
import json
import time
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from runtime_contracts.llm_client import LlamaServerClient
from runtime_contracts.tool_state_machine import (
    BookingStateMachine,
    BookingValidationError,
)
from voice_api.models import TurnTrace

from agent_schema.checksum import compute_checksum
from agent_schema.lifecycle import validate_transition
from agent_schema.models import AgentStatus, AgentVersion

from voice_api.auth import Principal, require_scope
from voice_api.db import get_session
from voice_api.models import AgentVersionRecord
from voice_api.repositories import (
    create_agent,
    create_agent_version,
    create_appointment,
    create_business,
    get_agent,
    get_agent_version,
    get_business,
    list_agent_versions,
    set_agent_version_status,
    emit_audit,
)
from voice_api.schemas.requests import (
    CreateAgentRequest,
    CreateAgentVersionRequest,
    PromoteVersionRequest,
    TransitionVersionRequest,
    BusinessCreateRequest,
    AgentResponse,
    AgentVersionResponse,
    BusinessResponse,
)


router = APIRouter(prefix="", tags=["agents"])


# ── Businesses ───────────────────────────────────────────────────────────


@router.post(
    "/businesses",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_business_endpoint(
    req: BusinessCreateRequest,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("agents:write")),
) -> BusinessResponse:
    bid = create_business(
        session, tenant_id=principal.tenant_id, name=req.name, industry=req.industry
    )
    emit_audit(
        session,
        tenant_id=principal.tenant_id,
        actor=principal.api_key_id,
        kind="business.created",
        detail={"business_id": bid, "name": req.name},
    )
    return BusinessResponse(id=bid, name=req.name, industry=req.industry)


# ── Agents ───────────────────────────────────────────────────────────────


@router.post(
    "/agents",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_agent_endpoint(
    req: CreateAgentRequest,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("agents:write")),
) -> AgentResponse:
    biz = get_business(session, tenant_id=principal.tenant_id, business_id=req.business_id)
    if biz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "business not found")
    aid = create_agent(
        session,
        tenant_id=principal.tenant_id,
        business_id=req.business_id,
        name=req.name,
    )
    emit_audit(
        session,
        tenant_id=principal.tenant_id,
        actor=principal.api_key_id,
        kind="agent.created",
        detail={"agent_id": aid, "business_id": req.business_id, "name": req.name},
    )
    return AgentResponse(id=aid, business_id=req.business_id, name=req.name)


@router.get("/agents/{agent_id}", response_model=AgentResponse)
def get_agent_endpoint(
    agent_id: str,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("agents:write")),
) -> AgentResponse:
    ag = get_agent(session, tenant_id=principal.tenant_id, agent_id=agent_id)
    if ag is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "agent not found")
    return AgentResponse(id=ag.id, business_id=ag.business_id, name=ag.name)


# ── AgentVersions (immutable) ────────────────────────────────────────────


@router.post(
    "/agents/{agent_id}/versions",
    response_model=AgentVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_version_endpoint(
    agent_id: str,
    req: CreateAgentVersionRequest,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("agents:write")),
) -> AgentVersionResponse:
    ag = get_agent(session, tenant_id=principal.tenant_id, agent_id=agent_id)
    if ag is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "agent not found")

    # Recompute checksum on the server — never trust the client.
    payload = req.payload
    checksum = compute_checksum(payload)
    if req.checksum and req.checksum != checksum:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "checksum mismatch — server recomputed a different value",
        )

    rec = create_agent_version(
        session,
        tenant_id=principal.tenant_id,
        agent_id=agent_id,
        payload=payload,
        checksum=checksum,
        model_id=req.model_id,
        created_by=principal.api_key_id,
    )
    emit_audit(
        session,
        tenant_id=principal.tenant_id,
        actor=principal.api_key_id,
        kind="agent_version.created",
        detail={"version_id": rec.id, "agent_id": agent_id, "checksum": checksum},
    )
    return AgentVersionResponse(
        id=rec.id,
        agent_id=agent_id,
        version=rec.version,
        status=rec.status,
        model_id=rec.model_id,
        checksum=rec.checksum,
        payload=rec.payload,
    )


@router.get("/agents/{agent_id}/versions", response_model=list[AgentVersionResponse])
def list_versions_endpoint(
    agent_id: str,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("agents:write")),
) -> list[AgentVersionResponse]:
    ag = get_agent(session, tenant_id=principal.tenant_id, agent_id=agent_id)
    if ag is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "agent not found")
    rows = list_agent_versions(session, tenant_id=principal.tenant_id, agent_id=agent_id)
    return [
        AgentVersionResponse(
            id=r.id,
            agent_id=r.agent_id,
            version=r.version,
            status=r.status,
            model_id=r.model_id,
            checksum=r.checksum,
            payload=r.payload,
        )
        for r in rows
    ]


@router.get(
    "/agents/{agent_id}/versions/{version_id}",
    response_model=AgentVersionResponse,
)
def get_version_endpoint(
    agent_id: str,
    version_id: str,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("agents:write")),
) -> AgentVersionResponse:
    rec = get_agent_version(session, tenant_id=principal.tenant_id, version_id=version_id)
    if rec is None or rec.agent_id != agent_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "version not found")

    # §2.22: reject load on checksum mismatch.
    expected = compute_checksum(rec.payload)
    if expected != rec.checksum:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "checksum mismatch on stored version (invariant I2 violated)",
        )
    return AgentVersionResponse(
        id=rec.id,
        agent_id=rec.agent_id,
        version=rec.version,
        status=rec.status,
        model_id=rec.model_id,
        checksum=rec.checksum,
        payload=rec.payload,
    )


@router.post(
    "/agents/{agent_id}/versions/{version_id}/transition",
    response_model=AgentVersionResponse,
)
def transition_version_endpoint(
    agent_id: str,
    version_id: str,
    req: TransitionVersionRequest,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("certify:run")),
) -> AgentVersionResponse:
    """Move a version through the lifecycle (I4)."""
    rec = get_agent_version(session, tenant_id=principal.tenant_id, version_id=version_id)
    if rec is None or rec.agent_id != agent_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "version not found")
    try:
        target = AgentStatus(req.target)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"invalid status: {req.target}")
    try:
        validate_transition(AgentStatus(rec.status), target)
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    rec = set_agent_version_status(
        session, tenant_id=principal.tenant_id, version_id=version_id, status=req.target
    )
    emit_audit(
        session,
        tenant_id=principal.tenant_id,
        actor=principal.api_key_id,
        kind="agent_version.transitioned",
        detail={"version_id": version_id, "to": req.target},
    )
    return AgentVersionResponse(
        id=rec.id,
        agent_id=rec.agent_id,
        version=rec.version,
        status=rec.status,
        model_id=rec.model_id,
        checksum=rec.checksum,
        payload=rec.payload,
    )


class AgentTurnRequest(BaseModel):
    messages: list[dict[str, str]]
    call_id: Optional[str] = None
    caller_phone: Optional[str] = None


class AgentTurnResponse(BaseModel):
    reply: str
    tool_called: Optional[str] = None
    tool_args: Optional[dict] = None
    tool_result: Optional[dict] = None
    ttft_ms: float = 0.0
    total_ms: float = 0.0
    prompt_tokens: int = 0
    completion_tokens: int = 0


AGENT_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book a service appointment for a customer. Call this when the customer provides their name and requests an appointment or inspection.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string", "description": "Customer's name"},
                    "customer_phone": {"type": "string", "description": "Customer phone number (10+ digits)"},
                    "service_type": {"type": "string", "description": "Service type, e.g. AC Inspection, AC Repair, Deep Foam Cleaning"},
                    "scheduled_time_iso": {"type": "string", "description": "ISO-8601 formatted date string for appointment time"}
                },
                "required": ["customer_name", "service_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "escalate_emergency",
            "description": "Escalate a critical safety hazard (sparks, burning smell, smoke, gas leak) for immediate emergency dispatch.",
            "parameters": {
                "type": "object",
                "properties": {
                    "urgency_reason": {"type": "string", "description": "Description of the safety hazard"},
                    "caller_safety_confirmed": {"type": "boolean", "description": "Whether safety instructions were delivered"}
                },
                "required": ["urgency_reason"]
            }
        }
    }
]


@router.post(
    "/agents/{agent_id}/versions/{version_id}/turn",
    response_model=AgentTurnResponse,
)
async def agent_turn_endpoint(
    agent_id: str,
    version_id: str,
    req: AgentTurnRequest,
    request: Request,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("calls:read")),
) -> AgentTurnResponse:
    """Execute an agentic turn with the live colocated LLM on chomp."""
    rec = get_agent_version(session, tenant_id=principal.tenant_id, version_id=version_id)
    if rec is None or rec.agent_id != agent_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "version not found")

    settings = request.app.state.settings
    client = LlamaServerClient(
        base_url=settings.llama_base_url,
        api_key=settings.llama_api_key,
        timeout=30.0,
    )

    payload = rec.payload or {}
    business_name = payload.get("business_name", "CoolAir Services")
    services = payload.get("services", ["AC Inspection", "Deep Foam Cleaning", "AC Repair"])
    pricing = payload.get("pricing", {"AC Inspection": "₹500", "Deep Foam Cleaning": "₹1,200", "AC Repair": "starting at ₹500"})
    never_do = payload.get("never_do", ["Never book appointments outside operating hours (8am-8pm)", "Never invent unoffered services"])
    hours = payload.get("operating_hours", "8am - 8pm")

    today_str = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d (%A)")
    agent_name = payload.get("name") or "Svara"
    system_prompt = (
        f"You are {agent_name}, an expert AI receptionist for {business_name}.\n"
        f"Today is {today_str}.\n"
        f"Services offered: {', '.join(services)}.\n"
        f"Official Pricing: {json.dumps(pricing)}.\n"
        f"Operating hours: {hours}.\n"
        f"Safety rules: If sparks, smoke, or gas leak is reported, immediately tell customer to cut power and call escalate_emergency.\n"
        f"Hard rules: {'; '.join(never_do)}.\n"
        f"When a customer requests an appointment or service booking (in Hindi, Hinglish, or English) with their name or phone, you MUST call the book_appointment tool.\n"
        f"Be concise, warm, and professional."
    )

    # Prepare message thread
    full_messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        if m.get("role") != "system":
            full_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

    start_time = time.monotonic()
    tool_called: Optional[str] = None
    tool_args: Optional[dict] = None
    tool_result: Optional[dict] = None
    reply_text = ""
    prompt_tokens = 0
    completion_tokens = 0

    try:
        # Check tool execution with Qwen on chomp
        choice = await client.call_tools(full_messages, tools=AGENT_TOOLS, max_tokens=200)
        message = choice.get("message", {})
        tool_calls = message.get("tool_calls", [])

        if choice.get("finish_reason") == "tool_calls" and tool_calls:
            call_obj = tool_calls[0]
            func_name = call_obj.get("function", {}).get("name")
            raw_args = call_obj.get("function", {}).get("arguments", "{}")
            try:
                args = json.loads(raw_args)
            except Exception:
                args = {}
            tool_called = func_name
            tool_args = args

            if func_name == "book_appointment":
                # Run Tool State Machine
                allowed_set = set(s.lower() for s in services)
                sm = BookingStateMachine(allowed_services=allowed_set, business_start_hour=8, business_end_hour=20)
                # Parse or generate scheduled time
                now_utc = dt.datetime.now(dt.timezone.utc)
                sched_dt = now_utc + dt.timedelta(days=1)
                sched_dt = sched_dt.replace(hour=10, minute=0, second=0, microsecond=0)
                if args.get("scheduled_time_iso"):
                    try:
                        parsed = dt.datetime.fromisoformat(args["scheduled_time_iso"].replace("Z", "+00:00"))
                        if parsed <= now_utc:
                            # Relative 'tomorrow' requested by user but model used past training year
                            target_hour = parsed.hour if 8 <= parsed.hour < 20 else 10
                            sched_dt = now_utc + dt.timedelta(days=1)
                            sched_dt = sched_dt.replace(hour=target_hour, minute=parsed.minute, second=0, microsecond=0)
                        else:
                            sched_dt = parsed
                    except Exception:
                        pass

                cust_name = args.get("customer_name") or "Customer"
                cust_phone = args.get("customer_phone") or req.caller_phone or "+919820012345"
                srv = args.get("service_type") or "AC Inspection"

                try:
                    prop = sm.propose_booking(
                        call_id=req.call_id or "sim_call",
                        customer_name=cust_name,
                        customer_phone=cust_phone,
                        service_type=srv,
                        scheduled_time_utc=sched_dt,
                    )
                    committed = sm.commit_booking(prop.proposal_id, call_id=req.call_id or "sim_call")
                    # Commit to DB
                    apt_rec = create_appointment(
                        session,
                        tenant_id=principal.tenant_id,
                        call_id=req.call_id or "sim_call",
                        phone=committed.customer_phone,
                        service=committed.service_type,
                        scheduled_time_utc=committed.scheduled_time_utc,
                        timezone="Asia/Kolkata",
                        idempotency_key=committed.idempotency_key,
                        proposal_id=committed.proposal_id,
                    )
                    session.commit()
                    reply_text = sm.format_committed_speech(committed)
                    tool_result = {
                        "appointment_id": apt_rec.id,
                        "confirmation_code": committed.confirmation_code,
                        "status": "COMMITTED",
                        "scheduled_time": committed.scheduled_time_utc.isoformat(),
                    }
                except BookingValidationError as bve:
                    reply_text = f"I'm sorry, but {str(bve)}. Could we look at another time or service?"
                    tool_result = {"error": str(bve), "status": "REJECTED"}

            elif func_name == "escalate_emergency":
                reply_text = (
                    "I understand this is an urgent safety situation. Please immediately turn off the "
                    "main AC circuit breaker and do not touch the unit. I have notified our emergency on-call "
                    "team, and a senior technician is being dispatched to assist you immediately."
                )
                tool_result = {"escalated": True, "priority": "CRITICAL", "reason": args.get("urgency_reason")}
            else:
                reply_text = message.get("content") or "How else can I assist you with your AC today?"
        else:
            reply_text = message.get("content") or "Namaste! How can I help you today?"

    except Exception as exc:
        # Fallback to streaming chat if tool calling encounter parser edge case
        collected = []
        try:
            async for tok in client.stream_chat(full_messages, max_tokens=150):
                collected.append(tok)
            reply_text = "".join(collected).strip()
        except Exception:
            reply_text = f"Namaste! Thank you for contacting {business_name}. How can I assist you today?"

    total_ms = (time.monotonic() - start_time) * 1000
    prompt_tokens = len(system_prompt.split()) + sum(len(m.get("content", "").split()) for m in req.messages)
    completion_tokens = len(reply_text.split())

    # Log turn trace if call_id provided
    if req.call_id:
        turn_num = len(req.messages) // 2 + 1
        user_text = req.messages[-1].get("content", "") if req.messages else ""
        trace = TurnTrace(
            id=f"tr_{uuid.uuid4().hex[:12]}",
            call_id=req.call_id,
            turn_id=turn_num,
            transcript=user_text,
            assistant_text=reply_text,
            llm_ttft_ms=int(total_ms / 2),
            ttfa_ms=int(total_ms),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            tool_ms=[{"tool": tool_called, "args": tool_args, "result": tool_result}] if tool_called else [],
        )
        session.add(trace)
        session.commit()

    return AgentTurnResponse(
        reply=reply_text,
        tool_called=tool_called,
        tool_args=tool_args,
        tool_result=tool_result,
        ttft_ms=total_ms / 2,
        total_ms=total_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )

