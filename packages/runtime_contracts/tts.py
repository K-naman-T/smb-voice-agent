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


class KokoroTTS:
    """Invokes Kokoro-82M ONNX model on CPU/CUDA for studio-grade natural prosody."""

    def __init__(
        self,
        voice_path: str = "/home/knamant/models/kokoro/kokoro-v0_19.onnx",
        voice_name: str = "af_heart",
    ) -> None:
        self.voice_path = Path(voice_path)
        self.voice_name = voice_name

    def is_available(self) -> bool:
        if self.voice_path.is_file():
            return True
        # Also available if python kokoro package is installed
        try:
            import kokoro  # type: ignore # noqa: F401
            return True
        except ImportError:
            return False

    def synthesize(self, text: str, output_path: Optional[str] = None) -> bytes:
        """Synthesize text into WAV audio bytes using Kokoro-82M."""
        text = text.strip()
        if not text:
            return b""

        try:
            # First attempt: kokoro Python package
            from kokoro import KPipeline  # type: ignore
            pipeline = KPipeline(lang_code="a")
            generator = pipeline(text, voice=self.voice_name, speed=1.0)
            import io
            import soundfile as sf  # type: ignore
            audio_chunks = []
            for _, _, chunk in generator:
                audio_chunks.append(chunk)
            if audio_chunks:
                import numpy as np
                combined = np.concatenate(audio_chunks)
                buf = io.BytesIO()
                sf.write(buf, combined, 24000, format="WAV")
                data = buf.getvalue()
                if output_path:
                    Path(output_path).write_bytes(data)
                return data
        except Exception:
            pass

        # Fallback to piper if available to ensure service continuity
        fallback = PiperTTS()
        if fallback.is_available():
            return fallback.synthesize(text, output_path=output_path)

        raise TTSError(
            f"Kokoro-82M model ({self.voice_path}) not loaded and Piper fallback unavailable"
        )


class SarvamTTS:
    """Invokes Sarvam AI Bulbul/Saaras API for state-of-the-art conversational Indic TTS.
    
    Provides authentic Indian accents, natural Hinglish cadence, and 44.1kHz studio presence.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        speaker: str = "meera",
        target_language_code: str = "hi-IN",
        model: str = "bulbul:v1",
        voice_path: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("SARVAM_API_KEY", "")
        self.speaker = speaker
        self.target_language_code = target_language_code
        self.model = model
        self.fallback_voice = voice_path or "/home/knamant/models/piper/hi_IN-priyamvada-medium.onnx"
        self.endpoint = "https://api.sarvam.ai/text-to-speech"

    def is_available(self) -> bool:
        return bool(self.api_key)

    def synthesize(self, text: str, output_path: Optional[str] = None) -> bytes:
        """Synthesize text using Sarvam AI Bulbul/Saaras API with local Piper fallback."""
        text = text.strip()
        if not text:
            return b""

        if not self.is_available():
            fallback = PiperTTS(voice_path=self.fallback_voice)
            if fallback.is_available():
                return fallback.synthesize(text, output_path=output_path)
            raise TTSError("Sarvam API key not configured and local fallback unavailable")

        import base64
        import httpx

        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "inputs": [text],
            "target_language_code": self.target_language_code,
            "speaker": self.speaker,
            "pitch": 0,
            "pace": 1.0,
            "loudness": 1.5,
            "speech_sample_rate": 22050,
            "enable_preprocessing": True,
            "model": self.model,
        }
        try:
            with httpx.Client(timeout=12.0) as client:
                res = client.post(self.endpoint, json=payload, headers=headers)
                res.raise_for_status()
                data = res.json()
                audios = data.get("audios", [])
                if not audios:
                    raise TTSError("Empty audio payload received from Sarvam API")
                audio_bytes = base64.b64decode(audios[0])
                if output_path:
                    Path(output_path).write_bytes(audio_bytes)
                return audio_bytes
        except Exception:
            fallback = PiperTTS(voice_path=self.fallback_voice)
            if fallback.is_available():
                return fallback.synthesize(text, output_path=output_path)
            raise


class ElevenLabsTTS:
    """Invokes ElevenLabs Turbo/Flash API for state-of-the-art expressive human TTS."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        voice_id: str = "21m00Tcm4TlvDq8ikWAM",  # Rachel / Default
        model_id: str = "eleven_turbo_v2_5",
    ) -> None:
        self.api_key = api_key or os.environ.get("ELEVENLABS_API_KEY", "")
        self.voice_id = voice_id
        self.model_id = model_id

    def is_available(self) -> bool:
        return bool(self.api_key)

    def synthesize(self, text: str, output_path: Optional[str] = None) -> bytes:
        """Synthesize text using ElevenLabs API with Kokoro local fallback."""
        text = text.strip()
        if not text:
            return b""

        if not self.is_available():
            fallback = KokoroTTS()
            return fallback.synthesize(text, output_path=output_path)

        import httpx

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": text,
            "model_id": self.model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        }
        try:
            with httpx.Client(timeout=12.0) as client:
                res = client.post(url, json=payload, headers=headers)
                res.raise_for_status()
                audio_bytes = res.content
                if output_path:
                    Path(output_path).write_bytes(audio_bytes)
                return audio_bytes
        except Exception:
            fallback = KokoroTTS()
            return fallback.synthesize(text, output_path=output_path)


def create_tts(tts_model_id: str = "tts.kokoro.en", **kwargs):
    """Factory to instantiate the requested TTS engine."""
    if "sarvam" in tts_model_id:
        return SarvamTTS(**kwargs)
    if "elevenlabs" in tts_model_id:
        return ElevenLabsTTS(**kwargs)
    if "kokoro" in tts_model_id:
        return KokoroTTS(**kwargs)
    return PiperTTS(**kwargs)

