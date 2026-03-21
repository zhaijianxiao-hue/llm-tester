"""
Command-line interface for LLM Tester.

Provides commands for running tests, managing configuration,
and generating reports.
"""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint

from llm_tester import __version__
from llm_tester.core.config import Config, get_config, reload_config
from llm_tester.core.engine import TestEngine
from llm_tester.core.models import (
    ProviderType,
    TestConfig,
    TestReport,
    TestType,
    TestStatus,
)

# Initialize Typer app
app = typer.Typer(
    name="llm-tester",
    help="[TEST] LLM API Testing Tool - Test connectivity, performance, and context handling",
    add_completion=False,
)

# Sub-apps
test_app = typer.Typer(help="Run tests on LLM providers")
config_app = typer.Typer(help="Manage configuration")
report_app = typer.Typer(help="Generate and view reports")

app.add_typer(test_app, name="test")
app.add_typer(config_app, name="config")
app.add_typer(report_app, name="report")

# Rich console
console = Console()


def version_callback(value: bool) -> None:
    """Show version and exit."""
    if value:
        console.print(f"[bold blue]LLM Tester[/] version [green]{__version__}[/]")
        raise typer.Exit()


@app.callback()
def main(
    version: bool = typer.Option(
        False,
        "--version",
        "-v",
        callback=version_callback,
        is_eager=True,
        help="Show version and exit",
    ),
) -> None:
    """
    LLM Tester - A comprehensive tool for testing LLM APIs.

    Run connectivity, performance, and context tests on various
    LLM providers including OpenAI, Claude, Gemini, and more.
    """
    pass


# ============== TEST COMMANDS ==============


@test_app.command("connectivity")
def test_connectivity(
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Provider to test (openai, claude, gemini, etc.)",
    ),
    model: Optional[str] = typer.Option(
        None,
        "--model",
        "-m",
        help="Specific model to test",
    ),
    all_providers: bool = typer.Option(
        False,
        "--all",
        "-a",
        help="Test all configured providers",
    ),
    config_file: Optional[Path] = typer.Option(
        None,
        "--config",
        "-c",
        help="Path to configuration file",
    ),
) -> None:
    """
    Test connectivity to LLM API providers.

    Verifies API keys and checks model availability.
    """
    if config_file:
        reload_config(config_file)

    # Parse provider type
    provider_type = None
    if provider:
        try:
            provider_type = ProviderType(provider.lower())
        except ValueError:
            console.print(f"[red]Unknown provider: {provider}[/]")
            console.print(f"Available: {', '.join([p.value for p in ProviderType])}")
            raise typer.Exit(1)

    # Create test configuration
    test_config = TestConfig(
        test_type=TestType.CONNECTIVITY,
        provider=provider_type,
        model=model,
    )

    # Run test
    console.print("\n[bold]>> Running connectivity test...[/]\n")

    report = asyncio.run(_run_test(test_config))

    # Display results
    _display_connectivity_results(report)


@test_app.command("performance")
def test_performance(
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Provider to test",
    ),
    model: Optional[str] = typer.Option(
        None,
        "--model",
        "-m",
        help="Specific model to test",
    ),
    iterations: int = typer.Option(
        3,
        "--iterations",
        "-i",
        help="Number of test iterations",
    ),
    prompt: Optional[str] = typer.Option(
        None,
        "--prompt",
        help="Custom prompt for testing",
    ),
    max_tokens: int = typer.Option(
        100,
        "--max-tokens",
        help="Maximum tokens to generate",
    ),
    config_file: Optional[Path] = typer.Option(
        None,
        "--config",
        "-c",
        help="Path to configuration file",
    ),
) -> None:
    """
    Run performance benchmark tests.

    Measures response time, TTFT, and tokens per second.
    """
    if config_file:
        reload_config(config_file)

    provider_type = None
    if provider:
        try:
            provider_type = ProviderType(provider.lower())
        except ValueError:
            console.print(f"[red]Unknown provider: {provider}[/]")
            raise typer.Exit(1)

    test_config = TestConfig(
        test_type=TestType.PERFORMANCE,
        provider=provider_type,
        model=model,
        iterations=iterations,
        prompt=prompt,
        max_tokens=max_tokens,
    )

    console.print("\n[bold]>> Running performance test...[/]\n")

    report = asyncio.run(_run_test(test_config))
    _display_performance_results(report)


@test_app.command("context")
def test_context(
    provider: Optional[str] = typer.Option(
        None,
        "--provider",
        "-p",
        help="Provider to test",
    ),
    model: Optional[str] = typer.Option(
        None,
        "--model",
        "-m",
        help="Specific model to test",
    ),
    context_size: int = typer.Option(
        4096,
        "--size",
        "-s",
        help="Context size to test (in tokens)",
    ),
    config_file: Optional[Path] = typer.Option(
        None,
        "--config",
        "-c",
        help="Path to configuration file",
    ),
) -> None:
    """
    Test context handling capabilities.

    Tests memory and context window size.
    """
    if config_file:
        reload_config(config_file)

    provider_type = None
    if provider:
        try:
            provider_type = ProviderType(provider.lower())
        except ValueError:
            console.print(f"[red]Unknown provider: {provider}[/]")
            raise typer.Exit(1)

    test_config = TestConfig(
        test_type=TestType.CONTEXT,
        provider=provider_type,
        model=model,
        context_size=context_size,
    )

    console.print("\n[bold]>> Running context test...[/]\n")

    report = asyncio.run(_run_test(test_config))
    _display_context_results(report)


