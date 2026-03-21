# 🧪 LLM Tester

A comprehensive local tool for testing Large Language Model APIs. Test connectivity, measure performance, and validate context handling across multiple LLM providers.

## Features

- **🔌 Connectivity Testing** - Verify API keys, check model availability, measure latency
- **⚡ Performance Benchmarking** - Measure response time, TTFT (Time to First Token), tokens per second
- **🧠 Context Testing** - Test context window size and memory capabilities
- **🔄 Multi-Provider Support** - OpenAI, Claude, Gemini, DeepSeek, Ollama, and more
- **📊 Rich Reports** - JSON and Markdown report generation
- **🖥️ CLI Interface** - Beautiful command-line interface with progress indicators
- **🌐 Web UI** - Modern web-based interface with real-time progress and visualization

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/llm-tester.git
cd llm-tester

# Install with pip
pip install -e .

# Or install with development dependencies
pip install -e ".[dev]"
```

## Quick Start

### Option 1: Web UI (Recommended)

```bash
# Start the web interface
llm-tester-web

# Or use the startup script
./start-web.sh  # Linux/macOS
start-web.bat   # Windows
```

Then open http://localhost:5173 in your browser.

### Option 2: CLI

```bash
# Test connectivity
llm-tester test connectivity --all

# Test specific provider
llm-tester test connectivity --provider openai --model gpt-4

# Performance benchmark
llm-tester test performance --provider claude --iterations 5

# Context testing
llm-tester test context --provider openai --size 4096

# Run all tests
llm-tester test all
```

## Configuration

### Environment Variables

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Configuration File

Create `config/config.yaml`:

```yaml
providers:
  openai:
    api_key: "${OPENAI_API_KEY}"
    models:
      - gpt-4
      - gpt-3.5-turbo
  
  claude:
    api_key: "${ANTHROPIC_API_KEY}"
    models:
      - claude-3-opus-20240229
      - claude-3-sonnet-20240229
```

## CLI Commands

### Test Commands

```bash
# Connectivity tests
llm-tester test connectivity --provider openai
llm-tester test connectivity --all

# Performance tests
llm-tester test performance --provider claude --iterations 3
llm-tester test performance --model gpt-4 --max-tokens 200

# Context tests
llm-tester test context --provider openai --size 8192

# Run all tests
llm-tester test all
```

### Configuration Commands

```bash
# List current configuration
llm-tester config list

# Initialize config file
llm-tester config init

# Set provider API key
llm-tester config set openai --api-key sk-xxx
```

## Output Example

```
╭─────────────────────────────────────────────────────────────╮
│               Connectivity Test Results                      │
├────────────┬─────────────────┬──────────┬─────────┬─────────┤
│ Provider   │ Model           │ Status   │ Latency │ Details │
├────────────┼─────────────────┼──────────┼─────────┼─────────┤
│ openai     │ gpt-4           │ ✓ PASSED │ 523ms   │         │
│ openai     │ gpt-3.5-turbo   │ ✓ PASSED │ 312ms   │         │
│ claude     │ claude-3-opus   │ ✓ PASSED │ 891ms   │         │
│ claude     │ claude-3-sonnet │ ✓ PASSED │ 445ms   │         │
╰────────────┴─────────────────┴──────────┴─────────┴─────────╯

Summary: Total: 4 | Passed: 4 | Failed: 0 | Errors: 0
```

## Supported Providers

| Provider | Models | Authentication |
|----------|--------|----------------|
| OpenAI | GPT-4, GPT-4-turbo, GPT-3.5-turbo, GPT-4o | API Key |
| Claude | Claude 3 Opus, Sonnet, Haiku | API Key |
| Gemini | Gemini Pro, Gemini 1.5 | API Key |
| DeepSeek | DeepSeek Chat, DeepSeek Coder | API Key |
| Ollama | llama2, mistral, codellama (local) | None required |

## Development

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=llm_tester

# Type checking
mypy src/llm_tester

# Linting
ruff check src/llm_tester
```

## Project Structure

```
llm-tester/
├── src/llm_tester/
│   ├── cli.py              # CLI commands
│   ├── core/
│   │   ├── config.py       # Configuration management
│   │   ├── engine.py       # Test execution engine
│   │   └── models.py       # Data models
│   ├── providers/
│   │   ├── base.py         # Provider interface
│   │   ├── openai.py       # OpenAI provider
│   │   ├── claude.py       # Claude provider
│   │   └── ...
│   └── reports/
│       └── generator.py    # Report generation
├── config/
│   └── config.yaml         # Configuration template
├── tests/
│   └── ...
└── pyproject.toml
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.