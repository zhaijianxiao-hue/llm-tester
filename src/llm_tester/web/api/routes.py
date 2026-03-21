"""
API routes for LLM Tester Web UI.

This module defines all REST API endpoints for the web interface.
Supports dynamic provider discovery and configuration.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

from llm_tester.core.config import (
    Config,
    get_config,
    set_config,
    add_provider,
    save_config,
    remove_provider,
)
from llm_tester.core.models import ProviderConfig, TestConfig, TestType
from llm_tester.providers.registry import ProviderRegistry, auto_discover_providers

router = APIRouter(tags=["API"])


# ============== Provider Endpoints ==============


@router.get("/providers")
async def get_providers() -> Dict[str, Any]:
    """
    Get list of all available providers (registered + configured).

    Returns:
        Dictionary containing provider list with configuration status
    """
    auto_discover_providers()
    config = get_config()

    # Get all registered providers
    registered = ProviderRegistry.list_providers()

    # Get configured providers
    configured = config.providers.get_all_providers()

    providers = []
    for name in set(registered + list(configured.keys())):
        provider_config = configured.get(name)
        provider_class = ProviderRegistry.get_provider(name)

        is_registered = provider_class is not None
        is_configured = provider_config is not None and (
            name == "ollama" or provider_config.api_key
        )

        display_name = name
        if provider_config and provider_config.display_name:
            display_name = provider_config.display_name
        elif provider_class:
            # Try to get display name from provider class
            try:
                temp_instance = object.__new__(provider_class)
                display_name = (
                    temp_instance.name if hasattr(temp_instance, "name") else name.title()
                )
            except Exception:
                display_name = name.title()

        providers.append(
            {
                "name": name,
                "display_name": display_name,
                "registered": is_registered,
                "configured": is_configured,
                "enabled": provider_config.enabled if provider_config else False,
            }
        )

    return {"providers": providers}


@router.get("/providers/{provider_name}/models")
async def get_provider_models(provider_name: str) -> Dict[str, Any]:
    """
    Get list of models for a specific provider.

    Args:
        provider_name: Provider identifier (e.g., "openai", "claude")

    Returns:
        Dictionary containing model list
    """
    auto_discover_providers()

    config = get_config()
    provider_config = config.providers.get_provider(provider_name)

    # Check if provider is registered
    provider_class = ProviderRegistry.get_provider(provider_name)

    # Default models per provider
    default_models = {
        "openai": [
            "gpt-4",
            "gpt-4-turbo",
            "gpt-4-turbo-preview",
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k",
        ],
        "claude": [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
        ],
        "gemini": ["gemini-pro", "gemini-1.5-pro", "gemini-1.5-flash"],
        "deepseek": ["deepseek-chat", "deepseek-coder"],
        "ollama": ["llama2", "llama3", "mistral", "codellama", "qwen2", "phi3", "gemma"],
        "qwen": ["qwen-turbo", "qwen-plus", "qwen-max"],
        "wenxin": ["ernie-bot-4", "ernie-bot-turbo"],
    }

    models = default_models.get(provider_name, [])

    # Override with configured models if available
    if provider_config and provider_config.models:
        models = provider_config.models

    return {"provider": provider_name, "models": models, "registered": provider_class is not None}


@router.post("/providers/register")
async def register_provider(provider_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Register a new custom provider configuration.

    Args:
        provider_data: Provider configuration data
            - name: Provider identifier
            - display_name: Human readable name
            - api_key: API key (if required)
            - base_url: Base URL for API
            - models: List of models
            - provider_type: API type ("openai", "anthropic", "ollama")

    Returns:
        Status confirmation
    """
    name = provider_data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Provider name is required")

    name = name.lower()
    provider_type = provider_data.get("provider_type", "openai").lower()

    # Create provider config
    config = ProviderConfig(
        provider_type=provider_type,
        api_key=provider_data.get("api_key"),
        base_url=provider_data.get("base_url"),
        models=provider_data.get("models", []),
        display_name=provider_data.get("display_name", name.title()),
        enabled=provider_data.get("enabled", True),
    )

    # Add to configuration
    add_provider(name, config)
    save_config()

    return {
        "status": "registered",
        "provider": name,
        "provider_type": provider_type,
        "message": f"Provider '{name}' registered successfully",
    }


# ============== Configuration Endpoints ==============


@router.get("/config")
async def get_configuration() -> Dict[str, Any]:
    """
    Get current configuration.

    Returns:
        Current configuration with masked API keys
    """
    config = get_config()
    return _mask_sensitive_data(config.model_dump(mode="json"))


