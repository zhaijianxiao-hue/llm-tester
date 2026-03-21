"""
Test execution engine.

Coordinates test execution across multiple providers and models,
collects results, and generates reports. Uses dynamic provider registry.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from llm_tester.core.config import Config, get_config
from llm_tester.core.models import (
    ConnectivityResult,
    ContextResult,
    PerformanceResult,
    ProviderConfig,
    TestConfig,
    TestReport,
    TestStatus,
    TestSummary,
    TestType,
)
from llm_tester.providers.base import BaseProvider
from llm_tester.providers.registry import ProviderRegistry, auto_discover_providers


class TestEngine:
    """
    Test execution engine.

    Manages provider initialization, test execution, and result collection.
    Uses the dynamic provider registry for provider discovery.
    """

    def __init__(self, config: Optional[Config] = None):
        """
        Initialize test engine.

        Args:
            config: Configuration to use. If None, loads from default location.
        """
        self.config = config or get_config()
        self._providers: Dict[str, BaseProvider] = {}

        # Auto-discover providers on initialization
        auto_discover_providers()

        # Register custom providers from config as OpenAI-compatible
        self._register_custom_providers()

    def _register_custom_providers(self) -> None:
        """
        Register configured providers that don't have a dedicated implementation.

        Selects the appropriate provider class based on provider_type:
        - "openai" or "openai_compatible" → OpenAIProvider
        - "anthropic" or "claude" → ClaudeProvider
        - "ollama" → OllamaProvider
        """
        from llm_tester.providers.builtin.openai import OpenAIProvider
        from llm_tester.providers.builtin.claude import ClaudeProvider
        from llm_tester.providers.builtin.ollama import OllamaProvider

        configured = self.config.providers.get_all_providers()
        for name, config in configured.items():
            if not ProviderRegistry.has_provider(name):
                # Determine provider class based on provider_type
                provider_type = (config.provider_type or "openai").lower()

                if provider_type in ("anthropic", "claude"):
                    provider_class = ClaudeProvider
                elif provider_type == "ollama":
                    provider_class = OllamaProvider
                else:
                    # Default to OpenAI for openai, openai_compatible, or unknown
                    provider_class = OpenAIProvider

                ProviderRegistry.register(name, provider_class)

    async def initialize_provider(
        self,
        provider_name: str,
        provider_config: Optional[ProviderConfig] = None,
    ) -> BaseProvider:
        """
        Initialize a specific provider.

        Args:
            provider_name: Name of the provider to initialize
            provider_config: Optional custom configuration

        Returns:
            Initialized provider instance

        Raises:
            ValueError: If provider type is not supported
        """
        provider_name = provider_name.lower()

        if provider_name in self._providers:
            return self._providers[provider_name]

        if provider_config is None:
            provider_config = self.config.providers.get_provider(provider_name)
            if provider_config is None:
                raise ValueError(f"No configuration for provider: {provider_name}")

        provider_class = ProviderRegistry.get_provider(provider_name)
        if provider_class is None:
            available = ProviderRegistry.list_providers()
            raise ValueError(
                f"Unsupported provider: {provider_name}. "
                f"Available providers: {', '.join(available) or 'none registered'}"
            )

        provider = provider_class(provider_config)
        await provider.initialize()
        self._providers[provider_name] = provider

        return provider

    async def run_test(self, test_config: TestConfig) -> TestReport:
        """
        Execute a single test configuration.

        Args:
            test_config: Test configuration to execute

        Returns:
            Test report with results
        """
        test_id = str(uuid.uuid4())[:8]
        start_time = datetime.now()
        results: List[Dict[str, Any]] = []

        providers_to_test = self._get_providers_to_test(test_config)

        for provider_name, provider_config in providers_to_test.items():
            try:
                provider = await self.initialize_provider(provider_name, provider_config)

                models = self._get_models_to_test(test_config, provider)

                for model in models:
                    if test_config.test_type == TestType.CONNECTIVITY:
                        result = await provider.test_connectivity(model)
                    elif test_config.test_type == TestType.PERFORMANCE:
                        prompt = test_config.prompt or "Write a short greeting."
                        result = await provider.test_performance(
                            model, prompt, test_config.max_tokens
                        )
                    elif test_config.test_type == TestType.CONTEXT:
                        result = await provider.test_context(model, test_config.context_size)
                    else:
                        continue

                    results.append(result.model_dump())

            except Exception as e:
                results.append(
                    {
                        "provider": provider_name,
                        "model": test_config.model or "unknown",
                        "status": TestStatus.ERROR.value,
                        "error_message": str(e),
                    }
                )

        end_time = datetime.now()
        summary = self._generate_summary(results)

        return TestReport(
            test_id=test_id,
            test_type=test_config.test_type,
            start_time=start_time,
            end_time=end_time,
            config=test_config,
            results=results,
            summary=summary,
        )

    async def run_batch_tests(
        self,
        test_configs: List[TestConfig],
    ) -> List[TestReport]:
        """
        Execute multiple test configurations.

        Args:
            test_configs: List of test configurations

        Returns:
            List of test reports
        """
        return [await self.run_test(config) for config in test_configs]

    async def run_all_tests(
        self,
        providers: Optional[List[str]] = None,
        models: Optional[Dict[str, List[str]]] = None,
    ) -> Dict[TestType, TestReport]:
        """
        Run all test types across specified providers and models.

        Args:
            providers: Providers to test (None for all configured)
            models: Models per provider (None for configured models)

        Returns:
            Dictionary mapping test type to report
        """
        reports = {}

        for test_type in [TestType.CONNECTIVITY, TestType.PERFORMANCE, TestType.CONTEXT]:
            config = TestConfig(test_type=test_type)
            reports[test_type] = await self.run_test(config)

        return reports

    def _get_providers_to_test(
        self,
        test_config: TestConfig,
    ) -> Dict[str, ProviderConfig]:
        """Get providers to test based on configuration."""
        if test_config.provider:
            config = self.config.providers.get_provider(test_config.provider)
            if config:
                return {test_config.provider: config}
            return {}

        return self.config.providers.get_enabled_providers()

    def _get_models_to_test(
        self,
        test_config: TestConfig,
        provider: BaseProvider,
    ) -> List[str]:
        """Get models to test based on configuration."""
        if test_config.model:
            return [test_config.model]
        return provider.config.models if provider.config.models else []

    def _generate_summary(self, results: List[Dict[str, Any]]) -> TestSummary:
        """Generate summary from results."""
        total = len(results)
        passed = sum(1 for r in results if r.get("status") == TestStatus.PASSED.value)
        failed = sum(1 for r in results if r.get("status") == TestStatus.FAILED.value)
        errors = sum(1 for r in results if r.get("status") == TestStatus.ERROR.value)
        skipped = sum(1 for r in results if r.get("status") == TestStatus.SKIPPED.value)

        return TestSummary(
            total_tests=total,
            passed=passed,
            failed=failed,
            errors=errors,
            skipped=skipped,
        )

    async def close(self) -> None:
        """Close all provider connections."""
        for provider in self._providers.values():
            await provider.close()
        self._providers.clear()

    @staticmethod
    def get_available_providers() -> List[str]:
        """
        Get list of all available (registered) providers.

        Returns:
            List of provider names
        """
        return ProviderRegistry.list_providers()
