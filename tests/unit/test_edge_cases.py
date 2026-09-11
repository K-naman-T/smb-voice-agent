"""Heavy low- and high-level edge-case test suite for voice agent runtime.

Covers:
- Rapid successive barge-ins (race condition / state integrity)
- Zero-duration and whitespace sentence filtering
- Playout watermark boundary conditions (exact slack_ms cutoff)
- Cross-call session isolation and hijacking prevention
- Proposal expiration TTL enforcement
- Slot collisions across concurrent calls
- Malformed and international phone number normalization
- Out-of-hours and past booking rejection
- Strict unoffered service hallucination suppression
- Invariant I6 safety under error conditions
"""
from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
import pytest

from runtime_contracts.barge_manager import BargeManager
from runtime_contracts.tool_state_machine import (
    BookingStateMachine,
    BookingState,
    BookingValidationError,
)


class TestBargeManagerEdgeCases:
    """Low-level acoustic and barge-in boundary testing."""

    def test_rapid_successive_barge_in(self):
        """Simulate rapid-fire barge-ins (e.g. user stuttering or audio flutter)."""
        bm = BargeManager(slack_ms=50.0)
        bm.new_turn()
        bm.enqueue_sentence("s1", "First sentence.", duration_ms=1000.0)
        bm.enqueue_sentence("s2", "Second sentence.", duration_ms=1000.0)
        bm.mark_playout_started("s1", t_start_ms=0.0)

        # First interruption during s1
        h1 = bm.handle_barge_in(t_barge_ms=400.0)
        assert h1 == ""  # s1 not completed

        # Immediate second interruption 10ms later
        h2 = bm.handle_barge_in(t_barge_ms=410.0)
        assert h2 == ""
        assert bm.interrupted is True

        # Third interruption 20ms later
        h3 = bm.handle_barge_in(t_barge_ms=430.0)
        assert h3 == ""

    def test_exact_slack_boundary_condition(self):
        """Sentence completes at exactly t_barge + slack_ms."""
        bm = BargeManager(slack_ms=50.0)
        bm.new_turn()
        # s1: starts at 0, lasts 1000ms (ends at 1000ms)
        bm.enqueue_sentence("s1", "Hello there.", duration_ms=1000.0)
        bm.mark_playout_started("s1", t_start_ms=0.0)

        # Barge at 950ms -> cutoff is 950 + 50 = 1000ms -> sentence finished in time
        h = bm.handle_barge_in(t_barge_ms=950.0)
        assert h == "Hello there."

        # If barge was at 949ms -> cutoff is 999ms -> sentence incomplete -> dropped
        bm2 = BargeManager(slack_ms=50.0)
        bm2.new_turn()
        bm2.enqueue_sentence("s1", "Hello there.", duration_ms=1000.0)
        bm2.mark_playout_started("s1", t_start_ms=0.0)
        h_dropped = bm2.handle_barge_in(t_barge_ms=949.0)
        assert h_dropped == ""

    def test_zero_duration_and_whitespace_sentences(self):
        """Empty or zero-duration sentences should not corrupt the history or queue."""
        bm = BargeManager(slack_ms=50.0)
        bm.new_turn()
        item1 = bm.enqueue_sentence("s0", "   ", duration_ms=0.0)
        assert item1.text == ""

        item2 = bm.enqueue_sentence("s1", "Real sentence.", duration_ms=800.0)
        bm.mark_playout_started("s1", t_start_ms=10.0)

        history = bm.handle_barge_in(t_barge_ms=900.0)
        assert history == "Real sentence."

    def test_unstarted_sentence_never_marked_completed(self):
        """Sentences enqueued but never dispatched to audio hardware are never kept."""
        bm = BargeManager(slack_ms=50.0)
        bm.new_turn()
        bm.enqueue_sentence("s1", "Spoken.", duration_ms=500.0)
        bm.enqueue_sentence("s2", "Unspoken queue item.", duration_ms=500.0)
        bm.mark_playout_started("s1", t_start_ms=0.0)
        # s2 is never marked started

        history = bm.handle_barge_in(t_barge_ms=600.0)
        assert history == "Spoken."
        assert "Unspoken" not in history


