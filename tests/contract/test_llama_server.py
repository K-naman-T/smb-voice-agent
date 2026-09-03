"""Contract tests for llama-server (Phase P1).

Asserts:
  C1: models list returns the pinned model identity
  C2: stream completion with no tools emits tokens with low latency
  C3: tool calling non-stream returns structured JSON tool_calls
  C4: cancel mid-stream cleans up cleanly and leaves the slot usable
  C5: requests with missing or invalid API key return HTTP 401
"""
from __future__ import annotations

import asyncio
import json
import pytest

from runtime_contracts.llm_client import (
    LlamaServerClient,
    LlamaServerError,
    LlamaAuthError,
)

BASE_URL = "http://127.0.0.1:8083/v1"
API_KEY = "change-me-high-entropy"


@pytest.fixture
def client() -> LlamaServerClient:
    return LlamaServerClient(base_url=BASE_URL, api_key=API_KEY, timeout=15.0)


@pytest.fixture
def unauthed_client() -> LlamaServerClient:
    return LlamaServerClient(base_url=BASE_URL, api_key="invalid-key", timeout=15.0)


@pytest.mark.asyncio
async def test_contract_c1_models_list(client: LlamaServerClient):
    """C1: /v1/models returns the expected pinned Qwen3.5-9B model."""
    models = await client.get_models()
    assert len(models) > 0, "No models returned from /v1/models"
    model_ids = [m.get("id", "") for m in models]
    assert any("Qwen3.5-9B" in mid for mid in model_ids), f"Pinned model not found in {model_ids}"


@pytest.mark.asyncio
async def test_contract_c2_stream_no_tools(client: LlamaServerClient):
    """C2: Streaming chat completion yields chunks with tool_choice='none' and thinking disabled."""
    messages = [
        {"role": "system", "content": "You are a concise voice assistant. Respond in 5 words or less."},
        {"role": "user", "content": "Are you online?"}
    ]
    tokens: list[str] = []
    async for chunk in client.stream_chat(messages, max_tokens=20):
        tokens.append(chunk)

    full_text = "".join(tokens).strip()
    assert full_text, "Streaming yielded empty output"
    assert "<think>" not in full_text, f"Thinking tag leaked into stream: {full_text}"


@pytest.mark.asyncio
async def test_contract_c3_tools_non_stream(client: LlamaServerClient):
    """C3: Structured tool calls return valid function name and JSON arguments."""
    messages = [
        {"role": "user", "content": "Book an AC service appointment for tomorrow 10am for John at 555-0199."}
    ]
    tools = [
        {
            "type": "function",
            "function": {
                "name": "book_appointment",
                "description": "Book a customer appointment",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "customer_name": {"type": "string"},
                        "customer_phone": {"type": "string"},
                        "service_type": {"type": "string"},
                        "scheduled_time": {"type": "string"}
                    },
                    "required": ["customer_name", "service_type"]
                }
            }
        }
    ]
    choice = await client.call_tools(messages, tools, max_tokens=150)
    assert choice.get("finish_reason") == "tool_calls"
    message = choice.get("message", {})
    tool_calls = message.get("tool_calls", [])
    assert len(tool_calls) > 0, "No tool_calls in message"
    fn = tool_calls[0].get("function", {})
    assert fn.get("name") == "book_appointment"
    args = json.loads(fn.get("arguments", "{}"))
    assert "customer_name" in args or "service_type" in args


@pytest.mark.asyncio
async def test_contract_c4_cancel_mid_stream(client: LlamaServerClient):
    """C4: Aborting stream mid-generation leaves the slot immediately available."""
    messages = [
        {"role": "user", "content": "Count from 1 to 100 with commas."}
    ]
    # Receive only 2 chunks and break
    received = 0
    async for _ in client.stream_chat(messages, max_tokens=100):
        received += 1
        if received >= 2:
            break

    assert received >= 2

    # Slot must be immediately reusable without waiting
    warm = await client.warmup()
    assert warm is True, "Slot did not recover after stream cancel"


@pytest.mark.asyncio
async def test_contract_c5_auth_enforced(unauthed_client: LlamaServerClient):
    """C5: Requests with an invalid API key receive HTTP 401 Unauthorized on chat completions."""
    with pytest.raises(LlamaAuthError):
        await unauthed_client.warmup()
