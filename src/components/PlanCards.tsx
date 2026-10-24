import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import type { Plan, Rsvp } from '../types'
import { useApp } from '../state/context'
import { useRsvp } from '../state/hooks'
import { planWhen } from '../lib/plans'
import { personName, rsvpOf } from '../state/selectors'
import { RSVP_LABELS } from '../lib/labels'

export function RsvpBadge({ rsvp }: { rsvp: Rsvp }) {
  return <span className={`badge badge-${rsvp}`}>{RSVP_LABELS[rsvp]}</span>
}

/** An invitation awaiting (or with) my response. */
export function InviteCard({ plan }: { plan: Plan }) {
  const world = useApp()
  const setRsvp = useRsvp()
  const mine = rsvpOf(plan, 'me')
  const titleId = `invite-${plan.id}`
  return (
    <article className="card card-invite stack" aria-labelledby={titleId}>
      <div>
        <div className="card-head">
          <span className="badge badge-navy">Plan</span>
          <span className="small muted">Invited by {personName(world, plan.leaderId, true)}</span>
        </div>
        <h3 id={titleId} style={{ fontSize: '1.25rem' }}>
          {plan.title}
        </h3>
        <p className="small muted">
          {planWhen(plan, world.today)} · {plan.location}
        </p>
      </div>
      <div className="btn-row">
        <button
          type="button"
          className={`btn btn-sm ${mine === 'going' ? 'btn-primary' : 'btn-secondary'}`}
          aria-pressed={mine === 'going'}
          onClick={() => setRsvp(plan, 'going')}
        >
          Going
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mine === 'not_going' ? 'btn-outline' : 'btn-secondary'}`}
          aria-pressed={mine === 'not_going'}
          onClick={() => setRsvp(plan, 'not_going')}
        >
          Can't go
        </button>
        <Link className="btn-link" to={`/plan/${plan.id}`} style={{ flex: '0 0 auto' }}>
          Details<span className="visually-hidden"> for {plan.title}</span>
        </Link>
      </div>
    </article>
  )
}

/** Compact link to a plan I'm going to or leading. */
export function PlanRow({ plan }: { plan: Plan }) {
  const world = useApp()
  const going = plan.invitees.filter((i) => i.rsvp === 'going').length + 1
  const mine = rsvpOf(plan, 'me')
  return (
    <Link to={`/plan/${plan.id}`} className="card card-link">
      <div className="list-item-btn">
        <div style={{ minWidth: 0 }}>
          <div className="card-head" style={{ justifyContent: 'flex-start' }}>
            {plan.leaderId === 'me' ? (
              <span className="badge badge-navy">You're leading</span>
            ) : (
              mine && <RsvpBadge rsvp={mine} />
            )}
            <span className="small muted">{going} going</span>
          </div>
          <h3 style={{ fontSize: '1.1rem' }}>{plan.title}</h3>
          <p className="small muted">
            {planWhen(plan, world.today)} · {plan.location}
          </p>
        </div>
        <ChevronRight size={20} aria-hidden />
      </div>
    </Link>
  )
}
