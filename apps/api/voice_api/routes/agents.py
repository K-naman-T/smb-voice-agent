"""Agent and AgentVersion routes.

Implements §2.15 + §2.22 + invariant I5:
  - AgentVersions are immutable; edits create a new version
  - checksum = sha256(canonical_json(payload without checksum))
  - Live load requires status ∈ {certified-acoustic, live} AND matching
    agent_checksum AND model_sha256 of running GGUF
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from agent_schema.checksum import compute_checksum
from agent_schema.lifecycle import validate_transition
from agent_schema.models import AgentStatus, AgentVersion

from voice_api.auth import Principal, require_scope
from voice_api.db import get_session
from voice_api.models import AgentVersionRecord
from voice_api.repositories import (
    create_agent,
    create_agent_version,
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
