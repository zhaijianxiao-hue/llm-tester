import { Children, isValidElement, useCallback, useState } from 'react'
import type { Ref } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Cpu,
  Hash,
  MessageSquare,
  Settings,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from '../../../lib/api'
import type { ToneTag } from '../../chat-performance/types'

interface DialogueTimelineProps {
  messages: Message[]
  streamingContent: string
  isLoading: boolean
  thinkingCaption: string
  sideLine: string | null
  currentTone?: ToneTag
  formatNumber: (value: number | undefined, decimals?: number) => string
  endMarkerRef?: Ref<HTMLDivElement>
}

function extractTextContent(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(extractTextContent).join('')
  }

  if (isValidElement(node)) {
    return extractTextContent(node.props.children)
  }

  return Children.toArray(node).map(extractTextContent).join('')
}

function TypingIndicator() {
  return (
    <div className="typing-indicator" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

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
                onClick={() => handleCopy(extractTextContent(children).replace(/\n$/, ''))}
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

export function DialogueTimeline({
  messages,
  streamingContent,
  isLoading,
  thinkingCaption,
  sideLine,
  currentTone = 'steady',
  formatNumber,
  endMarkerRef,
}: DialogueTimelineProps) {
  const hasEmptyState = messages.length === 0 && !streamingContent
  const assistantToneClass = `dialogue-bubble--tone-${currentTone}`

  return (
    <div
      className={`flex-1 overflow-y-auto p-6 space-y-6 relative stage-shell__messages dialogue-timeline dialogue-timeline--tone-${currentTone}`}
      role="log"
      aria-label="Dialogue timeline"
      aria-live="polite"
      aria-relevant="additions"
    >
      {hasEmptyState && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-neon-cyan/10 to-neon-purple/10 border border-neon-cyan/20 flex items-center justify-center animate-float">
              <MessageSquare className="w-10 h-10 text-neon-cyan/50" />
            </div>
            <h3 className="text-xl font-display text-gray-300 mb-2">Start a conversation</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Select a provider and model, then type your message below to begin testing
            </p>
          </div>
        </div>
      )}

      {messages.map((msg, index) => (
        <div
          key={msg.id}
          className={`dialogue-timeline__entry flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {msg.role === 'user' ? (
            <div className="max-w-[85%] rounded-2xl px-5 py-4 message-user dialogue-bubble dialogue-bubble--user">
              <div className="whitespace-pre-wrap text-gray-100">{msg.content}</div>
            </div>
          ) : (
            <div className={`max-w-[85%] rounded-2xl px-5 py-4 message-ai dialogue-bubble dialogue-bubble--assistant ${assistantToneClass}`}>
              <MessageContent content={msg.content} />

              {msg.status === 'error' ? (
                <div className="mt-4 pt-4 border-t border-red-500/20">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 w-fit">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs font-medium text-red-400 font-mono">ERROR</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-neon-purple/20">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30">
                      <CheckCircle className="w-3.5 h-3.5 text-neon-green" />
                      <span className="text-xs font-medium text-neon-green font-mono">SUCCESS</span>
                    </div>
                    {msg.metrics && (
                      <span className="text-xs text-gray-500 font-mono">
                        {msg.metrics.modelName}
                      </span>
                    )}
                  </div>

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
              )}
            </div>
          )}
        </div>
      ))}

      {sideLine && (
        <div className={`dialogue-timeline__aside dialogue-timeline__aside--tone-${currentTone} text-sm text-amber-100/80 italic pl-2`}>
          {sideLine}
        </div>
      )}

      {streamingContent && (
        <div className="dialogue-timeline__entry flex justify-start animate-slide-up" role="status" aria-label="Assistant streaming response">
          <div className={`max-w-[85%] rounded-2xl px-5 py-4 message-ai dialogue-bubble dialogue-bubble--assistant dialogue-bubble--streaming ${assistantToneClass}`}>
            <MessageContent content={streamingContent} isStreaming />
          </div>
        </div>
      )}

      {isLoading && !streamingContent && (
        <div className="dialogue-timeline__entry flex justify-start animate-slide-up" role="status" aria-label="Assistant thinking">
          <div className={`message-ai rounded-2xl px-5 py-4 dialogue-bubble dialogue-bubble--assistant dialogue-bubble--thinking ${assistantToneClass}`}>
            <div className="flex flex-col items-start gap-3">
              <TypingIndicator />
              <span className="dialogue-timeline__thinking text-xs uppercase tracking-[0.24em] text-amber-100/70">
                {thinkingCaption}
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={endMarkerRef} />
    </div>
  )
}
