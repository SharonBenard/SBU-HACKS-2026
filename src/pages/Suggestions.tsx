import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { useApp, useToast } from '../state/context'
import { alternativeSlots, computeMatch, getMyStatus, remainingWindow, type StatusMatch } from '../state/selectors'
import { PageHead } from '../components/PageHead'
import { Avatar } from '../components/Avatar'
import { ActivityArt } from '../components/ActivityArt'
import { Duck } from '../components/Duck'
import { EmptyState } from '../components/EmptyState'
import { DemoTag, Notice } from '../components/Notice'
import { DAY_SHORT, formatDayLong, formatDayShort, formatDuration, formatRange, formatTime, relativeDayLong, weekdayIndex } from '../lib/dates'
import { activityLabel } from '../lib/labels'
import { statusHeadline } from '../lib/statusText'
import { suggestActivities, type SuggestionInput, type SuggestionResult } from '../services/recommendations'
import type { Status } from '../types'

export function Suggestions() {
  const world = useApp()
  const status = getMyStatus(world)

  if (!status) {
    return (
      <div className="page">
        <PageHead title="What should we do?" />
        <EmptyState
          title="Set a status first"
          actions={
            <Link to="/status" className="btn btn-primary btn-block">
              I'm free
            </Link>
          }
        >
          Tell friends when you're free and we'll find who overlaps with you and what to do.
        </EmptyState>
      </div>
    )
  }

  const match = computeMatch(world, status)
  return match.slot ? <SuggestionCard match={match} /> : <NoOverlap status={status} />
}

type Loaded = { key: string; result?: SuggestionResult; error?: string }

function SuggestionCard({ match }: { match: StatusMatch }) {
  const world = useApp()
  const navigate = useNavigate()
  const slot = match.slot!
  const status = match.status
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [ownIdea, setOwnIdea] = useState('')
  const [error, setError] = useState<string | null>(null)

  const input: SuggestionInput = {
    start: slot.start,
    end: slot.end,
    mine: { activity: status.activity, budget: status.budget, energy: status.energy },
    friendStatuses: match.friends.flatMap((f) => (f.status ? [f.status] : [])),
    interests: [world.data.profile?.interests ?? [], ...match.friends.map((f) => f.friend.interests)],
  }
  const key = JSON.stringify(input)

  useEffect(() => {
    let cancelled = false
    suggestActivities(JSON.parse(key) as SuggestionInput)
      .then((result) => !cancelled && setLoaded({ key, result }))
      .catch(() => !cancelled && setLoaded({ key, error: "Couldn't load ideas. Check your connection and try again." }))
    return () => {
      cancelled = true
    }
  }, [key, attempt])

  const current = loaded?.key === key ? loaded : null
  const activities = current?.result?.activities ?? []
  const choice = selected ?? activities[0]?.activity.id ?? (current?.result ? 'custom' : null)
  const myWindow = remainingWindow(world, status)
  const trimmed = myWindow && (myWindow[0] !== slot.start || myWindow[1] !== slot.end)

  const proceed = () => {
    if (!choice) return
    const qs = new URLSearchParams({
      date: slot.date,
      start: String(slot.start),
      end: String(slot.end),
      friends: slot.personIds.join(','),
    })
    if (choice === 'custom') {
      if (!ownIdea.trim()) {
        setError('Describe your idea, or pick one of the suggestions.')
        return
      }
      qs.set('title', ownIdea.trim())
    } else {
      qs.set('activity', choice)
    }
    navigate(`/plans/new?${qs.toString()}`)
  }

  return (
    <div className="page">
      <PageHead title="What should we do?" />
      <section className="card card-ai stack" aria-labelledby="sugg-day">
        <span className="eyebrow">AI suggestion · Not a plan yet</span>
        <div className="card-head" style={{ margin: 0 }}>
          <h2 id="sugg-day" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
            {formatDayLong(slot.date)}
          </h2>
          <span className="badge badge-blue">
            {slot.personIds.length} friend{slot.personIds.length === 1 ? '' : 's'} free
          </span>
        </div>
        <div>
          <p className="small muted">Shared free time</p>
          <p className="big-time">{formatRange(slot.start, slot.end)}</p>
          {trimmed && (
            <p className="small muted">
              Your window is {formatRange(myWindow[0], myWindow[1])}. This is the part that overlaps with the most friends.
            </p>
          )}
        </div>

        <ul className="stack-sm" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Friends free then">
          {match.friends.map(({ friend, status: fs, kind }) => (
            <li key={friend.id} className="person-row" style={{ padding: '4px 0', border: 0 }}>
              <Avatar person={friend} size={34} />
              <div className="grow">
                <div className="name">{friend.name.split(' ')[0]}</div>
                <div className="sub">
                  {kind === 'status' && fs
                    ? `${statusHeadline(fs, world.today, world.nowMinutes)} · ${fs.note ?? activityLabel(fs.activity)}`
                    : 'No status set · free per schedule, counted as down for anything'}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="small muted">
          Being free isn't the same as saying yes. Friends confirm by RSVPing after you invite them.
        </p>

        {current?.result && (
          <p className="notice notice-info small" style={{ background: 'rgb(255 255 255 / 0.6)' }}>
            Picked for: {current.result.pickedFor.join(' · ')}
          </p>
        )}

        {!current && (
          <div className="stack-sm" aria-busy="true" aria-label="Loading ideas">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 96 }} />
            ))}
          </div>
        )}

        {current?.error && (
          <Notice tone="error" role="alert">
            {current.error}{' '}
            <button type="button" className="btn-link" onClick={() => setAttempt((a) => a + 1)}>
              <RotateCcw size={14} aria-hidden /> Try again
            </button>
          </Notice>
        )}

        {current?.result && (
          <fieldset className="stack-sm">
            <legend className="visually-hidden">Choose an activity</legend>
            {activities.length === 0 && (
              <p className="small">
                Nothing in our list fits this budget and {formatDuration(slot.end - slot.start, slot.end - slot.start)}.
                Add your own idea below.
              </p>
            )}
            {activities.map(({ activity, minMinutes, maxMinutes }) => (
              <label key={activity.id} className="activity-option">
                <ActivityArt art={activity.art} />
                <span className="grow">
                  <span className="opt-title">{activity.name}</span>
                  <span className="opt-line">
                    About {formatDuration(minMinutes, maxMinutes)} · {activity.costLabel}
                  </span>
                  <span className="opt-line">Best for {activity.bestFor}</span>
                  <span className="opt-line muted">
                    {activity.place} · {activity.transport}
                  </span>
                </span>
                <input
                  type="radio"
                  name="activity"
                  value={activity.id}
                  checked={choice === activity.id}
                  onChange={() => setSelected(activity.id)}
                />
              </label>
            ))}
            <label className="activity-option" style={{ borderStyle: 'dashed' }}>
              <span className="grow">
                <span className="opt-title">Something else: my own idea</span>
                <span className="opt-line">Describe it, then set the details on the next screen.</span>
              </span>
              <input
                type="radio"
                name="activity"
                value="custom"
                checked={choice === 'custom'}
                onChange={() => setSelected('custom')}
              />
            </label>
            {choice === 'custom' && (
              <label className="field">
                <span className="label">Your idea</span>
                <input
                  className="input"
                  value={ownIdea}
                  onChange={(e) => {
                    setOwnIdea(e.target.value)
                    setError(null)
                  }}
                  placeholder="Study session + pizza"
                  aria-invalid={!!error}
                />
              </label>
            )}
          </fieldset>
        )}
        <p className="small muted">
          Costs and options are estimates from a curated list of local spots, not live prices or availability.
        </p>
      </section>

      <Notice tone="demo">
        <DemoTag /> A rule-based ranker stands in for the AI service. Who's free is always calculated from schedules and
        statuses, not by AI.
      </Notice>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-primary btn-block" disabled={!choice} onClick={proceed}>
        Continue to create plan
      </button>
    </div>
  )
}

