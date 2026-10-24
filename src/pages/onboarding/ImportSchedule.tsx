import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router'
import { ImageUp, PencilLine } from 'lucide-react'
import { OnboardingFrame } from './OnboardingFrame'
import { DemoTag, Notice } from '../../components/Notice'
import { parseScheduleScreenshot, validateScheduleUpload } from '../../services/scheduleParser'
import { useApp } from '../../state/context'

export function ImportSchedule() {
  const { dispatch } = useApp()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)

  const choose = (f: File | undefined) => {
    if (!f) return
    const problem = validateScheduleUpload(f)
    setError(problem)
    setFile(problem ? null : f)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    choose(e.dataTransfer.files[0])
  }

  const parse = async () => {
    if (!file) return
    setParsing(true)
    setError(null)
    try {
      const schedule = await parseScheduleScreenshot(file)
      dispatch({ type: 'setSchedule', schedule })
      dispatch({ type: 'setOnboarding', step: 'review' })
      navigate('/onboarding/review')
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't read that screenshot. Try again or enter it manually.")
    } finally {
      setParsing(false)
    }
  }

  const manual = () => {
    dispatch({ type: 'setSchedule', schedule: { blocks: [], source: 'manual' } })
    dispatch({ type: 'setOnboarding', step: 'review' })
    navigate('/onboarding/review')
  }

  return (
    <OnboardingFrame title="Add your class schedule" step={2}>
      <p className="muted">
        Upload a screenshot of your SOLAR weekly schedule. Friends only ever see when you're free or busy, never your
        class names.
      </p>

      <div
        className={`upload-drop${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <ImageUp size={34} aria-hidden color="var(--blue-text)" />
        {file ? (
          <p>
            <strong>{file.name}</strong>
            <br />
            <span className="small muted">{Math.max(1, Math.round(file.size / 1024))} KB · ready to read</span>
          </p>
        ) : (
          <p>
            <strong>Drop a screenshot here</strong>
            <br />
            <span className="small muted">PNG or JPG, up to 10 MB</span>
          </p>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
          className="visually-hidden"
          id="schedule-file"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current?.click()}>
          {file ? 'Choose a different image' : 'Choose image'}
        </button>
      </div>

      {error && (
        <Notice tone="error" role="alert">
          {error}
        </Notice>
      )}

      <Notice tone="demo">
        <DemoTag /> Schedule reading is simulated. Your image isn't uploaded or read. The demo fills in a sample
        schedule for you to review and fix.
      </Notice>

      <button type="button" className="btn btn-primary btn-block" disabled={!file || parsing} onClick={parse}>
        {parsing ? (
          <>
            <span className="spinner" aria-hidden /> Reading your schedule…
          </>
        ) : (
          'Read my schedule'
        )}
      </button>
      {parsing && (
        <div className="stack-sm" aria-hidden>
          <div className="skeleton" style={{ height: 18, width: '60%' }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
      )}
      <button type="button" className="btn btn-secondary btn-block" onClick={manual} disabled={parsing}>
        <PencilLine size={18} aria-hidden /> Enter my schedule manually
      </button>
    </OnboardingFrame>
  )
}
