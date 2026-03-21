"""
Claude (Anthropic) API provider implementation.

Supports Claude 3 Opus, Sonnet, and Haiku models.
"""

import time
from typing import Any, Dict, List, Optional

import httpx

from llm_tester.core.models import (
    ConnectivityResult,
    ContextResult,
    PerformanceResult,
    ProviderConfig,
    ProviderType,
    TestStatus,
)
from llm_tester.providers.base import BaseProvider


class ClaudeProvider(BaseProvider):
    """
    Anthropic Claude API provider implementation.

    Supports Claude 3 family: Opus, Sonnet, and Haiku.
    """

    DEFAULT_BASE_URL = "https://api.anthropic.com/v1"
    DEFAULT_MODELS = [
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
    ]

    # Claude requires specific API version header
    API_VERSION = "2023-06-01"

    def __init__(self, config: ProviderConfig):
        """
        Initialize Claude provider.

        Args:
            config: Provider configuration with API key and settings
        """
        super().__init__(config)
        self.base_url = config.base_url or self.DEFAULT_BASE_URL

    @property
    def name(self) -> str:
        """Provider name."""
        return "Claude"

    @property
    def provider_type(self) -> ProviderType:
        """Provider type enum."""
        return ProviderType.CLAUDE

    async def initialize(self) -> None:
        """Initialize HTTP client with authentication."""
        if not self.config.api_key:
            raise ValueError("Claude API key is required")

        headers = {
            "x-api-key": self.config.api_key,
            "Content-Type": "application/json",
            "anthropic-version": self.API_VERSION,
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
        """Test API connectivity and model availability."""
        start_time = time.time()

        try:
            if not self._client:
                await self.initialize()

            # Send minimal request to test connectivity
            response = await self._client.post(
                "/messages",
                json={
                    "model": model,
                    "max_tokens": 10,
                    "messages": [{"role": "user", "content": "Hi"}],
                },
            )

            latency_ms = (time.time() - start_time) * 1000

            if response.status_code == 200:
                data = response.json()
                # Verify response structure
                if "content" in data and len(data["content"]) > 0:
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
        """Run performance benchmark."""
        start_time = time.time()
        first_token_time: Optional[float] = None
        tokens_generated = 0
        prompt_tokens = 0
        completion_tokens = 0

        try:
            if not self._client:
                await self.initialize()

            # Use streaming to measure TTFT
            response = await self._client.post(
                "/messages",
                json={
                    "model": model,
                    "max_tokens": max_tokens,
                    "messages": [{"role": "user", "content": prompt}],
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

            # Process streaming response (SSE format)
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]

                    import json

                    try:
                        data = json.loads(data_str)
                        event_type = data.get("type", "")

                        if event_type == "content_block_delta":
                            if first_token_time is None:
                                first_token_time = time.time()
                            tokens_generated += 1
                        elif event_type == "message_start":
                            prompt_tokens = (
                                data.get("message", {}).get("usage", {}).get("input_tokens", 0)
                            )
                        elif event_type == "message_delta":
                            completion_tokens = data.get("usage", {}).get(
                                "output_tokens", tokens_generated
                            )
                    except json.JSONDecodeError:
                        continue

            end_time = time.time()
            total_time_ms = (end_time - start_time) * 1000
            ttft_ms = (first_token_time - start_time) * 1000 if first_token_time else None

            # Calculate tokens per second
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
                completion_tokens=completion_tokens or tokens_generated,
                total_tokens=prompt_tokens + (completion_tokens or tokens_generated),
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
        """Test context handling capability."""
        try:
            if not self._client:
                await self.initialize()

            # Build a conversation with multiple turns
            messages: List[Dict[str, str]] = []

            # Add context by including multiple messages
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

            # Final question to test memory
            test_number = 42
            messages.append(
                {
                    "role": "user",
                    "content": f"Finally, what is {test_number}?",
                }
            )

            response = await self._client.post(
                "/messages",
                json={
                    "model": model,
                    "max_tokens": 50,
                    "messages": messages,
                },
            )

            if response.status_code == 200:
                data = response.json()
                content = data.get("content", [{}])[0].get("text", "")

                # Simple memory check
                memory_ok = str(test_number) in content

                return ContextResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.PASSED if memory_ok else TestStatus.FAILED,
                    context_size=context_size,
                    memory_score=1.0 if memory_ok else 0.0,
                    context_tokens_used=data.get("usage", {}).get("input_tokens", 0),
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
        """Get available models."""
        if self.config.models:
            return self.config.models
        return self.DEFAULT_MODELS
