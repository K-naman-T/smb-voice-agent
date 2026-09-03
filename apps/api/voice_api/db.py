"""Database engine, session, and base class.

Supports SQLite (dev/tests) and PostgreSQL (compose) via SQLAlchemy 2.0.
For SQLite, aiosqlite is used in async contexts; sync sqlite3 for tests.
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator, Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker[Session]] = None


def init_engine(database_url: str) -> Engine:
    """Initialize the global engine from a database URL.

    SQLite needs check_same_thread=False; PostgreSQL uses defaults.
    """
    global _engine, _SessionLocal
    if _engine is not None:
        return _engine

    connect_args: dict = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        # Ensure the parent directory exists for file-backed sqlite URLs.
        if database_url.startswith("sqlite:///"):
            path = database_url[len("sqlite:///"):]
            parent = os.path.dirname(path)
            if parent and not os.path.exists(parent):
                os.makedirs(parent, exist_ok=True)

    _engine = create_engine(database_url, future=True, connect_args=connect_args)
    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False, autoflush=False)
    return _engine


def create_all() -> None:
    """Create all tables. Idempotent."""
    if _engine is None:
        raise RuntimeError("init_engine must be called first")
    # Import models so they register with Base.metadata.
    from voice_api import models  # noqa: F401

    Base.metadata.create_all(_engine)


def init_db(database_url: str) -> Engine:
    """Convenience helper to initialize engine and create all tables."""
    engine = init_engine(database_url)
    create_all()
    return engine


def reset_engine() -> None:
    """Drop the engine and session factory. Used by tests."""
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None


def get_engine() -> Engine:
    if _engine is None:
        raise RuntimeError("init_engine must be called first")
    return _engine


@contextmanager
def session_scope() -> Iterator[Session]:
    """Context manager that commits on success and rolls back on error."""
    if _SessionLocal is None:
        raise RuntimeError("init_engine must be called first")
    session = _SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_session() -> Iterator[Session]:
    """FastAPI dependency: yields a session, commits on success, rolls back on error."""
    if _SessionLocal is None:
        raise RuntimeError("init_engine must be called first")
    session = _SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
