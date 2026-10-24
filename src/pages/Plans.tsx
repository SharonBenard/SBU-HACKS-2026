import { Link } from 'react-router'
import { useApp } from '../state/context'
import { isMine, isPlanUpcoming, rsvpOf, sortPlans } from '../state/selectors'
import { InviteCard, PlanRow } from '../components/PlanCards'
import { EmptyState } from '../components/EmptyState'

export function Plans() {
  const world = useApp()
  const mine = sortPlans(world.data.plans.filter(isMine))
  const upcoming = mine.filter((p) => isPlanUpcoming(p, world.now))
  const past = mine.filter((p) => !isPlanUpcoming(p, world.now)).reverse()
  const waiting = upcoming.filter((p) => rsvpOf(p, 'me') === 'waiting')
  const going = upcoming.filter((p) => rsvpOf(p, 'me') === 'going')
  const declined = upcoming.filter((p) => rsvpOf(p, 'me') === 'not_going')

  return (
    <div className="page">
      <h1 className="page-title">Plans</h1>

      {upcoming.length === 0 && (
        <EmptyState
          title="No plans yet"
          actions={
            <>
              <Link to="/status" className="btn btn-primary btn-block">
                I'm free, find friends
              </Link>
              <Link to="/free-time" className="btn btn-secondary btn-block">
                Open the free-time grid
              </Link>
            </>
          }
        >
          Set a status or pick a time on the grid to start one. Invitations from friends show up here too.
        </EmptyState>
      )}

      {waiting.length > 0 && (
        <section className="stack-sm" aria-labelledby="waiting-title">
          <h2 id="waiting-title" className="section-title">
            Waiting on your RSVP
          </h2>
          {waiting.map((p) => (
            <InviteCard key={p.id} plan={p} />
          ))}
        </section>
      )}

      {going.length > 0 && (
        <section className="stack-sm" aria-labelledby="upcoming-title">
          <h2 id="upcoming-title" className="section-title">
            Upcoming
          </h2>
          {going.map((p) => (
            <PlanRow key={p.id} plan={p} />
          ))}
        </section>
      )}

      {declined.length > 0 && (
        <section className="stack-sm" aria-labelledby="declined-title">
          <h2 id="declined-title" className="section-title">
            Not going
          </h2>
          <p className="small muted">Changed your mind? Open the plan and switch your RSVP.</p>
          {declined.map((p) => (
            <PlanRow key={p.id} plan={p} />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <details className="stack-sm">
          <summary className="section-title" style={{ cursor: 'pointer' }}>
            Past plans ({past.length})
          </summary>
          <div className="stack-sm" style={{ marginTop: 8 }}>
            {past.map((p) => (
              <PlanRow key={p.id} plan={p} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
