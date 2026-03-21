const API_BASE = '/api'

export interface Provider {
  name: string
  display_name: string
  configured: boolean
  registered?: boolean
}

export interface TestResponse {
  test_id: string
  status: string
  websocket_url: string
}

export interface TestResult {
  provider: string
  model: string
  status: string
  latency_ms?: number
  total_time_ms?: number
  ttft_ms?: number
  tokens_per_second?: number
  memory_score?: number
  error_message?: string
}

export interface TestSummary {
  total: number
  passed: number
  failed: number
  errors: number
  success_rate: number
}

// Provider API
export async function getProviders(): Promise<Provider[]> {
  const response = await fetch(`${API_BASE}/providers`)
  const data = await response.json()
  return data.providers
}

export async function getModels(provider: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/providers/${provider}/models`)
  const data = await response.json()
  return data.models
}

// Test API
export async function runConnectivityTest(params: {
  provider?: string
  model?: string
}): Promise<TestResponse> {
  const response = await fetch(`${API_BASE}/test/connectivity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return response.json()
}

export async function runPerformanceTest(params: {
  provider?: string
  model?: string
  iterations?: number
  max_tokens?: number
  prompt?: string
}): Promise<TestResponse> {
  const response = await fetch(`${API_BASE}/test/performance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return response.json()
}

export async function runContextTest(params: {
  provider?: string
  model?: string
  context_size?: number
}): Promise<TestResponse> {
  const response = await fetch(`${API_BASE}/test/context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return response.json()
}

// Config API
export async function getConfig() {
  const response = await fetch(`${API_BASE}/config`)
  return response.json()
}

export async function updateProviderConfig(provider: string, config: {
  api_key?: string
  base_url?: string
  models?: string[]
  display_name?: string
  provider_type?: string
}) {
  const response = await fetch(`${API_BASE}/config/providers/${provider}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return response.json()
}

export async function registerProvider(config: {
  name: string
  display_name?: string
  api_key?: string
  base_url?: string
  models?: string[]
  provider_type?: string
}) {
  const response = await fetch(`${API_BASE}/providers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return response.json()
}

export async function deleteProviderConfig(provider: string) {
  const response = await fetch(`${API_BASE}/config/providers/${provider}`, {
    method: 'DELETE',
  })
  return response.json()
}

// Reports API
export async function getReports() {
  const response = await fetch(`${API_BASE}/reports`)
  return response.json()
}

export async function getReport(testId: string) {
  const response = await fetch(`${API_BASE}/reports/${testId}`)
  return response.json()
}

export async function exportReport(testId: string, format: 'json' | 'markdown') {
  const response = await fetch(`${API_BASE}/reports/${testId}/export?format=${format}`)
  return response.json()
}

// Session API
export interface Session {
  id: string
  title: string
  auto_title: number
  provider: string
  model: string
  temperature: number
  created_at: string
  updated_at: string
  messages?: Message[]
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  status: string
  metrics?: {
    modelName?: string
    latencyMs?: number
    ttftMs?: number
    tpotMs?: number
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    tokensPerSecond?: number
    temperature?: number
  }
  created_at: string
}

export async function listSessions(limit: number = 50): Promise<{ sessions: Session[], total: number }> {
  const response = await fetch(`${API_BASE}/sessions?limit=${limit}`)
  return response.json()
}

export async function createSession(data?: { provider?: string; model?: string; temperature?: number }): Promise<Session> {
  const response = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  })
  return response.json()
}

export async function getSession(sessionId: string): Promise<Session> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`)
  return response.json()
}

export async function updateSession(sessionId: string, data: Partial<Session>): Promise<Session> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return response.json()
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' })
}

export async function addMessage(sessionId: string, message: { role: string; content: string; status?: string; metrics?: any }): Promise<Message> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })
  return response.json()
}

export async function generateTitle(sessionId: string): Promise<{ title: string }> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/generate-title`, {
    method: 'POST',
  })
  return response.json()
}