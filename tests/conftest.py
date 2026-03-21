"""
Test configuration and fixtures.
"""

import pytest
from pathlib import Path


@pytest.fixture
def config_path(tmp_path: Path) -> Path:
    """Create a temporary config file."""
    config_content = """
providers:
  openai:
    api_key: "test-key"
    models:
      - gpt-4
      - gpt-3.5-turbo

test_settings:
  timeout: 60

reporting:
  output_dir: "./reports"
"""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(config_content)
    return config_file
