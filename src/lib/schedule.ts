import type { BlockKind, BusyBlock, DayIndex } from '../types'
import { DAY_SHORT, formatRange } from './dates'
import { newId } from './ids'

export const GRID_START_HOUR = 9
export const GRID_END_HOUR = 21 // exclusive: last row is 8 PM
export const GRID_HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i)

export const COMMITMENT_KINDS: { kind: Exclude<BlockKind, 'class'>; label: string }[] = [
  { kind: 'work', label: 'Work shift' },
  { kind: 'meeting', label: 'Meeting' },
  { kind: 'commute', label: 'Commute' },
  { kind: 'other', label: 'Other' },
]

export function kindLabel(kind: BlockKind): string {
  if (kind === 'class') return 'Class'
  return COMMITMENT_KINDS.find((k) => k.kind === kind)?.label ?? 'Commitment'
}

/** What occupies the hour starting at `hour` on `day`, if anything. */
export function cellKind(blocks: BusyBlock[], day: DayIndex, hour: number): BlockKind | null {
  const start = hour * 60
  const end = start + 60
  const hit = blocks.find((b) => b.day === day && b.start < end && b.end > start)
  return hit ? hit.kind : null
}

/** Remove [start, end) on `day` from every block, splitting blocks as needed. */
export function clearRange(blocks: BusyBlock[], day: DayIndex, start: number, end: number): BusyBlock[] {
  const out: BusyBlock[] = []
  for (const b of blocks) {
    if (b.day !== day || b.end <= start || b.start >= end) {
      out.push(b)
      continue
    }
    if (b.start < start) out.push({ ...b, end: start })
    if (b.end > end) out.push({ ...b, id: newId('blk'), start: end })
  }
  return out
}

/** Merge touching blocks on the same day with the same kind and label. */
export function mergeBlocks(blocks: BusyBlock[]): BusyBlock[] {
  const sorted = [...blocks].sort((a, b) => a.day - b.day || a.start - b.start)
  const out: BusyBlock[] = []
  for (const b of sorted) {
    const last = out[out.length - 1]
    if (last && last.day === b.day && last.kind === b.kind && last.label === b.label && b.start <= last.end) {
      out[out.length - 1] = { ...last, end: Math.max(last.end, b.end) }
    } else {
      out.push({ ...b })
    }
  }
  return out
}

export function setCell(blocks: BusyBlock[], day: DayIndex, hour: number, kind: BlockKind | null): BusyBlock[] {
  const start = hour * 60
  const cleared = clearRange(blocks, day, start, start + 60)
  if (!kind) return mergeBlocks(cleared)
  const label = kind === 'class' ? undefined : kindLabel(kind)
  return mergeBlocks([...cleared, { id: newId('blk'), day, start, end: start + 60, kind, label }])
}

/** Tap cycle on the review grid: free → class → other commitment → free. */
export function nextCellKind(kind: BlockKind | null): BlockKind | null {
  if (kind === null) return 'class'
  if (kind === 'class') return 'other'
  return null
}

export function addCommitment(blocks: BusyBlock[], block: Omit<BusyBlock, 'id'>): BusyBlock[] {
  const cleared = clearRange(blocks, block.day, block.start, block.end)
  return mergeBlocks([...cleared, { ...block, id: newId('blk') }])
}

export function describeBlock(b: BusyBlock): string {
  return `${b.label ?? kindLabel(b.kind)} · ${DAY_SHORT[b.day]} ${formatRange(b.start, b.end)}`
}

export function scheduleSummary(blocks: BusyBlock[]): string {
  const classes = blocks.filter((b) => b.kind === 'class')
  const classNames = new Set(classes.map((b) => b.label ?? `${b.day}-${b.start}`))
  const nClasses = classes.some((b) => b.label) ? classNames.size : classes.length
  const others = blocks.filter((b) => b.kind !== 'class').length
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : word.endsWith('s') ? 'es' : 's'}`
  return `${plural(nClasses, 'class')} · ${plural(others, 'other commitment')}`
}
