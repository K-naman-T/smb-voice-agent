#!/usr/bin/env python3
"""Invariant I5: Certified bind (live load requires certified-acoustic status).

Why it exists:
An agent that has only passed simulation (certified-logic) cannot be bound to
live customer calls. Acoustic smoke gates on chomp hardware must be passed
first (certified-acoustic). Skipping directly from draft or certified-logic
to live is strictly rejected.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.extend([str(REPO_ROOT / "packages"), str(REPO_ROOT / "apps" / "api")])

from agent_schema.lifecycle import AgentStatus, validate_transition, InvalidTransition


def check_i5_certified_bind() -> None:
    # 1. Verify draft cannot skip to live
    raised = False
    try:
        validate_transition(AgentStatus.DRAFT, AgentStatus.LIVE)
    except InvalidTransition:
        raised = True
    assert raised, "Violation I5: Draft was permitted to transition directly to live"

    # 2. Verify certified-logic cannot skip to live
    raised = False
    try:
        validate_transition(AgentStatus.CERTIFIED_LOGIC, AgentStatus.LIVE)
    except InvalidTransition:
        raised = True
    assert raised, "Violation I5: certified-logic was permitted to transition directly to live"

    # 3. Verify only certified-acoustic can transition to live
    try:
        validate_transition(AgentStatus.CERTIFIED_ACOUSTIC, AgentStatus.LIVE)
    except InvalidTransition as exc:
        assert False, f"Violation I5: Valid transition certified-acoustic -> live was rejected: {exc}"

    print("PASS: Invariant I5 (Certified bind verified: live status strictly requires prior acoustic certification)")


if __name__ == "__main__":
    try:
        check_i5_certified_bind()
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
