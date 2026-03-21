import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useProviders, useModels } from '../hooks/useProviders'
import { useWebSocket } from '../hooks/useWebSocket'
import { runConnectivityTest } from '../lib/api'
import { Activity, CheckCircle, XCircle, AlertCircle, Zap } from 'lucide-react'

export default function ConnectivityTest() {
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
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
    const response = await runConnectivityTest({
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
    })

    setTestStarted(true)
    startTest(response.test_id, {
      test_type: 'connectivity',
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
    })
  }

  const handleTestAll = async () => {
    const response = await runConnectivityTest({})
    setTestStarted(true)
    startTest(response.test_id, {
      test_type: 'connectivity',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-['Orbitron'] flex items-center gap-3">
          <Activity className="w-6 h-6 text-[#00f0ff]" />
          Connectivity Test
        </h1>
        <p className="text-gray-400 mt-1">Test API connectivity and model availability</p>
      </div>

      {/* Configuration */}
      <Card glow>
        <h3 className="text-lg font-semibold text-white font-['Rajdhani'] mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value)
                setSelectedModel('')
              }}
              disabled={loadingProviders || isTesting}
              className="w-full cyber-select"
            >
              <option value="">All Providers</option>
              {providers.map((p) => (
                <option key={p.name} value={p.name}>{p.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={loadingModels || !selectedProvider || isTesting}
              className="w-full cyber-select"
            >
              <option value="">All Models</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handleStartTest} disabled={isTesting} glow>
              <Zap className="w-4 h-4 mr-1" />
              {isTesting ? 'Testing...' : 'Test Selected'}
            </Button>
            <Button variant="secondary" onClick={handleTestAll} disabled={isTesting}>
              Test All
            </Button>
          </div>
        </div>
      </Card>

      {/* Progress */}
      {isTesting && (
        <Card>
          <h3 className="text-lg font-semibold text-white font-['Rajdhani'] mb-4">Test Progress</h3>
          <div className="space-y-3">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00f0ff] to-[#bf00ff] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 text-center">{progress}% Complete</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-[#ff0064]/50 bg-[#ff0064]/5">
          <div className="flex items-center gap-2 text-[#ff0064]">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Results */}
      {testStarted && (results.length > 0 || summary) && (
        <Card glow>
          <h3 className="text-lg font-semibold text-white font-['Rajdhani'] mb-4">Test Results</h3>
          
          <div className="space-y-3">
            {results.map((result: any, index: number) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border transition-all ${
                  result.status === 'passed' 
                    ? 'bg-[#00ff88]/5 border-[#00ff88]/30' 
                    : result.status === 'failed' 
                    ? 'bg-[#ff0064]/5 border-[#ff0064]/30'
                    : 'bg-gray-800/50 border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {result.status === 'passed' ? (
                      <CheckCircle className="w-5 h-5 text-[#00ff88]" />
                    ) : result.status === 'failed' ? (
                      <XCircle className="w-5 h-5 text-[#ff0064]" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium text-white">{result.provider}</p>
                      <p className="text-sm text-gray-500">{result.model}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {result.latency_ms && (
                      <p className="text-[#00f0ff] font-['JetBrains_Mono']">{result.latency_ms}ms</p>
                    )}
                    <p className={`text-sm ${
                      result.status === 'passed' ? 'text-[#00ff88]' : 
                      result.status === 'failed' ? 'text-[#ff0064]' : 'text-gray-500'
                    }`}>
                      {result.status?.toUpperCase()}
                    </p>
                  </div>
                </div>
                {result.error_message && (
                  <p className="mt-2 text-sm text-[#ff0064]/80 pl-8">{result.error_message}</p>
                )}
              </div>
            ))}
          </div>
          
          {summary && (
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-br from-[#00f0ff]/5 to-[#bf00ff]/5 border border-[#00f0ff]/20">
              <h4 className="font-medium text-white mb-4 font-['Rajdhani']">Summary</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-lg bg-black/30">
                  <p className="text-2xl font-bold text-white font-['Orbitron']">{String(summary.total)}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
                <div className="p-3 rounded-lg bg-black/30">
                  <p className="text-2xl font-bold text-[#00ff88] font-['Orbitron']">{String(summary.passed)}</p>
                  <p className="text-sm text-gray-500">Passed</p>
                </div>
                <div className="p-3 rounded-lg bg-black/30">
                  <p className="text-2xl font-bold text-[#ff0064] font-['Orbitron']">{String(summary.failed)}</p>
                  <p className="text-sm text-gray-500">Failed</p>
                </div>
                <div className="p-3 rounded-lg bg-black/30">
                  <p className="text-2xl font-bold text-[#00f0ff] font-['Orbitron']">{String(summary.success_rate)}%</p>
                  <p className="text-sm text-gray-500">Success Rate</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}