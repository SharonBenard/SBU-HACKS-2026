import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import type { BlockKind, BusyBlock, DayIndex } from '../types'
import { DAY_LONG, DAY_SHORT, formatTime, fromTimeInput, hourLabel } from '../lib/dates'
import {
  COMMITMENT_KINDS,
  GRID_HOURS,
  addCommitment,
  cellKind,
  describeBlock,
  kindLabel,
  nextCellKind,
  setCell,
} from '../lib/schedule'

interface ScheduleEditorProps {
  blocks: BusyBlock[]
  onChange: (blocks: BusyBlock[]) => void
}

const DAYS: DayIndex[] = [0, 1, 2, 3, 4, 5, 6]

/**
 * Tap-to-fix weekly grid (free → class → other commitment → free) plus a
 * list of work, meeting and commute blocks.
 */
export function ScheduleEditor({ blocks, onChange }: ScheduleEditorProps) {
  const commitments = blocks.filter((b) => b.kind !== 'class')
  return (
    <div className="stack">
      <div className="card" style={{ padding: 12 }}>
        <div className="sched-grid" role="grid" aria-label="Weekly busy hours. Activate a cell to change it.">
          <span aria-hidden />
          {DAYS.map((d) => (
            <span key={d} className="col-head" aria-hidden>
              {DAY_SHORT[d]}
            </span>
          ))}
          {GRID_HOURS.map((hour) => (
            <Row key={hour} hour={hour} blocks={blocks} onChange={onChange} />
          ))}
        </div>
        <div className="legend" style={{ marginTop: 12 }}>
          <span>
            <i style={{ background: 'var(--navy)' }} /> Class
          </span>
          <span>
            <i style={{ background: 'var(--gold)' }} /> Other commitment
          </span>
          <span>
            <i style={{ background: 'var(--cell)' }} /> Free
          </span>
        </div>
      </div>

      <div className="stack-sm">
        <h2 className="section-title">Work, meetings &amp; commute</h2>
        {commitments.length === 0 && <p className="small muted">No other commitments yet.</p>}
        {commitments.map((b) => (
          <div key={b.id} className="copy-box">
            <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--gold)', flex: 'none' }} aria-hidden />
            <span className="grow small" style={{ fontWeight: 600 }}>
              {describeBlock(b)}
            </span>
            <button
              type="button"
              className="btn-link danger"
              onClick={() => onChange(blocks.filter((x) => x.id !== b.id))}
              aria-label={`Remove ${describeBlock(b)}`}
            >
              Remove
            </button>
          </div>
        ))}
        <AddCommitment onAdd={(b) => onChange(addCommitment(blocks, b))} />
      </div>
    </div>
  )
}

function Row({ hour, blocks, onChange }: { hour: number } & ScheduleEditorProps) {
  return (
    <div role="row" style={{ display: 'contents' }}>
      <span role="rowheader" className="row-head">
        {hourLabel(hour)}
      </span>
      {DAYS.map((d) => {
        const kind = cellKind(blocks, d, hour)
        const cls = kind === 'class' ? 'k-class' : kind ? 'k-commit' : ''
        const state = kind ? kindLabel(kind) : 'Free'
        return (
          <span role="gridcell" key={d} style={{ display: 'contents' }}>
            <button
              type="button"
              className={`sched-cell ${cls}`}
              aria-label={`${DAY_LONG[d]} ${formatTime(hour * 60)}: ${state}`}
              onClick={() => onChange(setCell(blocks, d, hour, nextCellKind(kind)))}
            />
          </span>
        )
      })}
    </div>
  )
}

function AddCommitment({ onAdd }: { onAdd: (b: Omit<BusyBlock, 'id'>) => void }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<Exclude<BlockKind, 'class'>>('work')
  const [label, setLabel] = useState('')
  const [day, setDay] = useState<DayIndex>(4)
  const [start, setStart] = useState('17:00')
  const [end, setEnd] = useState('21:00')
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button type="button" className="btn btn-secondary btn-block" style={{ borderStyle: 'dashed' }} onClick={() => setOpen(true)}>
        <Plus size={18} aria-hidden /> Add work, meeting or commute
      </button>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const s = fromTimeInput(start)
    const en = fromTimeInput(end)
    if (s === null || en === null) return setError('Enter a start and end time.')
    if (en <= s) return setError('End time must be after the start time.')
    onAdd({ day, start: s, end: en, kind, label: label.trim() || kindLabel(kind) })
    setOpen(false)
    setLabel('')
    setError(null)
  }

  return (
    <form className="card stack" onSubmit={submit} aria-label="Add a commitment">
      <div className="field-row">
        <label className="field">
          <span className="label">Type</span>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {COMMITMENT_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Day</span>
          <select className="input" value={day} onChange={(e) => setDay(Number(e.target.value) as DayIndex)}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {DAY_LONG[d]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="label">Name (optional)</span>
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={kindLabel(kind)} />
      </label>
      <div className="field-row">
        <label className="field">
          <span className="label">Starts</span>
          <input className="input" type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Ends</span>
          <input className="input" type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="btn-row">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-sm">
          Add
        </button>
      </div>
    </form>
  )
}
