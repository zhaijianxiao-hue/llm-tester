import type { PropsWithChildren } from 'react'
import { SceneLayer } from './SceneLayer'
import type { StageActorState } from './chatStage.types'

interface CharacterStageProps extends PropsWithChildren {
  npc: StageActorState
  player: StageActorState
}

function getActorClassName(side: 'npc' | 'player', actor: StageActorState) {
  return [
    'stage-actor',
    `stage-actor--${side}`,
    `stage-actor--mood-${actor.mood}`,
    `stage-actor--aura-${actor.aura}`,
    `stage-actor--intensity-${actor.intensity}`,
  ].join(' ')
}

export function CharacterStage({ npc, player, children }: CharacterStageProps) {
  return (
    <section
      className={`character-stage character-stage--npc-${npc.mood} character-stage--npc-intensity-${npc.intensity}`}
      aria-label="Character stage"
    >
      <SceneLayer />

      <div className="character-stage__actors" aria-hidden="true">
        <div className={getActorClassName('npc', npc)}>
          <span className="stage-actor__sigil" />
          <span className="stage-actor__label">{npc.label}</span>
        </div>

        <div className={getActorClassName('player', player)}>
          <span className="stage-actor__sigil" />
          <span className="stage-actor__label">{player.label}</span>
        </div>
      </div>

      <div className="character-stage__content">{children}</div>
    </section>
  )
}
