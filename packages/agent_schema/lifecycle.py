"""Lifecycle state machine for AgentVersion.

§2.16 (normative):
  draft → certified-logic → certified-acoustic → live

Only forward transitions are allowed (no demotion in v1).
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel


class AgentStatus(str, Enum):
    """Certification / lifecycle status of an AgentVersion."""

    DRAFT = "draft"
    CERTIFIED_LOGIC = "certified-logic"
    CERTIFIED_ACOUSTIC = "certified-acoustic"
    LIVE = "live"


# Allowed forward transitions (from → {to, ...})
ALLOWED_TRANSITIONS: dict[AgentStatus, set[AgentStatus]] = {
    AgentStatus.DRAFT: {AgentStatus.CERTIFIED_LOGIC},
    AgentStatus.CERTIFIED_LOGIC: {AgentStatus.CERTIFIED_ACOUSTIC},
    AgentStatus.CERTIFIED_ACOUSTIC: {AgentStatus.LIVE},
    AgentStatus.LIVE: set(),  # terminal — no further transitions
}


class InvalidTransition(Exception):
    """Raised when a lifecycle transition is not permitted."""


def validate_transition(current: AgentStatus, target: AgentStatus) -> None:
    """Validate that *current → target* is a legal lifecycle move.

    Raises InvalidTransition if not allowed.
    """
    if target not in ALLOWED_TRANSITIONS.get(current, set()):
        raise InvalidTransition(
            f"Cannot transition from {current.value!r} to {target.value!r}. "
            f"Allowed: {[s.value for s in ALLOWED_TRANSITIONS.get(current, set())] or ['(none — terminal)']}"
        )
