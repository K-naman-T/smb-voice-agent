"""Pydantic request/response schemas for the API."""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class BusinessCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    industry: str = ""


class BusinessResponse(BaseModel):
    id: str
    name: str
    industry: str


class CreateAgentRequest(BaseModel):
    business_id: str
    name: str = ""


class AgentResponse(BaseModel):
    id: str
    business_id: str
    name: str


class CreateAgentVersionRequest(BaseModel):
    payload: dict[str, Any]
    model_id: str = ""
    # Optional; if present, must match the server-computed checksum.
    checksum: Optional[str] = None


class AgentVersionResponse(BaseModel):
    id: str
    agent_id: str
    version: int
    status: str
    model_id: str
    checksum: str
    payload: dict[str, Any]


class TransitionVersionRequest(BaseModel):
    target: str  # draft | certified-logic | certified-acoustic | live


class PromoteVersionRequest(BaseModel):
    target: str = "live"


class CreateBookingProposalRequest(BaseModel):
    call_id: str
    version_id: str
    payload: dict[str, Any]
    ttl_seconds: int = 300


class BookingProposalResponse(BaseModel):
    id: str
    call_id: str
    version_id: str
    status: str
    expires_at: str
    payload: dict[str, Any]


class CommitBookingRequest(BaseModel):
    proposal_id: str
    phone: str
    service: str
    scheduled_time_utc: str
    timezone: str = "UTC"
    idempotency_key: str
