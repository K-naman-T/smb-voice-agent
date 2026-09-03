"""Speech-To-Text (STT) interface backed by faster-whisper.

Default local model: 'small' or 'tiny', running on CPU/CUDA with int8/float16 quantization.
"""
from __future__ import annotations

import io
import tempfile
from pathlib import Path
from typing import BinaryIO, Optional, Union


class STTError(Exception):
    """Raised on speech-to-text failure."""


class FasterWhisperSTT:
    """Wrapper around faster_whisper.WhisperModel."""

    def __init__(
        self,
        model_size_or_path: str = "small",
        device: str = "auto",
        compute_type: str = "default",
        language: Optional[str] = "en",
    ) -> None:
        self.model_size_or_path = model_size_or_path
        self.device = device
        self.compute_type = compute_type
        self.language = language
        self._model = None

    def _ensure_model(self):
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
                self._model = WhisperModel(
                    self.model_size_or_path,
                    device=self.device,
                    compute_type=self.compute_type,
                )
            except Exception as e:
                raise STTError(f"Failed to load faster-whisper model: {e}") from e
        return self._model

    def transcribe(self, audio: Union[str, Path, bytes, BinaryIO]) -> str:
        """Transcribe an audio file path or audio bytes to text."""
        model = self._ensure_model()

        if isinstance(audio, bytes):
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(audio)
                tmp_path = tmp.name
            try:
                segments, _ = model.transcribe(tmp_path, language=self.language)
                return " ".join(s.text.strip() for s in segments)
            finally:
                Path(tmp_path).unlink(missing_ok=True)
        else:
            segments, _ = model.transcribe(audio, language=self.language)
            return " ".join(s.text.strip() for s in segments)
