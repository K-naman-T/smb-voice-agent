"""LLM client for colocated llama-server.

Enforces local-private deployment policy (no cloud URLs or leaked keys).
Uses `chat_template_kwargs={"enable_thinking": False}` on Qwen3.5 to bypass
deep reasoning output and achieve sub-100ms TTFT for conversational turns.
"""
from __future__ import annotations

import json
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from runtime_contracts.deployment import DeploymentMode, DeploymentPolicy


class LlamaServerError(Exception):
    """Raised when llama-server returns an error or fails validation."""


class LlamaAuthError(LlamaServerError):
    """Raised when llama-server returns HTTP 401 Unauthorized."""


class LlamaServerClient:
    """Async client for llama.cpp llama-server."""

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8083/v1",
        api_key: str = "",
        policy: Optional[DeploymentPolicy] = None,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.policy = policy or DeploymentPolicy(DeploymentMode.LOCAL_PRIVATE)

        # Invariant I1/I7: Enforce that base_url is not a forbidden cloud provider
        self.policy.validate_base_url(self.base_url)

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def get_models(self) -> List[Dict[str, Any]]:
        """Retrieve model list from /v1/models."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(
                f"{self.base_url}/models",
                headers=self._headers(),
            )
            if resp.status_code == 401:
                raise LlamaAuthError("HTTP 401: Unauthorized API key")
            if resp.status_code != 200:
                raise LlamaServerError(f"HTTP {resp.status_code}: {resp.text}")
            data = resp.json()
            return data.get("data", [])

    async def warmup(self) -> bool:
        """Ping the server with a minimal prompt to warm the KV cache and GPU slot."""
        messages = [{"role": "user", "content": "ping"}]
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "messages": messages,
                    "max_tokens": 1,
                    "chat_template_kwargs": {"enable_thinking": False},
                }
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._headers(),
                    json=payload,
                )
                if resp.status_code == 401:
                    raise LlamaAuthError("HTTP 401: Unauthorized API key")
                return resp.status_code == 200
        except Exception as e:
            if isinstance(e, LlamaAuthError):
                raise
            return False

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 128,
        temperature: float = 0.3,
    ) -> AsyncIterator[str]:
        """Stream assistant response tokens with tool_choice='none' and thinking disabled."""
        payload = {
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
            "tool_choice": "none",
            "chat_template_kwargs": {"enable_thinking": False},
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            ) as response:
                if response.status_code == 401:
                    raise LlamaAuthError("HTTP 401: Unauthorized API key")
                if response.status_code != 200:
                    body = await response.aread()
                    raise LlamaServerError(f"HTTP {response.status_code}: {body.decode()}")

                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("data: "):
                        data_str = line[len("data: ") :].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            choices = chunk.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue

    async def call_tools(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        max_tokens: int = 256,
        temperature: float = 0.0,
    ) -> Dict[str, Any]:
        """Non-streaming completion with tools for structured function calling."""
        payload = {
            "messages": messages,
            "tools": tools,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
            "chat_template_kwargs": {"enable_thinking": False},
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
            if resp.status_code == 401:
                raise LlamaAuthError("HTTP 401: Unauthorized API key")
            if resp.status_code != 200:
                raise LlamaServerError(f"HTTP {resp.status_code}: {resp.text}")

            result = resp.json()
            choices = result.get("choices", [])
            if not choices:
                raise LlamaServerError("Empty choices returned from llama-server")
            return choices[0]
