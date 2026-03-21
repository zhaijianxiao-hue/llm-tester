"""
Ollama local LLM provider implementation.

Supports local models running via Ollama (llama2, mistral, codellama, etc.).
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


@provider("ollama")
class OllamaProvider(BaseProvider):
    """
    Ollama local LLM provider implementation.

    Supports models running locally via Ollama server.
    No API key required - connects to local Ollama instance.
    """

    DEFAULT_BASE_URL = "http://localhost:11434"
    DEFAULT_MODELS = [
        "llama2",
        "llama3",
        "mistral",
        "codellama",
        "qwen2",
        "phi3",
        "gemma",
    ]

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.base_url = config.base_url or self.DEFAULT_BASE_URL

    @property
    def name(self) -> str:
        return "Ollama (Local)"

    @property
    def provider_type(self) -> str:
        return "ollama"

    async def initialize(self) -> None:
        headers = {"Content-Type": "application/json"}
        headers.update(self.config.extra_headers)

        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            timeout=self.config.timeout,
            proxy=self.config.proxy,
        )
        self._initialized = True

    async def _check_server_running(self) -> bool:
        """Check if Ollama server is running."""
        try:
            if not self._client:
                await self.initialize()
            response = await self._client.get("/api/tags")
            return response.status_code == 200
        except Exception:
            return False

    async def test_connectivity(self, model: str) -> ConnectivityResult:
        start_time = time.time()

        try:
            if not self._client:
                await self.initialize()

            # First check if Ollama server is running
            server_check = await self._check_server_running()
            if not server_check:
                return ConnectivityResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.FAILED,
                    latency_ms=0,
                    is_valid_key=False,
                    model_available=False,
                    error_message="Ollama server not running. Start with: ollama serve",
                )

            # Check if model is available
            models_response = await self._client.get("/api/tags")
            if models_response.status_code == 200:
                models_data = models_response.json()
                available_models = [
                    m.get("name", "").split(":")[0] for m in models_data.get("models", [])
                ]

                model_base = model.split(":")[0]
                model_available = model_base in available_models or model in available_models

                if not model_available:
                    latency_ms = (time.time() - start_time) * 1000
                    return ConnectivityResult(
                        provider=self.provider_type,
                        model=model,
                        status=TestStatus.FAILED,
                        latency_ms=round(latency_ms, 2),
                        is_valid_key=True,
                        model_available=False,
                        error_message=f"Model '{model}' not found. Available: {', '.join(available_models[:5])}",
                    )

            # Test with a minimal request
            response = await self._client.post(
                "/api/chat",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "stream": False,
                    "options": {"num_predict": 5},
                },
            )

            latency_ms = (time.time() - start_time) * 1000

            if response.status_code == 200:
                data = response.json()
                if "message" in data:
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
                        model_available=True,
                        error_message="Invalid response structure",
                    )
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", response.text)
                return ConnectivityResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.FAILED,
                    latency_ms=round(latency_ms, 2),
                    error_message=f"HTTP {response.status_code}: {error_msg}",
                )

        except httpx.ConnectError:
            return ConnectivityResult(
                provider=self.provider_type,
                model=model,
                status=TestStatus.FAILED,
                error_message=f"Cannot connect to Ollama at {self.base_url}. Is Ollama running?",
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

            # Use streaming to measure TTFT
            response = await self._client.post(
                "/api/chat",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": True,
                    "options": {"num_predict": max_tokens},
                },
            )

            if response.status_code != 200:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", response.text)
                return PerformanceResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.FAILED,
                    error_message=f"HTTP {response.status_code}: {error_msg}",
                )

            import json

            async for line in response.aiter_lines():
                if not line.strip():
                    continue

                try:
                    data = json.loads(line)

                    if "message" in data and "content" in data["message"]:
                        if first_token_time is None:
                            first_token_time = time.time()
                        tokens_generated += 1

                    if data.get("done", False):
                        prompt_tokens = data.get("prompt_eval_count", 0)
                        tokens_generated = data.get("eval_count", tokens_generated)
                        break

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

        except httpx.ConnectError:
            return PerformanceResult(
                provider=self.provider_type,
                model=model,
                status=TestStatus.FAILED,
                error_message=f"Cannot connect to Ollama at {self.base_url}",
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
                "/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "options": {"num_predict": 50},
                },
            )

            if response.status_code == 200:
                data = response.json()
                content = data.get("message", {}).get("content", "")
                memory_ok = str(test_number) in content

                return ContextResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.PASSED if memory_ok else TestStatus.FAILED,
                    context_size=context_size,
                    memory_score=1.0 if memory_ok else 0.0,
                    context_tokens_used=data.get("prompt_eval_count", 0),
                )
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", response.text)
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
        """Get available models from Ollama server."""
        try:
            if not self._client:
                await self.initialize()

            response = await self._client.get("/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                return [m.split(":")[0] for m in models if m]
        except Exception:
            pass

        if self.config.models:
            return self.config.models
        return self.DEFAULT_MODELS
