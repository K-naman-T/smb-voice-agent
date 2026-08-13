from __future__ import annotations
import json
import os
from typing import AsyncIterator, Optional
import httpx
from .base import LLMProvider, Message, LLMResult, ToolCall


class GeminiLLM(LLMProvider):
    def __init__(self, model: str = "gemini-2.0-flash", api_key: str = ""):
        self.model = model
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")

    def _build_contents(self, messages: list[Message]) -> list[dict]:
        contents = []
        for msg in messages:
            if msg.role == "system":
                continue
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

    async def chat(self, messages: list[Message], tools: Optional[list[dict]] = None) -> LLMResult:
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
                return LLMResult(content="I'm having trouble processing your request.", finish_reason="error")
            data = resp.json()
            candidate = data.get("candidates", [{}])[0]
            part = candidate.get("content", {}).get("parts", [{}])[0]

            tool_calls = []
            if "functionCall" in part:
                fc = part["functionCall"]
                tool_calls.append(ToolCall(name=fc.get("name", ""), arguments=fc.get("args", {})))

            return LLMResult(
                content=part.get("text", ""),
                tool_calls=tool_calls,
                finish_reason=candidate.get("finishReason", "stop"),
            )

    async def stream(self, messages, tools=None) -> AsyncIterator[str]:
        result = await self.chat(messages, tools)
        yield result.content


class OllamaLLM(LLMProvider):
    def __init__(self, model: str = "qwen2.5:7b", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url

    async def chat(self, messages: list[Message], tools: Optional[list[dict]] = None) -> LLMResult:
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


class LlamaServerLLM(LLMProvider):
    """OpenAI-compatible client for local llama.cpp llama-server.

    Handles reasoning models (Qwable/etc.) where `content` may be empty
    on first attempts: retries, and falls back to reasoning_content tail.
    """

    def __init__(
        self,
        model: str = "qwable",
        base_url: str = "http://127.0.0.1:8083",
        max_tokens: int = 400,
        retries: int = 3,
        timeout: float = 120.0,
    ):
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.max_tokens = max_tokens
        self.retries = retries
        self.timeout = timeout

    def _url(self) -> str:
        return f"{self.base_url}/v1/chat/completions"

    async def _attempt(self, messages: list[Message]) -> LLMResult:
        body = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "max_tokens": self.max_tokens,
            "temperature": 0.4,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(self._url(), json=body)
            if resp.status_code != 200:
                return LLMResult(content="", finish_reason="error")
            data = resp.json()
            choice = data.get("choices", [{}])[0]
            msg = choice.get("message", {})
            content = (msg.get("content") or "").strip()
            finish = choice.get("finish_reason", "stop")
            if content:
                return LLMResult(content=content, finish_reason=finish)
            # Reasoning-model fallback: take last non-empty line of reasoning
            reasoning = (msg.get("reasoning_content") or "").strip()
            if reasoning:
                lines = [ln.strip() for ln in reasoning.splitlines() if ln.strip()]
                last = lines[-1].lstrip("- ").strip("“”\"")
                if last:
                    return LLMResult(content=last, finish_reason="reasoning_fallback")
            return LLMResult(content="", finish_reason=finish)

    async def chat(self, messages: list[Message], tools: Optional[list[dict]] = None) -> LLMResult:
        last_err = None
        for _ in range(self.retries):
            try:
                result = await self._attempt(messages)
                if result.content:
                    return result
                last_err = "empty content"
            except Exception as e:  # noqa: BLE001
                last_err = str(e)
        return LLMResult(content="", finish_reason="error")

    async def stream(self, messages, tools=None) -> AsyncIterator[str]:
        result = await self.chat(messages, tools)
        if result.content:
            yield result.content
