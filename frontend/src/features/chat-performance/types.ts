export type CharacterMood = 'neutral' | 'confused' | 'excited' | 'embarrassed' | 'thinking' | 'responding'

export type ToneTag = 'steady' | 'guiding' | 'gentle'

export type SideLineKind = 'none' | 'prelude'

export interface SideLineResult {
  kind: SideLineKind
  sideLine: string | null
  replaceAnswerBody: false
}
