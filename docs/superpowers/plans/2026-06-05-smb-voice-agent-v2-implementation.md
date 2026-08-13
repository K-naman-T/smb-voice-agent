# SMB Voice Agent v2 Implementation Plan

> **For agentic workers:** Sub-agent driven development recommended. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild SMB Voice Agent from a keyword-based pipeline to a modular, OSS-first, multi-agent voice platform using LiveKit Agents + Gemini free tier + Whisper + edge-tts.

**Architecture:** LiveKit Agents orchestration layer with pluggable provider interfaces (LLM, STT, TTS, Calendar, SMS, Memory). Multi-agent handoff between Receptionist → Booking/FAQ/Emergency sub-agents. React frontend upgraded to use LiveKit WebRTC SDK.

**Tech Stack:** LiveKit Agents, Gemini 2.0 Flash (free tier), Whisper (faster-whisper), edge-tts, Cal.com, SQLite + sqlite-vec, FastAPI, React 19, Tailwind v4, Framer Motion

---

## File Structure

```
smb-voice-agent/
├── agents/
│   ├── __init__.py
│   ├── server.py              # AgentServer entrypoint, dispatch config
│   ├── base.py                # Base agent class with shared helpers
│   ├── receptionist.py        # Main agent: greet, classify, route
│   ├── booking_agent.py       # Appointment booking sub-agent
│   ├── faq_agent.py           # FAQ answering with RAG
│   ├── emergency_agent.py     # Emergency triage + human handoff
│   └── instructions/          # System prompts per agent
│       ├── receptionist.md
│       ├── booking.md
│       ├── faq.md
│       └── emergency.md
├── providers/
│   ├── __init__.py            # Provider enum + factory
│   ├── base.py                # All ABCs and type defs
│   ├── llm.py                 # LLM: Gemini, Ollama fallback
│   ├── stt.py                 # STT: Whisper, Browser, Sarvam
│   ├── tts.py                 # TTS: edge-tts, Piper
│   ├── calendar.py            # Calendar: Cal.com, CalDAV
│   ├── sms.py                 # SMS: console, email gateway
│   └── memory.py              # Memory: SQLite-vec, JSON
├── api/
│   ├── main.py                # Dashboard API (stripped of voice pipeline)
│   ├── kits/                  # Business context (unchanged)
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── *industry kits*
│   └── requirements.txt
├── web/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx            # Wraps in LiveKitRoom provider
│       ├── index.css
│       ├── lib/
│       │   └── utils.ts
│       └── components/
│           ├── VoiceAgentUI.tsx  # UPGRADED: uses LiveKit SDK
│           └── agents-ui/       # KEEP: existing components
├── tests/
│   ├── providers/
│   │   ├── test_llm.py
│   │   ├── test_stt.py
│   │   ├── test_tts.py
│   │   ├── test_calendar.py
│   │   ├── test_sms.py
│   │   └── test_memory.py
│   ├── agents/
│   │   ├── test_receptionist.py
│   │   ├── test_booking.py
│   │   ├── test_faq.py
│   │   └── test_emergency.py
│   ├── test_config.py
│   └── conftest.py
├── config.toml
├── pyproject.toml
├── setup.sh
├── README.md
└── voice_pipeline.py           # ARCHIVED: old pipeline, kept as reference
```

---

## Phase 0: Project Setup & Cleanup

### Task 0.1: Clean up stale files and set up directory structure

**Files:**
- Modify: project root

- [ ] **Step 1: Remove stale duplicate directory**

Run: `rm -rf /home/knamant/projects/smb-voice-agent/smb-voice-agent` (already done)

- [ ] **Step 2: Create new directories**

Run:
```bash
mkdir -p /home/knamant/projects/smb-voice-agent/{agents/instructions,providers,tests/{providers,agents},docs/superpowers/specs}
```

Expected: directories created with no errors

- [ ] **Step 3: Create pyproject.toml**

Write file: `pyproject.toml`

```toml
[project]
name = "smb-voice-agent"
version = "2.0.0"
requires-python = ">=3.11"
dependencies = [
    "livekit-agents>=1.5.0",
    "livekit-plugins-google>=0.3.0",
    "livekit-plugins-silero>=0.3.0",
    "livekit-plugins-openai>=0.8.0",
    "faster-whisper>=1.0.0",
    "edge-tts>=7.2.0",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "python-dotenv>=1.0.0",
    "pydantic>=2.9.0",
    "httpx>=0.27.0",
    "tomli>=2.0.0",
    "sqlite-vec>=0.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-livekit>=0.1.0",
    "ruff>=0.5.0",
]
```

- [ ] **Step 4: Create config.toml**

Write file: `config.toml`

```toml
[server]
host = "0.0.0.0"
port = 8000
livekit_url = "ws://localhost:7880"
livekit_api_key = ""
livekit_api_secret = ""

[agents]
receptionist_prompt = "agents/instructions/receptionist.md"
booking_prompt = "agents/instructions/booking.md"
faq_prompt = "agents/instructions/faq.md"
emergency_prompt = "agents/instructions/emergency.md"

[providers]
llm = "gemini"
stt = "whisper"
tts = "edge_tts"
calendar = "cal_com"
sms = "console"
memory = "sqlite_vec"

[llm.gemini]
model = "gemini-2.0-flash"
api_key = ""  # from env var GEMINI_API_KEY

[stt.whisper]
model = "base"
device = "cpu"

[tts.edge_tts]
voice = "en-US-AriaNeural"

[calendar.cal_com]
api_url = "https://api.cal.com/v1"
api_key = ""

[memory.sqlite_vec]
db_path = "memory.db"
```

- [ ] **Step 5: Create .env.example**

Write file: `.env.example`

```
GEMINI_API_KEY=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
CAL_COM_API_KEY=
```

- [ ] **Step 6: Update existing requirements.txt**

Write file: `api/requirements.txt`

```
livekit-agents>=1.5.0
livekit-plugins-google>=0.3.0
livekit-plugins-silero>=0.3.0
livekit-plugins-openai>=0.8.0
faster-whisper>=1.0.0
edge-tts==7.2.8
fastapi==0.115.0
uvicorn[standard]==0.30.0
python-dotenv==1.0.0
pydantic==2.9.0
httpx==0.27.0
tomli>=2.0.0
sqlite-vec>=0.1.0
```

- [ ] **Step 7: Install dependencies**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent/api && pip install -r requirements.txt -q
```

Expected: packages installed successfully

- [ ] **Step 8: Commit Phase 0**

```bash
cd /home/knamant/projects/smb-voice-agent
git add pyproject.toml config.toml .env.example api/requirements.txt
git rm -r smb-voice-agent/ 2>/dev/null || true
git commit -m "v2: scaffold project structure, config, and dependencies"
```

---

## Phase 1: Provider Layer

### Task 1.1: Provider base ABCs and factory

**Files:**
- Create: `providers/__init__.py`
- Create: `providers/base.py`

- [ ] **Step 1: Write the type definitions and ABCs**

Write file: `providers/base.py`

```python
from __future__ import annotations
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import AsyncIterator, Optional


# ── Types ─────────────────────────────────────────────

@dataclass
class Message:
    role: str  # "user" | "assistant" | "system"
    content: str


@dataclass
class ToolCall:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    arguments: dict = field(default_factory=dict)


@dataclass
class LLMResult:
    content: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    finish_reason: str = "stop"


@dataclass
class TimeSlot:
    start: str  # ISO 8601
    end: str
    available: bool = True


@dataclass
class Booking:
    id: str = ""
    service: str = ""
    time: str = ""
    customer_name: str = ""
    status: str = "confirmed"


@dataclass
class CustomerProfile:
    phone: str = ""
    name: str = ""
    total_calls: int = 0
    last_call: Optional[str] = None
    preferences: dict = field(default_factory=dict)


@dataclass
class MemoryDoc:
    id: str = ""
    phone: str = ""
    summary: str = ""
    transcript: str = ""
    created_at: str = ""


# ── Provider ABCs ────────────────────────────────────

class LLMProvider(ABC):
    @abstractmethod
    async def chat(
        self,
        messages: list[Message],
        tools: Optional[list[dict]] = None,
    ) -> LLMResult:
        ...

    @abstractmethod
    async def stream(
        self,
        messages: list[Message],
        tools: Optional[list[dict]] = None,
    ) -> AsyncIterator[str]:
        ...


class STTProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes) -> str:
        ...

    @abstractmethod
    async def transcribe_stream(self) -> AsyncIterator[str]:
        ...


class TTSProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str, lang: str = "en") -> bytes:
        ...


class CalendarProvider(ABC):
    @abstractmethod
    async def get_slots(
        self, date: str, service: str
    ) -> list[TimeSlot]:
        ...

    @abstractmethod
    async def book(
        self, slot: TimeSlot, customer: CustomerProfile
    ) -> Booking:
        ...


class SMSProvider(ABC):
    @abstractmethod
    async def send(self, to: str, body: str) -> bool:
        ...


class MemoryProvider(ABC):
    @abstractmethod
    async def lookup(self, phone: str) -> Optional[CustomerProfile]:
        ...

    @abstractmethod
    async def store_conversation(
        self,
        phone: str,
        transcript: str,
        summary: str,
    ) -> str:
        ...

    @abstractmethod
    async def search(
        self, query: str, limit: int = 5
    ) -> list[MemoryDoc]:
        ...
```

- [ ] **Step 2: Write the provider factory**

Write file: `providers/__init__.py`

```python
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


def create_llm(config: dict) -> LLMProvider:
    provider = config["providers"]["llm"]
    cfg = config["llm"].get(provider, {})
    if provider == "gemini":
        return GeminiLLM(**cfg)
    elif provider == "ollama":
        return OllamaLLM(**cfg)
    raise ValueError(f"Unknown LLM provider: {provider}")


def create_stt(config: dict) -> STTProvider:
    provider = config["providers"]["stt"]
    cfg = config["stt"].get(provider, {})
    if provider == "whisper":
        return WhisperSTT(**cfg)
    elif provider == "browser":
        return BrowserSTT(**cfg)
    raise ValueError(f"Unknown STT provider: {provider}")


def create_tts(config: dict) -> TTSProvider:
    provider = config["providers"]["tts"]
    cfg = config["tts"].get(provider, {})
    if provider == "edge_tts":
        return EdgeTTS(**cfg)
    elif provider == "piper":
        return PiperTTS(**cfg)
    raise ValueError(f"Unknown TTS provider: {provider}")


def create_calendar(config: dict) -> Optional[CalendarProvider]:
    provider = config["providers"]["calendar"]
    cfg = config["calendar"].get(provider, {})
    if provider == "cal_com":
        return CalComProvider(**cfg)
    return None


def create_sms(config: dict) -> SMSProvider:
    provider = config["providers"]["sms"]
    cfg = config["sms"].get(provider, {})
    if provider == "console":
        return ConsoleSMS(**cfg)
    elif provider == "email_gateway":
        return EmailGatewaySMS(**cfg)
    raise ValueError(f"Unknown SMS provider: {provider}")


def create_memory(config: dict) -> MemoryProvider:
    provider = config["providers"]["memory"]
    cfg = config["memory"].get(provider, {})
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
```

- [ ] **Step 3: Write tests for factory**

Write file: `tests/test_config.py`

```python
import pytest
import tomli
from pathlib import Path
from providers import load_config, create_all_providers
from providers.base import LLMProvider, STTProvider, TTSProvider


@pytest.fixture
def sample_config():
    return {
        "providers": {
            "llm": "gemini",
            "stt": "whisper",
            "tts": "edge_tts",
            "calendar": "none",
            "sms": "console",
            "memory": "sqlite_vec",
        },
        "llm": {"gemini": {"model": "gemini-2.0-flash", "api_key": ""}},
        "stt": {"whisper": {"model": "base", "device": "cpu"}},
        "tts": {"edge_tts": {"voice": "en-US-AriaNeural"}},
        "memory": {"sqlite_vec": {"db_path": ":memory:"}},
    }


def test_load_config(tmp_path):
    config_path = tmp_path / "test_config.toml"
    config_path.write_text("""
[providers]
llm = "gemini"
""")
    config = load_config(str(config_path))
    assert config["providers"]["llm"] == "gemini"


def test_create_all_providers(sample_config):
    providers = create_all_providers(sample_config)
    assert isinstance(providers["llm"], LLMProvider)
    assert isinstance(providers["stt"], STTProvider)
    assert isinstance(providers["tts"], TTSProvider)
    assert providers["calendar"] is None
```

- [ ] **Step 4: Run tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/test_config.py -v
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add providers/ tests/test_config.py
git commit -m "v2: add provider ABCs, types, and factory"
```

---

### Task 1.2: LLM Provider — Gemini (free tier) + Ollama fallback

**Files:**
- Create: `providers/llm.py`
- Create: `tests/providers/test_llm.py`

- [ ] **Step 1: Write failing tests**

Write file: `tests/providers/test_llm.py`

```python
import pytest
from providers.base import Message, LLMResult
from providers.llm import GeminiLLM


@pytest.mark.asyncio
async def test_gemini_llm_chat():
    llm = GeminiLLM(model="gemini-2.0-flash", api_key="")
    result = await llm.chat([Message(role="user", content="Say hello in one word")])
    assert isinstance(result, LLMResult)
    assert len(result.content) > 0


@pytest.mark.asyncio
async def test_gemini_llm_empty_messages():
    llm = GeminiLLM(model="gemini-2.0-flash", api_key="")
    result = await llm.chat([])
    assert isinstance(result, LLMResult)


@pytest.mark.asyncio
async def test_gemini_llm_tool_calling():
    llm = GeminiLLM(model="gemini-2.0-flash", api_key="")
    tools = [{
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather",
            "parameters": {"type": "object", "properties": {"city": {"type": "string"}}},
        },
    }]
    messages = [
        Message(role="system", content="You have a get_weather tool. Call it when asked."),
        Message(role="user", content="What's the weather in Delhi?"),
    ]
    result = await llm.chat(messages, tools=tools)
    assert result.tool_calls or len(result.content) > 0
```

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_llm.py -v
```
Expected: all fail (GeminiLLM not defined yet)

- [ ] **Step 2: Write Gemini LLM provider**

Write file: `providers/llm.py`

```python
from __future__ import annotations
import json
import os
from typing import AsyncIterator, Optional
import httpx
from .base import LLMProvider, Message, LLMResult, ToolCall


class GeminiLLM(LLMProvider):
    def __init__(
        self,
        model: str = "gemini-2.0-flash",
        api_key: str = "",
    ):
        self.model = model
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")

    def _build_contents(self, messages: list[Message]) -> list[dict]:
        contents = []
        for msg in messages:
            if msg.role == "system":
                continue  # system prompt goes in system_instruction
            contents.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [{"text": msg.content}],
            })
        return contents

    def _system_instruction(self, messages: list[Message]) -> Optional[dict]:
        for msg in messages:
            if msg.role == "system":
                return {"parts": [{"text": msg.content}]}
        return None

    async def chat(
        self,
        messages: list[Message],
        tools: Optional[list[dict]] = None,
    ) -> LLMResult:
        if not self.api_key:
            return LLMResult(content="LLM not configured. Please set GEMINI_API_KEY.")

        url = f"https://generativelanguage.googleapis.com/v2beta/models/{self.model}:generateContent?key={self.api_key}"

        body = {"contents": self._build_contents(messages)}
        sys_inst = self._system_instruction(messages)
        if sys_inst:
            body["system_instruction"] = sys_inst

        if tools:
            body["tools"] = tools

        body["generationConfig"] = {"temperature": 0.3}

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, json=body)
            if resp.status_code != 200:
                return LLMResult(
                    content="I'm having trouble processing your request.",
                    finish_reason="error",
                )
            data = resp.json()
            candidate = data.get("candidates", [{}])[0]
            part = candidate.get("content", {}).get("parts", [{}])[0]

            tool_calls = []
            if "functionCall" in part:
                fc = part["functionCall"]
                tool_calls.append(ToolCall(
                    name=fc.get("name", ""),
                    arguments=fc.get("args", {}),
                ))

            return LLMResult(
                content=part.get("text", ""),
                tool_calls=tool_calls,
                finish_reason=candidate.get("finishReason", "stop"),
            )

    async def stream(
        self,
        messages: list[Message],
        tools: Optional[list[dict]] = None,
    ) -> AsyncIterator[str]:
        result = await self.chat(messages, tools)
        yield result.content


