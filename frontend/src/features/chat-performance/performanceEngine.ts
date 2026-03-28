import type { CharacterMood, SideLineResult, ToneTag } from './types'

const NORMAL_THINKING_CAPTION = 'Thinking...'
const NONSENSE_THINKING_CAPTION = 'Calibrating moonbeams...'
const RESPONSE_CAPTION = 'Answering carefully...'

const SIDE_LINES: Record<ToneTag, string> = {
  steady: '...and quietly braces for the reply.',
  guiding: '...and traces a clear path through the answer.',
  gentle: '...and lets the answer land softly.',
}

function normalizeDialogueText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function derivePlayerMood(input: string): CharacterMood {
  const normalized = normalizeDialogueText(input)

  if (/(embarrass|awkward|sorry|uh\b)/.test(normalized)) {
    return 'embarrassed'
  }

  if (/[?]|\b(what|why|how|huh|wait)\b/.test(normalized)) {
    return 'confused'
  }

  if (/(wow|amazing|awesome|hyped|excited|!{1,})/.test(normalized)) {
    return 'excited'
  }

  return 'neutral'
}

export function deriveNpcTone(output: string): ToneTag {
  const normalized = normalizeDialogueText(output)

  if (/(you should|try|start by|consider|next step)/.test(normalized)) {
    return 'guiding'
  }

  if (/(it's okay|its okay|it is okay|take your time|you(?:'| a)re doing fine|don't worry|safe here|slow down|breathe)/.test(normalized)) {
    return 'gentle'
  }

  return 'steady'
}

export function deriveConversationTone(options: {
  latestAssistantContent?: string | null
  streamingContent?: string | null
}): ToneTag {
  const activeContent = options.streamingContent?.trim() ? options.streamingContent : options.latestAssistantContent
  return deriveNpcTone(activeContent ?? '')
}

export function deriveNpcMood(options: {
  isLoading: boolean
  streamingContent?: string | null
  currentTone: ToneTag
}): CharacterMood | ToneTag {
  if (options.streamingContent?.trim()) {
    return 'responding'
  }

  if (options.isLoading) {
    return 'thinking'
  }

  return options.currentTone
}

export function buildThinkingCaption(options: {
  includeNonsense?: boolean
  isLoading?: boolean
  streamingContent?: string | null
  tone?: ToneTag
}): string {
  if (options.streamingContent?.trim()) {
    return RESPONSE_CAPTION
  }

  if (options.includeNonsense) {
    return NONSENSE_THINKING_CAPTION
  }

  if (options.isLoading && options.tone === 'gentle') {
    return 'Gathering a gentle reply...'
  }

  if (options.isLoading && options.tone === 'guiding') {
    return 'Tracing the next step...'
  }

  return NORMAL_THINKING_CAPTION
}

export function maybeInjectSideLine(options: { randomValue: number; tone: ToneTag }): SideLineResult {
  if (options.randomValue < 0.05) {
    return {
      kind: 'prelude',
      sideLine: SIDE_LINES[options.tone],
      replaceAnswerBody: false,
    }
  }

  return {
    kind: 'none',
    sideLine: null,
    replaceAnswerBody: false,
  }
}

export function deriveStableRandomValue(seed: string): number {
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0
  }

  return Math.abs(hash % 1000) / 1000
}
