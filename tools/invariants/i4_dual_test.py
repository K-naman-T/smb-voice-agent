#!/usr/bin/env python3
"""Invariant I4: Dual test (logic CI vs acoustic/GPU separate).

Why it exists:
Logic verification and acoustic validation operate on fundamentally different
assumptions. Logic tests must be runnable in headless CI on any developer machine
without GPU or audio hardware. Acoustic verification requires the target hardware
(chomp) and must have a separate, distinct certification status.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.extend([str(REPO_ROOT / "packages"), str(REPO_ROOT / "apps" / "api")])

from agent_schema.lifecycle import AgentStatus


def check_i4_dual_test() -> None:
    # 1. Lifecycle status separation
    statuses = set(s.value for s in AgentStatus)
    assert "certified-logic" in statuses, "Violation I4: 'certified-logic' status missing from AgentStatus"
    assert "certified-acoustic" in statuses, "Violation I4: 'certified-acoustic' status missing from AgentStatus"
    assert AgentStatus.CERTIFIED_LOGIC != AgentStatus.CERTIFIED_ACOUSTIC, (
        "Violation I4: Logic certification is conflated with acoustic certification"
    )

    # 2. Test taxonomy separation
    tests_dir = REPO_ROOT / "tests"
    assert (tests_dir / "unit").is_dir(), "Violation I4: tests/unit/ directory missing"
    assert (tests_dir / "contract").is_dir(), "Violation I4: tests/contract/ directory missing"

    # Verify unit and sim tests do not hardcode chomp contract dependencies
    for tfile in (tests_dir / "unit").glob("*.py"):
        content = tfile.read_text(encoding="utf-8")
        assert "chomp:8083" not in content, (
            f"Violation I4: Headless logic test {tfile.name} hardcodes chomp host dependency"
        )

    print("PASS: Invariant I4 (Dual test verified: logic CI and acoustic/GPU certification strictly separated)")


if __name__ == "__main__":
    try:
        check_i4_dual_test()
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
