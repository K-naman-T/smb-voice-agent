"""Unit tests for Phase P3: Barge Manager and Tool State Machine."""
from datetime import datetime, timedelta, timezone
import pytest

from runtime_contracts.barge_manager import BargeManager
from runtime_contracts.tool_state_machine import (
    BookingStateMachine,
    BookingState,
    BookingValidationError,
)


def test_barge_manager_watermark():
    bm = BargeManager(slack_ms=50.0)
    bm.new_turn()

    # Enqueue 3 sentences
    bm.enqueue_sentence("s1", "Hello there.", duration_ms=1000.0)
    bm.enqueue_sentence("s2", "Your AC repair is scheduled.", duration_ms=2000.0)
    bm.enqueue_sentence("s3", "See you tomorrow.", duration_ms=1000.0)

    # s1 starts at t=0, ends at t=1000
    bm.mark_playout_started("s1", t_start_ms=0.0)
    # s2 starts at t=1050, ends at t=3050
    bm.mark_playout_started("s2", t_start_ms=1050.0)

    # User interrupts at t=1500 (during s2)
    history = bm.handle_barge_in(t_barge_ms=1500.0)

    # s1 finished at 1000 <= 1550 -> kept
    # s2 ends at 3050 > 1550 -> dropped (no partial sentence)
    # s3 never started -> dropped
    assert history == "Hello there."


def test_tool_state_machine_three_stage_lifecycle():
    sm = BookingStateMachine(allowed_services={"ac repair", "ac servicing"})
    future_time = datetime.now(timezone.utc) + timedelta(days=1)
    future_time = future_time.replace(hour=10, minute=0, second=0, microsecond=0)

    # Step 1: PROPOSE
    prop = sm.propose_booking(
        call_id="call_123",
        customer_name="Alice",
        customer_phone="+15551234567",
        service_type="AC Repair",
        scheduled_time_utc=future_time,
    )
    assert prop.state == BookingState.PROPOSED

    # Invariant I6: Cannot format confirmation speech yet
    with pytest.raises(RuntimeError):
        sm.format_committed_speech(prop)

    # Step 2: CONFIRM
    conf = sm.confirm_proposal(prop.proposal_id, call_id="call_123")
    assert conf.state == BookingState.CONFIRMED

    # Step 3: COMMIT
    committed = sm.commit_booking(prop.proposal_id, call_id="call_123")
    assert committed.state == BookingState.COMMITTED
    assert committed.confirmation_code.startswith("APT-")

    # Now speech is allowed
    speech = sm.format_committed_speech(committed)
    assert "You are all booked" in speech
    assert committed.confirmation_code in speech


def test_tool_state_machine_never_do_rules():
    sm = BookingStateMachine(allowed_services={"ac repair"})

    # Hard rule 1: Refuse past time
    past_time = datetime.now(timezone.utc) - timedelta(hours=2)
    with pytest.raises(BookingValidationError, match="past"):
        sm.propose_booking("c1", "Bob", "5551234567", "AC Repair", past_time)

    # Hard rule 2: Refuse unoffered services (no hallucinated services)
    future_time = datetime.now(timezone.utc) + timedelta(days=1)
    future_time = future_time.replace(hour=11, minute=0)
    with pytest.raises(BookingValidationError, match="not an offered service"):
        sm.propose_booking("c1", "Bob", "5551234567", "Roof Installation", future_time)

    # Hard rule 3: Refuse outside business hours (e.g. 2 AM)
    night_time = future_time.replace(hour=2)
    with pytest.raises(BookingValidationError, match="outside business hours"):
        sm.propose_booking("c1", "Bob", "5551234567", "AC Repair", night_time)
