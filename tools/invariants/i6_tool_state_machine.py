#!/usr/bin/env python3
"""Invariant I6: Tool state machine (PROPOSED → CONFIRMED → COMMITTED only).

Why it exists:
Mutating tools (like customer appointment bookings) cannot be hallucinated or
committed directly by an LLM without explicit state transitions. Spoken confirmations
('You are booked') must be minted strictly from committed tool results with confirmation
codes, never from free-form model text.
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.extend([str(REPO_ROOT / "packages"), str(REPO_ROOT / "apps" / "api")])

from runtime_contracts.tool_state_machine import (
    BookingStateMachine,
    BookingState,
    BookingValidationError,
)


def check_i6_tool_state_machine() -> None:
    sm = BookingStateMachine(allowed_services={"oil change", "brake inspection"})
    future_time = datetime.now(timezone.utc) + timedelta(days=2)
    # Align to working hours (e.g. 10:00 UTC)
    future_time = future_time.replace(hour=10, minute=0, second=0, microsecond=0)

    # 1. Propose booking
    proposal = sm.propose_booking(
        call_id="call_test_01",
        customer_name="Alice Test",
        customer_phone="+15551234567",
        service_type="oil change",
        scheduled_time_utc=future_time,
    )
    assert proposal.state == BookingState.PROPOSED, "Violation I6: Initial state not PROPOSED"

    # 2. Verbal confirmation MUST NOT be speakable in PROPOSED state
    raised = False
    try:
        sm.format_committed_speech(proposal)
    except RuntimeError:
        raised = True
    assert raised, "Violation I6: Spoke confirmation on uncommitted proposal"

    # 3. Confirm booking
    confirmed = sm.confirm_proposal(proposal.proposal_id, "call_test_01")
    assert confirmed.state == BookingState.CONFIRMED, "Violation I6: State not CONFIRMED"

    # 4. Commit booking
    committed = sm.commit_booking(proposal.proposal_id, "call_test_01")
    assert committed.state == BookingState.COMMITTED, "Violation I6: State not COMMITTED"
    assert committed.confirmation_code is not None, "Violation I6: Confirmation code not minted on commit"

    # 5. Verbal confirmation is now valid
    speech = sm.format_committed_speech(committed)
    assert committed.confirmation_code in speech, "Violation I6: Speech does not include confirmation code"

    # 6. Past bookings must fail immediately
    past_time = datetime.now(timezone.utc) - timedelta(days=1)
    raised = False
    try:
        sm.propose_booking(
            call_id="call_test_02",
            customer_name="Bob Test",
            customer_phone="+15551234567",
            service_type="oil change",
            scheduled_time_utc=past_time,
        )
    except BookingValidationError:
        raised = True
    assert raised, "Violation I6: Past booking was accepted"

    print("PASS: Invariant I6 (Tool state machine verified: strictly PROPOSED → CONFIRMED → COMMITTED)")


if __name__ == "__main__":
    try:
        check_i6_tool_state_machine()
    except (AssertionError, Exception) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
