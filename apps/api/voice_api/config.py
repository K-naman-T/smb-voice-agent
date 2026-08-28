"""Configuration for voice_api.

Settings are read from environment variables at startup. Sensible defaults
exist for local development; production must set DATABASE_URL, LLAMA_API_KEY,
and a real LLAMA_BASE_URL pointing at the colocated llama-server.

Invariant I1: the API binds to the loopback interface by default in
`local-private`. Invariant I7: EGRESS_ALLOWLIST is empty in `local-private`;
the API refuses to start if a cloud env var is set in that mode.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Optional

from runtime_contracts.deployment import DeploymentMode, DeploymentPolicy


def _env(key: str, default: Optional[str] = None) -> Optional[str]:
    val = os.environ.get(key)
    return val if val is not None and val != "" else default


@dataclass(frozen=True)
class Settings:
    deployment_mode: DeploymentMode = DeploymentMode.LOCAL_PRIVATE
    api_host: str = "127.0.0.1"
    api_port: int = 8090
    database_url: str = "sqlite:///./var/dev.sqlite3"
    llama_base_url: str = "http://127.0.0.1:8081/v1"
    llama_api_key: str = ""
    livekit_url: str = "ws://127.0.0.1:7880"
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    worker_service_key: str = "set-in-deploy-env"  # worker → API service auth
    cors_origins: tuple[str, ...] = ()
    log_level: str = "INFO"
    request_id_header: str = "x-request-id"
    egress_allowlist: tuple[str, ...] = ()

    @property
    def policy(self) -> DeploymentPolicy:
        return DeploymentPolicy(self.deployment_mode)


def load_settings() -> Settings:
    """Build Settings from env, validating against deployment policy."""
    raw_mode = (_env("DEPLOYMENT_MODE", "local-private") or "local-private").lower()
    try:
        mode = DeploymentMode(raw_mode)
    except ValueError as exc:
        raise RuntimeError(f"Invalid DEPLOYMENT_MODE: {raw_mode!r}") from exc

    raw_cors = _env("CORS_ORIGINS", "") or ""
    cors = tuple(o.strip() for o in raw_cors.split(",") if o.strip())

    raw_allow = _env("EGRESS_ALLOWLIST", "") or ""
    allow = tuple(a.strip() for a in raw_allow.split(",") if a.strip())

    settings = Settings(
        deployment_mode=mode,
        api_host=_env("API_HOST", "127.0.0.1") or "127.0.0.1",
        api_port=int(_env("API_PORT", "8090") or "8090"),
        database_url=_env("DATABASE_URL", "sqlite:///./var/dev.sqlite3")
        or "sqlite:///./var/dev.sqlite3",
        llama_base_url=_env("LLAMA_BASE_URL", "http://127.0.0.1:8081/v1")
        or "http://127.0.0.1:8081/v1",
        llama_api_key=_env("LLAMA_API_KEY", "") or "",
        livekit_url=_env("LIVEKIT_URL", "ws://127.0.0.1:7880") or "ws://127.0.0.1:7880",
        livekit_api_key=_env("LIVEKIT_API_KEY", "") or "",
        livekit_api_secret=_env("LIVEKIT_API_SECRET", "") or "",
        worker_service_key=_env("WORKER_SERVICE_KEY", "set-in-deploy-env")
        or "set-in-deploy-env",
        cors_origins=cors,
        log_level=_env("LOG_LEVEL", "INFO") or "INFO",
        egress_allowlist=allow,
    )

    # Enforce policy at startup (I7).
    settings.policy.validate_base_url(settings.llama_base_url)
    settings.policy.validate_env_vars(dict(os.environ))

    return settings
