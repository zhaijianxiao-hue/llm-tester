"""
Base provider interface for LLM API integrations.

This module defines the abstract base class that all LLM providers must implement,
ensuring a consistent interface across different API providers.
"""

from abc import ABC, abstractmethod
from typing import List, Optional

from llm_tester.core.models import (
    ConnectivityResult,
    ContextResult,
    PerformanceResult,
    ProviderConfig,
    TestStatus,
)


class BaseProvider(ABC):
    """
    Abstract base class for LLM providers.

    All provider implementations must inherit from this class and implement
    the required methods for testing connectivity, performance, and context.
    """

    def __init__(self, config: ProviderConfig):
        """
        Initialize the provider with configuration.

        Args:
            config: Provider-specific configuration including API key,
                   base URL, and model list.
        """
        self.config = config
        self._client = None
        self._initialized = False

    @property
    @abstractmethod
    def name(self) -> str:
        """
        Get the human-readable name of the provider.

        Returns:
            Provider name (e.g., "OpenAI", "Claude")
        """
        pass

    @property
    @abstractmethod
    def provider_type(self) -> str:
        """
        Get the provider type identifier.

        Returns:
            Provider type string (e.g., "openai", "claude")
        """
        pass

    @abstractmethod
    async def initialize(self) -> None:
        """
        Initialize the provider client.

        This method should set up HTTP clients, validate credentials,
        and prepare the provider for API calls.

        Raises:
            ValueError: If configuration is invalid
            ConnectionError: If unable to connect to the API
        """
        pass

    @abstractmethod
    async def test_connectivity(self, model: str) -> ConnectivityResult:
        """
        Test connectivity to the provider's API.

        This method verifies that:
        - The API key is valid
        - The specified model is available
        - Network connectivity exists

        Args:
            model: Model identifier to test

        Returns:
            ConnectivityResult with test outcome
        """
        pass

    @abstractmethod
    async def test_performance(
        self,
        model: str,
        prompt: str,
        max_tokens: int = 100,
        warmup: int = 0,
    ) -> PerformanceResult:
        """
        Run a performance benchmark test.

        Measures:
        - Total response time
        - Time to first token (TTFT)
        - Tokens per second
        - Total token usage

        Args:
            model: Model identifier to test
            prompt: Test prompt to send
            max_tokens: Maximum tokens to generate
            warmup: Number of warmup iterations (not counted in results)

        Returns:
            PerformanceResult with benchmark metrics
        """
        pass

    @abstractmethod
    async def test_context(
        self,
        model: str,
        context_size: int,
    ) -> ContextResult:
        """
        Test context handling capabilities.

        This method tests:
        - Maximum context window size
        - Multi-turn conversation memory
        - Long context handling

        Args:
            model: Model identifier to test
            context_size: Context size to test (in tokens)

        Returns:
            ContextResult with context test outcome
        """
        pass

    @abstractmethod
    async def list_models(self) -> List[str]:
        """
        Get list of available models from the provider.

        Returns:
            List of model identifiers available for use
        """
        pass

    async def close(self) -> None:
        """
        Close the provider connection and cleanup resources.

        Should be called when done with the provider.
        """
        client = self._client
        if client is not None:
            close_method = getattr(client, "aclose", None)
            if close_method is not None and callable(close_method):
                await close_method()
        self._client = None
        self._initialized = False

    async def __aenter__(self) -> "BaseProvider":
        """Async context manager entry."""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.close()

    def _create_error_result(
        self,
        result_class,
        model: str,
        error_message: str,
        status: TestStatus = TestStatus.ERROR,
    ):
        """
        Helper to create error result objects.

        Args:
            result_class: Result class to instantiate
            model: Model that was being tested
            error_message: Error description
            status: Test status (default: ERROR)

        Returns:
            Result instance with error details
        """
        return result_class(
            provider=self.provider_type,
            model=model,
            status=status,
            error_message=error_message,
        )
