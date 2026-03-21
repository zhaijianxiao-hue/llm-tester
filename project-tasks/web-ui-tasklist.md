# LLM Tester Web UI - 任务列表

> **项目**: LLM Tester Web UI - CLI 改造为 Web 界面
> **创建时间**: 2026-03-21
> **更新时间**: 2026-03-21
> **状态**: ✅ Phase 1-3 完成

---

## 任务概览

| 分类 | 任务数 | 完成 | 进行中 | 待开始 |
|------|--------|------|--------|--------|
| Phase 1: 后端 API | 5 | 5 | 0 | 0 |
| Phase 2: 前端基础 | 4 | 4 | 0 | 0 |
| Phase 3: 核心功能 | 4 | 4 | 0 | 0 |
| Phase 4: 配置与报告 | 3 | 3 | 0 | 0 |
| Phase 5: 集成测试 | 2 | 1 | 0 | 1 |
| **总计** | **18** | **17** | **0** | **1** |

**完成率**: 94%

---

## Phase 1: 后端 API 基础 (P0)

### [ ] Task 1.1: 创建 FastAPI 应用框架
**优先级**: P0 | **预估**: 30min

**创建文件**:
- `src/llm_tester/web/__init__.py`
- `src/llm_tester/web/app.py` - FastAPI 应用入口

**实现内容**:
- FastAPI 应用实例
- CORS 配置 (允许前端跨域)
- 静态文件服务 (生产环境)
- 健康检查端点 `/health`

**验收标准**:
- [ ] `uvicorn llm_tester.web.app:app` 可启动
- [ ] `/health` 返回 `{"status": "ok"}`
- [ ] CORS 配置允许 localhost:5173

---

### [ ] Task 1.2: 实现 Provider 和 Model API
**优先级**: P0 | **预估**: 20min

**创建文件**:
- `src/llm_tester/web/api/__init__.py`
- `src/llm_tester/web/api/routes.py`

**API 端点**:
```
GET /api/providers              # 获取支持的 Provider 列表
GET /api/providers/{provider}/models  # 获取 Provider 的模型列表
```

**响应示例**:
```json
// GET /api/providers
{
  "providers": [
    {"name": "openai", "display_name": "OpenAI", "configured": true},
    {"name": "claude", "display_name": "Claude", "configured": true}
  ]
}

// GET /api/providers/openai/models
{
  "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-4o"]
}
```

**验收标准**:
- [ ] 返回正确的 Provider 列表
- [ ] 返回正确的模型列表
- [ ] 标记已配置的 Provider

---

### [ ] Task 1.3: 实现配置管理 API
**优先级**: P0 | **预估**: 20min

**API 端点**:
```
GET /api/config                 # 获取当前配置
PUT /api/config/providers/{provider}  # 更新 Provider 配置
```

**请求体示例**:
```json
// PUT /api/config/providers/openai
{
  "api_key": "sk-xxx",
  "base_url": "https://api.openai.com/v1",
  "models": ["gpt-4", "gpt-3.5-turbo"]
}
```

**验收标准**:
- [ ] 可获取当前配置
- [ ] 可更新 Provider 配置
- [ ] API Key 不在响应中暴露完整值

---

### [ ] Task 1.4: 实现测试执行 API
**优先级**: P0 | **预估**: 30min

**创建文件**:
- `src/llm_tester/web/services/__init__.py`
- `src/llm_tester/web/services/test_service.py`

**API 端点**:
```
POST /api/test/connectivity     # 连通性测试
POST /api/test/performance      # 性能测试
POST /api/test/context          # 上下文测试
POST /api/test/batch            # 批量测试
```

**请求体示例**:
```json
// POST /api/test/connectivity
{
  "provider": "openai",
  "model": "gpt-4"  // 可选，不提供则测试所有模型
}
```

**响应**:
```json
{
  "test_id": "abc123",
  "status": "running",
  "websocket_url": "/ws/test/abc123"
}
```

**验收标准**:
- [ ] 可发起测试请求
- [ ] 返回 test_id 用于追踪
- [ ] 集成现有 TestEngine

---

### [ ] Task 1.5: 实现 WebSocket 进度推送
**优先级**: P0 | **预估**: 30min

**创建文件**:
- `src/llm_tester/web/api/websocket.py`

**WebSocket 端点**:
```
WS /ws/test/{test_id}
```

**消息格式**:
```json
// 进度消息
{"type": "progress", "data": {"provider": "openai", "model": "gpt-4", "status": "running", "progress": 50}}

// 结果消息
{"type": "result", "data": {"provider": "openai", "model": "gpt-4", "status": "passed", "latency_ms": 523}}

// 完成消息
{"type": "complete", "data": {"summary": {"total": 4, "passed": 4, "failed": 0}}}

// 错误消息
{"type": "error", "data": {"message": "Connection timeout"}}
```