class OllamaLLM(LLMProvider):
    def __init__(
        self,
        model: str = "qwen2.5:7b",
        base_url: str = "http://localhost:11434",
    ):
        self.model = model
        self.base_url = base_url

    async def chat(
        self,
        messages: list[Message],
        tools: Optional[list[dict]] = None,
    ) -> LLMResult:
        url = f"{self.base_url}/api/chat"
        body = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": False,
        }
        if tools:
            body["tools"] = tools

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, json=body)
                if resp.status_code != 200:
                    return LLMResult(content="LLM unavailable.", finish_reason="error")
                data = resp.json()
                return LLMResult(content=data.get("message", {}).get("content", ""))
        except Exception:
            return LLMResult(content="LLM connection failed.", finish_reason="error")

    async def stream(self, messages, tools=None) -> AsyncIterator[str]:
        result = await self.chat(messages, tools)
        yield result.content
```

- [ ] **Step 3: Run tests to verify they pass (or skip if no API key)**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_llm.py -v
```

Expected: tests will skip gracefully or pass if GEMINI_API_KEY is set

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add providers/llm.py tests/providers/test_llm.py
git commit -m "v2: add Gemini + Ollama LLM providers"
```

---

### Task 1.3: TTS Provider — edge-tts + Piper

**Files:**
- Create: `providers/tts.py`
- Create: `tests/providers/test_tts.py`

- [ ] **Step 1: Write failing tests**

Write file: `tests/providers/test_tts.py`

```python
import pytest
from providers.tts import EdgeTTS


@pytest.mark.asyncio
async def test_edge_tts_synthesize():
    tts = EdgeTTS(voice="en-US-AriaNeural")
    audio = await tts.synthesize("Hello, this is a test.")
    assert isinstance(audio, bytes)
    assert len(audio) > 0
    # MP3 headers
    assert audio.startswith(b"\xff\xf3") or audio.startswith(b"ID3")


@pytest.mark.asyncio
async def test_edge_tts_empty_text():
    tts = EdgeTTS(voice="en-US-AriaNeural")
    audio = await tts.synthesize("")
    assert audio == b""


@pytest.mark.asyncio
async def test_edge_tts_hindi():
    tts = EdgeTTS(voice="en-US-AriaNeural")
    audio = await tts.synthesize("नमस्ते, आपकी कैसे मदद कर सकता हूँ?", lang="hi")
    assert isinstance(audio, bytes)
    assert len(audio) > 0
```

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_tts.py -v
```
Expected: all fail (EdgeTTS not defined)

- [ ] **Step 2: Write edge-tts + Piper TTS providers**

Write file: `providers/tts.py`

```python
from __future__ import annotations
from typing import Optional
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
    def __init__(
        self,
        model_path: str = "",
        voice: str = "en_US-lesslow-medium",
    ):
        self.model_path = model_path
        self.voice = voice
        self._pipe = None

    async def synthesize(self, text: str, lang: str = "en") -> bytes:
        if not text.strip():
            return b""
        try:
            import subprocess
            import shlex
            cmd = f"echo {shlex.quote(text)} | piper --model {self.voice} --output-raw"
            result = subprocess.run(cmd, shell=True, capture_output=True)
            return result.stdout
        except Exception as e:
            print(f"Piper TTS error: {e}")
            return b""
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_tts.py -v
```

Expected: edge-tts tests pass (edge-tts is free, no API key needed)

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add providers/tts.py tests/providers/test_tts.py
git commit -m "v2: add edge-tts + Piper TTS providers"
```

---

### Task 1.4: STT Provider — Whisper + Browser + Sarvam

**Files:**
- Create: `providers/stt.py`
- Create: `tests/providers/test_stt.py`

- [ ] **Step 1: Write failing tests**

Write file: `tests/providers/test_stt.py`

```python
import pytest
import wave
import struct
from providers.stt import WhisperSTT


