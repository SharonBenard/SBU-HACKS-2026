import { useApp, useToast } from '../state/context'
import { PageHead } from '../components/PageHead'
import { ScheduleEditor } from '../components/ScheduleEditor'
import { Notice } from '../components/Notice'
import { useRef, useState } from 'react'
import type { BusyBlock } from '../types'
import { parseScheduleScreenshot } from '../services/scheduleParser' 

function ImportButton({ onParsed }: { onParsed: (blocks: BusyBlock[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const schedule = await parseScheduleScreenshot(file)
      onParsed(schedule.blocks)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button type="button" className="btn btn-primary btn-block" disabled={loading} onClick={() => inputRef.current?.click()}>
        {loading ? 'Reading your schedule…' : 'Import from screenshot'}
      </button>
      {error && <p className="error-text" role="alert">{error}</p>}
    </>
  )
}

export function EditSchedule() {
  const { data, dispatch } = useApp()
  const toast = useToast()
  const schedule = data.schedule ?? { blocks: [], source: 'manual' as const }

  return (
    <div className="page">
      <PageHead title="Weekly schedule" fallback="/me" />
      <Notice tone="green" icon="none">
        Tap an hour to cycle free → class → other commitment. Changes save automatically and update your free time
        everywhere.
      </Notice>

      <ImportButton onParsed={(blocks) => dispatch({ type: 'setSchedule', schedule: { ...schedule, blocks } })} />

      <ScheduleEditor
        blocks={schedule.blocks}
        onChange={(blocks) => dispatch({ type: 'setSchedule', schedule: { ...schedule, blocks } })}
      />
      <Notice tone="info" icon="lock">
        Friends only see free or busy. Class names stay private to you.
      </Notice>

      {schedule.blocks.length > 0 && (
        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={() => {
            dispatch({ type: 'setSchedule', schedule: { blocks: [], source: 'manual' } })
            toast.show('Schedule cleared.')
          }}
        >
          Clear whole schedule
        </button>
      )}
    </div>
  )
}
