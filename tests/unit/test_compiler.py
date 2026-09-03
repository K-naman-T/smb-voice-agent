"""Unit tests for Phase P6: Agent Compiler and Industry Kits."""
from agent_compiler.compiler import compile_agent_version
from agent_compiler.kits import get_industry_kit
from agent_schema.models import AgentStatus, BusinessProfile


def test_compile_default_hvac_kit():
    ver = compile_agent_version(
        agent_id="agt_1",
        tenant_id="ten_1",
        industry="hvac",
    )
    assert ver.status == AgentStatus.DRAFT
    assert ver.checksum != "", "Checksum must be automatically computed"
    assert "CoolAir Services" in ver.system_prompt
    assert "AC Repair" in ver.system_prompt
    assert len(ver.tools) == 3
    tool_names = [t.name for t in ver.tools]
    assert "book_appointment" in tool_names
    assert "route_emergency" in tool_names


def test_compile_custom_profile():
    profile = BusinessProfile(
        business_name="Custom Plumbers",
        industry="plumbing",
        hours="9am - 5pm",
        services=["Pipe Unclogging"],
        never_do=["Never give quotes without inspection"],
    )
    ver = compile_agent_version(
        agent_id="agt_2",
        tenant_id="ten_2",
        profile=profile,
        industry="plumbing",
    )
    assert "Custom Plumbers" in ver.system_prompt
    assert "Pipe Unclogging" in ver.system_prompt
    assert "Never give quotes without inspection" in ver.system_prompt
    assert ver.business_profile.business_name == "Custom Plumbers"


def test_all_industry_kits_exist():
    for ind in ["hvac", "plumbing", "electrician", "pest_control"]:
        kit = get_industry_kit(ind)
        assert kit.business_name
        assert len(kit.services) > 0
        assert len(kit.pricing) > 0
        assert len(kit.never_do) > 0