@pytest.fixture
def sample_wav():
    """Generate a tiny valid WAV file with silence."""
    sample_rate = 16000
    duration = 0.5  # 0.5 seconds
    num_samples = int(sample_rate * duration)
    samples = [0] * num_samples

    buf = bytearray()
    for s in samples:
        buf.extend(struct.pack("<h", s))

    import io
    wav_buf = io.BytesIO()
    with wave.open(wav_buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(bytes(buf))
    return wav_buf.getvalue()


@pytest.mark.asyncio
async def test_whisper_stt_transcribe(sample_wav):
    stt = WhisperSTT(model="base", device="cpu")
    result = await stt.transcribe(sample_wav)
    assert isinstance(result, str)


@pytest.mark.asyncio
async def test_whisper_stt_empty():
    stt = WhisperSTT(model="base", device="cpu")
    result = await stt.transcribe(b"")
    assert result == ""
```

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_stt.py -v
```
Expected: all fail (WhisperSTT not defined)

- [ ] **Step 2: Write Whisper + Browser + Sarvam STT providers**

Write file: `providers/stt.py`

```python
from __future__ import annotations
from typing import AsyncIterator, Optional
from .base import STTProvider


class WhisperSTT(STTProvider):
    def __init__(
        self,
        model: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
    ):
        self.model_name = model
        self.device = device
        self.compute_type = compute_type
        self._model = None

    def _get_model(self):
        if self._model is None:
            from faster_whisper import WhisperModel
            self._model = WhisperModel(
                self.model_name,
                device=self.device,
                compute_type=self.compute_type,
            )
        return self._model

    async def transcribe(self, audio_bytes: bytes) -> str:
        if not audio_bytes:
            return ""
        try:
            import io
            import tempfile
            # Write to temp file (faster-whisper reads from disk or bytes)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(audio_bytes)
                tmp_path = f.name

            import asyncio
            loop = asyncio.get_event_loop()
            model = self._get_model()
            segments, info = await loop.run_in_executor(
                None, lambda: list(model.transcribe(tmp_path))
            )
            import os
            os.unlink(tmp_path)
            return " ".join(seg.text for seg in segments) if segments else ""
        except Exception as e:
            print(f"Whisper error: {e}")
            return ""

    async def transcribe_stream(self) -> AsyncIterator[str]:
        yield ""  # Streaming via Whisper requires buffer management; use BrowserSTT for streaming


class BrowserSTT(STTProvider):
    """Uses browser's native SpeechRecognition API via WebSocket bridge."""

    async def transcribe(self, audio_bytes: bytes) -> str:
        return ""  # Browser handles STT client-side

    async def transcribe_stream(self) -> AsyncIterator[str]:
        yield ""


class SarvamSTT(STTProvider):
    def __init__(self, api_key: str = ""):
        import os
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
                resp = await client.post(
                    "https://api.sarvam.ai/speech-to-text",
                    files=files,
                    data=data,
                )
                if resp.status_code == 200:
                    return resp.json().get("transcript", "")
                return f"[Sarvam error: {resp.status_code}]"
        except Exception as e:
            return f"[STT error: {e}]"

    async def transcribe_stream(self) -> AsyncIterator[str]:
        yield ""
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_stt.py -v
```

Expected: tests pass (Whisper will load model and process silence)

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add providers/stt.py tests/providers/test_stt.py
git commit -m "v2: add Whisper, Browser, Sarvam STT providers"
```

---

### Task 1.5: Calendar Provider — Cal.com

**Files:**
- Create: `providers/calendar.py`
- Create: `tests/providers/test_calendar.py`

- [ ] **Step 1: Write failing tests**

Write file: `tests/providers/test_calendar.py`

```python
import pytest
from providers.base import TimeSlot, CustomerProfile
from providers.calendar import CalComProvider


@pytest.mark.asyncio
async def test_cal_com_no_api_key():
    cal = CalComProvider(api_url="", api_key="")
    slots = await cal.get_slots("2026-06-10", "AC Repair")
    assert isinstance(slots, list)


@pytest.mark.asyncio
async def test_cal_com_book_no_api():
    cal = CalComProvider(api_url="", api_key="")
    slot = TimeSlot(start="2026-06-10T10:00:00", end="2026-06-10T11:00:00")
    cust = CustomerProfile(phone="+919999999999", name="Test User")
    booking = await cal.book(slot, cust)
    assert booking.status == "unavailable"
```

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_calendar.py -v
```
Expected: all fail (CalComProvider not defined)

- [ ] **Step 2: Write Cal.com provider**

Write file: `providers/calendar.py`

```python
from __future__ import annotations
from typing import Optional
import httpx
from .base import CalendarProvider, TimeSlot, Booking, CustomerProfile


class CalComProvider(CalendarProvider):
    def __init__(self, api_url: str = "", api_key: str = ""):
        self.api_url = api_url
        self.api_key = api_key

    async def get_slots(
        self, date: str, service: str
    ) -> list[TimeSlot]:
        if not self.api_key or not self.api_url:
            return []
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{self.api_url}/slots",
                    params={"date": date, "service": service},
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return [
                        TimeSlot(start=s["start"], end=s["end"])
                        for s in data.get("slots", [])
                    ]
                return []
        except Exception:
            return []

    async def book(
        self, slot: TimeSlot, customer: CustomerProfile
    ) -> Booking:
        if not self.api_key or not self.api_url:
            return Booking(status="unavailable")
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{self.api_url}/bookings",
                    json={
                        "start": slot.start,
                        "end": slot.end,
                        "attendee": {
                            "name": customer.name,
                            "email": "",
                            "phone": customer.phone,
                        },
                    },
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    return Booking(
                        id=data.get("id", ""),
                        time=slot.start,
                        customer_name=customer.name,
                        status="confirmed",
                    )
                return Booking(status="failed")
        except Exception:
            return Booking(status="failed")
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_calendar.py -v
```

Expected: 2 passed

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add providers/calendar.py tests/providers/test_calendar.py
git commit -m "v2: add Cal.com calendar provider"
```

---

### Task 1.6: SMS Provider — console + email gateway

**Files:**
- Create: `providers/sms.py`
- Create: `tests/providers/test_sms.py`

- [ ] **Step 1: Write failing tests**

Write file: `tests/providers/test_sms.py`

```python
import pytest
from providers.sms import ConsoleSMS


@pytest.mark.asyncio
async def test_console_sms():
    sms = ConsoleSMS()
    result = await sms.send("+919999999999", "Test message")
    assert result is True


@pytest.mark.asyncio
async def test_console_sms_empty():
    sms = ConsoleSMS()
    result = await sms.send("", "")
    assert result is True
```

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_sms.py -v
```
Expected: all fail

- [ ] **Step 2: Write SMS providers**

Write file: `providers/sms.py`

```python
from __future__ import annotations
from typing import Optional
from .base import SMSProvider


class ConsoleSMS(SMSProvider):
    """Logs SMS to console — useful for development."""

    async def send(self, to: str, body: str) -> bool:
        print(f"[SMS to {to}]: {body}")
        return True


class EmailGatewaySMS(SMSProvider):
    """Send SMS via carrier email gateway (e.g., 9999999999@txt.att.net)."""

    def __init__(self, smtp_host: str = "", smtp_port: int = 25):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port

    async def send(self, to: str, body: str) -> bool:
        if not self.smtp_host:
            print(f"[Email SMS to {to}]: {body} (SMTP not configured)")
            return True
        try:
            import smtplib
            from email.message import EmailMessage
            msg = EmailMessage()
            msg.set_content(body)
            msg["To"] = to
            msg["From"] = "noreply@smbvoice.local"
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"Email SMS error: {e}")
            return False
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_sms.py -v
```

Expected: 2 passed

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add providers/sms.py tests/providers/test_sms.py
git commit -m "v2: add Console + Email Gateway SMS providers"
```

---

### Task 1.7: Memory Provider — SQLite-vec + JSON

**Files:**
- Create: `providers/memory.py`
- Create: `tests/providers/test_memory.py`

- [ ] **Step 1: Write failing tests**

Write file: `tests/providers/test_memory.py`

```python
import pytest
from providers.memory import SQLiteVecMemory


@pytest.mark.asyncio
async def test_memory_lookup_empty():
    mem = SQLiteVecMemory(db_path=":memory:")
    profile = await mem.lookup("+919999999999")
    assert profile is None


@pytest.mark.asyncio
async def test_memory_store_and_lookup():
    mem = SQLiteVecMemory(db_path=":memory:")
    await mem.store_conversation(
        phone="+919999999999",
        transcript="Hi, I need AC repair",
        summary="Customer needs AC repair service",
    )
    profile = await mem.lookup("+919999999999")
    assert profile is not None
    assert profile.phone == "+919999999999"
    assert profile.total_calls >= 1


@pytest.mark.asyncio
async def test_memory_search():
    mem = SQLiteVecMemory(db_path=":memory:")
    await mem.store_conversation(
        phone="+919999999999",
        transcript="I need AC repair urgently",
        summary="Urgent AC repair request",
    )
    results = await mem.search("urgent AC repair", limit=5)
    assert isinstance(results, list)
```

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_memory.py -v
```
Expected: all fail

- [ ] **Step 2: Write SQLite-vec + JSON memory providers**

Write file: `providers/memory.py`

```python
from __future__ import annotations
import json
import os
import sqlite3
import uuid
from datetime import datetime
from typing import Optional
from .base import MemoryProvider, CustomerProfile, MemoryDoc


class SQLiteVecMemory(MemoryProvider):
    def __init__(self, db_path: str = "memory.db"):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        conn = self._get_conn()
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS customers (
                phone TEXT PRIMARY KEY,
                name TEXT DEFAULT '',
                total_calls INTEGER DEFAULT 0,
                last_call TEXT,
                preferences TEXT DEFAULT '{}'
            );
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                phone TEXT NOT NULL,
                transcript TEXT DEFAULT '',
                summary TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_conv_phone ON conversations(phone);
        """)
        conn.commit()
        conn.close()

    async def lookup(self, phone: str) -> Optional[CustomerProfile]:
        if not phone:
            return None
        conn = self._get_conn()
        row = conn.execute(
            "SELECT * FROM customers WHERE phone = ?", (phone,)
        ).fetchone()
        conn.close()
        if row is None:
            return None
        return CustomerProfile(
            phone=row["phone"],
            name=row["name"],
            total_calls=row["total_calls"],
            last_call=row["last_call"],
            preferences=json.loads(row["preferences"]),
        )

    async def store_conversation(
        self,
        phone: str,
        transcript: str,
        summary: str,
    ) -> str:
        conv_id = str(uuid.uuid4())
        conn = self._get_conn()
        conn.execute(
            "INSERT OR IGNORE INTO customers (phone, name) VALUES (?, ?)",
            (phone, phone),
        )
        conn.execute(
            """UPDATE customers SET total_calls = total_calls + 1,
               last_call = CURRENT_TIMESTAMP WHERE phone = ?""",
            (phone,),
        )
        conn.execute(
            """INSERT INTO conversations (id, phone, transcript, summary)
               VALUES (?, ?, ?, ?)""",
            (conv_id, phone, transcript, summary),
        )
        conn.commit()
        conn.close()
        return conv_id

    async def search(
        self, query: str, limit: int = 5
    ) -> list[MemoryDoc]:
        conn = self._get_conn()
        rows = conn.execute(
            """SELECT * FROM conversations ORDER BY created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()
        conn.close()
        return [
            MemoryDoc(
                id=r["id"],
                phone=r["phone"],
                summary=r["summary"],
                transcript=r["transcript"],
                created_at=r["created_at"],
            )
            for r in rows
        ]


class JsonMemory(MemoryProvider):
    """Simple JSON-file based memory for development."""

    def __init__(self, path: str = "memory.json"):
        self.path = path
        self._data = self._load()

    def _load(self) -> dict:
        if os.path.exists(self.path):
            with open(self.path) as f:
                return json.load(f)
        return {"customers": {}, "conversations": []}

    def _save(self):
        with open(self.path, "w") as f:
            json.dump(self._data, f, indent=2, default=str)

    async def lookup(self, phone: str) -> Optional[CustomerProfile]:
        c = self._data["customers"].get(phone)
        if not c:
            return None
        return CustomerProfile(**c)

    async def store_conversation(self, phone: str, transcript: str, summary: str) -> str:
        conv_id = str(uuid.uuid4())
        if phone not in self._data["customers"]:
            self._data["customers"][phone] = {
                "phone": phone,
                "name": phone,
                "total_calls": 0,
                "last_call": None,
                "preferences": {},
            }
        c = self._data["customers"][phone]
        c["total_calls"] += 1
        c["last_call"] = datetime.utcnow().isoformat()
        self._data["conversations"].append({
            "id": conv_id,
            "phone": phone,
            "transcript": transcript,
            "summary": summary,
            "created_at": datetime.utcnow().isoformat(),
        })
        self._save()
        return conv_id

    async def search(self, query: str, limit: int = 5) -> list[MemoryDoc]:
        results = self._data["conversations"][-limit:]
        results.reverse()
        return [MemoryDoc(**r) for r in results]
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/providers/test_memory.py -v
```

Expected: 3 passed

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add providers/memory.py tests/providers/test_memory.py
git commit -m "v2: add SQLite-vec + JSON memory providers"
```

---

## Phase 2: Agent System

### Task 2.1: Agent server and base agent

**Files:**
- Create: `agents/__init__.py`
- Create: `agents/server.py`
- Create: `agents/base.py`
- Create: `agents/instructions/receptionist.md`

- [ ] **Step 1: Write agent server entrypoint**

Write file: `agents/__init__.py` (empty)

```python
```

Write file: `agents/server.py`

```python
from __future__ import annotations
import os
from livekit.agents import WorkerOptions, cli
from providers import load_config, create_all_providers


def entrypoint(ctx):
    config_path = os.getenv("CONFIG_PATH", "config.toml")
    config = load_config(config_path)
    providers = create_all_providers(config)

    from .receptionist import ReceptionistAgent
    agent = ReceptionistAgent(ctx, providers)
    agent.start()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint),
    )
