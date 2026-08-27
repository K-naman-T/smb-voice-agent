"""privacy — forbidden-provider scan helper.

I7 (normative): Runtime allowlist empty for local-private.
CI: fail if cloud base_url or OPENAI_API_KEY set in local-private.
"""

from privacy.forbidden_providers import (
    scan_for_forbidden_providers,
    ProviderViolation,
    FORBIDDEN_PROVIDERS,
)

__all__ = [
    "scan_for_forbidden_providers",
    "ProviderViolation",
    "FORBIDDEN_PROVIDERS",
]