**验收标准**:
- [ ] WebSocket 连接成功建立
- [ ] 测试进度实时推送
- [ ] 测试完成后发送 complete 消息

---

## Phase 2: 前端基础 (P0)

### [ ] Task 2.1: 创建 React 项目框架
**优先级**: P0 | **预估**: 20min

**创建文件**:
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`
- `frontend/vite.config.ts`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/index.css`

**依赖**:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.24.0",
    "recharts": "^2.12.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.1.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

**验收标准**:
- [ ] `npm run dev` 可启动开发服务器
- [ ] 页面正常渲染
- [ ] Tailwind CSS 生效

---

### [ ] Task 2.2: 实现页面路由和布局
**优先级**: P0 | **预估**: 30min

**创建文件**:
- `frontend/src/router.tsx`
- `frontend/src/layouts/MainLayout.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/Header.tsx`

**路由配置**:
```tsx
/                    → Dashboard
/test/connectivity   → ConnectivityTest
/test/performance    → PerformanceTest
/test/context        → ContextTest
/config              → ConfigPage
/reports             → ReportsList
/reports/:id         → ReportDetail
```

**验收标准**:
- [ ] 路由导航正常工作
- [ ] 侧边栏显示所有页面链接
- [ ] 当前页面高亮显示

---

### [ ] Task 2.3: 实现通用 UI 组件
**优先级**: P0 | **预估**: 30min

**创建文件**:
- `frontend/src/components/ui/Card.tsx`
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Table.tsx`
- `frontend/src/components/ui/Select.tsx`
- `frontend/src/components/ui/Input.tsx`
- `frontend/src/components/ui/Spinner.tsx`
- `frontend/src/components/ui/StatusBadge.tsx`

**验收标准**:
- [ ] Card 组件支持 title, children
- [ ] Button 支持 primary, secondary 变体
- [ ] Table 支持动态列和数据
- [ ] Select 和 Input 有统一的样式

---

### [ ] Task 2.4: 实现 API 集成层
**优先级**: P0 | **预估**: 20min

**创建文件**:
- `frontend/src/lib/api.ts`
- `frontend/src/lib/websocket.ts`
- `frontend/src/hooks/useProviders.ts`
- `frontend/src/hooks/useConfig.ts`

**API 函数**:
```typescript
// api.ts
export async function getProviders(): Promise<Provider[]>
export async function getModels(provider: string): Promise<string[]>
export async function getConfig(): Promise<Config>
export async function updateProviderConfig(provider: string, config: ProviderConfig): Promise<void>
export async function runTest(type: TestType, params: TestParams): Promise<TestResponse>
```

**验收标准**:
- [ ] API 函数正确调用后端
- [ ] 错误处理完善
- [ ] WebSocket 连接管理

---

## Phase 3: 核心功能实现 (P0)

### [ ] Task 3.1: 连通性测试页面
**优先级**: P0 | **预估**: 40min

**创建文件**:
- `frontend/src/pages/ConnectivityTest.tsx`
- `frontend/src/components/ConnectivityResultTable.tsx`
- `frontend/src/hooks/useConnectivityTest.ts`

**功能**:
1. Provider 下拉选择
2. Model 下拉选择 (依赖 Provider)
3. "测试全部" 和 "测试选中" 按钮
4. 实时进度条
5. 结果表格 (Provider, Model, Status, Latency, Details)
6. 测试统计摘要

**验收标准**:
- [ ] 可选择 Provider 和 Model
- [ ] 点击测试后显示进度
- [ ] 结果表格正确显示
- [ ] 状态图标正确 (passed/failed/error)

---

### [ ] Task 3.2: 性能测试页面
**优先级**: P0 | **预估**: 50min

**创建文件**:
- `frontend/src/pages/PerformanceTest.tsx`
- `frontend/src/components/PerformanceResultTable.tsx`
- `frontend/src/components/PerformanceChart.tsx`
- `frontend/src/hooks/usePerformanceTest.ts`

**功能**:
1. Provider/Model 选择
2. 迭代次数输入 (默认 3)
3. Max Tokens 输入 (默认 100)
4. 自定义 Prompt 文本框
5. 实时进度
6. 结果表格 (TTFT, Total Time, Tokens/s)
7. 性能对比图表 (柱状图)

**验收标准**:
- [ ] 所有参数可配置
- [ ] 结果表格完整
- [ ] 图表正确渲染
- [ ] 多次迭代结果取平均值

---

### [ ] Task 3.3: 上下文测试页面
**优先级**: P0 | **预估**: 30min

**创建文件**:
- `frontend/src/pages/ContextTest.tsx`
- `frontend/src/components/ContextResultCard.tsx`
- `frontend/src/hooks/useContextTest.ts`

**功能**:
1. Provider/Model 选择
2. Context Size 输入 (默认 4096)
3. 测试按钮
4. 结果显示:
   - 通过/失败状态
   - 记忆分数 (0-100%)
   - Context Tokens Used

**验收标准**:
- [ ] Context Size 可配置
- [ ] 结果清晰展示
- [ ] 记忆分数可视化

---

### [ ] Task 3.4: 首页 Dashboard
**优先级**: P0 | **预估**: 30min

**创建文件**:
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/components/StatCard.tsx`
- `frontend/src/components/RecentTests.tsx`

