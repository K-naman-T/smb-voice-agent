#!/usr/bin/env python3
"""Invariant I8: Single GPU consumer policy (one active session, cooperative GPU lock).

Why it exists:
On single-GPU edge hosts (e.g. RTX 4060 8GB on chomp), concurrent model inference
causes VRAM thrashing, CUDA out-of-memory crashes, or extreme latency spikes. A cooperative
flock-based mutex must arbitrate GPU access between Whisper STT decode and llama LLM decode.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.extend([str(REPO_ROOT / "packages"), str(REPO_ROOT / "apps" / "api")])

from runtime_contracts.gpu_lock import GPULock, GPULockTimeoutError


def check_i8_single_gpu_policy() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        lock_file = os.path.join(tmpdir, "test_gpu.lock")

        # 1. Primary worker acquires GPU lock
        lock1 = GPULock(lock_path=lock_file, timeout=0.1)
        lock1.acquire()

        # 2. Secondary consumer attempts acquisition and must be locked out
        lock2 = GPULock(lock_path=lock_file, timeout=0.1)
        raised = False
        try:
            lock2.acquire()
        except GPULockTimeoutError:
            raised = True
        assert raised, "Violation I8: Concurrent consumer acquired GPU lock simultaneously"

        # 3. Primary releases, secondary can now acquire
        lock1.release()
        lock2.acquire()
        lock2.release()

    print("PASS: Invariant I8 (Single GPU consumer policy verified: cooperative lock arbitrates access)")


if __name__ == "__main__":
    try:
        check_i8_single_gpu_policy()
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
