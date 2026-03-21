"""
Tests for data models.
"""

import pytest
from datetime import datetime

from llm_tester.core.models import (
    ProviderType,
    TestType,
    TestStatus,
    ProviderConfig,
    TestConfig,
    ConnectivityResult,
    PerformanceResult,
    ContextResult,
    TestSummary,
    TestReport,
)


class TestEnums:
    """Tests for enum types."""

    def test_provider_type_values(self):
        """Test ProviderType enum values."""
        assert ProviderType.OPENAI.value == "openai"
        assert ProviderType.CLAUDE.value == "claude"
        assert ProviderType.GEMINI.value == "gemini"
        assert ProviderType.DEEPSEEK.value == "deepseek"
        assert ProviderType.OLLAMA.value == "ollama"

    def test_test_type_values(self):
        """Test TestType enum values."""
        assert TestType.CONNECTIVITY.value == "connectivity"
        assert TestType.PERFORMANCE.value == "performance"
        assert TestType.CONTEXT.value == "context"

    def test_test_status_values(self):
        """Test TestStatus enum values."""
        assert TestStatus.PASSED.value == "passed"
        assert TestStatus.FAILED.value == "failed"
        assert TestStatus.ERROR.value == "error"
        assert TestStatus.TIMEOUT.value == "timeout"


class TestResults:
    """Tests for result models."""

    def test_connectivity_result(self):
        """Test ConnectivityResult model."""
        result = ConnectivityResult(
            provider=ProviderType.OPENAI,
            model="gpt-4",
            status=TestStatus.PASSED,
            latency_ms=500.0,
            is_valid_key=True,
            model_available=True,
        )

        assert result.provider == ProviderType.OPENAI
        assert result.model == "gpt-4"
        assert result.status == TestStatus.PASSED
        assert result.latency_ms == 500.0
        assert result.is_valid_key is True
        assert result.model_available is True
        assert isinstance(result.timestamp, datetime)

    def test_performance_result(self):
        """Test PerformanceResult model."""
        result = PerformanceResult(
            provider=ProviderType.CLAUDE,
            model="claude-3-opus",
            status=TestStatus.PASSED,
            total_time_ms=1500.0,
            ttft_ms=300.0,
            tokens_generated=100,
            tokens_per_second=66.67,
            prompt_tokens=50,
            completion_tokens=100,
            total_tokens=150,
        )

        assert result.provider == ProviderType.CLAUDE
        assert result.total_time_ms == 1500.0
        assert result.ttft_ms == 300.0
        assert result.tokens_per_second == 66.67

    def test_context_result(self):
        """Test ContextResult model."""
        result = ContextResult(
            provider=ProviderType.OPENAI,
            model="gpt-4-turbo",
            status=TestStatus.PASSED,
            context_size=8192,
            max_context=128000,
            memory_score=0.95,
        )

        assert result.context_size == 8192
        assert result.max_context == 128000
        assert result.memory_score == 0.95


class TestSummaryModel:
    """Tests for TestSummary model."""

    def test_success_rate(self):
        """Test success rate calculation."""
        summary = TestSummary(
            total_tests=10,
            passed=8,
            failed=2,
            errors=0,
            skipped=0,
        )

        assert summary.success_rate == 80.0

    def test_success_rate_zero_tests(self):
        """Test success rate with zero tests."""
        summary = TestSummary()

        assert summary.success_rate == 0.0


class TestReportModel:
    """Tests for TestReport model."""

    def test_report_creation(self):
        """Test creating a test report."""
        config = TestConfig(
            test_type=TestType.CONNECTIVITY,
            provider=ProviderType.OPENAI,
        )

        report = TestReport(
            test_id="test-123",
            test_type=TestType.CONNECTIVITY,
            start_time=datetime.now(),
            config=config,
            results=[],
            summary=TestSummary(),
        )

        assert report.test_id == "test-123"
        assert report.test_type == TestType.CONNECTIVITY
        assert report.duration_ms is None  # No end time yet

    def test_report_duration(self):
        """Test report duration calculation."""
        start = datetime(2024, 1, 1, 12, 0, 0)
        end = datetime(2024, 1, 1, 12, 0, 1, 500000)  # 1.5 seconds later

        config = TestConfig(test_type=TestType.PERFORMANCE)

        report = TestReport(
            test_id="test-123",
            test_type=TestType.PERFORMANCE,
            start_time=start,
            end_time=end,
            config=config,
            results=[],
            summary=TestSummary(),
        )

        assert report.duration_ms == 1500.0
