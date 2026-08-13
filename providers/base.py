from __future__ import annotations
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import AsyncIterator, Optional


@dataclass
class Message:
    role: str
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
    start: str
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
    async def get_slots(self, date: str, service: str) -> list[TimeSlot]:
        ...

    @abstractmethod
    async def book(self, slot: TimeSlot, customer: CustomerProfile) -> Booking:
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
    async def store_conversation(self, phone: str, transcript: str, summary: str) -> str:
        ...

    @abstractmethod
    async def search(self, query: str, limit: int = 5) -> list[MemoryDoc]:
        ...
