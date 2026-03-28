import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CharacterStage } from './CharacterStage'
import type { StageActorState } from './chatStage.types'

describe('CharacterStage', () => {
  it('renders stage labels for 如来 and 主角', () => {
    const actors: { npc: StageActorState; player: StageActorState } = {
      npc: {
        label: '如来',
        mood: 'steady',
        aura: 'radiant',
        intensity: 'idle',
      },
      player: {
        label: '主角',
        mood: 'neutral',
        aura: 'mortal',
        intensity: 'idle',
      },
    }

    render(<CharacterStage npc={actors.npc} player={actors.player}><div>messages</div></CharacterStage>)

    expect(screen.getByText('如来')).toBeInTheDocument()
    expect(screen.getByText('主角')).toBeInTheDocument()
  })
})
