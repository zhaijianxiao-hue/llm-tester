"""
Builtin provider implementations.

This package contains built-in LLM provider implementations.
All providers are auto-registered via the @provider decorator.
"""

from llm_tester.providers.registry import auto_discover_providers

# Auto-discover providers when this package is imported
auto_discover_providers()