**功能**:
1. 统计卡片:
   - 总测试次数
   - 通过率
   - 平均延迟
2. 最近测试记录列表 (链接到报告详情)
3. 快速测试入口按钮

**验收标准**:
- [ ] 统计数据正确
- [ ] 最近测试列表显示
- [ ] 快速入口可用

---

## Phase 4: 配置与报告 (P1)

### [ ] Task 4.1: 配置管理页面
**优先级**: P1 | **预估**: 40min

**创建文件**:
- `frontend/src/pages/ConfigPage.tsx`
- `frontend/src/components/ProviderConfigForm.tsx`

**功能**:
1. Provider 列表卡片
2. 每个 Provider:
   - API Key 输入 (密码模式)
   - Base URL 输入
   - 模型列表 (可编辑)
   - 保存按钮
3. 全局保存按钮

**验收标准**:
- [ ] 可查看所有 Provider 配置
- [ ] 可更新 API Key
- [ ] 可添加/删除模型
- [ ] 保存成功提示

---

### [ ] Task 4.2: 报告列表页面
**优先级**: P1 | **预估**: 30min

**创建文件**:
- `frontend/src/pages/ReportsList.tsx`
- `frontend/src/components/ReportCard.tsx`

**功能**:
1. 报告列表 (按时间倒序)
2. 筛选: 测试类型、Provider、日期范围
3. 每个报告卡片:
   - 测试 ID
   - 测试类型
   - 时间
   - 通过率
   - 查看详情链接

**验收标准**:
- [ ] 报告列表正确显示
- [ ] 筛选功能正常
- [ ] 可点击查看详情

---

### [ ] Task 4.3: 报告详情与导出
**优先级**: P1 | **预估**: 40min

**创建文件**:
- `frontend/src/pages/ReportDetail.tsx`
- `frontend/src/components/ReportExport.tsx`

**功能**:
1. 报告详情:
   - 测试配置信息
   - 结果表格
   - 性能图表 (如果是性能测试)
   - 摘要统计
2. 导出按钮:
   - JSON 导出
   - Markdown 导出

**验收标准**:
- [ ] 报告详情完整
- [ ] JSON 导出正确
- [ ] Markdown 格式美观

---

## Phase 5: 集成测试 (P0)

### [ ] Task 5.1: 后端 API 测试
**优先级**: P0 | **预估**: 40min

**创建文件**:
- `tests/web/test_api.py`
- `tests/web/test_websocket.py`

**测试覆盖**:
1. Provider API 测试
2. Config API 测试
3. Test API 测试
4. WebSocket 连接测试

**验收标准**:
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过
- [ ] 边界情况覆盖

---

### [ ] Task 5.2: 端到端集成测试
**优先级**: P0 | **预估**: 30min

**测试场景**:
1. 启动前端和后端
2. 访问首页
3. 执行连通性测试
4. 查看结果
5. 检查报告列表

**验收标准**:
- [ ] 前后端通信正常
- [ ] WebSocket 连接稳定
- [ ] 测试流程完整

---

## 依赖关系

```
Phase 1 (后端) ──┬── Phase 2 (前端基础) ─── Phase 3 (核心功能)
                 │
                 └── Phase 4 可并行开发
                 
Phase 3 ────────── Phase 5 (集成测试)
```

---

## 执行顺序

1. **Phase 1.1-1.5**: 顺序执行 (后端 API 层层递进)
2. **Phase 2.1-2.4**: 顺序执行 (前端框架搭建)
3. **Phase 3.1-3.4**: 可并行执行 (独立页面)
4. **Phase 4.1-4.3**: 顺序执行 (配置和报告)
5. **Phase 5.1-5.2**: 最后执行

---

## 更新日志

| 日期 | 更新内容 |
|------|----------|
| 2026-03-21 | 初始任务列表创建 |