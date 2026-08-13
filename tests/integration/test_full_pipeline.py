import pytest
from providers.base import Message, CustomerProfile


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
    customer = CustomerProfile(phone="+919999999999", name="Test User")
    booking = await calendar.book(slots[0], customer)
    assert booking.status == "confirmed"
    sms_result = await sms.send(customer.phone, "Your AC repair is confirmed")
    assert sms_result is True
    conv_id = await memory.store_conversation(customer.phone, "Hi, I need AC repair", "Customer booked AC repair")
    assert conv_id is not None


@pytest.mark.asyncio
async def test_memory_flow(mock_providers):
    memory = mock_providers["memory"]
    profile = await memory.lookup("+919999999999")
    assert profile is None
    await memory.store_conversation("+919999999999", "I need help with plumbing", "Plumbing service request")
    results = await memory.search("plumbing", limit=5)
    assert isinstance(results, list)