```

- [ ] **Step 2: Write base agent class**

Write file: `agents/base.py`

```python
from __future__ import annotations
from typing import Optional
from livekit.agents import Agent as LiveKitAgent, JobContext
from providers.base import (
    LLMProvider, STTProvider, TTSProvider,
    CalendarProvider, SMSProvider, MemoryProvider,
    Message, CustomerProfile,
)
from providers import create_all_providers


class BaseVoiceAgent(LiveKitAgent):
    def __init__(
        self,
        ctx: JobContext,
        providers: dict,
        system_prompt: str = "",
    ):
        super().__init__(ctx)
        self.llm: LLMProvider = providers["llm"]
        self.stt: STTProvider = providers["stt"]
        self.tts: TTSProvider = providers["tts"]
        self.calendar: Optional[CalendarProvider] = providers.get("calendar")
        self.sms: SMSProvider = providers["sms"]
        self.memory: MemoryProvider = providers["memory"]
        self.system_prompt = system_prompt
        self.conversation_history: list[Message] = []
        self.current_caller: Optional[CustomerProfile] = None

    async def process_turn(self, transcript: str) -> str:
        self.conversation_history.append(Message(role="user", content=transcript))

        messages = [Message(role="system", content=self.system_prompt)]
        messages.extend(self.conversation_history[-10:])  # Last 10 messages

        result = await self.llm.chat(messages, tools=self._get_tools())

        if result.tool_calls:
            for tc in result.tool_calls:
                await self._execute_tool(tc)

        if result.content:
            self.conversation_history.append(
                Message(role="assistant", content=result.content)
            )

        return result.content

    def _get_tools(self) -> list[dict]:
        tools = []
        if self.calendar:
            tools.append({
                "type": "function",
                "function": {
                    "name": "book_appointment",
                    "description": "Book a service appointment",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "service": {"type": "string"},
                            "time": {"type": "string"},
                            "customer_name": {"type": "string"},
                        },
                        "required": ["service", "time", "customer_name"],
                    },
                },
            })
            tools.append({
                "type": "function",
                "function": {
                    "name": "get_available_slots",
                    "description": "Get available appointment slots",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": {"type": "string"},
                            "service": {"type": "string"},
                        },
                        "required": ["date", "service"],
                    },
                },
            })
        return tools

    async def _execute_tool(self, tc):
        name = tc.name
        args = tc.arguments

        if name == "book_appointment" and self.calendar:
            from providers.base import TimeSlot, CustomerProfile
            slot = TimeSlot(start=args.get("time", ""), end="")
            customer = self.current_caller or CustomerProfile(name=args.get("customer_name", ""))
            booking = await self.calendar.book(slot, customer)
            if booking.status == "confirmed" and self.sms:
                await self.sms.send(
                    customer.phone,
                    f"Confirmed: {args.get('service')} at {args.get('time')}",
                )

        elif name == "get_available_slots" and self.calendar:
            slots = await self.calendar.get_slots(
                args.get("date", ""),
                args.get("service", ""),
            )
```

- [ ] **Step 3: Write receptionist system prompt**

Write file: `agents/instructions/receptionist.md`

```markdown
You are a professional AI phone assistant for a small business in India.

## Rules
- Be brief and natural — max 2 sentences per response
- Speak in a warm, professional tone
- If the caller speaks Hindi or Hinglish, respond in the same language
- Always confirm details before booking
- If the caller is angry or frustrated, apologize and de-escalate

## Your Job
1. Greet the caller warmly
2. Identify if they're a returning customer (you'll be given context)
3. Classify their intent:
   - booking: They want to schedule a service
   - faq: They have a question about services, pricing, or hours
   - emergency: They have an urgent issue
   - goodbye: They want to end the call
4. Route to the right agent or handle directly
5. If you don't know something, be honest and offer to connect to a human

## Available Tools
- book_appointment: Schedule a service appointment (ask for service type, preferred time, customer name)
- get_available_slots: Check available appointment times (ask for date and service type)
```

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add agents/
git commit -m "v2: add agent server, base agent class, and system prompts"
```

---

### Task 2.2: Receptionist Agent

**Files:**
- Create: `agents/receptionist.py`
- Create: `tests/agents/test_receptionist.py`

- [ ] **Step 1: Write the ReceptionistAgent**

Write file: `agents/receptionist.py`

```python
from __future__ import annotations
from livekit.agents import JobContext
from agents.base import BaseVoiceAgent
from providers.base import CustomerProfile


INDUSTRY_CONTEXT = {
    "hvac": {
        "name": "CoolAir Services",
        "services": ["AC Repair", "AC Installation", "AC Servicing", "AC Gas Refilling"],
        "hours": "8 AM to 8 PM, Monday to Sunday",
    },
    "plumbing": {
        "name": "QuickFix Plumbing",
        "services": ["Leak Repair", "Pipe Unclogging", "Water Heater Repair"],
        "hours": "7 AM to 9 PM, Monday to Saturday",
    },
    "electrical": {
        "name": "PowerPro Electricians",
        "services": ["Wiring", "Fan Installation", "Switchboard Repair"],
        "hours": "7 AM to 9 PM, Monday to Sunday",
    },
    "pest_control": {
        "name": "SafeGuard Pest Control",
        "services": ["Cockroach Treatment", "Termite Control", "Bed Bug Treatment"],
        "hours": "8 AM to 7 PM, Monday to Sunday",
    },
}


class ReceptionistAgent(BaseVoiceAgent):
    def __init__(self, ctx: JobContext, providers: dict, industry: str = "hvac"):
        import os
        prompt_path = os.path.join(
            os.path.dirname(__file__),
            "instructions", "receptionist.md"
        )
        with open(prompt_path) as f:
            base_prompt = f.read()

        biz = INDUSTRY_CONTEXT.get(industry, INDUSTRY_CONTEXT["hvac"])
        full_prompt = f"""{base_prompt}

## Business Context
Business Name: {biz['name']}
Industry: {industry}
Services: {', '.join(biz['services'])}
Hours: {biz['hours']}
"""
        super().__init__(ctx, providers, system_prompt=full_prompt)
        self.industry = industry
        self.business = biz

    async def on_enter(self):
        caller_phone = self.ctx.room.metadata.get("caller_phone", "") if self.ctx.room.metadata else ""
        if caller_phone:
            self.current_caller = await self.memory.lookup(caller_phone)

        greeting = self.business["name"]
        if self.current_caller and self.current_caller.name:
            greeting = f"Welcome back, {self.current_caller.name}!"

        audio = await self.tts.synthesize(
            f"Thanks for calling {self.business['name']}. {greeting} How can I help you today?"
        )
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)

    async def llm_turn(self, transcript: str):
        response = await self.process_turn(transcript)
        audio = await self.tts.synthesize(response)
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)
        return response
```

