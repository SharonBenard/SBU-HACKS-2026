import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Lock } from 'lucide-react'
import { useApp } from '../state/context'
import {
  acceptedFriends,
  alternativeSlots,
  computeMatch,
  currentEnergy,
  friendStatus,
  getMyStatus,
  isMine,
  isPlanUpcoming,
  rsvpOf,
  sortPlans,
  suggestionInputFor,
} from '../state/selectors'
import { Avatar } from '../components/Avatar'
import { Duck } from '../components/Duck'
import { InviteCard, PlanRow } from '../components/PlanCards'
import { formatDayShort, formatRange, relativeDay, relativeDayLong } from '../lib/dates'
import { isNow, statusExpiry, statusHeadline, statusPrefs, storyWhen } from '../lib/statusText'
import { rankActivities } from '../services/recommendations'
import type { Status } from '../types'

export function Home() {
  const world = useApp()
  const { data, today, nowMinutes } = world
  const me = data.profile!
  const myStatus = getMyStatus(world)
  const [openStory, setOpenStory] = useState<string | null>(null)

  const friendsDown = acceptedFriends(world)
    .map((f) => ({ friend: f, status: friendStatus(world, f.id) }))
    .filter((x): x is { friend: typeof x.friend; status: Status } => !!x.status)
    .sort((a, b) => {
      const an = isNow(a.status, today, nowMinutes) ? 0 : 1
      const bn = isNow(b.status, today, nowMinutes) ? 0 : 1
      return an - bn || a.status.date.localeCompare(b.status.date) || a.status.start - b.status.start
    })

  const myPlans = sortPlans(data.plans.filter((p) => isMine(p) && isPlanUpcoming(p, world.now)))
  const invites = myPlans.filter((p) => rsvpOf(p, 'me') === 'waiting')
  const upcoming = myPlans.filter((p) => rsvpOf(p, 'me') === 'going').slice(0, 2)
  const opened = friendsDown.find((x) => x.friend.id === openStory)

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/" className="brand" aria-label="AdventureTime home">
          <Duck width={30} />
          AdventureTime
        </Link>
        <Link to="/me" aria-label="Your profile" style={{ borderRadius: '50%' }}>
          <Avatar person={me} size={40} />
        </Link>
      </div>

      <section className="stack-sm" aria-labelledby="down-title">
        <div className="section-title">
          <h2 id="down-title" style={{ font: 'inherit' }}>
            Down to hang
          </h2>
          <small>{formatDayShort(today)}</small>
        </div>
        <div className="story-row">
          <Link to="/status" className="story" aria-label={myStatus ? 'Your status, edit' : 'Set your status'}>
            <Avatar
              person={me}
              size={54}
              ring={myStatus ? (isNow(myStatus, today, nowMinutes) ? 'now' : 'later') : 'none'}
            />
            <span className="name">You</span>
            <span className="when">{myStatus ? storyWhen(myStatus, today, nowMinutes) : 'add'}</span>
          </Link>
          {friendsDown.map(({ friend, status }) => (
            <button
              key={friend.id}
              type="button"
              className="story"
              aria-expanded={openStory === friend.id}
              aria-controls="story-detail"
              onClick={() => setOpenStory(openStory === friend.id ? null : friend.id)}
            >
              <Avatar person={friend} size={54} ring={isNow(status, today, nowMinutes) ? 'now' : 'later'} />
              <span className="name">{friend.name.split(' ')[0]}</span>
              <span className="when">{storyWhen(status, today, nowMinutes)}</span>
            </button>
          ))}
        </div>
        <div id="story-detail" aria-live="polite">
          {opened && (
            <div className="card stack-sm">
              <strong>
                {opened.friend.name} · {statusHeadline(opened.status, today, nowMinutes)}
              </strong>
              <span className="small muted">
                {opened.status.note ? `“${opened.status.note}” · ` : ''}
                {statusPrefs(opened.status)}
              </span>
            </div>
          )}
          {friendsDown.length === 0 && (
            <p className="small muted">No friends have a status up right now. Yours could be the first.</p>
          )}
        </div>
      </section>

      <div className="home-grid">
        {myStatus ? (
          <section className="card card-status stack-sm" aria-labelledby="my-status">
            <div className="card-head">
              <span className="badge badge-cream">Down to hang · your status</span>
              <Link to="/status" className="btn-link" style={{ color: 'var(--navy)', textDecoration: 'underline' }}>
                Edit<span className="visually-hidden"> your status</span>
              </Link>
            </div>
            <h2 id="my-status" style={{ fontSize: '1.35rem' }}>
              {statusHeadline(myStatus, today, nowMinutes)}
            </h2>
            <p className="small">{statusPrefs(myStatus)}</p>
            <p className="small muted inline-icon">
              <Lock size={14} aria-hidden /> Friends only · {statusExpiry(myStatus, today)}
            </p>
          </section>
        ) : (
          <section className="card card-status stack-sm">
            <span className="badge badge-cream" style={{ alignSelf: 'flex-start' }}>
              No status yet
            </span>
            <h2 style={{ fontSize: '1.35rem' }}>Free between classes?</h2>
            <p className="small">
              Tell friends you're down to hang. It disappears when your window ends.
              {!currentEnergy(world) && ' Your energy resets at midnight.'}
            </p>
            <Link to="/status" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
              I'm free
            </Link>
          </section>
        )}

        <SuggestionPreview myStatus={myStatus} />

        {invites.length > 0 && (
          <section className="stack-sm" aria-labelledby="invited-title">
            <h2 id="invited-title" className="section-title">
              You're invited
            </h2>
            {invites.map((p) => (
              <InviteCard key={p.id} plan={p} />
            ))}
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="stack-sm" aria-labelledby="upcoming-title">
            <div className="section-title">
              <h2 id="upcoming-title" style={{ font: 'inherit' }}>
                Coming up
              </h2>
              <Link to="/plans" className="btn-link small">
                All plans
              </Link>
            </div>
            {upcoming.map((p) => (
              <PlanRow key={p.id} plan={p} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

function SuggestionPreview({ myStatus }: { myStatus: Status | null }) {
  const world = useApp()
  const { today, nowMinutes } = world

  if (!myStatus) {
    const best = alternativeSlots(world)[0]
    if (!best) return null
    return (
      <Link
        to={`/status?date=${best.date}&start=${best.start}&end=${best.end}`}
        className="card card-ai card-link stack-sm"
      >
        <span className="eyebrow">Free-time match</span>
        <strong style={{ fontSize: '1.1rem' }}>
          {best.personIds.length} friend{best.personIds.length === 1 ? '' : 's'} free{' '}
          {best.date === today ? 'today' : relativeDayLong(best.date, today).replace('Tomorrow', 'tomorrow')}{' '}
          {formatRange(best.start, best.end)}
        </strong>
        <span className="small inline-icon">
          Set a status for that time to get ideas <ArrowRight size={14} aria-hidden />
        </span>
      </Link>
    )
  }

  const planned = world.data.plans.find(
    (p) =>
      isMine(p) &&
      rsvpOf(p, 'me') === 'going' &&
      p.date === myStatus.date &&
      p.start < myStatus.end &&
      myStatus.start < p.end,
  )
  if (planned) {
    return (
      <Link to={`/plan/${planned.id}`} className="card card-ai card-link stack-sm">
        <span className="eyebrow">You have a plan then</span>
        <strong style={{ fontSize: '1.1rem' }}>{planned.title}</strong>
        <span className="small inline-icon">
          {formatRange(planned.start, planned.end)} · {planned.location} <ArrowRight size={14} aria-hidden />
        </span>
      </Link>
    )
  }

  const match = computeMatch(world, myStatus)
  if (!match.slot) {
    return (
      <Link to="/suggestions" className="card card-ai card-link stack-sm">
        <span className="eyebrow">No overlap yet</span>
        <strong style={{ fontSize: '1.1rem' }}>None of your friends are free in your window</strong>
        <span className="small inline-icon">
          See times that work for friends <ArrowRight size={14} aria-hidden />
        </span>
      </Link>
    )
  }

  const suggestionInput = suggestionInputFor(world, match)
  const ideas = suggestionInput ? rankActivities(suggestionInput).activities.length : 0
  const n = match.friends.length
  const day = relativeDay(match.slot.date, today)
  const when = isNow(myStatus, today, nowMinutes)
    ? 'now'
    : day === 'Today' || day === 'Tomorrow'
      ? day.toLowerCase()
      : `on ${day}`

  return (
    <Link to="/suggestions" className="card card-ai card-link stack-sm">
      <span className="eyebrow">AI suggestion · Not a plan yet</span>
      <strong style={{ fontSize: '1.15rem' }}>
        {n} friend{n === 1 ? '' : 's'} free with you {when}
      </strong>
      <span className="small inline-icon">
        {ideas} idea{ideas === 1 ? '' : 's'} that fit your time and budget <ArrowRight size={14} aria-hidden />
      </span>
    </Link>
  )
}
