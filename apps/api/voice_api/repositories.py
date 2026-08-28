"""Tenant-scoped repositories.

Every public function takes a Session and a tenant_id and filters
`WHERE tenant_id = :tenant_id` (or joins on it). IDOR tests verify that
cross-tenant reads/writes return 404 or raise NotFound.
"""
from __future__ import annotations

import datetime as dt
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from voice_api.models import (
    Agent,
    AgentVersionRecord,
    ApiKey,
    Appointment,
    AuditEvent,
    Business,
    Call,
)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


# ── Tenants & api keys ────────────────────────────────────────────────────


def create_tenant(session: Session, *, name: str) -> str:
    tid = _new_id("ten")
    session.add(Tenant(id=tid, name=name))
    session.flush()
    return tid


def create_api_key(
    session: Session,
    *,
    tenant_id: str,
    scopes: Iterable[str] = (),
) -> tuple[str, str, str]:
    """Mint a new API key. Returns (full_key, key_id, prefix)."""
    full, digest, prefix = generate_api_key()
    kid = _new_id("key")
    session.add(
        ApiKey(
            id=kid,
            tenant_id=tenant_id,
            key_hash=digest,
            prefix=prefix,
            scopes=",".join(scopes),
        )
    )
    session.flush()
    return full, kid, prefix


def get_api_key_by_hash(session: Session, key_hash: str) -> Optional[ApiKey]:
    return session.query(ApiKey).filter_by(key_hash=key_hash, revoked=False).one_or_none()


# ── Businesses & agents ───────────────────────────────────────────────────


def create_business(session: Session, *, tenant_id: str, name: str, industry: str = "") -> str:
    bid = _new_id("biz")
    session.add(Business(id=bid, tenant_id=tenant_id, name=name, industry=industry))
    session.flush()
    return bid


def get_business(session: Session, *, tenant_id: str, business_id: str) -> Optional[Business]:
    return (
        session.query(Business)
        .filter_by(id=business_id, tenant_id=tenant_id)
        .one_or_none()
    )


def list_businesses(session: Session, *, tenant_id: str) -> list[Business]:
    return list(session.query(Business).filter_by(tenant_id=tenant_id).all())


def create_agent(session: Session, *, tenant_id: str, business_id: str, name: str = "") -> str:
    aid = _new_id("agt")
    session.add(Agent(id=aid, tenant_id=tenant_id, business_id=business_id, name=name))
    session.flush()
    return aid


def get_agent(session: Session, *, tenant_id: str, agent_id: str) -> Optional[Agent]:
    return session.query(Agent).filter_by(id=agent_id, tenant_id=tenant_id).one_or_none()


# ── AgentVersions (immutable) ─────────────────────────────────────────────


def _next_version(session: Session, *, agent_id: str) -> int:
    last = (
        session.query(AgentVersionRecord)
        .filter_by(agent_id=agent_id)
        .order_by(AgentVersionRecord.version.desc())
        .first()
    )
    return (last.version + 1) if last else 1


def create_agent_version(
    session: Session,
    *,
    tenant_id: str,
    agent_id: str,
    payload: dict,
    checksum: str,
    model_id: str = "",
    created_by: str = "",
) -> AgentVersionRecord:
    """Append a new immutable version. Status starts at 'draft'."""
    version = _next_version(session, agent_id=agent_id)
    rec = AgentVersionRecord(
        id=_new_id("ver"),
        tenant_id=tenant_id,
        agent_id=agent_id,
        version=version,
        status="draft",
        model_id=model_id,
        payload=payload,
        checksum=checksum,
        created_by=created_by,
    )
    session.add(rec)
    session.flush()
    return rec


def get_agent_version(
    session: Session,
    *,
    tenant_id: str,
    version_id: str,
) -> Optional[AgentVersionRecord]:
    return (
        session.query(AgentVersionRecord)
        .filter_by(id=version_id, tenant_id=tenant_id)
        .one_or_none()
    )


def get_agent_version_by_version(
    session: Session,
    *,
    tenant_id: str,
    agent_id: str,
    version: int,
) -> Optional[AgentVersionRecord]:
    return (
        session.query(AgentVersionRecord)
        .filter_by(tenant_id=tenant_id, agent_id=agent_id, version=version)
        .one_or_none()
    )


def list_agent_versions(
    session: Session,
    *,
    tenant_id: str,
    agent_id: str,
) -> list[AgentVersionRecord]:
    return list(
        session.query(AgentVersionRecord)
        .filter_by(tenant_id=tenant_id, agent_id=agent_id)
        .order_by(AgentVersionRecord.version.asc())
        .all()
    )


def set_agent_version_status(
    session: Session,
    *,
    tenant_id: str,
    version_id: str,
    status: str,
) -> Optional[AgentVersionRecord]:
    rec = get_agent_version(session, tenant_id=tenant_id, version_id=version_id)
    if rec is None:
        return None
    rec.status = status
    session.flush()
    return rec


# ── Appointments ──────────────────────────────────────────────────────────


def create_appointment(
    session: Session,
    *,
    tenant_id: str,
    call_id: str,
    phone: str,
    service: str,
    scheduled_time_utc: dt.datetime,
    timezone: str,
    idempotency_key: str,
    proposal_id: Optional[str] = None,
) -> Appointment:
    ap = Appointment(
        id=_new_id("apt"),
        tenant_id=tenant_id,
        call_id=call_id,
        phone=phone,
        service=service,
        scheduled_time_utc=scheduled_time_utc,
        timezone=timezone,
        idempotency_key=idempotency_key,
        proposal_id=proposal_id,
    )
    session.add(ap)
    session.flush()
    return ap


def get_appointment(
    session: Session,
    *,
    tenant_id: str,
    appointment_id: str,
) -> Optional[Appointment]:
    return (
        session.query(Appointment)
        .filter_by(id=appointment_id, tenant_id=tenant_id)
        .one_or_none()
    )


def find_appointment_by_idempotency(
    session: Session,
    *,
    idempotency_key: str,
) -> Optional[Appointment]:
    return session.query(Appointment).filter_by(idempotency_key=idempotency_key).one_or_none()


# ── Audit ────────────────────────────────────────────────────────────────


def emit_audit(
    session: Session,
    *,
    tenant_id: str,
    actor: str,
    kind: str,
    detail: Optional[dict] = None,
) -> None:
    session.add(
        AuditEvent(
            id=_new_id("aud"),
            tenant_id=tenant_id,
            actor=actor,
            kind=kind,
            detail=detail or {},
        )
    )
    session.flush()
