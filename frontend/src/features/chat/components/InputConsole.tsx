import { forwardRef, type KeyboardEvent, type TextareaHTMLAttributes } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '../../../components/ui/Button'

interface InputConsoleProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  canSend: boolean
  isLoading: boolean
  providerLabel: string
  modelLabel: string
  temperatureLabel: string
}

export const InputConsole = forwardRef<HTMLTextAreaElement, InputConsoleProps>(function InputConsole({
  value,
  onChange,
  onSend,
  canSend: _canSend,
  isLoading,
  disabled,
  providerLabel,
  modelLabel,
  temperatureLabel,
  className,
  onKeyDown,
  placeholder = 'Speak your next line... (Enter to send, Shift+Enter for new line)',
  rows = 4,
  ...props
}, ref) {
  const hasInput = value.trim().length > 0
  const canTriggerSend = hasInput && !disabled && !isLoading

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()

      if (canTriggerSend) {
        onSend()
      }

      return
    }

    onKeyDown?.(event)
  }

  return (
    <div className="input-console glass-card rounded-2xl p-4 border border-neon-cyan/20">
      <div className="input-console__frame">
        <div className="input-console__header">
          <span className="input-console__eyebrow">PLAYER SPEECH CONSOLE</span>
          <span className="input-console__hint">Enter sends · Shift+Enter adds a new line</span>
        </div>

        <div className="input-console__body">
          <label className="sr-only" htmlFor="player-speech-console">Player speech console</label>
          <textarea
            {...props}
            id="player-speech-console"
            ref={ref}
            className={[
              'input-console__textarea',
              className,
            ].filter(Boolean).join(' ')}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            aria-label="Player speech console"
          />

          <Button
            onClick={onSend}
            disabled={!canTriggerSend}
            className="input-console__send self-end h-12 px-6"
            glow
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="input-console__send-content">
                <Send className="w-5 h-5" />
                <span className="input-console__send-pulse" aria-hidden="true" />
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="input-console__status">
        <div className="input-console__status-item">
          <span className="input-console__status-label">Provider</span>
          <span className={providerLabel === 'None' ? 'text-gray-600' : 'text-neon-cyan'}>{providerLabel}</span>
        </div>
        <span className="input-console__status-divider">|</span>
        <div className="input-console__status-item">
          <span className="input-console__status-label">Model</span>
          <span className={modelLabel === 'None' ? 'text-gray-600' : 'text-neon-purple'}>{modelLabel}</span>
        </div>
        <span className="input-console__status-divider">|</span>
        <div className="input-console__status-item">
          <span className="input-console__status-label">Temp</span>
          <span className="text-neon-pink">{temperatureLabel}</span>
        </div>
      </div>
    </div>
  )
})
