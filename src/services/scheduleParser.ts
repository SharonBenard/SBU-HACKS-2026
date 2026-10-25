import type { BusyBlock, DayIndex, WeeklySchedule } from '../types'
import { DAY_SHORT, fromTimeInput } from '../lib/dates'
import { newId } from '../lib/ids'
import { mergeBlocks } from '../lib/schedule'
import { sampleParsedSchedule } from '../data/sampleData'

export const PARSER_IS_SIMULATED = false

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']

export function validateScheduleUpload(file: File): string | null {
  if (!ACCEPTED.includes(file.type) && !/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name)) {
    return 'That file is not an image. Upload a PNG or JPG screenshot of your SOLAR schedule.'
  }
  if (file.size > MAX_BYTES) return 'That image is over 10 MB. Try a smaller screenshot.'
  if (file.size === 0) return 'That file is empty. Try taking the screenshot again.'
  return null
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface ApiEvent {
  title: string
  days: string[]
  start_time: string
  end_time: string
  location?: string | null
}

const ALL_DAYS: DayIndex[] = [0, 1, 2, 3, 4, 5, 6]

/** "Mon" -> your DayIndex, based on whatever order DAY_SHORT uses. */
function dayIndexFor(name: string): DayIndex | null {
  const key = name.slice(0, 3).toLowerCase()
  return ALL_DAYS.find((d) => DAY_SHORT[d].slice(0, 3).toLowerCase() === key) ?? null
}

function toBlocks(events: ApiEvent[]): BusyBlock[] {
  const blocks: BusyBlock[] = []
  for (const ev of events) {
    const start = fromTimeInput(ev.start_time)
    const end = fromTimeInput(ev.end_time)
    if (start === null || end === null || end <= start) continue
    for (const dayName of ev.days) {
      const day = dayIndexFor(dayName)
      if (day === null) continue
      blocks.push({ id: newId('blk'), day, start, end, kind: 'class', label: ev.title })
    }
  }
  return mergeBlocks(blocks)
}

export async function parseScheduleScreenshot(file: File): Promise<WeeklySchedule> {
  const problem = validateScheduleUpload(file)
  if (problem) throw new Error(problem)

  const form = new FormData()
  form.append('file', file)

  let res: Response
  try {
    res = await fetch(`${API_URL}/extract-schedule`, { method: 'POST', body: form })
  } catch {
    throw new Error('Could not reach the schedule reader. Is the backend running?')
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? 'Could not read that screenshot. Try a clearer one.')
  }

  const data: { events: ApiEvent[] } = await res.json()
  const blocks = toBlocks(data.events)
  if (blocks.length === 0) throw new Error('No classes found in that image.')

  // Reuse the `source` value the sample data already uses, so the types match.
  return { ...sampleParsedSchedule(), blocks }
}
