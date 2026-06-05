import pytest
import wave
import struct
import io
from providers.stt import WhisperSTT


@pytest.fixture
def sample_wav():
    sample_rate = 16000
    duration = 0.5
    num_samples = int(sample_rate * duration)
    samples = [0] * num_samples
    buf = bytearray()
    for s in samples:
        buf.extend(struct.pack("<h", s))
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
