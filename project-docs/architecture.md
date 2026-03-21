# LLM Tester - 技术架构文档

> **版本**: 1.0
> **日期**: 2026-03-21
> **架构师**: AgentsOrchestrator

---

## 1. 系统架构概览

### 1.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Layer (Typer)                        │
│  llm-tester test | config | report                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                      Core Engine Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Config    │  │   Engine    │  │      Results           │  │
│  │  Manager    │  │  (async)    │  │    Aggregator          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                      Test Modules Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │Connectivity │  │ Performance │  │      Context           │  │
│  │   Tester    │  │   Tester    │  │      Tester            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                      Provider Layer                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐  │
│  │ OpenAI  │ │ Claude  │ │ Gemini  │ │ DeepSeek │ │ Ollama  │  │
│  │Provider │ │Provider │ │Provider │ │ Provider │ │Provider │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬─────┘ └────┬────┘  │
│       │           │           │           │            │        │
│       └───────────┴───────────┴───────────┴────────────┘        │
│                           │                                      │
│                    BaseProvider                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                      Report Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Generator  │  │ Visualizer  │  │    Templates           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  (JSON/Markdown/HTML)                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

1. **异步优先**: 所有 I/O 操作使用 async/await
2. **Provider 抽象**: 统一接口，易于扩展新 Provider
3. **配置分离**: 敏感信息通过环境变量管理
4. **结果持久化**: SQLite 存储历史测试结果
5. **可测试性**: 每层可独立测试

---

## 2. 数据模型设计

### 2.1 核心模型 (`core/models.py`)

```python
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ProviderType(str, Enum):
    OPENAI = "openai"
    CLAUDE = "claude"
    GEMINI = "gemini"
    DEEPSEEK = "deepseek"
    OLLAMA = "ollama"

class TestType(str, Enum):
    CONNECTIVITY = "connectivity"
    PERFORMANCE = "performance"
    CONTEXT = "context"

class TestStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    ERROR = "error"

class ProviderConfig(BaseModel):
    """单个 Provider 的配置"""
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    models: List[str] = Field(default_factory=list)
    timeout: int = 60
    max_retries: int = 3
    proxy: Optional[str] = None

class TestConfig(BaseModel):
    """测试配置"""
    test_type: TestType
    provider: Optional[ProviderType] = None
    model: Optional[str] = None
    timeout: int = 60
    iterations: int = 1
    warmup: int = 0
    
class ConnectivityResult(BaseModel):
    """连通性测试结果"""
    provider: ProviderType
    model: str
    status: TestStatus
    latency_ms: Optional[float] = None
    error_message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class PerformanceResult(BaseModel):
    """性能测试结果"""
    provider: ProviderType
    model: str
    status: TestStatus
    total_time_ms: float
    ttft_ms: Optional[float] = None  # Time to First Token
    tokens_generated: int
    tokens_per_second: float
    prompt_tokens: int
    completion_tokens: int
    error_message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ContextResult(BaseModel):
    """上下文测试结果"""
    provider: ProviderType
    model: str
    status: TestStatus
    context_size: int
    max_context: Optional[int] = None
    memory_score: Optional[float] = None
    error_message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class TestReport(BaseModel):
    """测试报告"""
    test_id: str
    test_type: TestType
    start_time: datetime
    end_time: Optional[datetime] = None
    results: List[Dict[str, Any]]
    summary: Dict[str, Any]
```

### 2.2 配置模型 (`core/config.py`)

```python
from pathlib import Path
from typing import Dict, Optional
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

class AppConfig(BaseSettings):
    """应用配置 (支持环境变量)"""
    
    # 配置文件路径
    config_path: Path = Field(default=Path("config/config.yaml"))
    
    # 报告输出目录
    output_dir: Path = Field(default=Path("./reports"))
    
    # 默认超时
    default_timeout: int = 60
    
    # 日志级别
    log_level: str = "INFO"
    
    class Config:
        env_prefix = "LLM_TESTER_"
        env_file = ".env"

class ProvidersConfig(BaseModel):
    """所有 Provider 配置"""
    openai: Optional[ProviderConfig] = None
    claude: Optional[ProviderConfig] = None
    gemini: Optional[ProviderConfig] = None
    deepseek: Optional[ProviderConfig] = None
    ollama: Optional[ProviderConfig] = None

class Config(BaseModel):
    """完整配置"""
    providers: ProvidersConfig
    test_settings: Dict[str, Any] = Field(default_factory=dict)
    reporting: Dict[str, Any] = Field(default_factory=dict)
```

---

## 3. Provider 抽象层设计

### 3.1 基类接口 (`providers/base.py`)

