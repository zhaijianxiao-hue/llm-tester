# LLM Tester Web UI - 项目规范

> **项目**: 将 CLI 工具改造为 Web UI 版本
> **创建时间**: 2026-03-21
> **工作目录**: D:/Workbench/obb_works/llm-tester/

---

## 1. 项目目标

将现有的 `llm-tester` CLI 工具改造为 **Web UI 界面**版本，提供用户友好的图形界面进行 LLM API 测试。

### 核心需求
1. **Web UI 界面** - 用户友好的图形界面
2. **保留现有功能** - 连通性、性能、上下文测试
3. **配置管理** - UI 中配置 API Key
4. **实时测试进度** - 测试过程中显示进度
5. **结果可视化** - 表格、图表展示测试结果
6. **报告导出** - 支持 JSON/Markdown 导出

---

## 2. 现有代码结构

```
llm-tester/
├── src/llm_tester/
│   ├── __init__.py
│   ├── cli.py                    # CLI 入口 (保留)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py             # 配置管理 (复用)
│   │   ├── engine.py             # 测试引擎 (复用)
│   │   └── models.py             # 数据模型 (复用)
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py               # Provider 基类 (复用)
│   │   ├── openai.py             # OpenAI (复用)
│   │   └── claude.py             # Claude (复用)
│   └── web/                      # 🆕 新增 Web 模块
│       ├── __init__.py
│       ├── app.py                # FastAPI 应用
│       ├── api/
│       │   ├── __init__.py
│       │   ├── routes.py         # API 路由
│       │   └── websocket.py      # WebSocket 处理
│       └── services/
│           ├── __init__.py
│           └── test_service.py   # 测试服务层
├── frontend/                     # 🆕 React 前端
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   └── ...
├── pyproject.toml                # 更新依赖
└── README.md
```

---

## 3. 技术架构

### 3.1 后端 (FastAPI)

**新增依赖**:
```toml
[project.dependencies]
# 现有依赖保留
# 新增:
fastapi = ">=0.109.0"
uvicorn = ">=0.27.0"
websockets = ">=12.0"
python-multipart = ">=0.0.6"
```

**API 设计**:

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/providers` | GET | 获取支持的 Provider 列表 |
| `/api/providers/{provider}/models` | GET | 获取 Provider 的模型列表 |
| `/api/config` | GET/PUT | 获取/更新配置 |
| `/api/config/providers/{provider}` | PUT | 更新 Provider 配置 |
| `/api/test/connectivity` | POST | 执行连通性测试 |
| `/api/test/performance` | POST | 执行性能测试 |
| `/api/test/context` | POST | 执行上下文测试 |
| `/api/test/batch` | POST | 批量测试 |
| `/api/reports` | GET | 获取测试报告列表 |
| `/api/reports/{id}` | GET | 获取单个报告 |
| `/api/reports/{id}/export` | GET | 导出报告 (JSON/Markdown) |
| `/ws/test/{test_id}` | WebSocket | 实时测试进度 |

### 3.2 前端 (React + TypeScript)

**技术栈**:
- React 18 + TypeScript
- Vite (构建工具)
- Tailwind CSS (样式)
- Recharts (图表)
- TanStack Query (数据获取)
- React Router (路由)

**页面结构**:
```
/                    # 首页 - 测试概览
/test/connectivity   # 连通性测试
/test/performance    # 性能测试
/test/context        # 上下文测试
/config              # 配置管理
/reports             # 报告列表
/reports/:id         # 报告详情
```

---

## 4. 功能规格

### 4.1 首页 (Dashboard)
- 测试统计卡片 (总测试数、通过率、平均延迟)
- 最近测试记录列表
- 快速测试入口

### 4.2 连通性测试页面
- Provider 选择下拉框
- Model 选择下拉框 (动态加载)
- 测试按钮
- 结果表格 (状态、延迟、详情)
- 实时进度显示

### 4.3 性能测试页面
- Provider/Model 选择
- 迭代次数配置
- 自定义 Prompt 输入
- Max Tokens 配置
- 结果表格 + 性能图表 (TTFT、TPS 对比)
- 实时进度

### 4.4 上下文测试页面
- Provider/Model 选择
- Context Size 配置
- 结果显示 (通过/失败、记忆分数)

### 4.5 配置管理页面
- Provider 列表
- API Key 配置表单
- Base URL 配置
- 模型列表管理
- 配置保存/导出

### 4.6 报告页面
- 报告列表 (带筛选)
- 报告详情
- 导出功能 (JSON/Markdown)

---

## 5. 数据流设计

### 5.1 测试执行流程
```
用户点击测试 
  → 前端发送 POST /api/test/{type}
  → 后端创建测试任务，返回 test_id
  → 前端建立 WebSocket /ws/test/{test_id}
  → 后端异步执行测试，通过 WS 推送进度
  → 测试完成后，前端显示结果
```

### 5.2 WebSocket 消息格式
```json
{
  "type": "progress" | "result" | "error" | "complete",
  "data": {
    "provider": "openai",
    "model": "gpt-4",
    "status": "running",
    "progress": 50,
    "message": "Testing gpt-4..."
  }
}
```

---

## 6. 实现计划

### Phase 1: 后端 API 基础 (P0)
1. 创建 FastAPI 应用框架
2. 实现 Provider/Config API
3. 实现测试 API 端点
4. 实现 WebSocket 进度推送

### Phase 2: 前端基础 (P0)
1. 创建 React 项目框架
2. 实现页面路由
3. 实现通用组件 (Layout, Card, Table)
4. 实现 API 集成层

### Phase 3: 核心功能实现 (P0)
1. 连通性测试页面
2. 性能测试页面
3. 上下文测试页面
4. 实时进度显示

### Phase 4: 配置与报告 (P1)
1. 配置管理页面
2. 报告列表页面
3. 报告导出功能

### Phase 5: 集成测试 (P0)
1. 端到端测试
2. 性能测试
3. UI 测试

---

## 7. 验收标准

### 功能验收
- [ ] 用户可通过 Web UI 执行连通性测试
- [ ] 用户可通过 Web UI 执行性能测试
- [ ] 用户可通过 Web UI 执行上下文测试
- [ ] 用户可配置 Provider API Key
- [ ] 测试过程显示实时进度
- [ ] 测试结果以表格和图表展示
- [ ] 可导出 JSON/Markdown 报告

### 技术验收
- [ ] 后端 API 测试覆盖率 > 80%
- [ ] 前端组件正常渲染
- [ ] WebSocket 连接稳定
- [ ] 页面响应时间 < 2s

---

## 8. 约束条件

1. **复用现有代码** - 最大程度复用 providers 和 core 模块
2. **保持 CLI 兼容** - Web UI 与 CLI 共存
3. **本地运行** - 单机部署，无需云端服务
4. **安全考虑** - API Key 仅存储在本地环境变量或配置文件

---

## 9. 开发命令

```bash
# 后端开发
cd llm-tester
pip install -e ".[web]"
uvicorn llm_tester.web.app:app --reload --port 8000

# 前端开发
cd llm-tester/frontend
npm install
npm run dev

# 完整运行
npm run dev  # 前端 :5173
# 另一终端
uvicorn llm_tester.web.app:app --reload --port 8000  # 后端 :8000
```

---

## 10. 参考资料

- FastAPI 文档: https://fastapi.tiangolo.com/
- React 文档: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/
- Recharts: https://recharts.org/
- TanStack Query: https://tanstack.com/query