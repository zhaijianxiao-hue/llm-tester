import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConfig, updateProviderConfig, getProviders, Provider, registerProvider, deleteProviderConfig } from '../lib/api'
import { Plus, Trash2, Edit2, X, Check, AlertCircle, Key, Globe, Cpu, Sparkles } from 'lucide-react'

interface ProviderFormData {
  name: string
  display_name: string
  api_key: string
  base_url: string
  models: string
  provider_type: 'openai' | 'anthropic'
}

const PROVIDER_TEMPLATES = {
  openai: {
    base_url: 'https://api.openai.com/v1',
    models: 'gpt-4, gpt-4-turbo, gpt-4o, gpt-3.5-turbo',
  },
  anthropic: {
    base_url: 'https://api.anthropic.com/v1',
    models: 'claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307',
  },
}

export default function ConfigPage() {
  const queryClient = useQueryClient()
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    display_name: '',
    api_key: '',
    base_url: '',
    models: '',
    provider_type: 'openai',
  })
  const [newProviderData, setNewProviderData] = useState<ProviderFormData>({
    name: '',
    display_name: '',
    api_key: '',
    base_url: '',
    models: '',
    provider_type: 'openai',
  })

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
  })

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: getProviders,
  })

  const updateMutation = useMutation({
    mutationFn: ({ provider, data }: { provider: string; data: Partial<ProviderFormData> }) =>
      updateProviderConfig(provider, {
        api_key: data.api_key || undefined,
        base_url: data.base_url || undefined,
        models: data.models ? data.models.split(',').map((m) => m.trim()) : undefined,
        display_name: data.display_name || undefined,
        provider_type: data.provider_type || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] })
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      setEditingProvider(null)
    },
  })

  const addMutation = useMutation({
    mutationFn: (data: ProviderFormData) =>
      registerProvider({
        name: data.name,
        display_name: data.display_name || data.name,
        api_key: data.api_key,
        base_url: data.base_url,
        models: data.models ? data.models.split(',').map((m) => m.trim()) : [],
        provider_type: data.provider_type,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] })
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      setShowAddForm(false)
      setNewProviderData({
        name: '',
        display_name: '',
        api_key: '',
        base_url: '',
        models: '',
        provider_type: 'openai',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (provider: string) => deleteProviderConfig(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] })
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    },
  })

  const handleEdit = (provider: Provider) => {
    const providerConfig = config?.providers?.[provider.name] || {}
    setFormData({
      name: provider.name,
      display_name: provider.display_name || provider.name,
      api_key: '',
      base_url: providerConfig.base_url || '',
      models: (providerConfig.models || []).join(', '),
      provider_type: providerConfig.provider_type || 'openai',
    })
    setEditingProvider(provider.name)
  }

  const handleSave = () => {
    if (editingProvider) {
      updateMutation.mutate({ provider: editingProvider, data: formData })
    }
  }

  const handleCancel = () => {
    setEditingProvider(null)
  }

  const handleAddProvider = () => {
    if (!newProviderData.name.trim()) {
      alert('Provider name is required')
      return
    }
    addMutation.mutate(newProviderData)
  }

  const handleDelete = (providerName: string) => {
    if (confirm(`Are you sure you want to delete "${providerName}"?`)) {
      deleteMutation.mutate(providerName)
    }
  }

  const handleProviderTypeChange = (type: 'openai' | 'anthropic') => {
    setNewProviderData(prev => ({
      ...prev,
      provider_type: type,
      base_url: PROVIDER_TEMPLATES[type].base_url,
      models: PROVIDER_TEMPLATES[type].models,
    }))
  }

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00f0ff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Orbitron']">Configuration</h1>
          <p className="text-gray-400 mt-1">Manage API keys and provider settings</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} glow>
          <Plus className="w-4 h-4 mr-1" />
          Add Provider
        </Button>
      </div>

      {/* Add Provider Modal */}
      {showAddForm && (
        <Card glow className="border-[#00f0ff]/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00f0ff]" />
              <h3 className="text-lg font-semibold text-white font-['Rajdhani']">Add New Provider</h3>
            </div>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Provider Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Provider Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleProviderTypeChange('openai')}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-300 ${
                    newProviderData.provider_type === 'openai'
                      ? 'border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                      : 'border-[rgba(255,255,255,0.1)] bg-transparent text-gray-400 hover:border-[rgba(0,240,255,0.3)]'
                  }`}
                >
                  OpenAI Compatible
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderTypeChange('anthropic')}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-300 ${
                    newProviderData.provider_type === 'anthropic'
                      ? 'border-[#bf00ff] bg-[#bf00ff]/10 text-[#bf00ff] shadow-[0_0_15px_rgba(191,0,255,0.2)]'
                      : 'border-[rgba(255,255,255,0.1)] bg-transparent text-gray-400 hover:border-[rgba(191,0,255,0.3)]'
                  }`}
                >
                  Anthropic (Claude)
                </button>
              </div>
            </div>

            {/* Provider Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Provider ID</label>
                <input
                  type="text"
                  value={newProviderData.name}
                  onChange={(e) => setNewProviderData({ ...newProviderData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="my-provider"
                  className="w-full px-3 py-2.5 rounded-lg cyber-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newProviderData.display_name}
                  onChange={(e) => setNewProviderData({ ...newProviderData, display_name: e.target.value })}
                  placeholder="My Provider"
                  className="w-full px-3 py-2.5 rounded-lg cyber-input"
                />
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                <Key className="w-4 h-4" /> API Key
              </label>
              <input
                type="password"
                value={newProviderData.api_key}
                onChange={(e) => setNewProviderData({ ...newProviderData, api_key: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2.5 rounded-lg cyber-input"
              />
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Base URL
              </label>
              <input
                type="text"
                value={newProviderData.base_url}
                onChange={(e) => setNewProviderData({ ...newProviderData, base_url: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="w-full px-3 py-2.5 rounded-lg cyber-input"
              />
            </div>

            {/* Models */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Models (comma-separated)
              </label>
              <textarea
                value={newProviderData.models}
                onChange={(e) => setNewProviderData({ ...newProviderData, models: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg cyber-input resize-none"
                rows={2}
                placeholder="model-1, model-2"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddProvider} loading={addMutation.isPending}>
                <Check className="w-4 h-4 mr-1" />
                Add Provider
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider) => {
          const isEditing = editingProvider === provider.name
          const providerConfig = config?.providers?.[provider.name] || {}

          return (
            <Card key={provider.name} glow className={isEditing ? 'border-[#00f0ff]/50' : ''}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white font-['Rajdhani']">
                    {provider.display_name || provider.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                        provider.configured
                          ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}
                    >
                      {provider.configured ? '✓ Configured' : 'Not Configured'}
                    </span>
                    {provider.registered && (
                      <span className="px-2.5 py-1 text-xs rounded-full bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30">
                        Built-in
                      </span>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Provider Type</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, provider_type: 'openai' })}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            formData.provider_type === 'openai'
                              ? 'border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff]'
                              : 'border-gray-700 bg-transparent text-gray-400'
                          }`}
                        >
                          OpenAI
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, provider_type: 'anthropic' })}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            formData.provider_type === 'anthropic'
                              ? 'border-[#bf00ff] bg-[#bf00ff]/10 text-[#bf00ff]'
                              : 'border-gray-700 bg-transparent text-gray-400'
                          }`}
                        >
                          Anthropic
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg cyber-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">API Key</label>
                      <input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        placeholder="Enter your API key"
                        className="w-full px-3 py-2 rounded-lg cyber-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Base URL</label>
                      <input
                        type="text"
                        value={formData.base_url}
                        onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg cyber-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Models (comma-separated)</label>
                      <textarea
                        value={formData.models}
                        onChange={(e) => setFormData({ ...formData, models: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg cyber-input resize-none"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSave} loading={updateMutation.isPending}>Save</Button>
                      <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                      {!provider.registered && (
                        <Button variant="danger" onClick={() => handleDelete(provider.name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Type</span>
                      <span className="text-[#00f0ff] font-medium">{providerConfig.provider_type || 'openai'}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">API Key</span>
                      <span className="text-gray-300">
                        {providerConfig.api_key
                          ? '****' + String(providerConfig.api_key).slice(-4)
                          : <span className="text-red-400">Not set</span>}
                      </span>
                    </div>

                    {providerConfig.base_url && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Base URL</span>
                        <span className="text-gray-300 truncate max-w-[200px] font-['JetBrains_Mono'] text-xs">
                          {String(providerConfig.base_url)}
                        </span>
                      </div>
                    )}

                    {providerConfig.models?.length > 0 && (
                      <div>
                        <span className="text-gray-500 text-sm">Models:</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {providerConfig.models.map((model: string) => (
                            <span
                              key={model}
                              className="px-2 py-0.5 bg-[#00f0ff]/10 border border-[#00f0ff]/20 rounded text-xs text-[#00f0ff] font-['JetBrains_Mono']"
                            >
                              {model}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button variant="secondary" onClick={() => handleEdit(provider)}>
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      {!provider.registered && (
                        <Button variant="danger" onClick={() => handleDelete(provider.name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Help Card */}
      <Card>
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-[#00f0ff] flex-shrink-0" />
          <div className="text-sm text-gray-400">
            <p className="font-medium text-white mb-1">Tips</p>
            <ul className="space-y-1">
              <li>• API Keys are stored in the config file. Keep it secure.</li>
              <li>• You can use environment variables like <code className="text-[#00f0ff]">${'{OPENAI_API_KEY}'}</code></li>
              <li>• "OpenAI Compatible" providers use the standard OpenAI API format</li>
              <li>• "Anthropic" providers use the Claude API format</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}