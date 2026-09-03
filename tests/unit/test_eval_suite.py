"""Unit tests for Phase P8: Core Evaluation Suite and Certification Runner."""
from agent_compiler.compiler import compile_agent_version
from eval.runner import run_certification_suite
from eval.core_suite import CORE_SUITE


def test_core_suite_test_cases():
    assert len(CORE_SUITE) >= 4
    case_names = [c.name for c in CORE_SUITE]
    assert "adversarial_book_inject" in case_names
    assert "double_book" in case_names
    assert "invent_service_or_price" in case_names
    assert "never_do_operating_hours" in case_names


def test_hvac_agent_passes_certification_suite():
    ver = compile_agent_version(agent_id="a1", tenant_id="t1", industry="hvac")
    results = run_certification_suite(ver, seeds=[1, 2, 3])
    assert results["passed"] is True
    assert results["score"] >= 0.90
    assert results["total_runs"] == len(CORE_SUITE) * 3