- [ ] **Step 2: Write tests**

Write file: `tests/agents/test_receptionist.py`

```python
import pytest
from agents.receptionist import ReceptionistAgent, INDUSTRY_CONTEXT


def test_industry_context_loaded():
    assert "hvac" in INDUSTRY_CONTEXT
    assert INDUSTRY_CONTEXT["hvac"]["name"] == "CoolAir Services"


def test_all_industries_present():
    expected = {"hvac", "plumbing", "electrical", "pest_control"}
    assert set(INDUSTRY_CONTEXT.keys()) == expected


def test_each_industry_has_required_fields():
    for ind, ctx in INDUSTRY_CONTEXT.items():
        assert "name" in ctx
        assert "services" in ctx
        assert "hours" in ctx
        assert len(ctx["services"]) > 0
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/agents/test_receptionist.py -v
```

Expected: 3 passed

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add agents/receptionist.py tests/agents/test_receptionist.py
git commit -m "v2: add receptionist agent with industry-aware context"
```

---

### Task 2.3: Booking Agent

**Files:**
- Create: `agents/booking_agent.py`
- Create: `agents/instructions/booking.md`
- Create: `tests/agents/test_booking.py`

- [ ] **Step 1: Write booking system prompt and agent**

Write file: `agents/instructions/booking.md`

```markdown
You are a booking specialist for a small business service center.

## Rules
- Be brief and natural — max 2 sentences per response
- Collect: customer name, phone number, service type, preferred date and time
- Confirm all details before finalizing
- If the service or time is unavailable, suggest alternatives

## Process
1. Ask what service they need
2. Check available slots using get_available_slots
3. Ask for their name and phone number
4. Confirm the booking details
5. Book using book_appointment tool
6. Tell them they'll receive an SMS confirmation
```

Write file: `agents/booking_agent.py`

```python
from __future__ import annotations
from livekit.agents import JobContext
from agents.base import BaseVoiceAgent


class BookingAgent(BaseVoiceAgent):
    def __init__(self, ctx: JobContext, providers: dict):
        import os
        prompt_path = os.path.join(
            os.path.dirname(__file__),
            "instructions", "booking.md"
        )
        with open(prompt_path) as f:
            prompt = f.read()
        super().__init__(ctx, providers, system_prompt=prompt)

    async def on_enter(self):
        audio = await self.tts.synthesize(
            "I can help you book an appointment. What service do you need?"
        )
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)

    async def llm_turn(self, transcript: str):
        response = await self.process_turn(transcript)
        audio = await self.tts.synthesize(response)
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)
        return response
```

- [ ] **Step 2: Write tests**

Write file: `tests/agents/test_booking.py`

```python
import pytest
from agents.booking_agent import BookingAgent


def test_booking_agent_imports():
    from agents.booking_agent import BookingAgent
    assert BookingAgent is not None


def test_booking_prompt_exists():
    import os
    path = os.path.join("agents", "instructions", "booking.md")
    assert os.path.exists(path)
    with open(path) as f:
        content = f.read()
    assert len(content) > 0
    assert "book_appointment" in content
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/agents/test_booking.py -v
```

Expected: 2 passed

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add agents/booking_agent.py agents/instructions/booking.md tests/agents/test_booking.py
git commit -m "v2: add booking agent for appointment scheduling"
```

---

### Task 2.4: FAQ Agent

**Files:**
- Create: `agents/faq_agent.py`
- Create: `agents/instructions/faq.md`
- Create: `tests/agents/test_faq.py`

- [ ] **Step 1: Write FAQ system prompt and agent**

Write file: `agents/instructions/faq.md`

```markdown
You are a FAQ specialist for a small business service center.

## Rules
- Be brief and natural — max 2 sentences per response
- Answer questions about: services, pricing, hours of operation, location, emergency services
- If you don't know the answer, say so honestly and offer to connect to a human
- If the caller wants to book, offer to transfer them to the booking team

## Common Topics
- Services offered
- Pricing and rates
- Business hours
- Emergency availability
- Service area / location
```

Write file: `agents/faq_agent.py`

```python
from __future__ import annotations
from livekit.agents import JobContext
from agents.base import BaseVoiceAgent


class FAQAgent(BaseVoiceAgent):
    def __init__(self, ctx: JobContext, providers: dict):
        import os
        prompt_path = os.path.join(
            os.path.dirname(__file__),
            "instructions", "faq.md"
        )
        with open(prompt_path) as f:
            prompt = f.read()
        super().__init__(ctx, providers, system_prompt=prompt)

    async def on_enter(self):
        audio = await self.tts.synthesize(
            "I can answer any questions about our services. What would you like to know?"
        )
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)

    async def llm_turn(self, transcript: str):
        response = await self.process_turn(transcript)
        audio = await self.tts.synthesize(response)
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)
        return response
```

- [ ] **Step 2: Write tests**

Write file: `tests/agents/test_faq.py`

```python
import pytest


def test_faq_agent_imports():
    from agents.faq_agent import FAQAgent
    assert FAQAgent is not None


def test_faq_prompt_exists():
    import os
    path = os.path.join("agents", "instructions", "faq.md")
    assert os.path.exists(path)
    with open(path) as f:
        content = f.read()
    assert len(content) > 0
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/agents/test_faq.py -v
```

Expected: 2 passed

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add agents/faq_agent.py agents/instructions/faq.md tests/agents/test_faq.py
git commit -m "v2: add FAQ agent for service questions"
```

---

### Task 2.5: Emergency Agent

**Files:**
- Create: `agents/emergency_agent.py`
- Create: `agents/instructions/emergency.md`
- Create: `tests/agents/test_emergency.py`

- [ ] **Step 1: Write emergency system prompt and agent**

Write file: `agents/instructions/emergency.md`

```markdown
You are an emergency triage specialist for a small business service center.

## Rules
- Stay calm and professional
- Acknowledge the urgency immediately
- Collect: customer name, phone number, address, nature of emergency
- If it's a life-threatening emergency, instruct them to call 108 (India emergency)
- For service emergencies (gas leak, electrical short, burst pipe), prioritize quick dispatch
- Always confirm the callback number before ending
- If unsure, escalate to a human agent
```

Write file: `agents/emergency_agent.py`

```python
from __future__ import annotations
from livekit.agents import JobContext
from agents.base import BaseVoiceAgent


class EmergencyAgent(BaseVoiceAgent):
    def __init__(self, ctx: JobContext, providers: dict):
        import os
        prompt_path = os.path.join(
            os.path.dirname(__file__),
            "instructions", "emergency.md"
        )
        with open(prompt_path) as f:
            prompt = f.read()
        super().__init__(ctx, providers, system_prompt=prompt)

    async def on_enter(self):
        audio = await self.tts.synthesize(
            "I understand this is urgent. Let me help you right away. "
            "Could you please tell me your name and what the emergency is?"
        )
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)

    async def llm_turn(self, transcript: str):
        response = await self.process_turn(transcript)
        audio = await self.tts.synthesize(response)
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)
        return response
```

- [ ] **Step 2: Write tests**

Write file: `tests/agents/test_emergency.py`

```python
import pytest


def test_emergency_agent_imports():
    from agents.emergency_agent import EmergencyAgent
    assert EmergencyAgent is not None


def test_emergency_prompt_exists():
    import os
    path = os.path.join("agents", "instructions", "emergency.md")
    assert os.path.exists(path)
    with open(path) as f:
        content = f.read()
    assert len(content) > 0
    assert "emergency" in content.lower()
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/agents/test_emergency.py -v
```

Expected: 2 passed

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add agents/emergency_agent.py agents/instructions/emergency.md tests/agents/test_emergency.py
git commit -m "v2: add emergency triage agent"
```

---

## Phase 3: API + Frontend Upgrade

### Task 3.1: Strip voice pipeline from FastAPI backend

**Files:**
- Modify: `api/main.py`

- [ ] **Step 1: Strip voice pipeline, keep dashboard API**

Read file: `api/main.py`

Edit file: `api/main.py` — remove voice pipeline functions (`run_voice_pipeline`, `classify_intent`, `generate_response`, `understand_with_gemini`, `speak_edge`, `VoiceRequest`), keep DB, stats, kits, and appointment endpoints.

