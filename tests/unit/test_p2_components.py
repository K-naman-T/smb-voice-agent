"""Unit tests for Phase P2 components (GPU lock, STT, TTS wrappers)."""
import os
import tempfile
import pytest
from pathlib import Path

from runtime_contracts.gpu_lock import GPULock, GPULockTimeoutError, gpu_lock
from runtime_contracts.stt import FasterWhisperSTT
from runtime_contracts.tts import PiperTTS, TTSError


def test_gpu_lock_acquire_release():
    with tempfile.TemporaryDirectory() as tmpdir:
        lock_file = os.path.join(tmpdir, "test.lock")
        lock = GPULock(lock_path=lock_file, timeout=1.0)
        lock.acquire()
        assert os.path.exists(lock_file)
        lock.release()


def test_gpu_lock_context_manager():
    with tempfile.TemporaryDirectory() as tmpdir:
        lock_file = os.path.join(tmpdir, "test.lock")
        with gpu_lock(lock_path=lock_file, timeout=1.0):
            assert os.path.exists(lock_file)


def test_gpu_lock_contention_timeout():
    with tempfile.TemporaryDirectory() as tmpdir:
        lock_file = os.path.join(tmpdir, "test.lock")
        lock1 = GPULock(lock_path=lock_file, timeout=1.0)
        lock1.acquire()
        try:
            lock2 = GPULock(lock_path=lock_file, timeout=0.1)
            with pytest.raises(GPULockTimeoutError):
                lock2.acquire()
        finally:
            lock1.release()


def test_piper_tts_unavailable_error():
    tts = PiperTTS(voice_path="/nonexistent/voice.onnx", piper_bin="/nonexistent/piper")
    assert not tts.is_available()
    with pytest.raises(TTSError):
        tts.synthesize("Hello world")
