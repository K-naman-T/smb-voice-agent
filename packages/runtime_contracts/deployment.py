"""Deployment mode and policy enforcement.

I3: Cloud adapters cannot import into local-private.
I7: local-private → egress allowlist empty; fail-closed.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Optional


class DeploymentMode(str, Enum):
    """Runtime deployment mode."""

    LOCAL_PRIVATE = "local-private"
    CLOUD = "cloud"
    HYBRID = "hybrid"


# Regex patterns matching cloud provider base URLs / identifiers.
# Used for config scanning and import guards.
_CLOUD_PROVIDER_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"https?://(?:api\.)?openai\.com", re.IGNORECASE),
    re.compile(r"https?://(?:api\.)?anthropic\.com", re.IGNORECASE),
    re.compile(r"https?://(?:.*\.)?googleapis\.com", re.IGNORECASE),
    re.compile(r"https?://(?:.*\.)?azure\.com", re.IGNORECASE),
    re.compile(r"https?://(?:.*\.)?amazonaws\.com", re.IGNORECASE),
    re.compile(r"https?://(?:api\.)?cohere\.ai", re.IGNORECASE),
    re.compile(r"https?://(?:api\.)?mistral\.ai", re.IGNORECASE),
    re.compile(r"https?://api\.groq\.com", re.IGNORECASE),
    re.compile(r"https?://(?:.*\.)?replicate\.com", re.IGNORECASE),
    re.compile(r"https?://api\.together\.xyz", re.IGNORECASE),
]

# Environment variables that signal cloud provider usage.
_CLOUD_ENV_VARS: list[str] = [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_API_KEY",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_ENDPOINT",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "COHERE_API_KEY",
    "MISTRAL_API_KEY",
    "GROQ_API_KEY",
    "REPLICATE_API_TOKEN",
    "TOGETHER_API_KEY",
]


class CloudProviderError(Exception):
    """Raised when a cloud provider is detected in local-private mode."""


class DeploymentPolicy:
    """Enforce deployment-mode constraints.

    In local-private mode:
      - No cloud base URLs allowed
      - No cloud API-key env vars may be set
      - Egress must be empty (fail-closed)
    """

    def __init__(self, mode: DeploymentMode) -> None:
        self.mode = mode

    def validate_base_url(self, url: str) -> None:
        """Raise CloudProviderError if *url* matches a cloud provider and mode is local-private."""
        if self.mode != DeploymentMode.LOCAL_PRIVATE:
            return
        for pattern in _CLOUD_PROVIDER_PATTERNS:
            if pattern.search(url):
                raise CloudProviderError(
                    f"Cloud provider URL detected in local-private mode: {url}"
                )

    def validate_env_vars(self, env: dict[str, str | None]) -> list[str]:
        """Check env dict for cloud provider keys.

        Returns list of offending variable names.
        Raises CloudProviderError if any found in local-private mode.
        """
        violations: list[str] = []
        if self.mode != DeploymentMode.LOCAL_PRIVATE:
            return violations
        for var in _CLOUD_ENV_VARS:
            val = env.get(var)
            if val is not None and val.strip() != "":
                violations.append(var)
        if violations:
            raise CloudProviderError(
                f"Cloud provider env vars set in local-private mode: {', '.join(violations)}"
            )
        return violations

    def validate_config(self, config: dict) -> list[str]:
        """Scan a config dict for any cloud provider URLs (recursive string scan).

        Returns list of paths where cloud URLs were found.
        Raises CloudProviderError in local-private mode.
        """
        if self.mode != DeploymentMode.LOCAL_PRIVATE:
            return []
        violations = self._scan_dict(config, path="")
        if violations:
            raise CloudProviderError(
                f"Cloud provider config detected in local-private mode at: {'; '.join(violations)}"
            )
        return violations

    def _scan_dict(self, obj: object, path: str) -> list[str]:
        violations: list[str] = []
        if isinstance(obj, str):
            for pattern in _CLOUD_PROVIDER_PATTERNS:
                if pattern.search(obj):
                    violations.append(path or "(root)")
                    break
        elif isinstance(obj, dict):
            for key, val in obj.items():
                child = f"{path}.{key}" if path else key
                violations.extend(self._scan_dict(val, child))
        elif isinstance(obj, (list, tuple)):
            for i, val in enumerate(obj):
                child = f"{path}[{i}]"
                violations.extend(self._scan_dict(val, child))
        return violations

    @property
    def egress_allowed(self) -> bool:
        """In local-private mode, egress is always denied (fail-closed)."""
        return self.mode != DeploymentMode.LOCAL_PRIVATE
