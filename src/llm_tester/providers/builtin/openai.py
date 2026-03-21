"""
OpenAI API provider implementation.

Supports GPT-4, GPT-4-turbo, GPT-3.5-turbo and other OpenAI models.
"""

import time
from typing import Any, Dict, List, Optional

import httpx

from llm_tester.core.models import (
    ConnectivityResult,
    ContextResult,
    PerformanceResult,
    ProviderConfig,
    TestStatus,
)
from llm_tester.providers.base import BaseProvider
from llm_tester.providers.registry import provider


@provider("openai")
class OpenAIProvider(BaseProvider):
    """
    OpenAI API provider implementation.

    Supports all OpenAI chat models including GPT-4, GPT-4-turbo,
    and GPT-3.5-turbo.
    """

    DEFAULT_BASE_URL = "https://api.openai.com/v1"
    DEFAULT_MODELS = [
        "gpt-4",
        "gpt-4-turbo",
        "gpt-4-turbo-preview",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-16k",
    ]

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.base_url = config.base_url or self.DEFAULT_BASE_URL

    @property
    def name(self) -> str:
        return "OpenAI"

    @property
    def provider_type(self) -> str:
        return "openai"

    async def initialize(self) -> None:
        if not self.config.api_key:
            raise ValueError("OpenAI API key is required")

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }
        headers.update(self.config.extra_headers)

        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            timeout=self.config.timeout,
            proxy=self.config.proxy,
        )
        self._initialized = True

    async def test_connectivity(self, model: str) -> ConnectivityResult:
        start_time = time.time()

        try:
            if not self._client:
                await self.initialize()

            response = await self._client.post(
                "/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 5,
                },
            )

            latency_ms = (time.time() - start_time) * 1000

            if response.status_code == 200:
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    return ConnectivityResult(
                        provider=self.provider_type,
                        model=model,
                        status=TestStatus.PASSED,
                        latency_ms=round(latency_ms, 2),
                        is_valid_key=True,
                        model_available=True,
                    )
                else:
                    return ConnectivityResult(
                        provider=self.provider_type,
                        model=model,
                        status=TestStatus.FAILED,
                        latency_ms=round(latency_ms, 2),
                        is_valid_key=True,
                        model_available=False,
                        error_message="Invalid response structure",
                    )
            elif response.status_code == 401:
                return ConnectivityResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.FAILED,
                    latency_ms=round(latency_ms, 2),
                    is_valid_key=False,
                    model_available=False,
                    error_message="Invalid API key",
                )
            elif response.status_code == 404:
                return ConnectivityResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.FAILED,
                    latency_ms=round(latency_ms, 2),
                    is_valid_key=True,
                    model_available=False,
                    error_message=f"Model '{model}' not found",
                )
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", {}).get("message", response.text)
                return ConnectivityResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.FAILED,
                    latency_ms=round(latency_ms, 2),
                    error_message=f"HTTP {response.status_code}: {error_msg}",
                )

        except httpx.TimeoutException:
            return ConnectivityResult(
                provider=self.provider_type,
                model=model,
                status=TestStatus.TIMEOUT,
                error_message=f"Request timed out after {self.config.timeout}s",
            )
        except Exception as e:
            return self._create_error_result(ConnectivityResult, model, str(e), TestStatus.ERROR)

    async def test_performance(
        self,
        model: str,
        prompt: str,
        max_tokens: int = 100,
        warmup: int = 0,
    ) -> PerformanceResult:
        start_time = time.time()
        first_token_time: Optional[float] = None
        tokens_generated = 0
        prompt_tokens = 0

        try:
            if not self._client:
                await self.initialize()

            response = await self._client.post(
                "/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "stream": True,
                },
            )

            if response.status_code != 200:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", {}).get("message", response.text)
                return PerformanceResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.FAILED,
                    error_message=f"HTTP {response.status_code}: {error_msg}",
                )

            import json

            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break

                    try:
                        data = json.loads(data_str)
                        if first_token_time is None:
                            first_token_time = time.time()

                        delta = data.get("choices", [{}])[0].get("delta", {})
                        if "content" in delta:
                            tokens_generated += 1
                    except json.JSONDecodeError:
                        continue

            end_time = time.time()
            total_time_ms = (end_time - start_time) * 1000
            ttft_ms = (first_token_time - start_time) * 1000 if first_token_time else None

            if total_time_ms > 0 and tokens_generated > 0:
                tokens_per_second = tokens_generated / (total_time_ms / 1000)
            else:
                tokens_per_second = 0.0

            return PerformanceResult(
                provider=self.provider_type,
                model=model,
                status=TestStatus.PASSED,
                total_time_ms=round(total_time_ms, 2),
                ttft_ms=round(ttft_ms, 2) if ttft_ms else None,
                tokens_generated=tokens_generated,
                tokens_per_second=round(tokens_per_second, 2),
                prompt_tokens=prompt_tokens,
                completion_tokens=tokens_generated,
                total_tokens=prompt_tokens + tokens_generated,
            )

        except httpx.TimeoutException:
            return PerformanceResult(
                provider=self.provider_type,
                model=model,
                status=TestStatus.TIMEOUT,
                error_message=f"Request timed out after {self.config.timeout}s",
            )
        except Exception as e:
            return self._create_error_result(PerformanceResult, model, str(e), TestStatus.ERROR)

    async def test_context(
        self,
        model: str,
        context_size: int,
    ) -> ContextResult:
        try:
            if not self._client:
                await self.initialize()

            messages: List[Dict[str, str]] = []

            for i in range(min(context_size // 100, 10)):
                messages.append(
                    {
                        "role": "user",
                        "content": f"Remember this number: {i * 100}. What is it?",
                    }
                )
                messages.append(
                    {
                        "role": "assistant",
                        "content": f"The number is {i * 100}.",
                    }
                )

            test_number = 42
            messages.append(
                {
                    "role": "user",
                    "content": f"Finally, what is {test_number}?",
                }
            )

            response = await self._client.post(
                "/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": 50,
                },
            )

            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                memory_ok = str(test_number) in content

                return ContextResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.PASSED if memory_ok else TestStatus.FAILED,
                    context_size=context_size,
                    memory_score=1.0 if memory_ok else 0.0,
                    context_tokens_used=data.get("usage", {}).get("prompt_tokens", 0),
                )
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", {}).get("message", response.text)
                return ContextResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.FAILED,
                    context_size=context_size,
                    error_message=f"HTTP {response.status_code}: {error_msg}",
                )

        except Exception as e:
            return self._create_error_result(ContextResult, model, str(e), TestStatus.ERROR)

    async def list_models(self) -> List[str]:
        if self.config.models:
            return self.config.models
        return self.DEFAULT_MODELS