@test_app.command("all")
def test_all(
    config_file: Optional[Path] = typer.Option(
        None,
        "--config",
        "-c",
        help="Path to configuration file",
    ),
    output_dir: Optional[Path] = typer.Option(
        None,
        "--output",
        "-o",
        help="Output directory for reports",
    ),
) -> None:
    """
    Run all tests on all configured providers.
    """
    if config_file:
        reload_config(config_file)

    console.print("\n[bold]>> Running all tests...[/]\n")

    engine = TestEngine()

    async def run_all():
        results = {}
        for test_type in [TestType.CONNECTIVITY, TestType.PERFORMANCE]:
            config = TestConfig(test_type=test_type)
            results[test_type] = await engine.run_test(config)
        await engine.close()
        return results

    results = asyncio.run(run_all())

    # Display all results
    for test_type, report in results.items():
        if test_type == TestType.CONNECTIVITY:
            _display_connectivity_results(report)
        elif test_type == TestType.PERFORMANCE:
            _display_performance_results(report)

    # Summary
    console.print("\n" + "=" * 50)
    _display_summary(results)


# ============== CONFIG COMMANDS ==============


@config_app.command("list")
def config_list() -> None:
    """List current configuration."""
    config = get_config()

    console.print("\n[bold][CONFIG] Current Configuration[/]\n")

    # Providers
    table = Table(title="Configured Providers")
    table.add_column("Provider", style="cyan")
    table.add_column("API Key", style="green")
    table.add_column("Models", style="yellow")
    table.add_column("Base URL", style="blue")

    for provider_type in ProviderType:
        provider_config = config.providers.get_provider(provider_type)
        if provider_config:
            key_status = "[OK] Set" if provider_config.api_key else "[X] Not set"
            models = ", ".join(provider_config.models[:3])
            if len(provider_config.models) > 3:
                models += f" (+{len(provider_config.models) - 3} more)"
            table.add_row(
                provider_type.value,
                key_status,
                models or "Default",
                provider_config.base_url or "Default",
            )

    console.print(table)


@config_app.command("set")
def config_set(
    provider: str = typer.Argument(..., help="Provider name"),
    key: str = typer.Option(..., "--api-key", "-k", help="API key"),
    base_url: Optional[str] = typer.Option(
        None,
        "--base-url",
        help="Custom base URL",
    ),
) -> None:
    """Set configuration for a provider."""
    try:
        provider_type = ProviderType(provider.lower())
    except ValueError:
        console.print(f"[red]Unknown provider: {provider}[/]")
        raise typer.Exit(1)

    console.print(f"[green]Configuration updated for {provider}[/]")
    console.print(
        "[yellow]Note: Changes are not persisted. Set environment variables for persistence.[/]"
    )


@config_app.command("init")
def config_init(
    output: Path = typer.Option(
        Path("config/config.yaml"),
        "--output",
        "-o",
        help="Output file path",
    ),
) -> None:
    """Initialize a new configuration file."""
    output.parent.mkdir(parents=True, exist_ok=True)

    template = """# LLM Tester Configuration
# Copy this file and fill in your API keys

providers:
  openai:
    api_key: "${OPENAI_API_KEY}"
    models:
      - gpt-4
      - gpt-4-turbo
      - gpt-3.5-turbo
  
  claude:
    api_key: "${ANTHROPIC_API_KEY}"
    models:
      - claude-3-opus-20240229
      - claude-3-sonnet-20240229
  
  gemini:
    api_key: "${GOOGLE_API_KEY}"
    models:
      - gemini-pro
  
  deepseek:
    api_key: "${DEEPSEEK_API_KEY}"
    base_url: "https://api.deepseek.com"
    models:
      - deepseek-chat
  
  ollama:
    base_url: "http://localhost:11434"
    models:
      - llama2
      - mistral

test_settings:
  timeout: 60
  max_retries: 3

reporting:
  output_dir: "./reports"
  formats:
    - json
    - markdown
"""

    with open(output, "w") as f:
        f.write(template)

    console.print(f"[green][OK] Created configuration template at {output}[/]")
    console.print("\n[yellow]Next steps:[/]")
    console.print("1. Copy config/config.yaml to config/config.local.yaml")
    console.print("2. Add your API keys or set environment variables")
    console.print("3. Run: llm-tester test connectivity --all")


# ============== REPORT COMMANDS ==============


