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


def test_compile_with_2026_agentic_moe():
    """Verify compiler supports Qwen3.8 Flash Next MoE with Kokoro and SenseVoice."""
    ver = compile_agent_version(
        agent_id="agt_moe",
        tenant_id="ten_moe",
        industry="electrician",
        model_id="llm.qwen3_8.flash_next",
        stt_model_id="stt.sensevoice",
        tts_model_id="tts.kokoro.en",
        pipeline_mode="cascaded",
        paralinguistic_tags=True,
        autonomous_recovery=True,
    )
    assert ver.model_id == "llm.qwen3_8.flash_next"
    assert ver.stt_model_id == "stt.sensevoice"
    assert ver.tts_model_id == "tts.kokoro.en"
    assert ver.pipeline_mode == "cascaded"
    assert ver.paralinguistic_tags is True
    assert ver.autonomous_recovery is True
    assert ver.verify_checksum() is True


def test_compile_full_duplex_personaplex():
    """Verify compiler supports NVIDIA PersonaPlex-7B Full-Duplex S2S."""
    ver = compile_agent_version(
        agent_id="agt_s2s",
        tenant_id="ten_s2s",
        industry="hvac",
        model_id="s2s.nvidia.personaplex",
        stt_model_id="s2s.nvidia.personaplex",
        tts_model_id="s2s.nvidia.personaplex",
        pipeline_mode="full_duplex",
        paralinguistic_tags=False,
        autonomous_recovery=True,
    )
    assert ver.model_id == "s2s.nvidia.personaplex"
    assert ver.pipeline_mode == "full_duplex"
    assert ver.verify_checksum() is True
    snapshot = ver.snapshot()
    assert snapshot["model_id"] == "s2s.nvidia.personaplex"
    assert snapshot["pipeline_mode"] == "full_duplex"
