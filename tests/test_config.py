"""
Tests for configuration management.
"""

import os
from pathlib import Path

import pytest

from llm_tester.core.config import Config, AppConfig, ProvidersConfig
from llm_tester.core.models import ProviderConfig, ProviderType


class TestProviderConfig:
    """Tests for ProviderConfig model."""

    def test_default_values(self):
        """Test default configuration values."""
        config = ProviderConfig()

        assert config.api_key is None
        assert config.base_url is None
        assert config.models == []
        assert config.timeout == 60
        assert config.max_retries == 3

    def test_custom_values(self):
        """Test custom configuration values."""
        config = ProviderConfig(
            api_key="test-key",
            base_url="https://api.example.com",
            models=["model-1", "model-2"],
            timeout=30,
        )

        assert config.api_key == "test-key"
        assert config.base_url == "https://api.example.com"
        assert config.models == ["model-1", "model-2"]
        assert config.timeout == 30


class TestProvidersConfig:
    """Tests for ProvidersConfig model."""

    def test_get_provider(self):
        """Test getting provider configuration."""
        config = ProvidersConfig(
            openai=ProviderConfig(api_key="test-key"),
        )

        result = config.get_provider(ProviderType.OPENAI)
        assert result is not None
        assert result.api_key == "test-key"

        result = config.get_provider(ProviderType.CLAUDE)
        assert result is None

    def test_get_enabled_providers(self):
        """Test getting enabled providers."""
        config = ProvidersConfig(
            openai=ProviderConfig(api_key="test-key"),
            claude=ProviderConfig(),  # No API key
        )

        enabled = config.get_enabled_providers()

        assert ProviderType.OPENAI in enabled
        assert ProviderType.CLAUDE not in enabled


class TestConfig:
    """Tests for Config class."""

    def test_from_yaml(self, tmp_path: Path):
        """Test loading configuration from YAML file."""
        config_file = tmp_path / "config.yaml"
        config_file.write_text("""
providers:
  openai:
    api_key: "test-key"
    models:
      - gpt-4

test_settings:
  timeout: 30
""")

        config = Config.from_yaml(config_file)

        assert config.providers.openai is not None
        assert config.providers.openai.api_key == "test-key"
        assert config.test_settings.timeout == 30

    def test_from_nonexistent_yaml(self, tmp_path: Path):
        """Test loading from non-existent file returns default config."""
        config = Config.from_yaml(tmp_path / "nonexistent.yaml")

        assert config is not None
        assert isinstance(config, Config)

    def test_to_yaml(self, tmp_path: Path):
        """Test saving configuration to YAML file."""
        config = Config(
            providers=ProvidersConfig(
                openai=ProviderConfig(api_key="test-key"),
            )
        )

        output_file = tmp_path / "output.yaml"
        config.to_yaml(output_file)

        assert output_file.exists()

        # Load and verify
        loaded = Config.from_yaml(output_file)
        assert loaded.providers.openai is not None
        assert loaded.providers.openai.api_key == "test-key"


class TestAppConfig:
    """Tests for AppConfig."""

    def test_default_values(self):
        """Test default app configuration."""
        config = AppConfig()

        assert config.config_path == Path("config/config.yaml")
        assert config.output_dir == Path("./reports")
        assert config.default_timeout == 60
        assert config.log_level == "INFO"