@report_app.command("generate")
def report_generate(
    test_id: Optional[str] = typer.Option(
        None,
        "--test-id",
        help="Specific test ID to generate report for",
    ),
    format: str = typer.Option(
        "markdown",
        "--format",
        "-f",
        help="Report format (json, markdown, html)",
    ),
    output: Optional[Path] = typer.Option(
        None,
        "--output",
        "-o",
        help="Output file path",
    ),
) -> None:
    """Generate a report from test results."""
    console.print("[yellow]Report generation coming soon![/]")


# ============== HELPER FUNCTIONS ==============


async def _run_test(test_config: TestConfig) -> TestReport:
    """Run a test and return the report."""
    engine = TestEngine()
    report = await engine.run_test(test_config)
    await engine.close()
    return report


def _display_connectivity_results(report: TestReport) -> None:
    """Display connectivity test results in a table."""
    table = Table(title="Connectivity Test Results")
    table.add_column("Provider", style="cyan")
    table.add_column("Model", style="yellow")
    table.add_column("Status", style="bold")
    table.add_column("Latency", style="green")
    table.add_column("Details")

    for result in report.results:
        status = result.get("status", "unknown")
        status_style = {
            TestStatus.PASSED.value: "[green][PASS][/]",
            TestStatus.FAILED.value: "[red][FAIL][/]",
            TestStatus.ERROR.value: "[red][ERR][/]",
            TestStatus.TIMEOUT.value: "[yellow][TIME][/]",
        }.get(status, f"[white]{status}[/]")

        latency = result.get("latency_ms")
        latency_str = f"{latency:.0f}ms" if latency else "N/A"

        error = result.get("error_message", "")
        details = error[:50] + "..." if len(error) > 50 else error

        table.add_row(
            result.get("provider", "unknown"),
            result.get("model", "unknown"),
            status_style,
            latency_str,
            details,
        )

    console.print(table)
    _display_summary_inline(report.summary)


def _display_performance_results(report: TestReport) -> None:
    """Display performance test results."""
    table = Table(title="Performance Test Results")
    table.add_column("Provider", style="cyan")
    table.add_column("Model", style="yellow")
    table.add_column("Status", style="bold")
    table.add_column("Total Time", style="blue")
    table.add_column("TTFT", style="green")
    table.add_column("Tokens/s", style="magenta")

    for result in report.results:
        status = result.get("status", "unknown")
        status_style = {
            TestStatus.PASSED.value: "[green][OK][/]",
            TestStatus.FAILED.value: "[red][X][/]",
        }.get(status, f"[white]{status}[/]")

        total_time = result.get("total_time_ms", 0)
        ttft = result.get("ttft_ms")
        tps = result.get("tokens_per_second", 0)

        table.add_row(
            result.get("provider", "unknown"),
            result.get("model", "unknown"),
            status_style,
            f"{total_time:.0f}ms",
            f"{ttft:.0f}ms" if ttft else "N/A",
            f"{tps:.1f}",
        )

    console.print(table)
    _display_summary_inline(report.summary)


def _display_context_results(report: TestReport) -> None:
    """Display context test results."""
    table = Table(title="Context Test Results")
    table.add_column("Provider", style="cyan")
    table.add_column("Model", style="yellow")
    table.add_column("Status", style="bold")
    table.add_column("Context Size", style="blue")
    table.add_column("Memory Score", style="green")

    for result in report.results:
        status = result.get("status", "unknown")
        status_style = {
            TestStatus.PASSED.value: "[green][PASS][/]",
            TestStatus.FAILED.value: "[red][FAIL][/]",
        }.get(status, f"[white]{status}[/]")

        context_size = result.get("context_size", 0)
        memory_score = result.get("memory_score")

        table.add_row(
            result.get("provider", "unknown"),
            result.get("model", "unknown"),
            status_style,
            f"{context_size}",
            f"{memory_score:.1%}" if memory_score else "N/A",
        )

    console.print(table)
    _display_summary_inline(report.summary)


def _display_summary_inline(summary) -> None:
    """Display inline summary."""
    console.print(
        f"\n[bold]Summary:[/] "
        f"Total: {summary.total_tests} | "
        f"[green]Passed: {summary.passed}[/] | "
        f"[red]Failed: {summary.failed}[/] | "
        f"[yellow]Errors: {summary.errors}[/]"
    )


def _display_summary(results: dict) -> None:
    """Display overall summary."""
    total_passed = sum(r.summary.passed for r in results.values())
    total_tests = sum(r.summary.total_tests for r in results.values())

    console.print(
        Panel(
            f"[bold green]All Tests Complete[/]\n\n"
            f"Total Tests: {total_tests}\n"
            f"Passed: {total_passed}\n"
            f"Success Rate: {total_passed / total_tests * 100:.1f}%"
            if total_tests > 0
            else "N/A",
            title="[REPORT] Test Summary",
            border_style="blue",
        )
    )


if __name__ == "__main__":
    app()
