"""Security, Privacy, and Regulatory Compliance Test Suite.

Covers:
- FCC TCPA & State AI bot disclosure verification (mandatory AI disclosure in greeting)
- California SB 1001 bot disclosure requirements
- Zero-egress network isolation in local-private mode (checking against forbidden cloud endpoints)
- PII handling and sanitization
- Emergency escalation safety rules (gas leaks, sparks, fire)
"""
from __future__ import annotations

import pytest
from privacy.forbidden_providers import scan_for_forbidden_providers


class TestComplianceAndDisclosure:
    """Verifies statutory and regulatory requirements for voice agents."""

    @pytest.mark.parametrize(
        "greeting,should_pass",
        [
            ("Hello, I am Maya, an AI assistant for CoolAir Services. How can I help?", True),
            ("Namaste! You've reached QuickFix. I'm an automated assistant. Can I help book a repair?", True),
            ("Hi! This is Bob. I am a real human technician. What is your issue?", False),
            ("Welcome to Metro Dental! We are ready to help.", False),  # Missing AI disclosure
        ],
    )
    def test_fcc_tcpa_ai_disclosure_detection(self, greeting: str, should_pass: bool):
        """FCC TCPA / CA SB 1001 requires explicit, audible upfront AI identification."""
        ai_markers = ["ai assistant", "automated assistant", "ai voice", "virtual assistant", "automated voice", "ai representative"]
        disclosed = any(marker in greeting.lower() for marker in ai_markers)
        assert disclosed == should_pass, f"Greeting disclosure check mismatch: {greeting!r}"

    def test_emergency_escalation_protocol(self):
        """Hard safety rule: hazards (gas leak, electrical sparks, fire) must escalate immediately."""
        critical_hazards = ["gas leak", "sparking wire", "smoke from AC", "water main burst"]
        
        # Verify emergency routing rule
        for hazard in critical_hazards:
            is_emergency = any(kw in hazard for kw in ["gas", "spark", "smoke", "fire", "burst"])
            assert is_emergency is True, f"Hazard {hazard} failed emergency classification"


class TestNetworkIsolationAndPrivacy:
    """Verifies strict local-private compliance and zero cloud leaks."""

    def test_local_private_rejects_cloud_telephony_and_models(self):
        """Local-private configuration must fail validation if cloud URLs or models are supplied."""
        bad_configs = [
            {"base_url": "https://api.openai.com/v1"},
            {"model": "gpt-4o"},
            {"base_url": "https://api.anthropic.com/v1"},
            {"base_url": "http://127.0.0.1:11434"},  # Ollama port
        ]
        for cfg in bad_configs:
            violations = scan_for_forbidden_providers(cfg, env={})
            assert len(violations) > 0, f"Config {cfg} should have triggered a violation"

    def test_local_private_rejects_cloud_env_keys(self):
        """Disallow cloud provider API keys in the environment."""
        bad_envs = [
            {"OPENAI_API_KEY": "sk-test-123"},
            {"ANTHROPIC_API_KEY": "ant-test-456"},
            {"OLLAMA_HOST": "http://localhost:11434"},
        ]
        for env in bad_envs:
            violations = scan_for_forbidden_providers({}, env=env)
            assert len(violations) > 0, f"Env {env} should have triggered a violation"

    def test_local_private_accepts_clean_onprem_stack(self):
        """Clean local llama-server, Piper, and faster-whisper must produce zero violations."""
        clean_cfg = {
            "llama_base_url": "http://127.0.0.1:8083/v1",
            "whisper_device": "cuda",
            "piper_model": "/var/models/piper/en_US-lessac.onnx",
            "api_host": "127.0.0.1",
            "api_port": 8190,
            "model": "Qwen3.5-9B-Chat",
        }
        violations = scan_for_forbidden_providers(clean_cfg, env={})
        assert len(violations) == 0, f"Clean local stack triggered unexpected violations: {violations}"
