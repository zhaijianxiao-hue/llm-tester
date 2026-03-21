import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useProviders, useModels } from '../hooks/useProviders'
import { useWebSocket } from '../hooks/useWebSocket'
import { runContextTest } from '../lib/api'

export default function ContextTest() {
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [contextSize, setContextSize] = useState<string>('4096')
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
    const response = await runContextTest({
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
      context_size: parseInt(contextSize) || 4096,
    })

    setTestStarted(true)
    startTest(response.test_id, {
      test_type: 'context',
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
      context_size: parseInt(contextSize) || 4096,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Context Test</h1>
        <p className="text-gray-600 mt-1">Test context window size and memory capabilities</p>
      </div>

      <Card title="Test Configuration">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            label="Context Size (tokens)"
            type="number"
            value={contextSize}
            onChange={(e) => setContextSize(e.target.value)}
            min={256}
            max={128000}
            disabled={isTesting}
          />

          <div className="flex items-end">
            <Button onClick={handleStartTest} disabled={isTesting}>
              {isTesting ? 'Testing...' : 'Start Context Test'}
            </Button>
          </div>
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

      {/* Results */}
      {testStarted && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result, index) => (
            <Card key={index}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    {String(result.provider)} / {String(result.model)}
                  </h4>
                  <StatusBadge status={String(result.status)} />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Context Size</span>
                    <span className="text-gray-900">{String(result.context_size)} tokens</span>
                  </div>
                  
                  {result.memory_score !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Memory Score</span>
                      <span className="text-gray-900">
                        {Math.round(Number(result.memory_score) * 100)}%
                      </span>
                    </div>
                  )}

                  {result.context_tokens_used !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tokens Used</span>
                      <span className="text-gray-900">{String(result.context_tokens_used)}</span>
                    </div>
                  )}

                  {result.error_message !== undefined && result.error_message !== null && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-xs">
                      {String(result.error_message)}
                    </div>
                  )}
                </div>

                {/* Memory Score Progress Bar */}
                {result.memory_score !== undefined && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          Number(result.memory_score) >= 0.8
                            ? 'bg-green-500'
                            : Number(result.memory_score) >= 0.5
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${Number(result.memory_score) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
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