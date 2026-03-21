"""
Configuration management for LLM Tester.

This module handles loading, validating, and managing configuration
from YAML files and environment variables. Supports dynamic provider configuration.
"""

import os
from pathlib import Path
from typing import Any, Dict, Optional

import yaml
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

from llm_tester.core.models import (
    ProviderConfig,
    ReportingConfig,
    TestSettings,
)


class AppConfig(BaseSettings):
    """Application configuration with environment variable support."""

    config_path: Path = Field(
        default=Path("config/config.yaml"), description="Path to configuration file"
    )

    output_dir: Path = Field(default=Path("./reports"), description="Output directory for reports")

    default_timeout: int = Field(default=60, description="Default timeout in seconds")

    log_level: str = Field(default="INFO", description="Logging level")

    env_file: Optional[str] = Field(default=None, description="Path to .env file")

    model_config = {
        "env_prefix": "LLM_TESTER_",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


class ProvidersConfig(BaseSettings):
    """
    Dynamic configuration for all providers.

    Uses extra="allow" to support any provider name dynamically.
    Providers can be added at runtime without modifying this class.
    """

    class Config:
        extra = "allow"

    def get_provider(self, name: str) -> Optional[ProviderConfig]:
        """
        Get configuration for a specific provider.

        Args:
            name: Provider name (e.g., "openai", "claude", "my_custom_provider")

        Returns:
            ProviderConfig if configured, None otherwise
        """
        config = getattr(self, name.lower(), None)
        if config is None:
            return None
        if isinstance(config, ProviderConfig):
            return config
        if isinstance(config, dict):
            return ProviderConfig(**config)
        return None

    def set_provider(self, name: str, config: Optional[ProviderConfig]) -> None:
        """
        Set configuration for a provider.

        Args:
            name: Provider name
            config: Provider configuration (None to remove)
        """
        if config is None:
            # Remove from model_extra if exists
            extra = getattr(self, "model_extra", {}) or {}
            if name.lower() in extra:
                del extra[name.lower()]
        else:
            setattr(self, name.lower(), config)

    def get_all_providers(self) -> Dict[str, ProviderConfig]:
        """
        Get all configured providers.

        Returns:
            Dictionary mapping provider names to their configurations
        """
        result = {}

        # Pydantic v2 stores extra fields in model_extra
        extra = getattr(self, "model_extra", {}) or {}

        for key, value in extra.items():
            if value is not None:
                if isinstance(value, ProviderConfig):
                    result[key] = value
                elif isinstance(value, dict):
                    try:
                        result[key] = ProviderConfig(**value)
                    except Exception:
                        pass

        return result

    def get_enabled_providers(self) -> Dict[str, ProviderConfig]:
        """
        Get all enabled providers with valid configuration.

        Returns:
            Dictionary of enabled providers
        """
        enabled = {}
        for name, config in self.get_all_providers().items():
            if config.enabled:
                # Ollama doesn't need API key
                if name == "ollama":
                    enabled[name] = config
                elif config.api_key or os.getenv(f"{name.upper()}_API_KEY"):
                    enabled[name] = config
        return enabled

    def list_provider_names(self) -> list:
        """List all configured provider names."""
        return list(self.get_all_providers().keys())


class Config(BaseSettings):
    """Main configuration class."""

    providers: ProvidersConfig = Field(default_factory=ProvidersConfig)
    test_settings: TestSettings = Field(default_factory=TestSettings)
    reporting: ReportingConfig = Field(default_factory=ReportingConfig)

    @classmethod
    def from_yaml(cls, path: Path) -> "Config":
        """Load configuration from YAML file."""
        if not path.exists():
            return cls()

        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        return cls.model_validate(data)

    def to_yaml(self, path: Path) -> None:
        """Save configuration to YAML file."""
        path.parent.mkdir(parents=True, exist_ok=True)

        data = self.model_dump(mode="json", exclude_none=True)

        with open(path, "w", encoding="utf-8") as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True)

    @field_validator("providers", mode="before")
    @classmethod
    def resolve_env_vars(cls, v: Any) -> Any:
        """Resolve environment variables in provider configurations."""
        if not isinstance(v, dict):
            return v

        result = {}
        for provider_name, config in v.items():
            if config is None:
                result[provider_name] = None
                continue

            if isinstance(config, dict):
                if "api_key" in config and isinstance(config["api_key"], str):
                    key = config["api_key"]
                    if key.startswith("${") and key.endswith("}"):
                        env_var = key[2:-1]
                        config["api_key"] = os.getenv(env_var)

                if not config.get("api_key"):
                    env_key = f"{provider_name.upper()}_API_KEY"
                    config["api_key"] = os.getenv(env_key)

            result[provider_name] = config

        return result


_config: Optional[Config] = None


def get_config() -> Config:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        app_config = AppConfig()
        _config = Config.from_yaml(app_config.config_path)
    return _config


def set_config(config: Config) -> None:
    """Set the global configuration instance."""
    global _config
    _config = config


def reload_config(config_path: Optional[Path] = None) -> Config:
    """Reload configuration from file."""
    global _config
    if config_path is None:
        app_config = AppConfig()
        config_path = app_config.config_path
    _config = Config.from_yaml(config_path)
    return _config


def add_provider(name: str, config: ProviderConfig) -> None:
    """
    Add or update a provider configuration at runtime.

    Args:
        name: Provider name
        config: Provider configuration
    """
    cfg = get_config()
    cfg.providers.set_provider(name, config)


def save_config() -> None:
    """Save the current configuration to YAML file."""
    global _config
    if _config is not None:
        app_config = AppConfig()
        _config.to_yaml(app_config.config_path)


def remove_provider(name: str) -> bool:
    """
    Remove a provider configuration.

    Args:
        name: Provider name to remove

    Returns:
        True if provider was removed
    """
    cfg = get_config()
    current = cfg.providers.get_provider(name)
    if current is not None:
        # Set to None by removing from model_extra
        extra = getattr(cfg.providers, "model_extra", {}) or {}
        if name in extra:
            del extra[name]
            # Rebuild the providers config
            new_providers = ProvidersConfig()
            for k, v in extra.items():
                setattr(new_providers, k, v)
            cfg.providers = new_providers
            return True
    return False
    cfg.providers.set_provider(name, config)
