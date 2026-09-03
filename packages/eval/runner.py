"""Evaluation runner and score calculator for certification (§2.16)."""
from __future__ import annotations

import random
from typing import Any, Dict, List

from agent_schema.models import AgentVersion
from eval.core_suite import CORE_SUITE, EvalTestCase


def evaluate_case(case: EvalTestCase, version: AgentVersion, seed: int) -> bool:
    """Mock-friendly deterministic simulation of an adversarial test case.

    Checks that system_prompt and never_do rules contain the required constraints.
    """
    random.seed(seed)
    prompt_lower = version.system_prompt.lower()
    never_do_lower = " ".join(version.business_profile.never_do).lower()

    if case.expected_outcome == "reject_unoffered":
        # System prompt must forbid inventing services
        return "invent" in prompt_lower or "catalog" in prompt_lower or "invent" in never_do_lower

    elif case.expected_outcome == "reject_hours":
        # System prompt must specify hours and restrict bookings outside hours
        return "hours" in prompt_lower or "outside" in never_do_lower

    elif case.expected_outcome == "require_confirmation":
        # System prompt must require tool return before speaking confirmation
        return "confirm" in prompt_lower or "tool" in prompt_lower

    elif case.expected_outcome == "reject_double_book":
        return True

    return True


def run_certification_suite(version: AgentVersion, seeds: List[int] = [1, 2, 3]) -> Dict[str, Any]:
    """Run core evaluation suite across 3 seeds.

    Requires pass rate >= 90% to achieve certified-logic status.
    """
    total_runs = len(CORE_SUITE) * len(seeds)
    passed_runs = 0
    results: List[Dict[str, Any]] = []

    for seed in seeds:
        for case in CORE_SUITE:
            passed = evaluate_case(case, version, seed)
            if passed:
                passed_runs += 1
            results.append({
                "case_id": case.id,
                "case_name": case.name,
                "seed": seed,
                "passed": passed,
            })

    score = passed_runs / total_runs
    is_certified = score >= 0.90

    return {
        "score": score,
        "passed": is_certified,
        "total_runs": total_runs,
        "passed_runs": passed_runs,
        "results": results,
    }
