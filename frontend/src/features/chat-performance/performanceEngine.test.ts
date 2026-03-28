import { describe, expect, it } from 'vitest'
import {
  buildThinkingCaption,
  deriveConversationTone,
  deriveNpcMood,
  deriveNpcTone,
  derivePlayerMood,
  maybeInjectSideLine,
} from './performanceEngine'

describe('performanceEngine', () => {
  describe('derivePlayerMood', () => {
    it('maps question-like input to confused', () => {
      expect(derivePlayerMood('Wait... what are you talking about?')).toBe('confused')
    })

    it('maps excited input to excited', () => {
      expect(derivePlayerMood('This is amazing! I am so hyped!')).toBe('excited')
    })

    it('maps embarrassed phrasing to embarrassed', () => {
      expect(derivePlayerMood('Uh, this is kind of awkward and embarrassing.')).toBe('embarrassed')
    })

    it('falls back to neutral for plain input', () => {
      expect(derivePlayerMood('Thanks for the update.')).toBe('neutral')
    })
  })

  describe('deriveNpcTone', () => {
    it('maps advisory output to guiding', () => {
      expect(deriveNpcTone('You should start by checking the logs and then retry carefully.')).toBe('guiding')
    })

    it('maps comforting output to gentle', () => {
      expect(deriveNpcTone("It's okay — take your time, you're doing fine.")).toBe('gentle')
    })

    it('maps reassuring assistant wording to gentle', () => {
      expect(deriveNpcTone('You are safe here. It is okay to slow down and breathe.')).toBe('gentle')
    })

    it('falls back to steady for plain output', () => {
      expect(deriveNpcTone('The report completed successfully.')).toBe('steady')
    })
  })

  describe('buildThinkingCaption', () => {
    it('returns the default caption when nonsense is disabled', () => {
      expect(buildThinkingCaption({ includeNonsense: false })).toBe('Thinking...')
    })

    it('returns the nonsense caption only when requested', () => {
      expect(buildThinkingCaption({ includeNonsense: true })).toBe('Calibrating moonbeams...')
    })

    it('returns a reply caption while streaming', () => {
      expect(buildThinkingCaption({ isLoading: true, streamingContent: 'partial reply', tone: 'guiding' })).toBe('Answering carefully...')
    })
  })

  describe('deriveConversationTone', () => {
    it('prefers streaming content over the last assistant message', () => {
      expect(deriveConversationTone({
        latestAssistantContent: 'The report completed successfully.',
        streamingContent: 'You should start by checking the logs.',
      })).toBe('guiding')
    })
  })

  describe('deriveNpcMood', () => {
    it('returns thinking while waiting for the first token', () => {
      expect(deriveNpcMood({ isLoading: true, streamingContent: '', currentTone: 'steady' })).toBe('thinking')
    })

    it('returns responding while streaming content', () => {
      expect(deriveNpcMood({ isLoading: true, streamingContent: 'partial reply', currentTone: 'gentle' })).toBe('responding')
    })

    it('falls back to the current tone when idle', () => {
      expect(deriveNpcMood({ isLoading: false, streamingContent: '', currentTone: 'gentle' })).toBe('gentle')
    })
  })

  describe('maybeInjectSideLine', () => {
    it('usually returns no side line', () => {
      expect(maybeInjectSideLine({ randomValue: 0.5, tone: 'steady' })).toEqual({ kind: 'none', sideLine: null, replaceAnswerBody: false })
    })

    it('returns a prelude below the rarity threshold without replacing the answer body', () => {
      expect(maybeInjectSideLine({ randomValue: 0.01, tone: 'gentle' })).toEqual({
        kind: 'prelude',
        sideLine: '...and lets the answer land softly.',
        replaceAnswerBody: false,
      })
    })

    it('returns no side line at or above the rarity threshold', () => {
      expect(maybeInjectSideLine({ randomValue: 0.05, tone: 'guiding' })).toEqual({ kind: 'none', sideLine: null, replaceAnswerBody: false })
    })
  })
})
