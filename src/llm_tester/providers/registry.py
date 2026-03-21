"""
Provider registry for dynamic provider registration.

This module provides a global registry for LLM providers, allowing
providers to be registered and discovered at runtime.
"""

import importlib
import importlib.util
import os
from pathlib import Path
from typing import Dict, List, Optional, Type

from llm_tester.providers.base import BaseProvider


class ProviderRegistry:
    """
    Global registry for LLM providers.

    Supports dynamic registration and discovery of providers.
    Providers can be registered using the @provider decorator or
    by calling register() directly.

    Example:
        @provider("openai")
        class OpenAIProvider(BaseProvider):
            ...

        # Or directly:
        ProviderRegistry.register("openai", OpenAIProvider)
    """

    _instance: Optional["ProviderRegistry"] = None
    _providers: Dict[str, Type[BaseProvider]] = {}
    _initialized: bool = False

    def __new__(cls) -> "ProviderRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def register(cls, name: str, provider_class: Type[BaseProvider]) -> None:
        """
        Register a provider class.

        Args:
            name: Provider identifier (e.g., "openai", "claude")
            provider_class: Provider class implementing BaseProvider
        """
        if not issubclass(provider_class, BaseProvider):
            raise TypeError(f"{provider_class} must be a subclass of BaseProvider")

        cls._providers[name.lower()] = provider_class

    @classmethod
    def unregister(cls, name: str) -> bool:
        """
        Unregister a provider.

        Args:
            name: Provider identifier to remove

        Returns:
            True if provider was removed, False if not found
        """
        return cls._providers.pop(name.lower(), None) is not None

    @classmethod
    def get_provider(cls, name: str) -> Optional[Type[BaseProvider]]:
        """
        Get a provider class by name.

        Args:
            name: Provider identifier

        Returns:
            Provider class if found, None otherwise
        """
        return cls._providers.get(name.lower())

    @classmethod
    def has_provider(cls, name: str) -> bool:
        """
        Check if a provider is registered.

        Args:
            name: Provider identifier

        Returns:
            True if provider exists
        """
        return name.lower() in cls._providers

    @classmethod
    def list_providers(cls) -> List[str]:
        """
        List all registered provider names.

        Returns:
            List of provider identifiers
        """
        return list(cls._providers.keys())

    @classmethod
    def get_all_providers(cls) -> Dict[str, Type[BaseProvider]]:
        """
        Get all registered providers.

        Returns:
            Dictionary mapping provider names to classes
        """
        return cls._providers.copy()

    @classmethod
    def clear(cls) -> None:
        """Clear all registered providers (mainly for testing)."""
        cls._providers.clear()
        cls._initialized = False

    @classmethod
    def auto_discover(cls) -> None:
        """
        Auto-discover and load providers from builtin and plugins directories.

        This method scans the following locations:
        1. llm_tester.providers.builtin - Built-in providers
        2. llm_tester.plugins - User-defined plugins
        3. ~/.llm-tester/plugins - User plugins directory
        """
        if cls._initialized:
            return

        # Load builtin providers
        cls._load_builtin_providers()

        # Load user plugins
        cls._load_user_plugins()

        cls._initialized = True

    @classmethod
    def _load_builtin_providers(cls) -> None:
        """Load providers from the builtin directory."""
        builtin_dir = Path(__file__).parent / "builtin"

        if not builtin_dir.exists():
            return

        for file_path in builtin_dir.glob("*.py"):
            if file_path.name.startswith("_"):
                continue

            module_name = file_path.stem
            try:
                importlib.import_module(f"llm_tester.providers.builtin.{module_name}")
            except Exception as e:
                print(f"Warning: Failed to load builtin provider {module_name}: {e}")

    @classmethod
    def _load_user_plugins(cls) -> None:
        """Load providers from user plugin directories."""
        plugin_dirs = [
            Path(__file__).parent.parent / "plugins",  # Package plugins
            Path.home() / ".llm-tester" / "plugins",  # User plugins
        ]

        for plugin_dir in plugin_dirs:
            if not plugin_dir.exists():
                continue

            for file_path in plugin_dir.glob("*.py"):
                if file_path.name.startswith("_"):
                    continue

                module_name = file_path.stem
                try:
                    # Load module from file path
                    spec = importlib.util.spec_from_file_location(
                        f"llm_tester_plugin_{module_name}", file_path
                    )
                    if spec and spec.loader:
                        module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module)
                except Exception as e:
                    print(f"Warning: Failed to load plugin {module_name}: {e}")


# Global registry instance
registry = ProviderRegistry()


def provider(name: str):
    """
    Decorator to register a provider class.

    Usage:
        @provider("openai")
        class OpenAIProvider(BaseProvider):
            ...

    Args:
        name: Provider identifier

    Returns:
        Decorator function
    """

    def decorator(cls: Type[BaseProvider]) -> Type[BaseProvider]:
        ProviderRegistry.register(name, cls)
        return cls

    return decorator


def get_registry() -> ProviderRegistry:
    """Get the global provider registry."""
    return registry


def auto_discover_providers() -> None:
    """Auto-discover and load all providers."""
    ProviderRegistry.auto_discover()
