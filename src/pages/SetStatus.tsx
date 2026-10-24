import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useApp, useToast } from '../state/context'
import { acceptedFriends, currentEnergy, getMyStatus } from '../state/selectors'
import { PageHead } from '../components/PageHead'
import { ChoiceGroup } from '../components/ChoiceGroup'
import { Notice } from '../components/Notice'
import { PRESET_WINDOWS } from '../lib/availability'
import {
  DAY_SHORT,
  addDays,
  formatRange,
  formatTime,
  fromTimeInput,
  parseISODate,
  relativeDayLong,
  toTimeInput,
  weekdayIndex,
} from '../lib/dates'
import { newId } from '../lib/ids'
import { ACTIVITY_OPTIONS, BUDGET_OPTIONS, ENERGY_OPTIONS } from '../lib/labels'
import type { ActivityPref, Budget, Energy, Status } from '../types'

type Preset = keyof typeof PRESET_WINDOWS | 'custom'

function presetFor(start: number, end: number): Preset {
  const hit = (Object.keys(PRESET_WINDOWS) as (keyof typeof PRESET_WINDOWS)[]).find(
    (k) => PRESET_WINDOWS[k].range[0] === start && PRESET_WINDOWS[k].range[1] === end,
  )
  return hit ?? 'custom'
}