class TestBookingStateMachineEdgeCases:
    """High-level business logic, safety constraints, and booking lifecycle."""

    @pytest.fixture
    def sm(self) -> BookingStateMachine:
        return BookingStateMachine(
            allowed_services={"ac repair", "filter cleaning", "gas topup"},
            business_start_hour=9,
            business_end_hour=19,
            proposal_ttl_seconds=3,  # Short TTL for fast expiration tests
        )

    def test_cross_call_proposal_hijack_prevention(self, sm: BookingStateMachine):
        """Proposal created by call_A cannot be confirmed or committed by call_B."""
        future_time = datetime.now(timezone.utc) + timedelta(days=1)
        future_time = future_time.replace(hour=11, minute=0, second=0, microsecond=0)

        prop = sm.propose_booking(
            call_id="call_tenant_A",
            customer_name="Alice",
            customer_phone="+919876543210",
            service_type="AC Repair",
            scheduled_time_utc=future_time,
        )

        with pytest.raises(BookingValidationError, match="Security error"):
            sm.confirm_proposal(prop.proposal_id, call_id="call_attacker_B")

        with pytest.raises(BookingValidationError, match="Security error"):
            sm.commit_booking(prop.proposal_id, call_id="call_attacker_B")

    def test_proposal_expiration_ttl(self, sm: BookingStateMachine):
        """Expired proposals must be rejected and cannot be committed."""
        future_time = datetime.now(timezone.utc) + timedelta(days=1)
        future_time = future_time.replace(hour=14, minute=0, second=0, microsecond=0)

        prop = sm.propose_booking(
            call_id="call_1",
            customer_name="Bob",
            customer_phone="+919876543210",
            service_type="AC Repair",
            scheduled_time_utc=future_time,
        )
        assert prop.state == BookingState.PROPOSED

        # Force expiration
        prop.expires_at_utc = datetime.now(timezone.utc) - timedelta(seconds=1)

        with pytest.raises(BookingValidationError, match="expired"):
            sm.confirm_proposal(prop.proposal_id, call_id="call_1")

    def test_phone_number_normalization_and_rejection(self, sm: BookingStateMachine):
        """Phone numbers with formatting are stripped; invalid lengths fail."""
        future_time = datetime.now(timezone.utc) + timedelta(days=1)
        future_time = future_time.replace(hour=12, minute=0, second=0, microsecond=0)

        # Valid formatted phone
        prop = sm.propose_booking(
            call_id="call_1",
            customer_name="Charlie",
            customer_phone="+91 (987) 654-3210",
            service_type="Filter Cleaning",
            scheduled_time_utc=future_time,
        )
        assert prop.customer_phone == "+919876543210"

        # Invalid short phone
        with pytest.raises(BookingValidationError, match="must have >= 10 digits"):
            sm.propose_booking(
                call_id="call_1",
                customer_name="Bad Phone",
                customer_phone="12345",
                service_type="Filter Cleaning",
                scheduled_time_utc=future_time,
            )

    def test_unoffered_service_rejection(self, sm: BookingStateMachine):
        """Services not in the whitelist are rejected immediately."""
        future_time = datetime.now(timezone.utc) + timedelta(days=1)
        future_time = future_time.replace(hour=12, minute=0, second=0, microsecond=0)

        with pytest.raises(BookingValidationError, match="not an offered service"):
            sm.propose_booking(
                call_id="call_1",
                customer_name="Dave",
                customer_phone="+919876543210",
                service_type="Free Roof Replacement",
                scheduled_time_utc=future_time,
            )

    def test_past_booking_and_out_of_hours_rejection(self, sm: BookingStateMachine):
        """Booking in the past or outside 9:00-19:00 is rejected."""
        # In the past
        past_time = datetime.now(timezone.utc) - timedelta(hours=2)
        with pytest.raises(BookingValidationError, match="in the past"):
            sm.propose_booking(
                call_id="call_1",
                customer_name="Eve",
                customer_phone="+919876543210",
                service_type="AC Repair",
                scheduled_time_utc=past_time,
            )

        # Outside business hours (e.g. 21:00)
        night_time = (datetime.now(timezone.utc) + timedelta(days=1)).replace(
            hour=21, minute=0, second=0, microsecond=0
        )
        with pytest.raises(BookingValidationError, match="outside business hours"):
            sm.propose_booking(
                call_id="call_1",
                customer_name="Eve",
                customer_phone="+919876543210",
                service_type="AC Repair",
                scheduled_time_utc=night_time,
            )

    def test_concurrent_slot_collision_prevention(self, sm: BookingStateMachine):
        """Two callers attempting to book the exact same slot for the same contact collide."""
        slot = (datetime.now(timezone.utc) + timedelta(days=1)).replace(
            hour=10, minute=0, second=0, microsecond=0
        )

        p1 = sm.propose_booking(
            call_id="call_1",
            customer_name="Customer 1",
            customer_phone="+919999999999",
            service_type="AC Repair",
            scheduled_time_utc=slot,
        )
        sm.confirm_proposal(p1.proposal_id, "call_1")
        sm.commit_booking(p1.proposal_id, "call_1")

        # Second attempt for same phone and slot is rejected
        with pytest.raises(BookingValidationError, match="already booked"):
            sm.propose_booking(
                call_id="call_2",
                customer_name="Customer 2",
                customer_phone="+919999999999",
                service_type="Gas Topup",
                scheduled_time_utc=slot,
            )
