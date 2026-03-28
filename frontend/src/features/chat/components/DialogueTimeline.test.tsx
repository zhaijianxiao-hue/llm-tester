import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DialogueTimeline } from './DialogueTimeline'
import type { Message } from '../../../lib/api'

const formatNumber = (value: number | undefined, decimals: number = 0): string => {
  if (value === undefined || value === null) {
    return '-'
  }

  return value.toFixed(decimals)
}

describe('DialogueTimeline', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    writeText.mockReset()
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    })
  })

  it('shows the thinking caption while loading', () => {
    render(
      <DialogueTimeline
        messages={[]}
        streamingContent=""
        isLoading
        thinkingCaption="Calibrating moonbeams..."
        sideLine={null}
        formatNumber={formatNumber}
      />,
    )

    expect(screen.getByText('Calibrating moonbeams...')).toBeInTheDocument()
  })

  it('renders user messages', () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        session_id: 'session-1',
        role: 'user',
        content: 'Hello from the user side',
        status: 'success',
        created_at: new Date().toISOString(),
      },
    ]

    render(
      <DialogueTimeline
        messages={messages}
        streamingContent=""
        isLoading={false}
        thinkingCaption="Thinking..."
        sideLine={null}
        formatNumber={formatNumber}
      />,
    )

    expect(screen.getByText('Hello from the user side')).toBeInTheDocument()
  })

  it('renders streaming assistant preview', () => {
    render(
      <DialogueTimeline
        messages={[]}
        streamingContent="Partial streamed answer"
        isLoading={false}
        thinkingCaption="Thinking..."
        sideLine={null}
        formatNumber={formatNumber}
      />,
    )

    expect(screen.getByText('Partial streamed answer')).toBeInTheDocument()
  })

  it('renders assistant error state', () => {
    const messages: Message[] = [
      {
        id: 'assistant-error',
        session_id: 'session-1',
        role: 'assistant',
        content: 'Error: request failed',
        status: 'error',
        created_at: new Date().toISOString(),
      },
    ]

    render(
      <DialogueTimeline
        messages={messages}
        streamingContent=""
        isLoading={false}
        thinkingCaption="Thinking..."
        sideLine={null}
        formatNumber={formatNumber}
      />,
    )

    expect(screen.getByText('Error: request failed')).toBeInTheDocument()
    expect(screen.getByText('ERROR')).toBeInTheDocument()
  })

  it('applies the current tone class to the timeline', () => {
    const { container } = render(
      <DialogueTimeline
        messages={[]}
        streamingContent=""
        isLoading={false}
        thinkingCaption="Thinking..."
        sideLine={null}
        currentTone="gentle"
        formatNumber={formatNumber}
      />,
    )

    expect(container.firstChild).toHaveClass('dialogue-timeline--tone-gentle')
  })

  it('copies the actual code block text', () => {
    const messages: Message[] = [
      {
        id: 'assistant-code',
        session_id: 'session-1',
        role: 'assistant',
        content: '```ts\nconst answer = 42\n```',
        status: 'success',
        created_at: new Date().toISOString(),
      },
    ]

    render(
      <DialogueTimeline
        messages={messages}
        streamingContent=""
        isLoading={false}
        thinkingCaption="Thinking..."
        sideLine={null}
        formatNumber={formatNumber}
      />,
    )

    fireEvent.click(screen.getByTitle('Copy code'))

    expect(writeText).toHaveBeenCalledWith('const answer = 42')
  })

  it('renders assistant status and metrics for a completed reply', () => {
    const messages: Message[] = [
      {
        id: 'assistant-1',
        session_id: 'session-1',
        role: 'assistant',
        content: 'Completed response body',
        status: 'success',
        metrics: {
          modelName: 'gpt-test',
          latencyMs: 250,
          ttftMs: 40,
          tpotMs: 7.5,
          promptTokens: 20,
          completionTokens: 30,
          totalTokens: 50,
          tokensPerSecond: 12.3,
          temperature: 0.7,
        },
        created_at: new Date().toISOString(),
      },
    ]

    render(
      <DialogueTimeline
        messages={messages}
        streamingContent=""
        isLoading={false}
        thinkingCaption="Thinking..."
        sideLine={null}
        currentTone="guiding"
        formatNumber={formatNumber}
      />,
    )

    expect(screen.getByText('SUCCESS')).toBeInTheDocument()
    expect(screen.getByText('gpt-test')).toBeInTheDocument()
    expect(screen.getByText('Latency')).toBeInTheDocument()
    expect(screen.getByText('250ms')).toBeInTheDocument()
    expect(screen.getByText('TTFT')).toBeInTheDocument()
    expect(screen.getByText('40ms')).toBeInTheDocument()
    expect(screen.getByText('TPOT')).toBeInTheDocument()
    expect(screen.getByText('7.5ms')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('50 tok')).toBeInTheDocument()
    expect(screen.getByText('Temp')).toBeInTheDocument()
    expect(screen.getByText('0.7')).toBeInTheDocument()
  })
})
