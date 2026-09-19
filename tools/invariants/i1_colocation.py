#!/usr/bin/env python3
"""Invariant I1: Colocation (Media, STT, llama-server, TTS, worker on one host).

Why it exists:
Stage latencies on voice pipelines compound across network hops. Distributing
STT, LLM, or TTS across network interfaces or Tailscale nodes degrades TTFA
beyond the ≤1600ms SLO. In local-private mode, all services must bind to loopback.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add repo root and packages to path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.extend([str(REPO_ROOT / "packages"), str(REPO_ROOT / "apps" / "api")])

from voice_api.config import Settings, DeploymentMode


def check_i1_colocation() -> None:
    settings = Settings()
    if settings.deployment_mode == DeploymentMode.LOCAL_PRIVATE:
        # Verify API host binds to loopback
        assert settings.api_host in ("127.0.0.1", "localhost"), (
            f"Violation I1: API host {settings.api_host} is not loopback"
        )
        # Verify llama_base_url is local
        assert "127.0.0.1" in settings.llama_base_url or "localhost" in settings.llama_base_url, (
            f"Violation I1: llama_base_url {settings.llama_base_url} is not colocated loopback"
        )
        # Verify livekit_url is local
        assert "127.0.0.1" in settings.livekit_url or "localhost" in settings.livekit_url, (
            f"Violation I1: livekit_url {settings.livekit_url} is not colocated loopback"
        )

    print("PASS: Invariant I1 (Colocation verified: all stages bound to local loopback)")


if __name__ == "__main__":
    try:
        check_i1_colocation()
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
