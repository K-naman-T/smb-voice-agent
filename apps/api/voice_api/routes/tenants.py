"""Auth, tenants, and API key bootstrap endpoints.

Bootstrap is intentionally minimal: an unauthenticated `/auth/bootstrap` route
mints a new tenant + operator API key so that an agency can stand up its
first tenant. After that, all routes require Bearer auth.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from voice_api.auth import (
    ALL_SCOPES,
    Principal,
    generate_api_key,
    require_scope,
)
from voice_api.db import get_session
from voice_api.models import Tenant, User
from voice_api.repositories import create_api_key, create_tenant, emit_audit


router = APIRouter(prefix="/auth", tags=["auth"])


class BootstrapRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1, max_length=255)
    operator_email: str = Field(..., min_length=3, max_length=255)


class BootstrapResponse(BaseModel):
    tenant_id: str
    api_key: str
    scopes: list[str]


@router.post(
    "/bootstrap",
    response_model=BootstrapResponse,
    status_code=status.HTTP_201_CREATED,
)
def bootstrap(req: BootstrapRequest, session: Session = Depends(get_session)) -> BootstrapResponse:
    """Mint a fresh tenant + admin API key. Idempotent on tenant_name."""
    existing = session.query(Tenant).filter_by(name=req.tenant_name).one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"tenant {req.tenant_name!r} already exists",
        )

    tenant_id = create_tenant(session, name=req.tenant_name)
    user_id = f"usr_{tenant_id[-12:]}"
    session.add(User(id=user_id, tenant_id=tenant_id, email=req.operator_email, role="admin"))
    full_key, kid, prefix = create_api_key(session, tenant_id=tenant_id, scopes=ALL_SCOPES)
    emit_audit(
        session,
        tenant_id=tenant_id,
        actor=user_id,
        kind="tenant.bootstrap",
        detail={"tenant_name": req.tenant_name},
    )
    return BootstrapResponse(tenant_id=tenant_id, api_key=full_key, scopes=list(ALL_SCOPES))


class CreateApiKeyRequest(BaseModel):
    scopes: list[str] = Field(default_factory=list)


class CreateApiKeyResponse(BaseModel):
    api_key: str
    key_id: str
    prefix: str
    scopes: list[str]


@router.post(
    "/api-keys",
    response_model=CreateApiKeyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_api_key_endpoint(
    req: CreateApiKeyRequest,
    session: Session = Depends(get_session),
    principal: Principal = Depends(require_scope("agents:write")),
) -> CreateApiKeyResponse:
    """Mint a new API key for the current tenant.

    Requires `agents:write` scope. The new key is shown to the caller exactly once.
    """
    full_key, kid, prefix = create_api_key(
        session, tenant_id=principal.tenant_id, scopes=req.scopes
    )
    emit_audit(
        session,
        tenant_id=principal.tenant_id,
        actor=principal.api_key_id,
        kind="api_key.created",
        detail={"key_id": kid, "scopes": req.scopes},
    )
    return CreateApiKeyResponse(
        api_key=full_key,
        key_id=kid,
        prefix=prefix,
        scopes=req.scopes,
    )


class ActiveSessionResponse(BaseModel):
    tenant_id: str
    tenant_name: str
    api_key: str
    agent_id: Optional[str] = None
    version_id: Optional[str] = None
    agent_status: Optional[str] = None


@router.get("/session", response_model=ActiveSessionResponse)
def get_or_create_active_session(session: Session = Depends(get_session)) -> ActiveSessionResponse:
    """Return active tenant and valid API key for UI and local tooling."""
    from voice_api.models import Agent, AgentVersionRecord

    tenant = session.query(Tenant).order_by(Tenant.created_at.desc()).first()
    if tenant is None:
        tenant_id = create_tenant(session, name="CoolAir Services Mumbai")
        tenant = session.query(Tenant).filter_by(id=tenant_id).first()

    full_key, kid, prefix = create_api_key(session, tenant_id=tenant.id, scopes=ALL_SCOPES)

    agent = session.query(Agent).filter_by(tenant_id=tenant.id).order_by(Agent.created_at.desc()).first()
    agent_id = agent.id if agent else None
    version = None
    if agent_id:
        version = (
            session.query(AgentVersionRecord)
            .filter_by(agent_id=agent_id)
            .order_by(AgentVersionRecord.version.desc())
            .first()
        )

    return ActiveSessionResponse(
        tenant_id=tenant.id,
        tenant_name=tenant.name,
        api_key=full_key,
        agent_id=agent_id,
        version_id=version.id if version else None,
        agent_status=version.status if version else None,
    )