@router.put("/config/providers/{provider_name}")
async def update_provider_config(
    provider_name: str,
    config_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Update configuration for a specific provider.

    Args:
        provider_name: Provider identifier
        config_data: New configuration data

    Returns:
        Updated configuration status
    """
    config = get_config()
    current_config = config.providers.get_provider(provider_name)

    if current_config:
        update_data = current_config.model_dump()
        update_data.update(config_data)
        new_provider_config = ProviderConfig(**update_data)
    else:
        new_provider_config = ProviderConfig(**config_data)

    config.providers.set_provider(provider_name, new_provider_config)
    set_config(config)
    save_config()

    return {"status": "updated", "provider": provider_name}


@router.delete("/config/providers/{provider_name}")
async def delete_provider_config(provider_name: str) -> Dict[str, Any]:
    """
    Delete a provider configuration.

    Args:
        provider_name: Provider identifier

    Returns:
        Deletion confirmation
    """
    removed = remove_provider(provider_name)
    if removed:
        save_config()
        return {"status": "deleted", "provider": provider_name}
    else:
        return {"status": "not_found", "provider": provider_name}


def _mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Mask sensitive data like API keys in response."""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if key in ("api_key", "apiKey") and isinstance(value, str) and value:
                result[key] = "****" + value[-4:] if len(value) > 4 else "****"
            elif isinstance(value, dict):
                result[key] = _mask_sensitive_data(value)
            else:
                result[key] = value
        return result
    return data


# ============== Test Endpoints ==============


_test_results: Dict[str, Any] = {}


@router.post("/test/connectivity")
async def run_connectivity_test(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run connectivity test.

    Args:
        params: Test parameters including provider and optional model

    Returns:
        Test results
    """
    import asyncio
    from llm_tester.core.engine import TestEngine

    engine = TestEngine()

    provider = params.get("provider")
    model = params.get("model")

    test_config = TestConfig(
        test_type=TestType.CONNECTIVITY,
        provider=provider,
        model=model,
    )

    report = await engine.run_test(test_config)
    await engine.close()

    return {
        "test_id": report.test_id,
        "results": report.results,
        "summary": report.summary.model_dump(),
    }


@router.post("/test/performance")
async def run_performance_test(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run performance test.

    Args:
        params: Test parameters including provider, model, and prompt

    Returns:
        Test results with performance metrics
    """
    from llm_tester.core.engine import TestEngine

    engine = TestEngine()

    provider = params.get("provider")
    model = params.get("model")
    prompt = params.get("prompt", "Write a short greeting.")
    max_tokens = params.get("max_tokens", 100)

    test_config = TestConfig(
        test_type=TestType.PERFORMANCE,
        provider=provider,
        model=model,
        prompt=prompt,
        max_tokens=max_tokens,
    )

    report = await engine.run_test(test_config)
    await engine.close()

    return {
        "test_id": report.test_id,
        "results": report.results,
        "summary": report.summary.model_dump(),
    }


@router.post("/test/context")
async def run_context_test(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run context handling test.

    Args:
        params: Test parameters including provider, model, and context_size

    Returns:
        Test results with context metrics
    """
    from llm_tester.core.engine import TestEngine

    engine = TestEngine()

    provider = params.get("provider")
    model = params.get("model")
    context_size = params.get("context_size", 4096)

    test_config = TestConfig(
        test_type=TestType.CONTEXT,
        provider=provider,
        model=model,
        context_size=context_size,
    )

    report = await engine.run_test(test_config)
    await engine.close()

    return {
        "test_id": report.test_id,
        "results": report.results,
        "summary": report.summary.model_dump(),
    }


@router.post("/test/all")
async def run_all_tests(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run all test types.

    Args:
        params: Test parameters including provider and model

    Returns:
        Combined test results
    """
    from llm_tester.core.engine import TestEngine

    engine = TestEngine()

    provider = params.get("provider")
    model = params.get("model")

    reports = await engine.run_all_tests(
        providers=[provider] if provider else None,
    )
    await engine.close()

    return {
        "connectivity": reports[TestType.CONNECTIVITY].model_dump(),
        "performance": reports[TestType.PERFORMANCE].model_dump(),
        "context": reports[TestType.CONTEXT].model_dump(),
    }


# ============== Health Check ==============


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    auto_discover_providers()
    return {
        "status": "ok",
        "providers_registered": len(ProviderRegistry.list_providers()),
        "providers_available": ProviderRegistry.list_providers(),
    }


# ============== Chat Endpoints ==============


@router.post("/chat/stream")
async def chat_stream(params: Dict[str, Any]):
    """
    Streaming chat endpoint.

    Args:
        params: Chat parameters
            - provider: Provider name
            - model: Model name
            - messages: List of messages [{role, content}]
            - temperature: Sampling temperature (optional)

    Returns:
        Streaming SSE response
    """
    from fastapi.responses import StreamingResponse
    import httpx
    import json

    provider_name = params.get("provider")
    model = params.get("model")
    messages = params.get("messages", [])
    temperature = params.get("temperature", 0.7)

    if not provider_name or not model:
        raise HTTPException(status_code=400, detail="Provider and model are required")

    # Get provider config
    config = get_config()
    provider_config = config.providers.get_provider(provider_name)

    if not provider_config:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_name}' not configured")

    base_url = provider_config.base_url or "https://api.openai.com/v1"
    api_key = provider_config.api_key

    async def generate():
        async with httpx.AsyncClient(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=120.0,
        ) as client:
            response = await client.post(
                "/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True,
                    "temperature": temperature,
                },
            )

            if response.status_code != 200:
                yield f"data: {json.dumps({'error': f'HTTP {response.status_code}'})}\n\n"
                return

            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    yield line + "\n"
                    if line == "data: [DONE]":
                        break

            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
