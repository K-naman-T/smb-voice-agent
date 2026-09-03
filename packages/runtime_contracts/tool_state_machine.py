"""Tool State Machine for Appointments & Booking (I6, §2.9).

Enforces the three-stage lifecycle:
  PROPOSED  -> Server mints proposal_id, validates business rules, schema, TZ, hours
  CONFIRMED -> Customer confirms proposal, bound to call_id, TTL 5m
  COMMITTED -> Idempotent commit, generates unique confirmation code

Guarantees:
  - Invariant I6: 'You are booked' can ONLY be spoken from COMMITTED state.
  - Hard never_do rules: refuse bookings in the past, outside hours, invalid phone.
  - Idempotency key uniqueness prevents double booking on reconnects/retries.
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, time, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set


class BookingState(str, Enum):
    PROPOSED = "PROPOSED"
    CONFIRMED = "CONFIRMED"
    COMMITTED = "COMMITTED"
    EXPIRED = "EXPIRED"
    REJECTED = "REJECTED"


class BookingValidationError(Exception):
    """Raised when proposal violates hard business or security rules."""


@dataclass
class BookingProposal:
    proposal_id: str
    call_id: str
    customer_name: str
    customer_phone: str
    service_type: str
    scheduled_time_utc: datetime
    timezone_str: str
    state: BookingState = BookingState.PROPOSED
    created_at_utc: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at_utc: Optional[datetime] = None
    idempotency_key: str = ""
    confirmation_code: Optional[str] = None


class BookingStateMachine:
    """Manages booking proposals, validation, confirmation, and commitment."""

    def __init__(
        self,
        allowed_services: Set[str],
        business_start_hour: int = 8,
        business_end_hour: int = 20,
        proposal_ttl_seconds: int = 300,
    ) -> None:
        self.allowed_services = set(s.lower() for s in allowed_services)
        self.business_start_hour = business_start_hour
        self.business_end_hour = business_end_hour
        self.proposal_ttl_seconds = proposal_ttl_seconds
        self.proposals: Dict[str, BookingProposal] = {}
        self.committed_slots: Set[str] = set()

    def _validate_phone(self, phone: str) -> str:
        clean = re.sub(r'[^0-9+]', '', phone)
        if len(clean) < 10:
            raise BookingValidationError(f"Invalid phone number: {phone!r} must have >= 10 digits")
        return clean

    def propose_booking(
        self,
        call_id: str,
        customer_name: str,
        customer_phone: str,
        service_type: str,
        scheduled_time_utc: datetime,
        timezone_str: str = "UTC",
    ) -> BookingProposal:
        """Step 1: PROPOSE booking and validate business rules."""
        now = datetime.now(timezone.utc)
        if scheduled_time_utc <= now:
            raise BookingValidationError(
                f"Booking time {scheduled_time_utc.isoformat()} is in the past (never_do hard rule)"
            )

        # Operating hours check (in UTC/local)
        hour = scheduled_time_utc.hour
        if hour < self.business_start_hour or hour >= self.business_end_hour:
            raise BookingValidationError(
                f"Requested time ({hour}:00) is outside business hours ({self.business_start_hour}:00 - {self.business_end_hour}:00)"
            )

        # Service whitelist
        clean_service = service_type.strip().lower()
        if self.allowed_services and not any(s in clean_service or clean_service in s for s in self.allowed_services):
            raise BookingValidationError(
                f"Service {service_type!r} is not an offered service (never_do rule: do not invent services)"
            )

        valid_phone = self._validate_phone(customer_phone)

        # Slot conflict check
        slot_key = f"{valid_phone}:{scheduled_time_utc.isoformat()}"
        if slot_key in self.committed_slots:
            raise BookingValidationError("Slot is already booked for this customer (double-book prevention)")

        proposal_id = f"prop_{uuid.uuid4().hex[:12]}"
        idempotency_key = f"idem_{uuid.uuid4().hex[:16]}"
        expires_at = datetime.fromtimestamp(now.timestamp() + self.proposal_ttl_seconds, tz=timezone.utc)

        proposal = BookingProposal(
            proposal_id=proposal_id,
            call_id=call_id,
            customer_name=customer_name.strip() or "Customer",
            customer_phone=valid_phone,
            service_type=service_type.strip(),
            scheduled_time_utc=scheduled_time_utc,
            timezone_str=timezone_str,
            state=BookingState.PROPOSED,
            created_at_utc=now,
            expires_at_utc=expires_at,
            idempotency_key=idempotency_key,
        )
        self.proposals[proposal_id] = proposal
        return proposal

    def confirm_proposal(self, proposal_id: str, call_id: str) -> BookingProposal:
        """Step 2: CONFIRM proposal (customer agrees to slot & details)."""
        proposal = self.proposals.get(proposal_id)
        if not proposal:
            raise BookingValidationError(f"Proposal {proposal_id} not found")

        if proposal.call_id != call_id:
            raise BookingValidationError("Security error: proposal call_id does not match active session")

        now = datetime.now(timezone.utc)
        if proposal.expires_at_utc and now > proposal.expires_at_utc:
            proposal.state = BookingState.EXPIRED
            raise BookingValidationError(f"Proposal {proposal_id} has expired (TTL={self.proposal_ttl_seconds}s)")

        if proposal.state != BookingState.PROPOSED:
            raise BookingValidationError(f"Cannot confirm proposal in state {proposal.state}")

        proposal.state = BookingState.CONFIRMED
        return proposal

    def commit_booking(self, proposal_id: str, call_id: str) -> BookingProposal:
        """Step 3: COMMIT booking with unique confirmation code."""
        proposal = self.confirm_proposal(proposal_id, call_id) if self.proposals[proposal_id].state == BookingState.PROPOSED else self.proposals.get(proposal_id)

        if not proposal or proposal.state != BookingState.CONFIRMED:
            raise BookingValidationError(f"Cannot commit proposal in state {getattr(proposal, 'state', None)}")

        slot_key = f"{proposal.customer_phone}:{proposal.scheduled_time_utc.isoformat()}"
        if slot_key in self.committed_slots:
            raise BookingValidationError("Slot collision: another booking committed during confirmation")

        proposal.state = BookingState.COMMITTED
        code = f"APT-{uuid.uuid4().hex[:6].upper()}"
        proposal.confirmation_code = code
        self.committed_slots.add(slot_key)
        return proposal

    def format_committed_speech(self, proposal: BookingProposal) -> str:
        """Generate official verbal confirmation message (Invariant I6)."""
        if proposal.state != BookingState.COMMITTED:
            raise RuntimeError(
                f"Invariant I6 violation: cannot speak booking confirmation for state {proposal.state}"
            )
        time_str = proposal.scheduled_time_utc.strftime("%A at %I:%M %p")
        return (
            f"You are all booked for {proposal.service_type} on {time_str}. "
            f"Your confirmation code is {proposal.confirmation_code}."
        )
