from __future__ import annotations
import tomli
from pathlib import Path
from typing import Optional
from .base import (
    LLMProvider, STTProvider, TTSProvider,
    CalendarProvider, SMSProvider, MemoryProvider,
)
from .llm import GeminiLLM, OllamaLLM
from .stt import WhisperSTT, BrowserSTT
from .tts import EdgeTTS, PiperTTS
from .calendar import CalComProvider
from .sms import ConsoleSMS, EmailGatewaySMS
from .memory import SQLiteVecMemory, JsonMemory


def load_config(path: str = "config.toml") -> dict:
    with open(path, "rb") as f:
        return tomli.load(f)


def _get_cfg(config: dict, section: str, provider: str) -> dict:
    return config.get(section, {}).get(provider, {})


def create_llm(config: dict) -> LLMProvider:
    provider = config["providers"]["llm"]
    cfg = _get_cfg(config, "llm", provider)
    if provider == "gemini":
        return GeminiLLM(**cfg)
    elif provider == "ollama":
        return OllamaLLM(**cfg)
    raise ValueError(f"Unknown LLM provider: {provider}")


def create_stt(config: dict) -> STTProvider:
    provider = config["providers"]["stt"]
    cfg = _get_cfg(config, "stt", provider)
    if provider == "whisper":
        return WhisperSTT(**cfg)
    elif provider == "browser":
        return BrowserSTT(**cfg)
    raise ValueError(f"Unknown STT provider: {provider}")


def create_tts(config: dict) -> TTSProvider:
    provider = config["providers"]["tts"]
    cfg = _get_cfg(config, "tts", provider)
    if provider == "edge_tts":
        return EdgeTTS(**cfg)
    elif provider == "piper":
        return PiperTTS(**cfg)
    raise ValueError(f"Unknown TTS provider: {provider}")


def create_calendar(config: dict) -> Optional[CalendarProvider]:
    provider = config.get("providers", {}).get("calendar", "none")
    cfg = _get_cfg(config, "calendar", provider)
    if provider == "cal_com":
        return CalComProvider(**cfg)
    return None


def create_sms(config: dict) -> SMSProvider:
    provider = config["providers"]["sms"]
    cfg = _get_cfg(config, "sms", provider)
    if provider == "console":
        return ConsoleSMS(**cfg)
    elif provider == "email_gateway":
        return EmailGatewaySMS(**cfg)
    raise ValueError(f"Unknown SMS provider: {provider}")


def create_memory(config: dict) -> MemoryProvider:
    provider = config["providers"]["memory"]
    cfg = _get_cfg(config, "memory", provider)
    if provider == "sqlite_vec":
        return SQLiteVecMemory(**cfg)
    elif provider == "json":
        return JsonMemory(**cfg)
    raise ValueError(f"Unknown Memory provider: {provider}")


def create_all_providers(config: dict) -> dict:
    return {
        "llm": create_llm(config),
        "stt": create_stt(config),
        "tts": create_tts(config),
        "calendar": create_calendar(config),
        "sms": create_sms(config),
        "memory": create_memory(config),
    }
