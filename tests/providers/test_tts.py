import pytest
from providers.tts import EdgeTTS


@pytest.mark.asyncio
async def test_edge_tts_synthesize():
    tts = EdgeTTS(voice="en-US-AriaNeural")
    audio = await tts.synthesize("Hello, this is a test.")
    assert isinstance(audio, bytes)
    assert len(audio) > 0


@pytest.mark.asyncio
async def test_edge_tts_empty_text():
    tts = EdgeTTS(voice="en-US-AriaNeural")
    audio = await tts.synthesize("")
    assert audio == b""


@pytest.mark.asyncio
async def test_edge_tts_hindi():
    tts = EdgeTTS(voice="hi-IN-SwaraNeural")
    audio = await tts.synthesize("नमस्ते, आपकी कैसे मदद कर सकता हूँ?", lang="hi")
    assert isinstance(audio, bytes)
    assert len(audio) > 0
