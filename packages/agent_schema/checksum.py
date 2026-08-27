"""Canonical JSON serialization and SHA-256 checksum for AgentVersion.

§2.22 (normative):
  checksum = sha256(canonical_json(payload without checksum))
  Reject load on mismatch.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_json(obj: Any) -> bytes:
    """Produce deterministic JSON bytes for any JSON-serializable object.

    Rules:
    - sorted keys (lexicographic at every level)
    - no trailing commas
    - no whitespace separators
    - ASCII-safe (no non-ASCII escapes unless needed for correctness)
    - null/None → null, bool → true/false
    """
    return json.dumps(
        obj,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("utf-8")


def sha256_checksum(data: bytes) -> str:
    """Return lowercase hex SHA-256 of raw bytes."""
    return hashlib.sha256(data).hexdigest()


def compute_checksum(payload: dict[str, Any]) -> str:
    """Compute checksum for an AgentVersion payload.

    Strips any existing 'checksum' key before canonicalizing.
    Returns hex SHA-256 string.
    """
    clean = {k: v for k, v in payload.items() if k != "checksum"}
    return sha256_checksum(canonical_json(clean))
