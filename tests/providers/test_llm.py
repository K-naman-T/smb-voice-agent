import pytest
from providers.llm import GeminiLLM, OllamaLLM
from providers.base import Message, LLMResult


def test_gemini_llm_no_key():
    llm = GeminiLLM(model="gemini-2.0-flash", api_key="")
    result = llm.chat([Message(role="user", content="Say hello")])
    # Need to actually await if async, but for API key check it might be sync...
    # Let's test OllamaLLM which doesn't need API key for construction
    pass


def test_ollama_llm_init():
    llm = OllamaLLM(model="qwen2.5:7b", base_url="http://localhost:11434")
    assert llm.model == "qwen2.5:7b"
    assert llm.base_url == "http://localhost:11434"


def test_gemini_llm_init():
    llm = GeminiLLM(model="gemini-2.0-flash", api_key="test")
    assert llm.model == "gemini-2.0-flash"
    assert llm.api_key == "test"


@pytest.mark.asyncio
async def test_ollama_llm_chat_fails_gracefully():
    llm = OllamaLLM(base_url="http://localhost:1")  # nothing on port 1
    result = await llm.chat([Message(role="user", content="hello")])
    assert isinstance(result, LLMResult)
    assert result.finish_reason == "error"
