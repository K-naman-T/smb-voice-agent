#!/usr/bin/env python3
"""Invariant I2: Immutable AgentVersion (checksum server-computed).

Why it exists:
Voice agents handling real customer transactions cannot have drift between what
was certified in sim and what executes in a live call. The AgentVersion must be
immutable and its SHA-256 checksum computed strictly server-side over canonical JSON.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.extend([str(REPO_ROOT / "packages"), str(REPO_ROOT / "apps" / "api")])

from agent_schema.checksum import compute_checksum, canonical_json
from agent_schema.models import AgentVersion, AgentStatus


def check_i2_immutable_artifact() -> None:
    # 1. Verify compute_checksum ignores client-provided checksum
    payload_a = {"id": "ag_01", "system_prompt": "Prompt A", "status": "draft"}
    payload_b = {"id": "ag_01", "system_prompt": "Prompt A", "status": "draft", "checksum": "client_forgery"}
    c1 = compute_checksum(payload_a)
    c2 = compute_checksum(payload_b)
    assert c1 == c2, "Violation I2: Checksum computation is influenced by client-supplied checksum"

    # 2. Verify any modification changes checksum
    payload_c = {"id": "ag_01", "system_prompt": "Prompt Modified", "status": "draft"}
    c3 = compute_checksum(payload_c)
    assert c1 != c3, "Violation I2: Modification did not change checksum"

    # 3. Verify canonical serialization is deterministic regardless of key order
    canon1 = canonical_json({"z": 1, "a": 2})
    canon2 = canonical_json({"a": 2, "z": 1})
    assert canon1 == canon2 == b'{"a":2,"z":1}', "Violation I2: Canonical JSON is not lexicographically ordered"

    print("PASS: Invariant I2 (Immutable AgentVersion checksum server-computed and deterministic)")


if __name__ == "__main__":
    try:
        check_i2_immutable_artifact()
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
