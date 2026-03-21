# 🧪 LLM Tester

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/zhaijianxiao-hue/llm-tester)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10%2B-brightgreen.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-18-blue.svg)](https://react.dev/)

A powerful local tool for testing and benchmarking LLM APIs. Test connectivity, measure performance, and chat with multiple providers through a beautiful Web UI or CLI.

![LLM Tester Screenshot](docs/screenshot.png)

## ✨ Features

- 🖥️ **Modern Web UI** - Sci-fi themed interface with real-time streaming chat
- 💬 **Multi-turn Chat** - Session management with SQLite persistence
- 🔌 **Multi-Provider** - OpenAI, Claude, Gemini, DeepSeek, Ollama, and custom endpoints
- ⚡ **Performance Metrics** - Latency, TTFT, TPOT, tokens/second
- 📊 **Rich Reports** - JSON and Markdown exports
- 🔒 **Local First** - All data stays on your machine

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+ (for Web UI)

### Installation

```bash
# Clone the repository
git clone https://github.com/zhaijianxiao-hue/llm-tester.git
cd llm-tester

# Create virtual environment (recommended)
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/macOS

# Install dependencies
pip install -e .

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Run Web UI

```bash
# Windows
start-web.bat

# Linux/macOS
./start-web.sh
```

Open http://localhost:5173 in your browser.

## ⚙️ Configuration

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
DEEPSEEK_API_KEY=sk-xxx
GOOGLE_API_KEY=xxx
```

Or configure providers in `config/config.yaml`:

```yaml
providers:
  openai:
    api_key: "${OPENAI_API_KEY}"
    models:
      - gpt-4
      - gpt-4o
      - gpt-3.5-turbo

  ollama:
    base_url: http://localhost:11434
    models:
      - llama2
      - mistral

  custom-openai:
    api_key: "${CUSTOM_API_KEY}"
    base_url: https://your-api.com/v1
    models:
      - your-model
```

## 📖 Usage

### Web UI

| Page | Description |
|------|-------------|
| Dashboard | Overview of all providers and test status |
| Chat | Multi-turn conversation with streaming |
| Connectivity | Test API keys and model availability |
| Performance | Benchmark response times and throughput |
| Context | Test context window handling |
| Config | Manage provider settings |
| Reports | View and export test reports |

### CLI

```bash
# Test connectivity
llm-tester test connectivity --all

# Performance benchmark
llm-tester test performance --provider openai --iterations 5

# Context testing
llm-tester test context --provider claude --size 4096
```

## 📊 Metrics Explained

| Metric | Description |
|--------|-------------|
| Latency | Total request time (ms) |
| TTFT | Time to First Token (ms) |
| TPOT | Time per Output Token (ms) |
| Tokens/s | Generation speed |

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | Python, FastAPI, Uvicorn |
| Database | SQLite |
| LLM SDK | OpenAI SDK (compatible with multiple providers) |

## 📁 Project Structure

```
llm-tester/
├── src/llm_tester/        # Python backend
│   ├── core/              # Config, engine, models
│   ├── providers/         # LLM provider implementations
│   └── web/               # FastAPI web app
├── frontend/              # React frontend
│   └── src/
│       ├── pages/         # Page components
│       ├── components/    # UI components
│       └── lib/           # API client, utilities
├── config/                # Configuration files
└── tests/                 # Test suite
```

## 🤝 Supported Providers

| Provider | Status | Notes |
|----------|--------|-------|
| OpenAI | ✅ | GPT-4, GPT-4o, GPT-3.5 |
| Claude | ✅ | Claude 3 Opus/Sonnet/Haiku |
| Gemini | ✅ | Gemini Pro, Gemini 1.5 |
| DeepSeek | ✅ | DeepSeek Chat, Coder |
| Ollama | ✅ | Local models |
| Custom | ✅ | Any OpenAI-compatible API |

## 🔧 Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy src/llm_tester

# Linting
ruff check src/llm_tester

# Frontend dev
cd frontend && npm run dev
```

## 📝 License

[MIT](LICENSE)

## 🙏 Acknowledgments

Built with [FastAPI](https://fastapi.tiangolo.com/), [React](https://react.dev/), and [Tailwind CSS](https://tailwindcss.com/).