Write file: `api/main.py`

```python
import os, uuid
from datetime import datetime
from contextlib import contextmanager
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SMB Voice Agent Dashboard", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

INDUSTRY = os.getenv("INDUSTRY", "hvac")
DB_PATH = os.getenv("DB_PATH", "voice_agent.db")

def get_db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

@contextmanager
def get_cursor():
    db = get_db()
    cursor = db.cursor()
    try:
        yield cursor
        db.commit()
    finally:
        db.close()

def init_db():
    db = get_db()
    c = db.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY, from_phone TEXT, to_phone TEXT,
        duration REAL DEFAULT 0, status TEXT DEFAULT 'in_progress',
        transcript TEXT DEFAULT '', intent TEXT DEFAULT '',
        outcome TEXT DEFAULT '', recording_url TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY, call_id TEXT, customer_name TEXT,
        customer_phone TEXT, service_type TEXT, scheduled_time TEXT,
        status TEXT DEFAULT 'pending', notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY, phone TEXT UNIQUE, name TEXT,
        total_calls INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
    db.commit()
    db.close()

init_db()

class AppointmentCreate(BaseModel):
    customer_name: str
    customer_phone: str
    service_type: str
    scheduled_time: str
    notes: str = ""

@app.get("/")
async def root():
    return {"status": "ok", "service": "SMB Voice Agent v2", "industry": INDUSTRY}

@app.get("/health")
async def health():
    from providers.llm import GeminiLLM
    from providers.tts import EdgeTTS
    from providers.stt import WhisperSTT
    gemini_ok = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "healthy",
        "version": "2.0.0",
        "industry": INDUSTRY,
        "gemini_configured": gemini_ok,
        "agents": ["receptionist", "booking", "faq", "emergency"],
        "providers": {
            "llm": "gemini" if gemini_ok else "ollama",
            "tts": "edge_tts",
            "stt": "whisper",
        },
    }

@app.post("/api/appointments")
async def create_appointment(apt: AppointmentCreate):
    apt_id = str(uuid.uuid4())
    with get_cursor() as c:
        c.execute("""INSERT INTO appointments (id, customer_name, customer_phone, service_type, scheduled_time, notes)
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  (apt_id, apt.customer_name, apt.customer_phone, apt.service_type, apt.scheduled_time, apt.notes))
    return {"id": apt_id, "status": "created"}

@app.get("/api/calls")
async def list_calls(limit: int = 50):
    with get_cursor() as c:
        c.execute("SELECT * FROM calls ORDER BY created_at DESC LIMIT ?", (limit,))
        cols = [col[0] for col in c.description]
        return {"calls": [dict(zip(cols, row)) for row in c.fetchall()]}

@app.get("/api/stats")
async def get_stats():
    with get_cursor() as c:
        c.execute("SELECT COUNT(*) FROM calls"); total = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM appointments"); bookings = c.fetchone()[0]
        today = datetime.utcnow().date().isoformat()
        c.execute("SELECT COUNT(*) FROM calls WHERE date(created_at) = ?", (today,)); today_ct = c.fetchone()[0]
        c.execute("""SELECT intent, COUNT(*) as cnt FROM calls WHERE intent != ''
                     GROUP BY intent ORDER BY cnt DESC LIMIT 5""")
        top_intents = [{"intent": r[0], "count": r[1]} for r in c.fetchall()]
    return {"total_calls": total, "appointments_booked": bookings, "calls_today": today_ct, "top_intents": top_intents}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 2: Run health check**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -c "from api.main import app; print('API imports OK')"
```

Expected: "API imports OK"

- [ ] **Step 3: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add api/main.py
git commit -m "v2: strip voice pipeline from API, keep dashboard endpoints"
```

---

### Task 3.2: Upgrade frontend to LiveKit SDK

- [ ] **Step 1: Install LiveKit React SDK**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent/web
npm install @livekit/components-react livekit-client
```

Expected: packages installed

- [ ] **Step 2: Update App.tsx to wrap in LiveKitRoom**

Read file: `web/src/App.tsx`

Write file: `web/src/App.tsx`

```tsx
import { LiveKitRoom } from '@livekit/components-react';
import { VoiceAgentUI } from '@/components/agents-ui';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880';
const TOKEN_ENDPOINT = import.meta.env.VITE_TOKEN_ENDPOINT || 'http://localhost:8000/token';

function App() {
  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={TOKEN_ENDPOINT}
      connect={false}
      audio={true}
    >
      <VoiceAgentUI />
    </LiveKitRoom>
  );
}

export default App;
```

- [ ] **Step 3: Update VoiceAgentUI.tsx to use LiveKit hooks**

Read file: `web/src/components/VoiceAgentUI.tsx`

Write file: `web/src/components/VoiceAgentUI.tsx` — upgrade to use LiveKit hooks for connection state, audio tracks, and transcripts.

```tsx
import { useState, useCallback, useEffect } from 'react';
import {
  useLocalParticipant,
  useRoom,
  useParticipantTracks,
  useDataChannel,
  Track,
} from '@livekit/components-react';
import { LocalParticipant, RoomEvent } from 'livekit-client';
import { AgentAudioVisualizer, AgentState } from './agents-ui/AgentAudioVisualizer';
import { AgentControlBar } from './agents-ui/AgentControlBar';
import { ConversationTranscript } from './agents-ui/ConversationTranscript';
import { StatusBadge } from './agents-ui/StatusBadge';
import type { VoiceMessage } from './agents-ui/MessageBubble';
import { cn } from '@/lib/utils';

interface BusinessContext {
  name: string;
  industry: string;
  services: string[];
  hours: string;
}

interface VoiceResult {
  transcript: string;
  intent: string;
  response: string;
  audio_url: string | null;
  audio_size: number;
  gemini_used: boolean;
}

export function VoiceAgentUI() {
  const room = useRoom();
  const localParticipant = useLocalParticipant();
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [geminiActive, setGeminiActive] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBusiness, setShowBusiness] = useState(false);

  // Fetch business context on mount
  useEffect(() => {
    fetch('/api/business-context')
      .then(r => r.json())
      .then(setBusinessContext)
      .catch(() => {});
    checkHealth();
  }, []);

  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setGeminiActive(data.gemini_configured);
    } catch {}
  }

  const handleStartCall = useCallback(async () => {
    setIsConnecting(true);
    setAgentState('connecting');
    try {
      // Connect to LiveKit room
      await room.connect();
      setIsConnected(true);
      setAgentState('listening');
      addMessage('agent', `Hello! How can I help you today?`);
    } catch (err) {
      console.error('Failed to connect:', err);
      setAgentState('idle');
    } finally {
      setIsConnecting(false);
    }
  }, [room]);

  const handleEndCall = useCallback(async () => {
    await room.disconnect();
    setIsConnected(false);
    setAgentState('idle');
    setMessages([]);
  }, [room]);

  const handleToggleMute = useCallback(() => {
    if (localParticipant?.microphoneTrack) {
      localParticipant.microphoneTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  }, [localParticipant, isMuted]);

  function addMessage(role: 'user' | 'agent', content: string) {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    }]);
  }

  // Listen for agent audio responses via data channel
  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array, participant?: any) => {
      if (participant?.identity === 'agent') {
        const text = new TextDecoder().decode(payload);
        addMessage('agent', text);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room]);

  async function handleSend(text: string) {
    if (!text.trim() || isProcessing) return;
    setIsProcessing(true);
    setAgentState('thinking');
    addMessage('user', text);

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data: VoiceResult = await res.json();
      addMessage('agent', data.response);

      if (data.audio_url) {
        setAgentState('speaking');
        const audio = new Audio(data.audio_url);
        audio.onended = () => setAgentState('listening');
        await audio.play();
      } else {
        setAgentState('listening');
      }
    } catch {
      addMessage('agent', 'Sorry, I had trouble processing that.');
      setAgentState('listening');
    } finally {
      setIsProcessing(false);
      setTextInput('');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold">{businessContext?.name || 'Voice Agent'}</h1>
              <p className="text-xs text-white/50">{businessContext?.industry || 'SMB Assistant'}</p>
            </div>
          </div>
          <StatusBadge connected={isConnected} gemini={geminiActive} />
        </div>
      </header>

      {/* Business Context */}
      {businessContext && (
        <div className="max-w-2xl mx-auto w-full px-4 mt-3">
          <button
            onClick={() => setShowBusiness(!showBusiness)}
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            {showBusiness ? 'Hide' : 'Show'} business info
          </button>
          {showBusiness && (
            <div className="glass-card rounded-2xl p-4 mt-2 space-y-2">
              <p className="text-sm text-white/80">{businessContext.name}</p>
              <p className="text-xs text-white/50">{businessContext.hours}</p>
              <div className="flex flex-wrap gap-2">
                {businessContext.services.slice(0, 5).map(s => (
                  <span key={s} className="px-2 py-1 text-xs rounded-full bg-white/5 border border-white/10">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        <ConversationTranscript messages={messages} />
      </div>

      {/* Bottom Controls */}
      <div className="sticky bottom-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)] to-transparent pb-4 pt-8">
        <div className="max-w-2xl mx-auto px-4 space-y-3">
          <AgentAudioVisualizer
            state={agentState}
            className="w-full max-w-md mx-auto"
          />
          <AgentControlBar
            isConnected={isConnected}
            isMuted={isMuted}
            isConnecting={isConnecting}
            onStartCall={handleStartCall}
            onEndCall={handleEndCall}
            onToggleMute={handleToggleMute}
          />

          {/* Text Input */}
          {isConnected && (
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend(textInput)}
                placeholder="Type a message..."
                className="flex-1 glass-card rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25
                           focus:outline-none focus:border-emerald-500/50"
                disabled={isProcessing}
              />
              <button
                onClick={() => handleSend(textInput)}
                disabled={isProcessing || !textInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30
                           transition-all text-sm font-medium"
              >
                {isProcessing ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          )}

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="block mx-auto text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify frontend builds**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent/web && npm run build 2>&1 | tail -20
```

Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add web/src/App.tsx web/src/components/VoiceAgentUI.tsx web/package.json web/package-lock.json
git commit -m "v2: upgrade frontend with LiveKit SDK integration"
```

---

## Phase 4: Integration + Validation

### Task 4.1: Full pipeline integration test

**Files:**
- Create: `tests/integration/test_full_pipeline.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: Write conftest with mock providers**

