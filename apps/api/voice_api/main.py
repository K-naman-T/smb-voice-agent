"""FastAPI application entrypoint for voice_api control plane (§2.15)."""
from __future__ import annotations

import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from voice_api.config import load_settings
from voice_api.db import init_db
from voice_api.routes import agents, appointments, calls, certify, tenants

settings = load_settings()

app = FastAPI(
    title="Bellmaker Control API",
    version="2.0.0",
    description="Control plane for configuring, simulating, certifying, and deploying local voice agents.",
)
app.state.settings = settings

# CORS
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.monotonic()
    response = await call_next(request)
    process_time = time.monotonic() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response


@app.get("/health")
def health_check():
    """Unauthenticated health probe."""
    return {
        "status": "healthy",
        "service": "voice_api",
        "version": "2.0.0",
        "deployment_mode": settings.deployment_mode.value,
        "database": settings.database_url,
    }


# Include v1 API routes
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(agents.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(calls.router, prefix="/api/v1")
app.include_router(certify.router, prefix="/api/v1")


@app.on_event("startup")
def on_startup():
    init_db(settings.database_url)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)
