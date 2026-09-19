#!/usr/bin/env python3
"""Invariant I9: English-only v1 (no Hinglish distill-en claims).

Why it exists:
Hinglish code-switching requires custom acoustic models and fine-tuned ASR.
Claiming Hindi/Hinglish support via a naive 'distill-en' translation heuristic
violates truth-in-advertising and fails acoustic certification. v1 is strictly English.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.extend([str(REPO_ROOT / "packages"), str(REPO_ROOT / "apps" / "api")])

from agent_compiler.compiler import compile_agent_version
from agent_compiler.kits import KITS_BY_INDUSTRY


def check_i9_english_only() -> None:
    # 1. Verify all starter kits specify English voice prompts
    for ind, kit in KITS_BY_INDUSTRY.items():
        agent = compile_agent_version("test_ag", "test_tenant", industry=ind)
        prompt = agent.system_prompt
        assert "Speak in natural, concise sentences" in prompt, (
            f"Violation I9: Missing standard English voice rule in kit {ind}"
        )
        assert "distill-en" not in prompt.lower(), (
            f"Violation I9: Distill-en heuristic detected in prompt for kit {ind}"
        )
        assert "hinglish" not in prompt.lower(), (
            f"Violation I9: Hinglish claim found in prompt for kit {ind}"
        )

    # 2. Check that active models in packages do not reference distill-en
    for py_file in (REPO_ROOT / "packages").rglob("*.py"):
        content = py_file.read_text(encoding="utf-8")
        assert "distill-en" not in content, (
            f"Violation I9: distill-en path found in {py_file.relative_to(REPO_ROOT)}"
        )

    print("PASS: Invariant I9 (English-only v1 verified: no distill-en or Hinglish claims)")


if __name__ == "__main__":
    try:
        check_i9_english_only()
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
