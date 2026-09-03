"""GPU Lock — Cooperative mutex for VRAM-intensive workloads.

Prevents concurrent execution of heavy GPU tasks (e.g. model switching or
competing decodes) on single-GPU hosts like chomp (RTX 4060 8GB).
"""
from __future__ import annotations

import asyncio
import contextlib
import fcntl
import os
import time
from pathlib import Path
from typing import Iterator, Optional


class GPULockTimeoutError(TimeoutError):
    """Raised when the GPU lock cannot be acquired within the timeout."""


class GPULock:
    """File-based cooperative mutex using fcntl.flock."""

    def __init__(self, lock_path: str = "/tmp/voice-agent-gpu.lock", timeout: float = 10.0) -> None:
        self.lock_path = Path(lock_path)
        self.timeout = timeout
        self._fd: Optional[int] = None

    def acquire(self) -> None:
        self.lock_path.parent.mkdir(parents=True, exist_ok=True)
        self._fd = os.open(str(self.lock_path), os.O_CREAT | os.O_RDWR)
        start = time.monotonic()
        while True:
            try:
                fcntl.flock(self._fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                return
            except (BlockingIOError, OSError):
                if time.monotonic() - start >= self.timeout:
                    if self._fd is not None:
                        os.close(self._fd)
                        self._fd = None
                    raise GPULockTimeoutError(
                        f"Timed out after {self.timeout}s waiting for GPU lock at {self.lock_path}"
                    )
                time.sleep(0.05)

    def release(self) -> None:
        if self._fd is not None:
            try:
                fcntl.flock(self._fd, fcntl.LOCK_UN)
            finally:
                os.close(self._fd)
                self._fd = None

    def __enter__(self) -> "GPULock":
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.release()

    async def __aenter__(self) -> "GPULock":
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self.acquire)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self.release)


@contextlib.contextmanager
def gpu_lock(lock_path: str = "/tmp/voice-agent-gpu.lock", timeout: float = 10.0) -> Iterator[GPULock]:
    lock = GPULock(lock_path=lock_path, timeout=timeout)
    with lock:
        yield lock
