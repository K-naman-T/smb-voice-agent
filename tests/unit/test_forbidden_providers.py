"""Tests for packages/privacy/forbidden_providers.

Regression coverage for the Ollama URL pattern (it used to match any
http://127.0.0.1:N, which false-positived on the v2 llama-server default
http://127.0.0.1:8081). Ollama's canonical port is 11434; the v2 llama-server
runs on 8081. These tests pin that distinction.
"""
from __future__ import annotations

import pytest

from privacy.forbidden_providers import scan_for_forbidden_providers


class TestOllamaNarrowPort:
    def test_ollama_default_port_is_detected(self):
        cfg = {"base_url": "http://127.0.0.1:11434"}
        violations = scan_for_forbidden_providers(cfg, env={})
        assert any(v.provider == "ollama" for v in violations)

    def test_ollama_localhost_default_port_is_detected(self):
        cfg = {"base_url": "http://localhost:11434/v1"}
        violations = scan_for_forbidden_providers(cfg, env={})
        assert any(v.provider == "ollama" for v in violations)

    def test_v2_llama_server_default_is_not_flagged(self):
        cfg = {
            "llama_base_url": "http://127.0.0.1:8081/v1",
            "api_host": "127.0.0.1",
        }
        violations = scan_for_forbidden_providers(cfg, env={})
        assert not any(v.provider == "ollama" for v in violations)

    def test_ollama_env_var_is_detected(self):
        violations = scan_for_forbidden_providers(
            {}, env={"OLLAMA_HOST": "http://127.0.0.1:11434"}
        )
        assert any(v.provider == "ollama" for v in violations)

    def test_ollama_model_prefix_is_detected(self):
        cfg = {"model_id": "llama3:latest"}
        violations = scan_for_forbidden_providers(cfg, env={})
        assert any(v.provider == "ollama" for v in violations)

    def test_qwen_model_not_flagged_as_ollama(self):
        # Qwen 2.5/3 and Qwen3.5 should never be flagged as Ollama —
        # the model_prefix list for ollama is `llama3/llama2/mistral/codellama/phi3/gemma2`.
        for model in ("qwen2.5-3b-instruct", "qwen3-4b", "Qwen3.5-9B-Chat"):
            violations = scan_for_forbidden_providers({"model": model}, env={})
            assert not any(
                v.provider == "ollama" for v in violations
            ), f"qwen model {model!r} should not be flagged as ollama"


class TestCloudProvidersStillDetected:
    @pytest.mark.parametrize(
        "url,expected_provider",
        [
            ("https://api.openai.com/v1", "openai"),
            ("https://api.anthropic.com/v1/messages", "anthropic"),
            ("https://generativelanguage.googleapis.com/v1", "google"),
            ("https://api.cohere.ai/v1", "cohere"),
            ("https://api.mistral.ai/v1", "mistral"),
            ("https://api.groq.com/openai/v1", "groq"),
        ],
    )
    def test_cloud_url_detected(self, url: str, expected_provider: str):
        violations = scan_for_forbidden_providers({"base_url": url}, env={})
        assert any(v.provider == expected_provider for v in violations)