export function SetStatus() {
  const world = useApp()
  const { dispatch, today, nowMinutes } = world
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const existing = getMyStatus(world)
  const nowStart = Math.floor(nowMinutes / 15) * 15

  // Prefill: query params (from "Use this time") > current status > defaults.
  const qDate = params.get('date')
  const qStart = params.get('start')
  const qEnd = params.get('end')
  const fromQuery = qDate && qStart && qEnd ? { date: qDate, start: Number(qStart), end: Number(qEnd) } : null
  const seed = fromQuery ?? (existing ? { date: existing.date, start: existing.start, end: existing.end } : null)
  const seedIsNow = seed ? seed.date === today && seed.start <= nowMinutes : !fromQuery

  const [mode, setMode] = useState<'now' | 'later'>(seed ? (seedIsNow ? 'now' : 'later') : nowMinutes < 22 * 60 ? 'now' : 'later')
  const [date, setDate] = useState(seed && !seedIsNow ? seed.date : addDays(today, 1))
  const [start, setStart] = useState(toTimeInput(seed && !seedIsNow ? seed.start : PRESET_WINDOWS.evening.range[0]))
  const [end, setEnd] = useState(toTimeInput(seed && !seedIsNow ? seed.end : PRESET_WINDOWS.evening.range[1]))
  const [nowUntil, setNowUntil] = useState(
    toTimeInput(seed && seedIsNow ? seed.end : Math.min(Math.ceil((nowMinutes + 120) / 30) * 30, 24 * 60 - 1)),
  )
  const [activity, setActivity] = useState<ActivityPref>(existing?.activity ?? 'anything')
  const [budget, setBudget] = useState<Budget>(existing?.budget ?? 'under15')
  const [energy, setEnergy] = useState<Energy>(currentEnergy(world) ?? existing?.energy ?? 'social')
  const [error, setError] = useState<string | null>(null)

  const s = fromTimeInput(start)
  const e = fromTimeInput(end)
  const preset: Preset = s !== null && e !== null ? presetFor(s, e) : 'custom'
  const friendCount = acceptedFriends(world).length
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))

  const chosen = (() => {
    if (mode === 'now') {
      const until = fromTimeInput(nowUntil)
      return until === null ? null : { date: today, start: nowStart, end: until }
    }
    return s === null || e === null ? null : { date, start: s, end: e }
  })()

  const validate = (): string | null => {
    if (!chosen) return 'Enter a start and end time.'
    if (chosen.end <= chosen.start) return 'The end time must be after the start time.'
    if (chosen.end - chosen.start < 30) return 'Pick a window of at least 30 minutes.'
    if (chosen.date === today && chosen.end <= nowMinutes + 15) return 'That time has already passed. Pick a later time.'
    if (mode === 'later' && chosen.date === today && chosen.start < nowMinutes) {
      return 'That window has already started. Use "Right now" instead.'
    }
    return null
  }

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    const problem = validate()
    setError(problem)
    if (problem || !chosen) return
    const status: Status = {
      id: newId('st'),
      personId: 'me',
      mode,
      ...chosen,
      activity,
      budget,
      energy,
    }
    dispatch({ type: 'setStatus', status })
    dispatch({ type: 'setEnergy', level: energy, date: today })
    navigate('/suggestions')
  }

  const expiresText = chosen
    ? `${formatTime(chosen.end)} ${chosen.date === today ? 'today' : DAY_SHORT[weekdayIndex(chosen.date)]}`
    : 'the end of your window'

  return (
    <div className="page">
      <PageHead title="I'm down to hang" />
      <form className="stack" onSubmit={submit} noValidate style={{ gap: 20 }}>
        <fieldset className="stack-sm">
          <legend className="section-title">When are you free?</legend>
          <div className="segmented" role="group" aria-label="Right now or later">
            <button type="button" aria-pressed={mode === 'now'} onClick={() => setMode('now')}>
              Right now
            </button>
            <button type="button" aria-pressed={mode === 'later'} onClick={() => setMode('later')}>
              Later this week
            </button>
          </div>

          {mode === 'now' ? (
            <div className="field-row" style={{ alignItems: 'end' }}>
              <div className="field">
                <span className="label">From</span>
                <div className="input" style={{ display: 'flex', alignItems: 'center', background: 'var(--cream-deep)' }}>
                  Now ({formatTime(nowStart)})
                </div>
              </div>
              <label className="field">
                <span className="label">Until</span>
                <input
                  className="input"
                  type="time"
                  step={900}
                  value={nowUntil}
                  onChange={(ev) => setNowUntil(ev.target.value)}
                />
              </label>
            </div>
          ) : (
            <>
              <ChoiceGroup
                label="Day"
                hideLabel
                className="date-strip"
                variant="tile"
                value={date}
                onChange={setDate}
                options={days.map((d) => ({
                  value: d,
                  ariaLabel: relativeDayLong(d, today),
                  label: (
                    <>
                      <span>{d === today ? 'Today' : DAY_SHORT[weekdayIndex(d)]}</span>
                      <strong>{parseISODate(d).getDate()}</strong>
                    </>
                  ),
                }))}
              />
              <ChoiceGroup
                label="Time window"
                hideLabel
                variant="tile"
                className="tiles tiles-3"
                value={preset === 'custom' ? null : preset}
                onChange={(p) => {
                  setStart(toTimeInput(PRESET_WINDOWS[p].range[0]))
                  setEnd(toTimeInput(PRESET_WINDOWS[p].range[1]))
                }}
                options={(Object.keys(PRESET_WINDOWS) as (keyof typeof PRESET_WINDOWS)[]).map((k) => ({
                  value: k,
                  disabled: date === today && PRESET_WINDOWS[k].range[0] < nowMinutes,
                  ariaLabel: `${PRESET_WINDOWS[k].label}, ${formatRange(...PRESET_WINDOWS[k].range)}`,
                  label: (
                    <>
                      {PRESET_WINDOWS[k].label}
                      <small>{formatRange(...PRESET_WINDOWS[k].range)}</small>
                    </>
                  ),
                }))}
              />
              <div className="field-row">
                <label className="field">
                  <span className="label">Start</span>
                  <input className="input" type="time" step={900} value={start} onChange={(ev) => setStart(ev.target.value)} />
                </label>
                <label className="field">
                  <span className="label">End</span>
                  <input className="input" type="time" step={900} value={end} onChange={(ev) => setEnd(ev.target.value)} />
                </label>
              </div>
            </>
          )}
        </fieldset>

        <ChoiceGroup
          label="What are you down for?"
          value={activity}
          onChange={setActivity}
          options={ACTIVITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <ChoiceGroup
          label="Budget per person"
          variant="tile"
          className="tiles tiles-4"
          value={budget}
          onChange={setBudget}
          options={BUDGET_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <ChoiceGroup
          label="Energy today"
          hint="Resets at midnight"
          variant="tile"
          className="tiles tiles-3"
          value={energy}
          onChange={setEnergy}
          options={ENERGY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />

        <Notice tone="info" icon="lock">
          Only your {friendCount} friend{friendCount === 1 ? '' : 's'} can see this status. It disappears at{' '}
          {expiresText}.
        </Notice>

        {error && (
          <Notice tone="error" role="alert">
            {error}
          </Notice>
        )}

        <button type="submit" className="btn btn-primary btn-block">
          Share status &amp; find friends
        </button>
        {existing && (
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={() => {
              dispatch({ type: 'clearStatus' })
              toast.show('Status removed. Friends no longer see it.')
              navigate('/')
            }}
          >
            Remove my status
          </button>
        )}
      </form>
    </div>
  )
}
