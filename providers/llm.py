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
