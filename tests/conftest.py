import pytest
from providers.base import (
    LLMProvider, STTProvider, TTSProvider,
    CalendarProvider, SMSProvider, MemoryProvider,
    LLMResult, Message, TimeSlot, Booking, CustomerProfile, MemoryDoc,
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

    async def search(self, query, limit=5) -> list[MemoryDoc]:
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
