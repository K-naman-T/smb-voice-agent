"""voice_api — FastAPI control plane for the v2 voice-agent configurator.

§2.15 of ENGINEERING_PLAN_v2.md:
  - Per-tenant API keys, stored as sha256
  - Scopes: agents:write, sessions:create, calls:read, appointments:write, certify:run
  - Middleware on all /api/v1/* except /health
  - IDOR-safe: every query tenant_id = principal.tenant_id
  - Rate limit on mutating endpoints
  - Bind: 127.0.0.1 default
  - CORS: explicit origins, no * with credentials
"""
