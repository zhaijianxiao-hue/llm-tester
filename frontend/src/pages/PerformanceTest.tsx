import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Table } from '../components/ui/Table'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useProviders, useModels } from '../hooks/useProviders'
import { useWebSocket } from '../hooks/useWebSocket'
import { runPerformanceTest } from '../lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function PerformanceTest() {
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [iterations, setIterations] = useState<string>('3')
  const [maxTokens, setMaxTokens] = useState<string>('100')
  const [prompt, setPrompt] = useState<string>('')
  const [testStarted, setTestStarted] = useState(false)

  const { data: providers = [], isLoading: loadingProviders } = useProviders()
  const { data: models = [], isLoading: loadingModels } = useModels(selectedProvider || null)

  const {
    isTesting,
    progress,
    results,
    summary,
    error,
    startTest,
  } = useWebSocket()

  const handleStartTest = async () => {
    const response = await runPerformanceTest({
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
      iterations: parseInt(iterations) || 3,
      max_tokens: parseInt(maxTokens) || 100,
      prompt: prompt || undefined,
    })

    setTestStarted(true)
    startTest(response.test_id, {
      test_type: 'performance',
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
      iterations: parseInt(iterations) || 3,
      max_tokens: parseInt(maxTokens) || 100,
      prompt: prompt || undefined,
    })
  }

  const columns = [
    { key: 'provider', header: 'Provider' },
    { key: 'model', header: 'Model' },
    {
      key: 'status',
      header: 'Status',
      render: (row: Record<string, unknown>) => (
        <StatusBadge status={String(row.status || 'pending')} />
      ),
    },
    {
      key: 'total_time_ms',
      header: 'Total Time',
      render: (row: Record<string, unknown>) =>
        row.total_time_ms ? `${Math.round(Number(row.total_time_ms))}ms` : '-',
    },
    {
      key: 'ttft_ms',
      header: 'TTFT',
      render: (row: Record<string, unknown>) =>
        row.ttft_ms ? `${Math.round(Number(row.ttft_ms))}ms` : '-',
    },
    {
      key: 'tokens_per_second',
      header: 'Tokens/s',
      render: (row: Record<string, unknown>) =>
        row.tokens_per_second ? Number(row.tokens_per_second).toFixed(1) : '-',
    },
  ]

  // Prepare chart data
  const chartData = results
    .filter((r) => r.status === 'passed')
    .map((r) => ({
      name: `${r.provider}/${r.model}`.slice(0, 20),
      ttft: r.ttft_ms ? Math.round(Number(r.ttft_ms)) : 0,
      tps: r.tokens_per_second ? Number(r.tokens_per_second).toFixed(1) : 0,
    }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performance Test</h1>
        <p className="text-gray-600 mt-1">Benchmark response times and token generation speed</p>
      </div>

      <Card title="Test Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider
            </label>
            <Select
              value={selectedProvider}
              onChange={(v) => {
                setSelectedProvider(v)
                setSelectedModel('')
              }}
              options={[
                { value: '', label: 'All Providers' },
                ...providers.map((p) => ({ value: p.name, label: p.display_name })),
              ]}
              disabled={loadingProviders || isTesting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              options={[
                { value: '', label: 'All Models' },
                ...models.map((m) => ({ value: m, label: m })),
              ]}
              disabled={loadingModels || !selectedProvider || isTesting}
            />
          </div>

          <Input
            label="Iterations"
            type="number"
            value={iterations}
            onChange={(e) => setIterations(e.target.value)}
            min={1}
            max={10}
            disabled={isTesting}
          />

          <Input
            label="Max Tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            min={10}
            max={1000}
            disabled={isTesting}
          />

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Prompt (optional)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              placeholder="Write a short greeting."
              disabled={isTesting}
            />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handleStartTest} disabled={isTesting}>
            {isTesting ? 'Testing...' : 'Start Performance Test'}
          </Button>
        </div>
      </Card>

      {/* Progress */}
      {isTesting && (
        <Card title="Test Progress">
          <div className="space-y-4">
            <ProgressBar progress={progress} />
            <p className="text-sm text-gray-600 text-center">{progress}% Complete</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-red-700">{error}</p>
        </Card>
      )}

      {/* Results Table */}
      {testStarted && results.length > 0 && (
        <Card title="Test Results">
          <Table columns={columns} data={results} />
        </Card>
      )}

      {/* Performance Chart */}
      {testStarted && chartData.length > 0 && (
        <Card title="Performance Comparison">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="ttft" fill="#0ea5e9" name="TTFT (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Summary */}
      {summary && (
        <Card title="Summary">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{String(summary.total)}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{String(summary.passed)}</p>
              <p className="text-sm text-gray-500">Passed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{String(summary.failed)}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{String(summary.success_rate)}%</p>
              <p className="text-sm text-gray-500">Success Rate</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}