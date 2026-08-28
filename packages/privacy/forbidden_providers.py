"""Forbidden-provider scan helper.

I7: "fail if cloud base_url or OPENAI_API_KEY set in local-private".

This module provides a scan function that inspects a configuration tree
(plain dicts/lists/scalars) and reports any forbidden cloud-provider
artifacts — URLs, API keys, model references — as structured violations.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ProviderViolation:
    """A single detected forbidden-provider violation."""

    path: str
    provider: str
    detail: str


# Canonical provider definitions — name, URL patterns, env-var names.
@dataclass(frozen=True)
class _ProviderDef:
    name: str
    url_patterns: list[re.Pattern[str]] = field(default_factory=list)
    env_patterns: list[str] = field(default_factory=list)
    model_prefixes: list[str] = field(default_factory=list)


FORBIDDEN_PROVIDERS: list[_ProviderDef] = [
    _ProviderDef(
        name="openai",
        url_patterns=[
            re.compile(r"https?://(?:api\.)?openai\.com", re.I),
        ],
        env_patterns=["OPENAI_API_KEY", "OPENAI_ORG_ID"],
        model_prefixes=["gpt-3", "gpt-4", "gpt-4o", "o1", "o3", "davinci"],
    ),
    _ProviderDef(
        name="anthropic",
        url_patterns=[
            re.compile(r"https?://(?:api\.)?anthropic\.com", re.I),
        ],
        env_patterns=["ANTHROPIC_API_KEY"],
        model_prefixes=["claude-"],
    ),
    _ProviderDef(
        name="google",
        url_patterns=[
            re.compile(r"https?://(?:.*\.)?googleapis\.com", re.I),
            re.compile(r"https?://(?:generativelanguage|aiplatform)\.", re.I),
        ],
        env_patterns=["GOOGLE_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS"],
        model_prefixes=["gemini-"],
    ),
    _ProviderDef(
        name="azure",
        url_patterns=[
            re.compile(r"https?://(?:.*\.)?azure\.com", re.I),
            re.compile(r"https?://(?:.*\.)?openai\.azure", re.I),
        ],
        env_patterns=["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"],
    ),
    _ProviderDef(
        name="aws",
        url_patterns=[
            re.compile(r"https?://(?:.*\.)?amazonaws\.com", re.I),
        ],
        env_patterns=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
    ),
    _ProviderDef(
        name="cohere",
        url_patterns=[re.compile(r"https?://(?:api\.)?cohere\.ai", re.I)],
        env_patterns=["COHERE_API_KEY"],
        model_prefixes=["command-"],
    ),
    _ProviderDef(
        name="mistral",
        url_patterns=[re.compile(r"https?://(?:api\.)?mistral\.ai", re.I)],
        env_patterns=["MISTRAL_API_KEY"],
        model_prefixes=["mistral-"],
    ),
    _ProviderDef(
        name="groq",
        url_patterns=[re.compile(r"https?://api\.groq\.com", re.I)],
        env_patterns=["GROQ_API_KEY"],
    ),
    _ProviderDef(
        name="replicate",
        url_patterns=[re.compile(r"https?://(?:.*\.)?replicate\.com", re.I)],
        env_patterns=["REPLICATE_API_TOKEN"],
    ),
    _ProviderDef(
        name="together",
        url_patterns=[re.compile(r"https?://api\.together\.xyz", re.I)],
        env_patterns=["TOGETHER_API_KEY"],
    ),
    _ProviderDef(
        name="ollama",
        # Ollama's default port is 11434. Match that specifically so we
        # don't false-positive on the v2 llama-server defaults
        # (http://127.0.0.1:8081, etc.). The `OLLAMA_HOST` env_pattern
        # below is the canonical signal; this URL pattern is a backstop
        # for a stray `base_url: http://localhost:11434` in a config.
        url_patterns=[
            re.compile(r"https?://(?:localhost|127\.0\.0\.1):11434(?:/|$)", re.I),
            re.compile(r"https?://(?:.*\.)?ollama\.com", re.I),
        ],
        env_patterns=["OLLAMA_HOST"],
        model_prefixes=["llama3", "llama2", "mistral", "codellama", "phi3", "gemma2"],
    ),
]


def _check_value(value: Any, provider: _ProviderDef) -> bool:
    """Return True if a scalar value matches a forbidden provider."""
    if not isinstance(value, str):
        return False
    for pattern in provider.url_patterns:
        if pattern.search(value):
            return True
    for prefix in provider.model_prefixes:
        if value.lower().startswith(prefix):
            return True
    return False


def _scan_object(
    obj: Any,
    path: str,
) -> list[ProviderViolation]:
    """Recursively scan an object tree for forbidden provider artifacts."""
    violations: list[ProviderViolation] = []

    if isinstance(obj, str):
        for prov in FORBIDDEN_PROVIDERS:
            if _check_value(obj, prov):
                violations.append(
                    ProviderViolation(
                        path=path or "(root)",
                        provider=prov.name,
                        detail=f"String value matches {prov.name}: {obj[:120]}",
                    )
                )
    elif isinstance(obj, dict):
        for key, val in obj.items():
            child = f"{path}.{key}" if path else key
            # Check key name against env-pattern names
            for prov in FORBIDDEN_PROVIDERS:
                if key in prov.env_patterns:
                    if isinstance(val, str) and val.strip():
                        violations.append(
                            ProviderViolation(
                                path=child,
                                provider=prov.name,
                                detail=f"Env-var name {key} contains non-empty value",
                            )
                        )
            violations.extend(_scan_object(val, child))
    elif isinstance(obj, (list, tuple)):
        for i, item in enumerate(obj):
            violations.extend(_scan_object(item, f"{path}[{i}]"))

    return violations


def scan_for_forbidden_providers(
    config: dict[str, Any],
    *,
    env: dict[str, str | None] | None = None,
) -> list[ProviderViolation]:
    """Scan a config dict (and optional env) for forbidden cloud providers.

    Returns a list of ProviderViolation (empty = clean).
    Designed for CI gates and pre-flight checks in local-private mode.
    """
    violations = _scan_object(config, path="")

    if env is not None:
        for key, val in env.items():
            if val is None or val.strip() == "":
                continue
            for prov in FORBIDDEN_PROVIDERS:
                if key in prov.env_patterns:
                    violations.append(
                        ProviderViolation(
                            path=f"env.{key}",
                            provider=prov.name,
                            detail=f"Environment variable {key} is set with a non-empty value",
                        )
                    )

    return violations
