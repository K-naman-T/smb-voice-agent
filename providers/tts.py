from __future__ import annotations
from .base import TTSProvider


class EdgeTTS(TTSProvider):
    def __init__(self, voice: str = "en-US-AriaNeural"):
        self.voice = voice

    async def synthesize(self, text: str, lang: str = "en") -> bytes:
        if not text.strip():
            return b""
        try:
            import edge_tts
            communicate = edge_tts.Communicate(text, self.voice)
            mp3_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    mp3_data += chunk["data"]
            return mp3_data
        except Exception as e:
            print(f"Edge TTS error: {e}")
            return b""


class PiperTTS(TTSProvider):
    def __init__(self, model_path: str = "", voice: str = "en_US-lesslow-medium"):
        self.model_path = model_path
        self.voice = voice

    async def synthesize(self, text: str, lang: str = "en") -> bytes:
        if not text.strip():
            return b""
        try:
            import subprocess, shlex
            cmd = f"echo {shlex.quote(text)} | piper --model {self.voice} --output-raw"
            result = subprocess.run(cmd, shell=True, capture_output=True)
            return result.stdout
        except Exception as e:
            print(f"Piper TTS error: {e}")
            return b""