function NoOverlap({ status }: { status: Status }) {
  const world = useApp()
  const { dispatch, today, nowMinutes } = world
  const toast = useToast()
  const alternatives = alternativeSlots(world, status)

  const use = (slot: { date: string; start: number; end: number }) => {
    const isNow = slot.date === today && slot.start <= nowMinutes
    dispatch({ type: 'setStatus', status: { ...status, ...slot, mode: isNow ? 'now' : 'later' } })
    toast.show(`Status moved to ${relativeDayLong(slot.date, today)}, ${formatRange(slot.start, slot.end)}.`)
  }

  return (
    <div className="page">
      <PageHead title="" />
      <div className="empty" style={{ paddingTop: 0 }}>
        <Duck facing="left" width={120} />
        <h2>No overlap this time</h2>
        <p className="muted">
          None of your friends are free {formatDayShort(status.date)}, {formatRange(status.start, status.end)}.
        </p>
      </div>
      <Notice tone="warm" icon="none">
        Your status stays up until {formatTime(status.end)}{' '}
        {status.date === today ? 'today' : DAY_SHORT[weekdayIndex(status.date)]}. If a friend frees up, they will see
        you are down.
      </Notice>

      <section className="stack-sm" aria-labelledby="alt-title">
        <h2 id="alt-title" className="section-title">
          Times that work for friends
        </h2>
        {alternatives.length === 0 && (
          <p className="small muted">No shared free time with friends in the next 7 days. Try adding friends.</p>
        )}
        {alternatives.map((slot) => (
          <div key={`${slot.date}-${slot.start}`} className="card list-item-btn">
            <div>
              <strong>
                {relativeDayLong(slot.date, today)} · {formatRange(slot.start, slot.end)}
              </strong>
              <p className="small" style={{ color: 'var(--blue-text)' }}>
                {slot.personIds.length} friend{slot.personIds.length === 1 ? '' : 's'} free
              </p>
            </div>
            <button type="button" className="btn-link" onClick={() => use(slot)}>
              Use<span className="visually-hidden"> {relativeDayLong(slot.date, today)} {formatRange(slot.start, slot.end)}</span>{' '}
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        ))}
      </section>

      <Link to="/status" className="btn btn-outline btn-block">
        Edit my status
      </Link>
      <Link to="/free-time" className="btn-link" style={{ alignSelf: 'center' }}>
        Open the free-time grid
      </Link>
    </div>
  )
}
