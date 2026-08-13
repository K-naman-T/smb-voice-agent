import pytest
from providers import load_config, create_all_providers
from providers.base import LLMProvider, STTProvider, TTSProvider


@pytest.fixture
def sample_config():
    return {
        "providers": {
            "llm": "gemini", "stt": "whisper", "tts": "edge_tts",
            "calendar": "none", "sms": "console", "memory": "sqlite_vec",
        },
        "llm": {"gemini": {"model": "gemini-2.0-flash", "api_key": ""}},
        "stt": {"whisper": {"model": "base", "device": "cpu"}},
        "tts": {"edge_tts": {"voice": "en-US-AriaNeural"}},
        "sms": {"console": {}},
        "memory": {"sqlite_vec": {"db_path": ":memory:"}},
    }


def test_load_config(tmp_path):
    config_path = tmp_path / "test_config.toml"
    config_path.write_text('[providers]\nllm = "gemini"\n')
    config = load_config(str(config_path))
    assert config["providers"]["llm"] == "gemini"


def test_create_all_providers(sample_config):
    providers = create_all_providers(sample_config)
    assert isinstance(providers["llm"], LLMProvider)
    assert isinstance(providers["stt"], STTProvider)
    assert isinstance(providers["tts"], TTSProvider)
    assert providers["calendar"] is None
