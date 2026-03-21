import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Send, Trash2, Loader2, Clock, Zap, MessageSquare, Hash, Timer, 
  AlertCircle, CheckCircle, Plus, Edit2, X, Copy, Check, 
  Settings, Sparkles, Cpu, PanelLeftClose, PanelLeft, Zap as LogoIcon, ArrowLeft
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { listSessions, createSession, getSession, updateSession, deleteSession, addMessage, generateTitle, Session, Message } from '../lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface Provider {
  name: string
  display_name: string
  configured: boolean
}

// Particle Background Component
function ParticleBackground() {
  return (
    <div className="particles-bg">
      <div className="absolute inset-0 cyber-grid-bg opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyber-dark/50 to-cyber-dark" />
    </div>
  )
}

// Typing Indicator Component
function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <span />
      <span />
      <span />
    </div>
  )
}

// Metric Card Component
function MetricCard({ icon: Icon, label, value, color = 'cyan' }: { 
  icon: React.ElementType
  label: string
  value: string | number
  color?: 'cyan' | 'purple' | 'pink' | 'green'
}) {
  const colorClasses = {
    cyan: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/5',
    purple: 'text-neon-purple border-neon-purple/30 bg-neon-purple/5',
    pink: 'text-neon-pink border-neon-pink/30 bg-neon-pink/5',
    green: 'text-neon-green border-neon-green/30 bg-neon-green/5',
  }

  return (
    <div className={`metric-card ${colorClasses[color]}`}>
      <Icon className="w-3.5 h-3.5 opacity-80" />
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-mono font-medium ${colorClasses[color].split(' ')[0]}`}>{value}</span>
    </div>
  )
}

function MessageContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  return (
    <div className="prose prose-sm prose-cyber max-w-none prose-pre:bg-black/60 prose-pre:border prose-pre:border-neon-cyan/15 prose-pre:rounded-lg prose-code:text-neon-pink prose-code:bg-neon-cyan/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-neon-cyan/20 prose-headings:text-white prose-p:text-gray-200 prose-a:text-neon-cyan prose-strong:text-white prose-ul:text-gray-200 prose-ol:text-gray-200 prose-li:text-gray-200 prose-blockquote:text-gray-400 prose-blockquote:border-neon-purple prose-blockquote:bg-neon-purple/5 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children, ...props }) => (
            <div className="relative group cyber-code">
              <pre {...props} className="!bg-black/60 !p-4 rounded-lg overflow-x-auto text-sm">
                {children}
              </pre>
              <button
                type="button"
                onClick={() => handleCopy(String(children).replace(/<[^>]*>/g, ''))}
                className="absolute top-2 right-2 p-1.5 bg-cyber-card/80 hover:bg-neon-cyan/20 border border-neon-cyan/20 rounded transition-all opacity-0 group-hover:opacity-100"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4 text-neon-cyan/70" />}
              </button>
            </div>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-neon-cyan/10 text-neon-cyan px-1.5 py-0.5 rounded text-sm border border-neon-cyan/20 font-mono" {...props}>
                  {children}
                </code>
              )
            }
            return <code className={`${className} font-mono`} {...props}>{children}</code>
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-neon-cyan animate-pulse ml-1 shadow-neon-cyan" />
      )}
    </div>
  )
}

export default function ChatPage() {
  // Session state
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  
  // Provider/Model state
  const [providers, setProviders] = useState<Provider[]>([])
  const [models, setModels] = useState<string[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [temperature, setTemperature] = useState(0.7)
  
  // UI state
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [editTitleValue, setEditTitleValue] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const loadSessions = useCallback(async () => {
    try {
      const data = await listSessions(50)
      setSessions(data.sessions)
      
      if (data.sessions.length > 0 && !currentSession) {
        setCurrentSession(data.sessions[0])
      } else if (data.sessions.length === 0) {
        // Create new session if none exist
        try {
          const session = await createSession({
            provider: selectedProvider,
            model: selectedModel,
            temperature,
          })
          setSessions([session])
          setCurrentSession(session)
          setMessages([])
        } catch (err) {
          console.error('Failed to create session:', err)
        }
      }
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  // Dependencies for initial load only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const session = await getSession(sessionId)
      setMessages(session.messages || [])
    } catch (err) {
      console.error('Failed to load messages:', err)
      setMessages([])
    }
  }, [])

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/providers')
      const data = await res.json()
      const configured = data.providers.filter((p: Provider) => p.configured)
      setProviders(configured)
      if (configured.length > 0 && !selectedProvider) {
        setSelectedProvider(configured[0].name)
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err)
    }
  }, [selectedProvider])

  const fetchModels = useCallback(async (provider: string) => {
    try {
      const res = await fetch(`/api/providers/${provider}/models`)
      const data = await res.json()
      setModels(data.models || [])
      if (data.models?.length > 0) {
        setSelectedModel(data.models[0])
      }
    } catch (err) {
      console.error('Failed to fetch models:', err)
      setModels([])
    }
  }, [])

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
    fetchProviders()
  }, [loadSessions, fetchProviders])

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      loadSessionMessages(currentSession.id)
      setSelectedProvider(currentSession.provider || '')
      setSelectedModel(currentSession.model || '')
      setTemperature(currentSession.temperature || 0.7)
    }
  }, [currentSession?.id, currentSession, loadSessionMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  // Fetch models when provider changes
  useEffect(() => {
    if (selectedProvider) {
      fetchModels(selectedProvider)
    }
  }, [selectedProvider, fetchModels])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleNewSession = useCallback(async () => {
    try {
      const session = await createSession({
        provider: selectedProvider,
        model: selectedModel,
        temperature,
      })
      setSessions(prev => [session, ...prev])
      setCurrentSession(session)
      setMessages([])
    } catch (err) {
      console.error('Failed to create session:', err)
    }
  }, [selectedProvider, selectedModel, temperature])

  const handleSelectSession = (session: Session) => {
    setCurrentSession(session)
  }

  const handleDeleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this session?')) return
    
    try {
      await deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSession?.id === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId)
        if (remaining.length > 0) {
          setCurrentSession(remaining[0])
        } else {
          handleNewSession()
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }, [currentSession?.id, sessions, handleNewSession])

  const handleEditTitle = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTitle(session.id)
    setEditTitleValue(session.title)
  }

  const handleSaveTitle = useCallback(async (sessionId: string) => {
    try {
      await updateSession(sessionId, { title: editTitleValue })
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: editTitleValue } : s))
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, title: editTitleValue } : null)
      }
    } catch (err) {
      console.error('Failed to update title:', err)
    }
    setEditingTitle(null)
  }, [editTitleValue, currentSession?.id])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return
    if (!selectedProvider || !selectedModel) {
      alert('Please select a provider and model')
      return
    }

    const userContent = input.trim()
    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    // Save user message
    if (currentSession) {
      await addMessage(currentSession.id, {
        role: 'user',
        content: userContent,
        status: 'success',
      })
    }

    // Add to local state
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      session_id: currentSession?.id || '',
      role: 'user',
      content: userContent,
      status: 'success',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])

    const startTime = Date.now()
    let firstTokenTime: number | null = null
    let completionTokens = 0
    let promptTokens = 0

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          messages: [...messages, tempUserMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature: temperature,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.usage) {
                  promptTokens = parsed.usage.prompt_tokens || 0
                  completionTokens = parsed.usage.completion_tokens || 0
                }
                const content = parsed.choices?.[0]?.delta?.content || ''
                if (content) {
                  if (firstTokenTime === null) {
                    firstTokenTime = Date.now()
                  }
                  completionTokens++
                  fullContent += content
                  setStreamingContent(fullContent)
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      const endTime = Date.now()
      const latencyMs = endTime - startTime
      const ttftMs = firstTokenTime ? firstTokenTime - startTime : 0
      const tpotMs = completionTokens > 0 ? (latencyMs - ttftMs) / completionTokens : 0
      const tokensPerSecond = completionTokens > 0 ? (completionTokens / (latencyMs / 1000)) : 0

      if (promptTokens === 0) {
        promptTokens = Math.ceil(userContent.length / 4)
      }

      // Save assistant message
      let savedMsgId = `temp-assistant-${Date.now()}`
      if (currentSession) {
        const savedMsg = await addMessage(currentSession.id, {
          role: 'assistant',
          content: fullContent,
          status: 'success',
          metrics: {
            modelName: selectedModel,
            latencyMs,
            ttftMs,
            tpotMs,
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            tokensPerSecond,
            temperature,
          },
        })
        savedMsgId = savedMsg.id
      }

      const assistantMessage: Message = {
        id: savedMsgId,
        session_id: currentSession?.id || '',
        role: 'assistant',
        content: fullContent,
        status: 'success',
        metrics: {
          modelName: selectedModel,
          latencyMs,
          ttftMs,
          tpotMs,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          tokensPerSecond,
          temperature,
        },
        created_at: new Date().toISOString(),
      }

      setMessages(prev => [...prev, assistantMessage])
      setStreamingContent('')

      // Update session provider/model
      if (currentSession) {
        await updateSession(currentSession.id, {
          provider: selectedProvider,
          model: selectedModel,
          temperature,
        })
        
        // Generate title in background
        if (messages.length <= 2) {
          generateTitle(currentSession.id).then(result => {
            if (result.title) {
              setSessions(prev => prev.map(s => 
                s.id === currentSession.id ? { ...s, title: result.title } : s
              ))
              setCurrentSession(prev => prev ? { ...prev, title: result.title } : null)
            }
          })
        }
        
        // Reload sessions to update order
        loadSessions()
      }

    } catch (err) {
      console.error('Chat error:', err)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        session_id: currentSession?.id || '',
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        status: 'error',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, selectedProvider, selectedModel, currentSession, messages, temperature, loadSessions])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    if (currentSession && confirm('Clear all messages in this session?')) {
      setMessages([])
      fetch(`/api/sessions/${currentSession.id}/messages`, { method: 'DELETE' })
    }
  }

  const formatNumber = (n: number | undefined, decimals: number = 0): string => {
    if (n === undefined || n === null) return '-'
    return n.toFixed(decimals)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f] cyber-grid-bg">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 glass-card border-b border-neon-cyan/10 flex items-center px-4 gap-4" style={{ borderRadius: 0 }}>
        <Link 
          to="/" 
          className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Dashboard</span>
        </Link>
        <div className="h-6 w-px bg-neon-cyan/20" />
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30">
            <LogoIcon className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <span className="text-sm font-bold text-white font-display">LLM</span>
            <span className="text-sm font-light text-neon-cyan font-display"> Chat</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">v0.1.0</span>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex pt-14 h-screen">
        <ParticleBackground />
        
        {/* Sidebar - Fixed position, independent scroll */}
        <div 
          ref={sidebarRef}
          className={`
            ${sidebarOpen ? 'w-72' : 'w-16'} 
            flex-shrink-0 
            glass-card 
            flex flex-col 
            h-full
            transition-all duration-300 ease-in-out
            z-20
            border-r border-neon-cyan/10
            fixed left-0 top-14 bottom-0
          `}
          style={{ borderRadius: 0 }}
        >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-neon-cyan/10">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-neon-cyan animate-pulse-neon" />
              <span className="text-sm font-semibold text-neon-cyan font-display tracking-wider">
                SESSIONS
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-neon-cyan/10 rounded-lg transition-colors group"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-5 h-5 text-gray-400 group-hover:text-neon-cyan transition-colors" />
            ) : (
              <PanelLeft className="w-5 h-5 text-gray-400 group-hover:text-neon-cyan transition-colors" />
            )}
          </button>
        </div>
        
        {sidebarOpen && (
          <>
            {/* New Chat Button */}
            <div className="p-3">
              <button
                type="button"
                onClick={handleNewSession}
                className="w-full px-4 py-3 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 
                  border border-neon-cyan/30 rounded-xl text-neon-cyan font-medium 
                  hover:border-neon-cyan hover:shadow-neon-cyan/30 hover:shadow-lg
                  transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span className="font-display tracking-wide">NEW CHAT</span>
              </button>
            </div>
            
            {/* Sessions List - Independent Scroll */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {sessions.map(session => (
                <button
                  type="button"
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`
                    session-item w-full text-left p-3 rounded-xl cursor-pointer group
                    border border-transparent
                    ${currentSession?.id === session.id
                      ? 'active bg-neon-cyan/10 border-neon-cyan/30'
                      : 'hover:bg-neon-cyan/5 hover:border-neon-cyan/10'
                    }
                    transition-all duration-300
                  `}
                >
                  {editingTitle === session.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitleValue}
                        onChange={e => setEditTitleValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveTitle(session.id)}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 px-3 py-1.5 text-sm bg-cyber-dark border border-neon-cyan/30 
                          rounded-lg text-gray-200 focus:outline-none focus:border-neon-cyan
                          focus:shadow-neon-cyan/20 focus:shadow-sm"
                      />
                      <button 
                        type="button"
                        onClick={e => { e.stopPropagation(); handleSaveTitle(session.id); }} 
                        className="p-1.5 hover:bg-neon-green/20 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 text-neon-green" />
                      </button>
                      <button 
                        type="button"
                        onClick={e => { e.stopPropagation(); setEditingTitle(null); }} 
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1 text-gray-300 group-hover:text-white transition-colors">
                        {session.title}
                      </span>
                      <div className="hidden group-hover:flex items-center gap-1 ml-2">
                        <button 
                          type="button"
                          onClick={e => handleEditTitle(session, e)} 
                          className="p-1.5 hover:bg-neon-cyan/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-neon-cyan/70" />
                        </button>
                        <button 
                          type="button"
                          onClick={e => handleDeleteSession(session.id, e)} 
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 relative z-10 transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-16'}`}>
        {/* Header */}
        <div className="flex-shrink-0 glass-card border-b border-neon-cyan/10 p-4 relative z-30" style={{ borderRadius: 0 }}>
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 
                border border-neon-cyan/30 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white font-display tracking-wide truncate max-w-md">
                  {currentSession?.title || 'New Chat'}
                </h1>
                <p className="text-xs text-gray-500 font-mono">
                  {selectedProvider || 'No provider'} / {selectedModel || 'No model'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" onClick={clearChat} disabled={messages.length === 0}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Provider & Model Selection */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <select
                className="cyber-select w-full"
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value)
                  setSelectedModel('')
                  setModels([])
                }}
              >
                <option value="">Select provider</option>
                {providers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.display_name || p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 relative">
              <select
                className="cyber-select w-full"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="">Select model</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-4 p-4 glass-card rounded-xl border border-neon-purple/20">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label htmlFor="temperature-slider" className="block text-sm font-medium text-neon-purple mb-2 font-mono">
                    TEMPERATURE: {temperature}
                  </label>
                  <input
                    id="temperature-slider"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-cyber-dark rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                      [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                      [&::-webkit-slider-thumb]:bg-neon-purple [&::-webkit-slider-thumb]:shadow-neon-purple
                      [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
          {/* Empty State */}
          {messages.length === 0 && !streamingContent && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-neon-cyan/10 to-neon-purple/10 
                  border border-neon-cyan/20 flex items-center justify-center animate-float">
                  <MessageSquare className="w-10 h-10 text-neon-cyan/50" />
                </div>
                <h3 className="text-xl font-display text-gray-300 mb-2">Start a conversation</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Select a provider and model, then type your message below to begin testing
                </p>
              </div>
            </div>
          )}
          
          {/* Messages */}
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`
                  max-w-[85%] rounded-2xl px-5 py-4 
                  ${msg.role === 'user'
                    ? 'message-user text-gray-100'
                    : 'message-ai'
                  }
                `}
              >
                {/* User Message */}
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap text-gray-100">{msg.content}</div>
                ) : (
                  <>
                    {/* AI Message Content */}
                    <MessageContent content={msg.content} />
                    
                    {/* Metrics Section */}
                    <div className="mt-4 pt-4 border-t border-neon-purple/20">
                      {/* Status Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        {msg.status === 'success' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30">
                            <CheckCircle className="w-3.5 h-3.5 text-neon-green" />
                            <span className="text-xs font-medium text-neon-green font-mono">SUCCESS</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-xs font-medium text-red-400 font-mono">ERROR</span>
                          </div>
                        )}
                        {msg.metrics && (
                          <span className="text-xs text-gray-500 font-mono">
                            {msg.metrics.modelName}
                          </span>
                        )}
                      </div>
                      
                      {/* Metrics Grid */}
                      {msg.metrics && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <MetricCard icon={Clock} label="Latency" value={`${formatNumber(msg.metrics.latencyMs)}ms`} color="cyan" />
                          <MetricCard icon={Zap} label="TTFT" value={`${formatNumber(msg.metrics.ttftMs)}ms`} color="purple" />
                          <MetricCard icon={Timer} label="TPOT" value={`${formatNumber(msg.metrics.tpotMs, 1)}ms`} color="pink" />
                          <MetricCard icon={Hash} label="Total" value={`${msg.metrics.totalTokens} tok`} color="green" />
                          <MetricCard icon={Sparkles} label="Prompt" value={`${msg.metrics.promptTokens} tok`} color="cyan" />
                          <MetricCard icon={Cpu} label="Completion" value={`${msg.metrics.completionTokens} tok`} color="purple" />
                          <MetricCard icon={Zap} label="Speed" value={`${formatNumber(msg.metrics.tokensPerSecond, 1)} t/s`} color="pink" />
                          <MetricCard icon={Settings} label="Temp" value={`${msg.metrics.temperature}`} color="green" />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          
          {/* Streaming Content */}
          {streamingContent && (
            <div className="flex justify-start animate-slide-up">
              <div className="max-w-[85%] rounded-2xl px-5 py-4 message-ai">
                <MessageContent content={streamingContent} isStreaming />
              </div>
            </div>
          )}
          
          {/* Loading Indicator */}
          {isLoading && !streamingContent && (
            <div className="flex justify-start animate-slide-up">
              <div className="message-ai rounded-2xl px-5 py-4">
                <TypingIndicator />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 relative z-20">
          <div className="glass-card rounded-2xl p-4 border border-neon-cyan/20">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  className="w-full bg-cyber-dark/50 border border-neon-cyan/20 rounded-xl px-4 py-3 
                    resize-none focus:outline-none focus:border-neon-cyan focus:shadow-neon-cyan/20 focus:shadow-lg
                    text-gray-200 placeholder-gray-500 font-body transition-all duration-300"
                  placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                  rows={4}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || !selectedProvider || !selectedModel}
                className="self-end h-12 px-6"
                glow
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            {/* Status Bar */}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600">Provider:</span>
                <span className={selectedProvider ? 'text-neon-cyan' : 'text-gray-600'}>
                  {selectedProvider || 'None'}
                </span>
              </div>
              <span className="text-neon-cyan/30">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600">Model:</span>
                <span className={selectedModel ? 'text-neon-purple' : 'text-gray-600'}>
                  {selectedModel || 'None'}
                </span>
              </div>
              <span className="text-neon-cyan/30">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600">Temp:</span>
                <span className="text-neon-pink">{temperature}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}