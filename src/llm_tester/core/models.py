"""
Core data models for LLM Tester.

This module defines all Pydantic models used throughout the application
for configuration, test parameters, and results.
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from datetime import datetime

from pydantic import BaseModel, Field


class ProviderType(str, Enum):
    """Built-in LLM provider types (for backward compatibility)."""

    OPENAI = "openai"
    CLAUDE = "claude"
    GEMINI = "gemini"
    DEEPSEEK = "deepseek"
    OLLAMA = "ollama"
    QWEN = "qwen"
    WENXIN = "wenxin"


class TestType(str, Enum):
    """Types of tests that can be performed."""

    CONNECTIVITY = "connectivity"
    PERFORMANCE = "performance"
    CONTEXT = "context"


class TestStatus(str, Enum):
    """Status of a test execution."""

    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    ERROR = "error"
    SKIPPED = "skipped"


class ProviderConfig(BaseModel):
    """Configuration for a single LLM provider."""

    provider_type: str = Field(
        default="openai", description="Provider API type: openai, anthropic, ollama"
    )
    api_key: Optional[str] = Field(default=None, description="API key for authentication")
    base_url: Optional[str] = Field(default=None, description="Base URL for API requests")
    models: List[str] = Field(default_factory=list, description="List of models to test")
    timeout: int = Field(default=60, ge=1, le=600, description="Request timeout in seconds")
    max_retries: int = Field(default=3, ge=0, le=10, description="Maximum number of retries")
    proxy: Optional[str] = Field(default=None, description="Proxy server URL")
    extra_headers: Dict[str, str] = Field(
        default_factory=dict, description="Additional headers for requests"
    )
    display_name: Optional[str] = Field(default=None, description="Display name for UI")
    enabled: bool = Field(default=True, description="Whether this provider is enabled")


class TestSettings(BaseModel):
    """Global test settings."""

    timeout: int = Field(default=60, description="Default timeout in seconds")
    max_retries: int = Field(default=3, description="Default max retries")
    proxy: Optional[str] = Field(default=None, description="Default proxy server")
    warmup_iterations: int = Field(default=1, description="Warmup iterations before testing")
    test_iterations: int = Field(default=3, description="Number of test iterations")


class ReportingConfig(BaseModel):
    """Reporting configuration."""

    output_dir: str = Field(default="./reports", description="Output directory for reports")
    formats: List[str] = Field(
        default=["json", "markdown"], description="Report formats to generate"
    )
    include_timestamp: bool = Field(default=True, description="Include timestamp in filenames")


class TestConfig(BaseModel):
    """Configuration for a specific test run."""

    test_type: TestType = Field(description="Type of test to run")
    provider: Optional[str] = Field(
        default=None, description="Specific provider to test (None for all)"
    )
    model: Optional[str] = Field(default=None, description="Specific model to test (None for all)")
    timeout: int = Field(default=60, description="Timeout in seconds")
    iterations: int = Field(default=1, ge=1, description="Number of iterations")
    warmup: int = Field(default=0, ge=0, description="Warmup iterations")
    prompt: Optional[str] = Field(default=None, description="Custom prompt for testing")
    max_tokens: int = Field(default=100, description="Max tokens to generate")
    context_size: int = Field(default=4096, description="Context size for context tests")


class BaseTestResult(BaseModel):
    """Base class for test results."""

    provider: str = Field(description="Provider that was tested")
    model: str = Field(description="Model that was tested")
    status: TestStatus = Field(description="Test status")
    error_message: Optional[str] = Field(default=None, description="Error message if test failed")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="When the test was executed"
    )


class ConnectivityResult(BaseTestResult):
    """Result of a connectivity test."""

    latency_ms: Optional[float] = Field(
        default=None, description="API response latency in milliseconds"
    )
    is_valid_key: bool = Field(default=False, description="Whether the API key is valid")
    model_available: bool = Field(default=False, description="Whether the model is available")


class PerformanceResult(BaseTestResult):
    """Result of a performance test."""

    total_time_ms: float = Field(
        default=0.0, description="Total time for the request in milliseconds"
    )
    ttft_ms: Optional[float] = Field(
        default=None, description="Time to first token in milliseconds"
    )
    tokens_generated: int = Field(default=0, description="Number of tokens generated")
    tokens_per_second: float = Field(default=0.0, description="Generation speed")
    prompt_tokens: int = Field(default=0, description="Number of prompt tokens")
    completion_tokens: int = Field(default=0, description="Number of completion tokens")
    total_tokens: int = Field(default=0, description="Total tokens used")


class ContextResult(BaseTestResult):
    """Result of a context test."""

    context_size: int = Field(default=0, description="Context size tested")
    max_context: Optional[int] = Field(default=None, description="Maximum context window size")
    memory_score: Optional[float] = Field(default=None, description="Memory retention score (0-1)")
    context_tokens_used: int = Field(default=0, description="Context tokens used")


class TestSummary(BaseModel):
    """Summary of a test run."""

    total_tests: int = Field(default=0, description="Total number of tests")
    passed: int = Field(default=0, description="Number of passed tests")
    failed: int = Field(default=0, description="Number of failed tests")
    errors: int = Field(default=0, description="Number of error tests")
    skipped: int = Field(default=0, description="Number of skipped tests")

    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        if self.total_tests == 0:
            return 0.0
        return self.passed / self.total_tests * 100


class TestReport(BaseModel):
    """Complete test report."""

    test_id: str = Field(description="Unique test identifier")
    test_type: TestType = Field(description="Type of test")
    start_time: datetime = Field(description="Test start time")
    end_time: Optional[datetime] = Field(default=None, description="Test end time")
    config: TestConfig = Field(description="Test configuration used")
    results: List[Dict[str, Any]] = Field(
        default_factory=list, description="Individual test results"
    )
    summary: TestSummary = Field(default_factory=TestSummary, description="Test summary")

    @property
    def duration_ms(self) -> Optional[float]:
        """Calculate total duration in milliseconds."""
        if self.end_time is None:
            return None
        return (self.end_time - self.start_time).total_seconds() * 1000
