import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Crown } from 'lucide-react'
import { useApp } from '../state/context'
import { acceptedFriends, friendsFreeFor } from '../state/selectors'
import { PageHead } from '../components/PageHead'
import { Avatar } from '../components/Avatar'
import { DemoTag, Notice } from '../components/Notice'
import { getActivity } from '../data/activities'
import { addDays, atMinutes, fromTimeInput, toTimeInput } from '../lib/dates'
import { newId } from '../lib/ids'
import { sendPlanInvites } from '../services/notifications'
import type { Activity, Plan, ReminderPref } from '../types'

function costText(a: Activity): string {
  if (a.costMax === 0) return 'Free'
  if (a.costMin === a.costMax) return `$${a.costMax}`
  return `$${a.costMin}–${a.costMax}`
}

type Errors = Partial<Record<'title' | 'location' | 'date' | 'time' | 'friends' | 'form', string>>

export function CreatePlan() {
  const world = useApp()
  const { dispatch, today } = world
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const activity = getActivity(params.get('activity'))

  const qStart = Number(params.get('start'))
  const qEnd = Number(params.get('end'))
  const hasTime = params.has('start') && params.has('end') && qEnd > qStart

  const [title, setTitle] = useState(activity?.name ?? params.get('title') ?? '')
  const [location, setLocation] = useState(activity?.place ?? '')
  const [date, setDate] = useState(params.get('date') ?? addDays(today, 1))
  const [start, setStart] = useState(toTimeInput(hasTime ? qStart : 18 * 60))
  const [end, setEnd] = useState(toTimeInput(hasTime ? qEnd : 21 * 60))
  const [cost, setCost] = useState(activity ? costText(activity) : '')
  const [transport, setTransport] = useState(activity?.transport ?? '')
  const [note, setNote] = useState('')
  const [reminders, setReminders] = useState<ReminderPref[]>(['day_before', 'two_hours_before'])
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const friends = acceptedFriends(world)
  const s = fromTimeInput(start)
  const e = fromTimeInput(end)
  const timeValid = s !== null && e !== null && e > s
  const freeNow = timeValid ? friendsFreeFor(world, date, s, e) : new Set<string>()

  const [selected, setSelected] = useState<Set<string>>(() => {
    const fromParams = params.get('friends')
    if (fromParams) return new Set(fromParams.split(',').filter(Boolean))
    return timeValid ? friendsFreeFor(world, date, s!, e!) : new Set()
  })

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    setErrors((x) => ({ ...x, friends: undefined }))
  }

  const sortedFriends = [...friends].sort((a, b) => Number(freeNow.has(b.id)) - Number(freeNow.has(a.id)))

  const validate = (): Errors => {
    const found: Errors = {}
    if (!title.trim()) found.title = 'Say what the plan is.'
    if (!location.trim()) found.location = 'Add where you are meeting.'
    if (!date || date < today) found.date = 'Pick today or a later date.'
    if (!timeValid) found.time = 'The end time must be after the start time.'
    else if (atMinutes(date, s!) < world.now) found.time = 'That start time has already passed.'
    if (selected.size === 0) found.friends = 'Invite at least one friend.'
    return found
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      document.querySelector<HTMLElement>('[aria-invalid="true"], .error-text')?.scrollIntoView({ block: 'center' })
      return
    }
    const plan: Plan = {
      id: newId('plan'),
      title: title.trim(),
      location: location.trim(),
      date,
      start: s!,
      end: e!,
      cost: cost.trim() || 'Not set',
      transport: transport.trim(),
      note: note.trim(),
      leaderId: 'me',
      invitees: [...selected].map((personId) => ({ personId, rsvp: 'waiting' as const })),
      activityId: activity?.id,
      inviteToken: newId('inv').slice(4),
      createdAt: new Date().toISOString(),
      reminders,
    }
    setSubmitting(true)
    try {
      const delivery = await sendPlanInvites(plan)
      dispatch({ type: 'createPlan', plan })
      navigate(`/plan/${plan.id}/confirmed`, { replace: true, state: { delivery: delivery.detail } })
    } catch {
      setErrors({ form: "Couldn't create the plan. Try again." })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleReminder = (r: ReminderPref) =>
    setReminders((list) => (list.includes(r) ? list.filter((x) => x !== r) : [...list, r]))

  return (
    <div className="page">
      <PageHead title="Create plan" />
      <form className="stack" onSubmit={submit} noValidate>
        <TextField label="What" value={title} onChange={setTitle} error={errors.title} placeholder="Movie night" />
        <TextField label="Where" value={location} onChange={setLocation} error={errors.location} placeholder="Roth Quad lounge" />
        <div className="field-row-3">
          <label className="field">
            <span className="label">Date</span>
            <input
              className="input"
              type="date"
              min={today}
              value={date}
              onChange={(ev) => setDate(ev.target.value)}
              aria-invalid={!!errors.date}
            />
          </label>
          <label className="field">
            <span className="label">Starts</span>
            <input className="input" type="time" step={900} value={start} onChange={(ev) => setStart(ev.target.value)} aria-invalid={!!errors.time} />
          </label>
          <label className="field">
            <span className="label">Ends</span>
            <input className="input" type="time" step={900} value={end} onChange={(ev) => setEnd(ev.target.value)} aria-invalid={!!errors.time} />
          </label>
        </div>
        {(errors.date || errors.time) && <p className="error-text">{errors.date ?? errors.time}</p>}
        <TextField label="Estimated cost per person" value={cost} onChange={setCost} placeholder="$0–5" />
        <TextField label="Getting there" value={transport} onChange={setTransport} placeholder="On campus · walk, or who's driving" />

        <fieldset className="stack-sm">
          <legend className="section-title" style={{ width: '100%' }}>
            <span>Invite friends</span>
            <small>Free friends are pre-selected</small>
          </legend>
          {friends.length === 0 && <p className="small muted">You don't have any friends added yet.</p>}
          {sortedFriends.map((f) => {
            const free = freeNow.has(f.id)
            return (
              <label key={f.id} className={`check-row${free ? '' : ' is-busy'}`}>
                <Avatar person={f} size={36} />
                <span style={{ flex: 1 }}>
                  <span className="name" style={{ display: 'block', fontWeight: 700 }}>
                    {f.name}
                  </span>
                  <span className="small" style={{ color: free ? 'var(--green-text)' : 'var(--muted)' }}>
                    {timeValid ? (free ? 'Free then' : 'Busy then') : 'Set a time to check'}
                  </span>
                </span>
                <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
              </label>
            )
          })}
          {errors.friends && <p className="error-text">{errors.friends}</p>}
        </fieldset>

        <label className="field">
          <span className="label">Note (optional)</span>
          <textarea
            className="input"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder="What's everyone bringing? Meet at the front?"
          />
        </label>

        <fieldset className="stack-sm">
          <legend className="section-title">Reminders</legend>
          <label className="inline-icon">
            <input type="checkbox" checked={reminders.includes('day_before')} onChange={() => toggleReminder('day_before')} />
            The day before
          </label>
          <label className="inline-icon">
            <input
              type="checkbox"
              checked={reminders.includes('two_hours_before')}
              onChange={() => toggleReminder('two_hours_before')}
            />
            2 hours before
          </label>
          <p className="small muted">
            <DemoTag /> Saved as a preference. Reminder delivery isn't connected yet.
          </p>
        </fieldset>

        <Notice tone="warm" icon="none">
          <span className="inline-icon" style={{ fontWeight: 700 }}>
            <Crown size={16} aria-hidden /> You're the leader.
          </span>{' '}
          Creating the plan locks in these details and sends invites. There's no vote. Each friend RSVPs going or not
          going.
        </Notice>

        {errors.form && (
          <Notice tone="error" role="alert">
            {errors.form}
          </Notice>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden /> Creating plan…
            </>
          ) : (
            `Create plan & invite ${selected.size || ''}`.trim()
          )}
        </button>
      </form>
    </div>
  )
}

function TextField(props: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
}) {
  const id = `f-${props.label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {props.label}
      </label>
      <input
        id={id}
        className="input"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        aria-invalid={!!props.error}
        aria-describedby={props.error ? `${id}-err` : undefined}
      />
      {props.error && (
        <span id={`${id}-err`} className="error-text">
          {props.error}
        </span>
      )}
    </div>
  )
}
