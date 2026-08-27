"""Tests for agent_schema.lifecycle — lifecycle state machine transitions."""

import pytest

from agent_schema.lifecycle import (
    AgentStatus,
    ALLOWED_TRANSITIONS,
    InvalidTransition,
    validate_transition,
)


class TestLifecycleTransitions:
    def test_draft_to_certified_logic(self):
        # Should not raise
        validate_transition(AgentStatus.DRAFT, AgentStatus.CERTIFIED_LOGIC)

    def test_certified_logic_to_certified_acoustic(self):
        validate_transition(AgentStatus.CERTIFIED_LOGIC, AgentStatus.CERTIFIED_ACOUSTIC)

    def test_certified_acoustic_to_live(self):
        validate_transition(AgentStatus.CERTIFIED_ACOUSTIC, AgentStatus.LIVE)

    def test_live_is_terminal(self):
        assert ALLOWED_TRANSITIONS[AgentStatus.LIVE] == set()

    def test_cannot_skip_draft_to_acoustic(self):
        with pytest.raises(InvalidTransition):
            validate_transition(AgentStatus.DRAFT, AgentStatus.CERTIFIED_ACOUSTIC)

    def test_cannot_skip_draft_to_live(self):
        with pytest.raises(InvalidTransition):
            validate_transition(AgentStatus.DRAFT, AgentStatus.LIVE)

    def test_cannot_go_backwards_acoustic_to_logic(self):
        with pytest.raises(InvalidTransition):
            validate_transition(AgentStatus.CERTIFIED_ACOUSTIC, AgentStatus.CERTIFIED_LOGIC)

    def test_cannot_go_backwards_live_to_draft(self):
        with pytest.raises(InvalidTransition):
            validate_transition(AgentStatus.LIVE, AgentStatus.DRAFT)

    def test_cannot_stay_same_status(self):
        with pytest.raises(InvalidTransition):
            validate_transition(AgentStatus.DRAFT, AgentStatus.DRAFT)

    def test_transition_chain_full(self):
        """Verify the full happy-path chain."""
        validate_transition(AgentStatus.DRAFT, AgentStatus.CERTIFIED_LOGIC)
        validate_transition(AgentStatus.CERTIFIED_LOGIC, AgentStatus.CERTIFIED_ACOUSTIC)
        validate_transition(AgentStatus.CERTIFIED_ACOUSTIC, AgentStatus.LIVE)

    def test_all_statuses_are_string_enum_values(self):
        for status in AgentStatus:
            assert isinstance(status.value, str)
            assert status.value == status.value.lower()

    def test_invalid_transition_message(self):
        with pytest.raises(InvalidTransition, match="draft.*live"):
            validate_transition(AgentStatus.DRAFT, AgentStatus.LIVE)