```python
from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional, List
from ..core.models import ProviderConfig, ConnectivityResult, PerformanceResult, ContextResult

class BaseProvider(ABC):
    """LLM Provider 基类"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self._client = None
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider 名称"""
        pass
    
    @property
    @abstractmethod
    def provider_type(self) -> ProviderType:
        """Provider 类型"""
        pass
    
    @abstractmethod
    async def initialize(self) -> None:
        """初始化 Provider 客户端"""
        pass
    
    @abstractmethod
    async def test_connectivity(self, model: str) -> ConnectivityResult:
        """测试连通性"""
        pass
    
    @abstractmethod
    async def test_performance(
        self, 
        model: str, 
        prompt: str,
        max_tokens: int = 100
    ) -> PerformanceResult:
        """测试性能"""
        pass
    
    @abstractmethod
    async def test_context(
        self,
        model: str,
        context_size: int
    ) -> ContextResult:
        """测试上下文能力"""
        pass
    
    @abstractmethod
    async def list_models(self) -> List[str]:
        """获取可用模型列表"""
        pass
    
    @abstractmethod
    async def close(self) -> None:
        """关闭连接"""
        pass
    
    async def __aenter__(self):
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
```

### 3.2 Provider 实现示例 (`providers/openai.py`)

```python
import time
from typing import List, Optional
import httpx
from .base import BaseProvider
from ..core.models import (
    ProviderConfig, ProviderType,
    ConnectivityResult, PerformanceResult, ContextResult,
    TestStatus
)

class OpenAIProvider(BaseProvider):
    """OpenAI Provider 实现"""
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.base_url = config.base_url or "https://api.openai.com/v1"
    
    @property
    def name(self) -> str:
        return "OpenAI"
    
    @property
    def provider_type(self) -> ProviderType:
        return ProviderType.OPENAI
    
    async def initialize(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json"
            },
            timeout=self.config.timeout
        )
    
    async def test_connectivity(self, model: str) -> ConnectivityResult:
        start_time = time.time()
        try:
            response = await self._client.post(
                "/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Hello"}],
                    "max_tokens": 5
                }
            )
            latency = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                return ConnectivityResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.PASSED,
                    latency_ms=latency
                )
            else:
                return ConnectivityResult(
                    provider=self.provider_type,
                    model=model,
                    status=TestStatus.FAILED,
                    latency_ms=latency,
                    error_message=f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            return ConnectivityResult(
                provider=self.provider_type,
                model=model,
                status=TestStatus.ERROR,
                error_message=str(e)
            )
    
    async def test_performance(
        self, 
        model: str, 
        prompt: str,
        max_tokens: int = 100
    ) -> PerformanceResult:
        # 实现性能测试...
        pass
    
    async def test_context(self, model: str, context_size: int) -> ContextResult:
        # 实现上下文测试...
        pass
    
    async def list_models(self) -> List[str]:
        return self.config.models
    
    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
```

---

## 4. 测试引擎设计

### 4.1 引擎核心 (`core/engine.py`)

```python
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
from .config import Config
from .models import TestConfig, TestReport, TestType, TestStatus
from ..providers.base import BaseProvider

class TestEngine:
    """测试执行引擎"""
    
    def __init__(self, config: Config):
        self.config = config
        self._providers: Dict[str, BaseProvider] = {}
    
    async def initialize_providers(self) -> None:
        """初始化所有配置的 Provider"""
        # 初始化逻辑...
        pass
    
    async def run_test(self, test_config: TestConfig) -> TestReport:
        """执行单个测试"""
        test_id = str(uuid.uuid4())
        start_time = datetime.now()
        
        results = []
        
        if test_config.test_type == TestType.CONNECTIVITY:
            results = await self._run_connectivity_test(test_config)
        elif test_config.test_type == TestType.PERFORMANCE:
            results = await self._run_performance_test(test_config)
        elif test_config.test_type == TestType.CONTEXT:
            results = await self._run_context_test(test_config)
        
        end_time = datetime.now()
        
        return TestReport(
            test_id=test_id,
            test_type=test_config.test_type,
            start_time=start_time,
            end_time=end_time,
            results=results,
            summary=self._generate_summary(results)
        )
    
    async def run_batch_tests(
        self, 
        test_configs: List[TestConfig]
    ) -> List[TestReport]:
        """批量执行测试"""
        tasks = [self.run_test(config) for config in test_configs]
        return await asyncio.gather(*tasks)
    
    def _generate_summary(self, results: List[Dict]) -> Dict[str, Any]:
        """生成测试摘要"""
        # 摘要生成逻辑...
        pass
```

