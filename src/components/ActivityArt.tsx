import {
  Coffee,
  CookingPot,
  CupSoda,
  Dices,
  Film,
  Sailboat,
  Shirt,
  ShoppingBag,
  Store,
  TreePine,
  Trophy,
  Utensils,
  Volleyball,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityArt as Art } from '../types'

const ART: Record<Art, { icon: LucideIcon; bg: string }> = {
  film: { icon: Film, bg: '#f6d9a8' },
  bowling: { icon: Trophy, bg: '#c9ddf0' },
  mall: { icon: ShoppingBag, bg: '#f4c9b8' },
  paddle: { icon: Volleyball, bg: '#cfe6c1' },
  coffee: { icon: Coffee, bg: '#ebd5be' },
  village: { icon: Store, bg: '#e2d7f0' },
  beach: { icon: Waves, bg: '#bfe0ea' },
  food: { icon: Utensils, bg: '#f7d7a5' },
  thrift: { icon: Shirt, bg: '#f2cfe0' },
  games: { icon: Dices, bg: '#d6e4c6' },
  harbor: { icon: Sailboat, bg: '#bcd6ee' },
  trail: { icon: TreePine, bg: '#cde5c3' },
  boba: { icon: CupSoda, bg: '#f3d2df' },
  cooking: { icon: CookingPot, bg: '#f6ddb4' },
}

/** Illustrated tile standing in for a photo (no stock photos are bundled). */
export function ActivityArt({ art, size = 76 }: { art: Art; size?: number }) {
  const { icon: Icon, bg } = ART[art]
  return (
    <span className="activity-art" style={{ background: bg, width: size, height: size }} aria-hidden>
      <Icon size={Math.round(size * 0.42)} strokeWidth={1.8} />
    </span>
  )
}
