"""API key authentication, scopes, and principal resolution.

§2.15: Per-tenant API keys, stored as sha256, scopes; IDOR-safe queries.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from typing import Iterable, Optional

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from voice_api.db import get_session


# Scope names from §2.15.
SCOPE_AGENTS_WRITE = "agents:write"
SCOPE_SESSIONS_CREATE = "sessions:create"
SCOPE_CALLS_READ = "calls:read"
SCOPE_APPOINTMENTS_WRITE = "appointments:write"
SCOPE_CERTIFY_RUN = "certify:run"

ALL_SCOPES = (
    SCOPE_AGENTS_WRITE,
    SCOPE_SESSIONS_CREATE,
    SCOPE_CALLS_READ,
    SCOPE_APPOINTMENTS_WRITE,
    SCOPE_CERTIFY_RUN,
)


def hash_api_key(key: str) -> str:
    """Return the lowercase SHA-256 hex digest of an API key.

    We never store the raw key. Only the hash and a short prefix.
    """
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def generate_api_key(prefix: str = "vak") -> tuple[str, str, str]:
    """Generate a new API key.

    Returns (full_key, key_hash, key_prefix).
    The full key is shown to the operator exactly once.
    """
    raw = secrets.token_urlsafe(32)
    full = f"{prefix}_{raw}"
    return full, hash_api_key(full), prefix


def parse_scopes(scopes: str | None) -> set[str]:
    if not scopes:
        return set()
    return {s.strip() for s in scopes.split(",") if s.strip()}


@dataclass(frozen=True)
class Principal:
    """The resolved caller of an API request."""

    tenant_id: str
    api_key_id: str
    scopes: frozenset[str]
    is_service: bool = False  # True when called by an internal worker

    def has_scope(self, scope: str) -> bool:
        return scope in self.scopes or self.is_service


class AuthError(HTTPException):
    def __init__(self, detail: str = "unauthorized") -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class ScopeError(HTTPException):
    def __init__(self, scope: str) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"missing scope: {scope}",
        )


def _extract_bearer(auth_header: Optional[str]) -> str:
    if not auth_header:
        raise AuthError("missing authorization header")
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthError("malformed authorization header")
    return parts[1].strip()


def get_principal(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    x_worker_key: Optional[str] = Header(default=None, alias="x-worker-key"),
    session: Session = Depends(get_session),
) -> Principal:
    """FastAPI dependency that resolves a Principal from headers.

    Accepts:
      - Bearer API key (operator)
      - X-Worker-Key header (internal worker; service principal)
    """
    from voice_api.models import ApiKey  # local import to avoid cycle

    settings = request.app.state.settings

    # Service path: worker → API.
    if x_worker_key:
        if not hmac.compare_digest(x_worker_key, settings.worker_service_key):
            raise AuthError("invalid worker key")
        # Service principal carries a synthetic tenant via header.
        svc_tenant = request.headers.get("x-tenant-id")
        if not svc_tenant:
            raise AuthError("service principal requires x-tenant-id")
        return Principal(
            tenant_id=svc_tenant,
            api_key_id="__service__",
            scopes=frozenset(ALL_SCOPES),
            is_service=True,
        )

    # Operator path: bearer API key.
    raw = _extract_bearer(authorization)
    digest = hash_api_key(raw)
    row = session.query(ApiKey).filter_by(key_hash=digest, revoked=False).one_or_none()
    if row is None:
        raise AuthError("invalid api key")

    return Principal(
        tenant_id=row.tenant_id,
        api_key_id=row.id,
        scopes=frozenset(parse_scopes(row.scopes)),
        is_service=False,
    )


def require_scope(scope: str):
    """FastAPI dependency factory enforcing a single scope."""

    def _check(principal: Principal = Depends(get_principal)) -> Principal:
        if not principal.has_scope(scope):
            raise ScopeError(scope)
        return principal

    return _check