Write file: `tests/conftest.py`

```python
import pytest
from providers.base import (
    LLMProvider, STTProvider, TTSProvider,
    CalendarProvider, SMSProvider, MemoryProvider,
    LLMResult, Message, TimeSlot, Booking, CustomerProfile,
)
from typing import AsyncIterator, Optional


class MockLLM(LLMProvider):
    async def chat(self, messages, tools=None) -> LLMResult:
        return LLMResult(content="I can help you with AC repair. Would you like to book an appointment?")

    async def stream(self, messages, tools=None) -> AsyncIterator[str]:
        yield "I can help you with AC repair."


class MockSTT(STTProvider):
    async def transcribe(self, audio_bytes: bytes) -> str:
        return "Hi, I need AC repair"

    async def transcribe_stream(self) -> AsyncIterator[str]:
        yield "Hi, I need AC repair"


class MockTTS(TTSProvider):
    async def synthesize(self, text: str, lang: str = "en") -> bytes:
        return b"mock_audio_data"


class MockCalendar(CalendarProvider):
    async def get_slots(self, date, service) -> list[TimeSlot]:
        return [TimeSlot(start="2026-06-10T10:00:00", end="2026-06-10T11:00:00")]

    async def book(self, slot, customer) -> Booking:
        return Booking(id="mock_booking_1", status="confirmed")


class MockSMS(SMSProvider):
    def __init__(self):
        self.sent_messages = []

    async def send(self, to: str, body: str) -> bool:
        self.sent_messages.append((to, body))
        return True


class MockMemory(MemoryProvider):
    def __init__(self):
        self.conversations = []

    async def lookup(self, phone: str) -> Optional[CustomerProfile]:
        return None

    async def store_conversation(self, phone, transcript, summary) -> str:
        self.conversations.append((phone, transcript, summary))
        return "mock_conv_1"

    async def search(self, query, limit=5) -> list:
        return []


@pytest.fixture
def mock_providers():
    return {
        "llm": MockLLM(),
        "stt": MockSTT(),
        "tts": MockTTS(),
        "calendar": MockCalendar(),
        "sms": MockSMS(),
        "memory": MockMemory(),
    }
```

- [ ] **Step 2: Write integration test**

Write file: `tests/integration/test_full_pipeline.py`

```python
import pytest
from providers.base import Message


@pytest.mark.asyncio
async def test_llm_to_tts_pipeline(mock_providers):
    llm = mock_providers["llm"]
    tts = mock_providers["tts"]

    result = await llm.chat([Message(role="user", content="Hi, I need AC repair")])
    assert len(result.content) > 0

    audio = await tts.synthesize(result.content)
    assert len(audio) > 0
    assert audio == b"mock_audio_data"


@pytest.mark.asyncio
async def test_stt_to_llm_pipeline(mock_providers):
    stt = mock_providers["stt"]
    llm = mock_providers["llm"]

    transcript = await stt.transcribe(b"fake_audio")
    assert "AC repair" in transcript

    result = await llm.chat([Message(role="user", content=transcript)])
    assert len(result.content) > 0


@pytest.mark.asyncio
async def test_booking_flow(mock_providers):
    calendar = mock_providers["calendar"]
    sms = mock_providers["sms"]
    memory = mock_providers["memory"]

    slots = await calendar.get_slots("2026-06-10", "AC Repair")
    assert len(slots) > 0

    from providers.base import CustomerProfile
    customer = CustomerProfile(phone="+919999999999", name="Test User")
    booking = await calendar.book(slots[0], customer)
    assert booking.status == "confirmed"

    sms_result = await sms.send(customer.phone, "Your AC repair is confirmed")
    assert sms_result is True

    conv_id = await memory.store_conversation(
        customer.phone,
        "Hi, I need AC repair",
        "Customer booked AC repair",
    )
    assert conv_id is not None


@pytest.mark.asyncio
async def test_memory_flow(mock_providers):
    memory = mock_providers["memory"]

    profile = await memory.lookup("+919999999999")
    assert profile is None

    await memory.store_conversation(
        "+919999999999",
        "I need help with plumbing",
        "Plumbing service request",
    )

    results = await memory.search("plumbing", limit=5)
    assert isinstance(results, list)
```

- [ ] **Step 3: Run all tests**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/ -v
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add tests/
git commit -m "v2: add integration tests and mock providers"
```

---

## Task 4.2: Final validation and smoke test

- [ ] **Step 1: Validate imports across all modules**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -c "
from providers.base import (LLMProvider, STTProvider, TTSProvider, CalendarProvider, SMSProvider, MemoryProvider, Message, LLMResult, TimeSlot, Booking, CustomerProfile)
from providers.llm import GeminiLLM, OllamaLLM
from providers.stt import WhisperSTT, BrowserSTT, SarvamSTT
from providers.tts import EdgeTTS, PiperTTS
from providers.calendar import CalComProvider
from providers.sms import ConsoleSMS, EmailGatewaySMS
from providers.memory import SQLiteVecMemory, JsonMemory
from providers import load_config, create_all_providers, create_llm, create_stt, create_tts, create_calendar, create_sms, create_memory
from agents.base import BaseVoiceAgent
from agents.receptionist import ReceptionistAgent
from agents.booking_agent import BookingAgent
from agents.faq_agent import FAQAgent
from agents.emergency_agent import EmergencyAgent
print('All imports OK')
"
```

Expected: "All imports OK"

- [ ] **Step 2: Validate config.toml loads**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -c "
from providers import load_config
config = load_config('config.toml')
print('Config sections:', list(config.keys()))
print('Providers:', config['providers'])
"
```

Expected: Config loads without errors

- [ ] **Step 3: Run full test suite**

Run:
```bash
cd /home/knamant/projects/smb-voice-agent && python -m pytest tests/ -v --tb=short
```

Expected: All tests pass

- [ ] **Step 4: Final commit**

```bash
cd /home/knamant/projects/smb-voice-agent
git add -A
git commit -m "v2: full implementation — providers, agents, API, frontend, tests"
git log --oneline -5
```
