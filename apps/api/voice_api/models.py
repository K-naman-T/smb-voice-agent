"""ORM models for voice_api.

P1 schema (per ENGINEERING_PLAN_v2.md §2.23):
  - api_keys(id, tenant_id, key_hash, prefix, scopes, created_at)
  - certify_records(...)
  - booking_proposals(id, call_id, payload, status, expires_at)
  - appointments(..., scheduled_time_utc, timezone, idempotency_key UNIQUE)
  - consent_events(...)
  Plus: tenants, users, businesses, agents, agent_versions (immutable),
  calls, turns, traces, customers, integrations, simulation_runs, audit_events.
"""
from __future__ import annotations

import datetime as dt
from typing import Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from voice_api.db import Base


def _utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


# ── Tenancy ──────────────────────────────────────────────────────────────


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="operator")  # operator | admin | read
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    prefix: Mapped[str] = mapped_column(String(16), nullable=False)  # shown in UI
    scopes: Mapped[str] = mapped_column(Text, default="")  # comma-separated
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


# ── Business & agents ────────────────────────────────────────────────────


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    business_id: Mapped[str] = mapped_column(String(64), ForeignKey("businesses.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class AgentVersionRecord(Base):
    """Immutable AgentVersion row.

    §2.22: checksum = sha256(canonical_json(payload without checksum)).
    Versions are append-only; edits create a new version row.
    """
    __tablename__ = "agent_versions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    agent_id: Mapped[str] = mapped_column(String(64), ForeignKey("agents.id"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    model_id: Mapped[str] = mapped_column(String(128), default="")
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)
    created_by: Mapped[str] = mapped_column(String(64), default="")

    __table_args__ = (
        UniqueConstraint("agent_id", "version", name="uq_agent_version"),
    )


# ── Booking & appointments ────────────────────────────────────────────────


class BookingProposal(Base):
    __tablename__ = "booking_proposals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    call_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    version_id: Mapped[str] = mapped_column(String(64), ForeignKey("agent_versions.id"), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="proposed")  # proposed | confirmed | committed | expired
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    proposal_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("booking_proposals.id"), nullable=True)
    call_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    service: Mapped[str] = mapped_column(String(128), nullable=False)
    scheduled_time_utc: Mapped[dt.datetime] = mapped_column(DateTime, nullable=False, index=True)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


# ── Certify, simulations, calls, traces ──────────────────────────────────


class CertifyRecord(Base):
    __tablename__ = "certify_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    version_id: Mapped[str] = mapped_column(String(64), ForeignKey("agent_versions.id"), nullable=False)
    level: Mapped[str] = mapped_column(String(32), nullable=False)  # logic | acoustic
    agent_checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    suite_checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    model_sha256: Mapped[str] = mapped_column(String(64), default="")
    llama_sha: Mapped[str] = mapped_column(String(64), default="")
    runtime_lock: Mapped[dict] = mapped_column(JSON, default=dict)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    operator: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    version_id: Mapped[str] = mapped_column(String(64), ForeignKey("agent_versions.id"), nullable=False)
    suite: Mapped[str] = mapped_column(String(64), default="core")
    seed: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[float] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), default=0)
    pass_: Mapped[bool] = mapped_column("pass", Boolean, default=False)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    version_id: Mapped[str] = mapped_column(String(64), ForeignKey("agent_versions.id"), nullable=False)
    caller_phone: Mapped[str] = mapped_column(String(32), default="")
    started_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)
    ended_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")


class TurnTrace(Base):
    __tablename__ = "turn_traces"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    call_id: Mapped[str] = mapped_column(String(64), ForeignKey("calls.id"), nullable=False, index=True)
    turn_id: Mapped[int] = mapped_column(Integer, nullable=False)
    eou_ms: Mapped[int] = mapped_column(Integer, default=0)
    stt_ms: Mapped[int] = mapped_column(Integer, default=0)
    llm_ttft_ms: Mapped[int] = mapped_column(Integer, default=0)
    tts_ttfb_ms: Mapped[int] = mapped_column(Integer, default=0)
    ttfa_ms: Mapped[int] = mapped_column(Integer, default=0)
    barge_stop_ms: Mapped[int] = mapped_column(Integer, default=0)
    gpu_lock_wait_ms: Mapped[int] = mapped_column(Integer, default=0)
    gpu_temp_c: Mapped[float] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), default=0)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    ctx_frac: Mapped[float] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), default=0)
    tool_ms: Mapped[list] = mapped_column(JSON, default=list)
    generation_id: Mapped[str] = mapped_column(String(64), default="")
    transcript: Mapped[str] = mapped_column(Text, default="")
    assistant_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class ConsentEvent(Base):
    __tablename__ = "consent_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    call_id: Mapped[str] = mapped_column(String(64), ForeignKey("calls.id"), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # disclosure_started | disclosure_completed | recording_started
    occurred_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    actor: Mapped[str] = mapped_column(String(64), default="")
    kind: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    occurred_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class Integration(Base):
    __tablename__ = "integrations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(64), nullable=False)  # twilio_pstn | twilio_sms | calendar | webhook
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


Index("ix_agent_versions_tenant_status", AgentVersionRecord.tenant_id, AgentVersionRecord.status)
Index("ix_appointments_tenant_time", Appointment.tenant_id, Appointment.scheduled_time_utc)
