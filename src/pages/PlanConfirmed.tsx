import { Link, useLocation, useParams } from 'react-router'
import { Sparkle } from 'lucide-react'
import { useApp } from '../state/context'
import { personName } from '../state/selectors'
import { Duck } from '../components/Duck'
import { EmptyState } from '../components/EmptyState'
import { InviteLink } from '../components/InviteLink'
import { DemoTag, Notice } from '../components/Notice'
import { formatDayShort, formatRange } from '../lib/dates'

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function PlanConfirmed() {
  const world = useApp()
  const { id } = useParams()
  const location = useLocation()
  const plan = world.data.plans.find((p) => p.id === id)
  const delivery = (location.state as { delivery?: string } | null)?.delivery

  if (!plan) {
    return (
      <div className="page">
        <EmptyState title="Plan not found" actions={<Link to="/plans" className="btn btn-primary">Go to plans</Link>} />
      </div>
    )
  }

  const realNames = plan.invitees.filter((i) => !i.demo).map((i) => personName(world, i.personId, true))
  const demoNames = plan.invitees.filter((i) => i.demo).map((i) => personName(world, i.personId, true))
  return (
    <div className="page">
      <div className="confirm-hero" aria-hidden>
        <Sparkle className="sparkle" style={{ left: '18%', top: '22%' }} size={20} fill="currentColor" />
        <Sparkle className="sparkle" style={{ right: '22%', top: '34%' }} size={14} fill="currentColor" />
        <div className="hill" />
        <Duck />
      </div>
      <div className="stack" style={{ textAlign: 'center', alignItems: 'center' }}>
        <span className="badge badge-navy">Plan confirmed</span>
        <h1 className="page-title">Plan's on!</h1>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{plan.title}</p>
          <p className="muted">
            {formatDayShort(plan.date)}, {formatRange(plan.start, plan.end)} · {plan.location}
          </p>
        </div>
        <p>
          {realNames.length > 0 ? `${listNames(realNames)} can RSVP now. ` : ''}
          Share the link below in your group chat so friends can join and RSVP going or not going.
        </p>
      </div>
      <Notice tone="demo">
        <DemoTag /> {delivery ?? 'No email or push notification was sent.'}
        {demoNames.length > 0 && ` ${listNames(demoNames)} ${demoNames.length === 1 ? 'is a sample friend' : 'are sample friends'} added for the demo.`}
      </Notice>
      <InviteLink plan={plan} />
      <Link to={`/plan/${plan.id}`} className="btn btn-primary btn-block">
        View plan
      </Link>
      <Link to="/" className="btn-link" style={{ alignSelf: 'center' }}>
        Back to home
      </Link>
    </div>
  )
}
