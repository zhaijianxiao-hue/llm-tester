import { useCallback, useEffect, useRef, useState } from 'react'

export interface WSMessage {
  type: 'connected' | 'started' | 'progress' | 'result' | 'complete' | 'error'
  data: Record<string, unknown>
}

export interface UseWebSocketReturn {
  isConnected: boolean
  isTesting: boolean
  progress: number
  results: Record<string, unknown>[]
  summary: Record<string, unknown> | null
  error: string | null
  startTest: (testId: string, params: Record<string, unknown>) => void
  disconnect: () => void
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<Record<string, unknown>[]>([])
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsTesting(false)
  }, [])

  const startTest = useCallback((testId: string, params: Record<string, unknown>) => {
    // Reset state
    setProgress(0)
    setResults([])
    setSummary(null)
    setError(null)
    setIsTesting(true)

    // Create WebSocket connection
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/test/${testId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      // Send test parameters
      ws.send(JSON.stringify(params))
    }

    ws.onmessage = (event) => {
      const message: WSMessage = JSON.parse(event.data)

      switch (message.type) {
        case 'connected':
          // Connection confirmed
          break
        case 'started':
          setIsTesting(true)
          break
        case 'progress':
          setProgress(message.data.progress as number || 0)
          break
        case 'result':
          setResults((prev) => [...prev, message.data])
          break
        case 'complete':
          setSummary(message.data.summary as Record<string, unknown>)
          setIsTesting(false)
          break
        case 'error':
          setError(message.data.message as string)
          setIsTesting(false)
          break
      }
    }

    ws.onerror = () => {
      setError('WebSocket connection error')
      setIsConnected(false)
      setIsTesting(false)
    }

    ws.onclose = () => {
      setIsConnected(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return {
    isConnected,
    isTesting,
    progress,
    results,
    summary,
    error,
    startTest,
    disconnect,
  }
}