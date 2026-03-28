import type { CharacterMood, ToneTag } from '../../chat-performance/types'

export type StageActorMood = CharacterMood | ToneTag

export type StageActorAura = 'radiant' | 'mortal'

export type StageActorIntensity = 'idle' | 'focused' | 'streaming'

export interface StageActorState {
  label: string
  mood: StageActorMood
  aura: StageActorAura
  intensity: StageActorIntensity
}
