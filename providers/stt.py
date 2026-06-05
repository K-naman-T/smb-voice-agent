from __future__ import annotations
import os
from typing import AsyncIterator
from .base import STTProvider


class WhisperSTT(STTProvider):
    def __init__(self, model: str = "base", device: str = "cpu", compute_type: str = "int8"):
        self.model_name = model
        self.device = device
        self.compute_type = compute_type
        self._model = None

    def _get_model(self):
        if self._model is None:
            from faster_whisper import WhisperModel
            self._model = WhisperModel(self.model_name, device=self.device, compute_type=self.compute_type)
        return self._model

    async def transcribe(self, audio_bytes: bytes) -> str:
        if not audio_bytes:
            return ""
        try:
            import tempfile, os, asyncio
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(audio_bytes)
                tmp_path = f.name
            loop = asyncio.get_event_loop()
            model = self._get_model()
            segments, info = await loop.run_in_executor(None, lambda: list(model.transcribe(tmp_path)))
            os.unlink(tmp_path)
            return " ".join(seg.text for seg in segments) if segments else ""
        except Exception as e:
            print(f"Whisper error: {e}")
            return ""

    async def transcribe_stream(self) -> AsyncIterator[str]:
        yield ""


class BrowserSTT(STTProvider):
    async def transcribe(self, audio_bytes: bytes) -> str:
        return ""

    async def transcribe_stream(self) -> AsyncIterator[str]:
        yield ""


class SarvamSTT(STTProvider):
    def __init__(self, api_key: str = ""):
        self.api_key = api_key or os.getenv("SARVAM_API_KEY", "")

    async def transcribe(self, audio_bytes: bytes) -> str:
        if not self.api_key:
            return "[Sarvam not configured]"
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30) as client:
                files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
                data = {
                    "api_key": self.api_key,
                    "model": "saarika:2.0",
                    "language_code": "en-IN",
                    "punctuate": True,
                }
                resp = await client.post("https://api.sarvam.ai/speech-to-text", files=files, data=data)
                if resp.status_code == 200:
                    return resp.json().get("transcript", "")
                return f"[Sarvam error: {resp.status_code}]"
        except Exception as e:
            return f"[STT error: {e}]"

    async def transcribe_stream(self) -> AsyncIterator[str]:
        yield ""
