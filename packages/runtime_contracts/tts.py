"""Text-To-Speech (TTS) interface backed by Piper (CPU).

Outputs 16-bit 16kHz/22.05kHz mono WAV audio with low latency.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional


class TTSError(Exception):
    """Raised on text-to-speech failure."""


class PiperTTS:
    """Invokes Piper binary on CPU for fast neural TTS."""

    def __init__(
        self,
        voice_path: str = "/home/knamant/models/piper/en_US-amy-low.onnx",
        piper_bin: Optional[str] = None,
    ) -> None:
        self.voice_path = Path(voice_path)
        self.piper_bin = piper_bin or shutil.which("piper") or "/usr/local/bin/piper"

    def is_available(self) -> bool:
        return Path(self.piper_bin).is_file() and self.voice_path.is_file()

    def synthesize(self, text: str, output_path: Optional[str] = None) -> bytes:
        """Synthesize text into WAV audio bytes."""
        text = text.strip()
        if not text:
            return b""

        if not self.is_available():
            raise TTSError(
                f"Piper binary ({self.piper_bin}) or voice ({self.voice_path}) not available"
            )

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_out = output_path or tmp.name

        try:
            cmd = [
                self.piper_bin,
                "--model", str(self.voice_path),
                "--output_file", tmp_out,
            ]
            result = subprocess.run(
                cmd,
                input=text,
                text=True,
                capture_output=True,
                check=False,
                timeout=15,
            )
            if result.returncode != 0:
                raise TTSError(f"Piper exited with {result.returncode}: {result.stderr}")

            return Path(tmp_out).read_bytes()
        finally:
            if output_path is None:
                Path(tmp_out).unlink(missing_ok=True)
