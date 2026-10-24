import type { CSSProperties } from 'react'
import type { Person } from '../types'

interface AvatarProps {
  person: Pick<Person, 'initials' | 'color' | 'name'> | undefined
  size?: number
  ring?: 'now' | 'later' | 'none'
  /** Avatars are usually next to the name, so they're hidden from screen readers by default. */
  labelled?: boolean
}

export function Avatar({ person, size = 40, ring, labelled = false }: AvatarProps) {
  const circle = (
    <span
      className="avatar"
      style={{ '--size': `${size}px`, background: person?.color ?? '#ddd' } as CSSProperties}
      aria-hidden={labelled ? undefined : true}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? person?.name : undefined}
    >
      {person?.initials ?? '?'}
    </span>
  )
  if (!ring) return circle
  return <span className={`avatar-ring ring-${ring}`}>{circle}</span>
}
