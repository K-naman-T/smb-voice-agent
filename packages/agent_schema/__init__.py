"""agent_schema — v2 AgentVersion models, canonical JSON, SHA-256 checksum, lifecycle.

Invariant I2: Live sessions load immutable AgentVersion; checksum server-computed.
§2.22: checksum = sha256(canonical_json(payload without checksum)).
§2.16: lifecycle = draft → certified-logic → certified-acoustic → live.
"""

from agent_schema.models import (
    AgentVersion,
    AgentStatus,
    ToolSpec,
    BusinessProfile,
)
from agent_schema.checksum import canonical_json, sha256_checksum, compute_checksum
from agent_schema.lifecycle import validate_transition, ALLOWED_TRANSITIONS

__all__ = [
    "AgentVersion",
    "AgentStatus",
    "ToolSpec",
    "BusinessProfile",
    "canonical_json",
    "sha256_checksum",
    "compute_checksum",
    "validate_transition",
    "ALLOWED_TRANSITIONS",
]
