/**
 * SIMULATED schedule parsing. The demo does not read your screenshot: it
 * returns a fixed sample schedule so the review step can be exercised.
 *
 * Replace `parseScheduleScreenshot` with a call to a server-side route that
 * sends the image to a vision model. Never call the model from the browser
 * with an API key.
 */
import type { WeeklySchedule } from '../types'
import { sampleParsedSchedule } from '../data/sampleData'

export const PARSER_IS_SIMULATED = true

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

export async function parseScheduleScreenshot(file: File): Promise<WeeklySchedule> {
  const problem = validateScheduleUpload(file)
  if (problem) throw new Error(problem)
  await new Promise((r) => setTimeout(r, 1400))
  return sampleParsedSchedule()
}