---

## 5. CLI 设计

### 5.1 命令结构 (`cli.py`)

```python
import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer(name="llm-tester", help="LLM API Testing Tool")
test_app = typer.Typer(help="Run tests")
config_app = typer.Typer(help="Manage configuration")
report_app = typer.Typer(help="Generate reports")

app.add_typer(test_app, name="test")
app.add_typer(config_app, name="config")
app.add_typer(report_app, name="report")

console = Console()

@test_app.command("connectivity")
def test_connectivity(
    provider: str = typer.Option(None, "--provider", "-p", help="Provider name"),
    model: str = typer.Option(None, "--model", "-m", help="Model name"),
    all_providers: bool = typer.Option(False, "--all", "-a", help="Test all providers")
):
    """Run connectivity test"""
    # 实现连通性测试...
    pass

@test_app.command("performance")
def test_performance(
    provider: str = typer.Option(None, "--provider", "-p"),
    model: str = typer.Option(None, "--model", "-m"),
    iterations: int = typer.Option(3, "--iterations", "-i")
):
    """Run performance test"""
    # 实现性能测试...
    pass

@test_app.command("context")
def test_context(
    provider: str = typer.Option(None, "--provider", "-p"),
    context_size: int = typer.Option(4096, "--size", "-s")
):
    """Run context test"""
    # 实现上下文测试...
    pass

@test_app.command("all")
def test_all(
    config_file: str = typer.Option("config/config.yaml", "--config", "-c")
):
    """Run all tests"""
    # 实现全量测试...
    pass

if __name__ == "__main__":
    app()
```

---

## 6. 项目文件结构

```
llm-tester/
├── pyproject.toml              # 项目配置
├── requirements.txt            # 依赖列表
├── README.md                   # 项目说明
├── config/
│   ├── config.yaml            # 配置模板
│   └── test_cases/             # 测试用例目录
│       └── default.json
├── src/
│   └── llm_tester/
│       ├── __init__.py
│       ├── cli.py              # CLI 入口
│       ├── core/
│       │   ├── __init__.py
│       │   ├── config.py       # 配置管理
│       │   ├── engine.py       # 测试引擎
│       │   ├── models.py       # 数据模型
│       │   └── results.py      # 结果处理
│       ├── providers/
│       │   ├── __init__.py
│       │   ├── base.py         # Provider 基类
│       │   ├── openai.py       # OpenAI
│       │   ├── claude.py       # Claude
│       │   ├── gemini.py       # Gemini
│       │   ├── deepseek.py     # DeepSeek
│       │   └── ollama.py       # Ollama
│       ├── tests/
│       │   ├── __init__.py
│       │   ├── connectivity.py # 连通性测试
│       │   ├── performance.py  # 性能测试
│       │   └── context.py      # 上下文测试
│       ├── reports/
│       │   ├── __init__.py
│       │   ├── generator.py    # 报告生成
│       │   ├── visualizer.py   # 可视化
│       │   └── templates/
│       │       ├── report.html
│       │       └── report.md
│       └── utils/
│           ├── __init__.py
│           └── helpers.py
├── tests/                      # 单元测试
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_config.py
│   ├── test_engine.py
│   ├── providers/
│   │   ├── test_openai.py
│   │   ├── test_claude.py
│   │   └── ...
│   └── tests/
│       ├── test_connectivity.py
│       ├── test_performance.py
│       └── test_context.py
└── docs/
    ├── USAGE.md
    └── CONFIGURATION.md
```

---

## 7. 依赖清单

```toml
# pyproject.toml dependencies
dependencies = [
    "typer[all]>=0.9.0",
    "rich>=13.0.0",
    "httpx>=0.25.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
    "pyyaml>=6.0",
    "aiofiles>=23.0.0",
    "jinja2>=3.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.0.0",
    "mypy>=1.0.0",
    "ruff>=0.1.0",
]
```

---

## 8. 执行计划

### 阶段划分

| 阶段 | 任务 | 依赖 | 优先级 |
|------|------|------|--------|
| 1 | 项目初始化 + 配置管理 | 无 | P0 |
| 2 | Provider 基类 + OpenAI/Claude | 阶段1 | P0 |
| 3 | 连通性测试 + 性能测试 | 阶段2 | P0 |
| 4 | CLI 基础命令 | 阶段3 | P0 |
| 5 | 报告生成 | 阶段4 | P1 |
| 6 | 其他 Provider | 阶段2 | P1 |
| 7 | 上下文测试 | 阶段3 | P1 |
| 8 | 文档完善 | 阶段5-7 | P1 |

---

*架构设计完成，准备进入开发阶段*