"""Unit tests for TTS engines and factories."""
import pytest
from runtime_contracts.tts import create_tts, PiperTTS, KokoroTTS, SarvamTTS, ElevenLabsTTS

def test_create_tts_factories():
    t_piper = create_tts("tts.piper.hi_priyamvada")
    assert isinstance(t_piper, PiperTTS)

    t_kokoro = create_tts("tts.kokoro.en")
    assert isinstance(t_kokoro, KokoroTTS)

    t_sarvam = create_tts("tts.sarvam.indic")
    assert isinstance(t_sarvam, SarvamTTS)
    assert not t_sarvam.is_available()

    t_eleven = create_tts("tts.elevenlabs.flash")
    assert isinstance(t_eleven, ElevenLabsTTS)
    assert not t_eleven.is_available()

def test_tts_empty_input():
    sarvam = SarvamTTS(api_key="mock_key")
    assert sarvam.synthesize("") == b""
    assert sarvam.synthesize("   ") == b""

    eleven = ElevenLabsTTS(api_key="mock_key")
    assert eleven.synthesize("") == b""
    assert eleven.synthesize("   ") == b""
