# LLM Tester - 大模型测试本地程序

## 项目概述
一个本地运行的大语言模型测试工具，用于测试和评估各大模型 API 的连通性、性能和上下文能力。

## 核心功能需求

### 1. 连通性测试
- 测试各大模型 API 的连接状态
- 验证 API Key 有效性
- 检测网络连通性
- 支持代理配置

### 2. 上下文测试
- 测试模型的上下文窗口大小
- 测试多轮对话记忆能力
- 测试长文本处理能力
- 测试上下文压缩/遗忘行为

### 3. 性能基准测试
- **响应时间**: 完整请求响应时间
- **Token 速度**: 每秒生成 Token 数
- **首字延迟 (TTFT)**: Time To First Token
- **吞吐量测试**: 并发请求处理能力

### 4. 多模型支持
- **OpenAI**: GPT-4, GPT-4-turbo, GPT-3.5-turbo
- **Claude**: Claude-3 Opus, Sonnet, Haiku
- **Google Gemini**: Gemini Pro, Gemini Ultra
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder
- **Ollama**: 本地模型支持
- **其他**: 通义千问、文心一言等国内模型

### 5. 测试报告
- 生成结构化测试结果
- 支持 JSON/Markdown/HTML 报告导出
- 可视化图表展示
- 历史记录对比

## 技术要求

### 核心技术栈
- **语言**: Python 3.10+
- **CLI 框架**: Typer + Rich (命令行界面)
- **Web UI**: FastAPI + React/Vue (可选 Web 界面)
- **异步处理**: asyncio/aiohttp
- **数据存储**: SQLite (本地持久化)
- **配置管理**: Pydantic Settings

### 功能特性
- 支持配置多个 API Key
- 支持自定义测试用例
- 支持测试用例模板
- 支持定时测试任务
- 支持批量测试

### 用户界面
- **CLI 模式**: 命令行交互，适合 CI/CD 集成
- **Web 模式** (可选): 图形化界面，便于操作

## 项目结构

```
llm-tester/
├── src/
│   ├── llm_tester/
│   │   ├── __init__.py
│   │   ├── cli.py              # CLI 入口
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py       # 配置管理
│   │   │   ├── engine.py       # 测试引擎
│   │   │   └── models.py       # 数据模型
│   │   ├── providers/
│   │   │   ├── __init__.py
│   │   │   ├── base.py         # Provider 基类
│   │   │   ├── openai.py       # OpenAI Provider
│   │   │   ├── claude.py       # Claude Provider
│   │   │   ├── gemini.py       # Gemini Provider
│   │   │   ├── deepseek.py     # DeepSeek Provider
│   │   │   └── ollama.py       # Ollama Provider
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── connectivity.py # 连通性测试
│   │   │   ├── context.py     # 上下文测试
│   │   │   └── performance.py  # 性能测试
│   │   ├── reports/
│   │   │   ├── __init__.py
│   │   │   ├── generator.py    # 报告生成器
│   │   │   └── templates/      # 报告模板
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── helpers.py
│   └── tests/                  # 单元测试
├── config/
│   ├── config.yaml             # 配置文件模板
│   └── test_cases/             # 测试用例目录
├── docs/
│   ├── README.md
│   └── USAGE.md
├── pyproject.toml
├── requirements.txt
└── README.md
```

## 配置示例

```yaml
# config.yaml
providers:
  openai:
    api_key: "${OPENAI_API_KEY}"
    base_url: "https://api.openai.com/v1"
    models:
      - gpt-4
      - gpt-4-turbo
      - gpt-3.5-turbo
  
  claude:
    api_key: "${ANTHROPIC_API_KEY}"
    base_url: "https://api.anthropic.com"
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
      - deepseek-coder
  
  ollama:
    base_url: "http://localhost:11434"
    models:
      - llama2
      - mistral

test_settings:
  timeout: 60
  max_retries: 3
  proxy: null

reporting:
  output_dir: "./reports"
  format: ["json", "markdown"]
```

## CLI 命令设计

```bash
# 连通性测试
llm-tester test connectivity --provider openai --model gpt-4

# 性能测试
llm-tester test performance --provider claude --model claude-3-opus

# 上下文测试
llm-tester test context --provider all --context-size 4096

# 批量测试
llm-tester test all --config config.yaml

# 生成报告
llm-tester report generate --format html --output ./reports

# 配置管理
llm-tester config set openai.api_key sk-xxx
llm-tester config list
```

## 验收标准

1. **功能完整性**
   - 所有核心功能正常运行
   - 支持至少 5 个主流模型提供商
   - CLI 命令完整可用

2. **性能要求**
   - 单次测试响应时间 < 30s
   - 支持并发测试多个模型
   - 内存占用 < 500MB

3. **可维护性**
   - 代码测试覆盖率 > 80%
   - 完整的类型注解
   - 清晰的文档说明

4. **用户体验**
   - 清晰的命令行输出
   - 有意义的错误提示
   - 支持配置文件和命令行参数

## 开发优先级

### P0 (核心功能)
- 配置管理
- Provider 基类和 OpenAI/Claude 支持
- 连通性测试
- 基础报告生成

### P1 (重要功能)
- 性能基准测试
- 上下文测试
- 更多 Provider 支持 (Gemini, DeepSeek, Ollama)
- JSON/Markdown 报告

### P2 (增强功能)
- Web UI 界面
- HTML 报告
- 定时测试任务
- 历史记录对比

## 时间估算
- P0 功能: 2-3 天
- P1 功能: 2-3 天
- P2 功能: 2-3 天
- 总计: 6-9 天