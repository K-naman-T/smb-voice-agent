#!/usr/bin/env python3
"""Invariant I7: Privacy fail-closed (local-private egress empty; cloud keys scanned).

Why it exists:
Local-private deployment requires a cryptographic guarantee that no audio, transcripts,
or business data leak to cloud providers. Egress must be fail-closed, allowlist empty,
and all configuration scanned against forbidden cloud endpoints and API keys.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.extend([str(REPO_ROOT / "packages"), str(REPO_ROOT / "apps" / "api")])

from privacy.forbidden_providers import scan_for_forbidden_providers
from runtime_contracts.deployment import DeploymentMode, DeploymentPolicy, CloudProviderError
from voice_api.config import Settings


def check_i7_privacy_fail_closed() -> None:
    # 1. Clean configuration passes with zero violations
    clean_config = {
        "llm_base_url": "http://127.0.0.1:8083/v1",
        "stt_engine": "faster-whisper-large-v3-turbo",
        "tts_engine": "piper-en_US-lessac-medium",
    }
    violations = scan_for_forbidden_providers(clean_config)
    assert len(violations) == 0, f"Violation I7: False positive on clean config: {violations}"

    # 2. Injected cloud keys must be detected
    dirty_env = {"OPENAI_API_KEY": "sk-test1234567890", "PATH": "/usr/bin"}
    env_violations = scan_for_forbidden_providers(clean_config, env=dirty_env)
    assert len(env_violations) == 1, f"Violation I7: Forbidden env var not detected: {env_violations}"
    assert env_violations[0].provider == "openai"

    # 3. Policy rejects cloud endpoints in local-private mode
    policy = DeploymentPolicy(DeploymentMode.LOCAL_PRIVATE)
    assert not policy.egress_allowed, "Violation I7: Egress is erroneously permitted in local-private mode"

    raised = False
    try:
        policy.validate_base_url("https://api.openai.com/v1")
    except CloudProviderError:
        raised = True
    assert raised, "Violation I7: Cloud URL allowed in local-private mode"

    # 4. Settings default in local-private has empty egress allowlist
    settings = Settings()
    if settings.deployment_mode == DeploymentMode.LOCAL_PRIVATE:
        assert len(settings.egress_allowlist) == 0, "Violation I7: Default egress allowlist is non-empty in local-private"

    print("PASS: Invariant I7 (Privacy fail-closed verified: egress empty, cloud scan active)")


if __name__ == "__main__":
    try:
        check_i7_privacy_fail_closed()
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
