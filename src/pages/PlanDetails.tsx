import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Lock } from 'lucide-react'
import { useApp, useToast } from '../state/context'
import { getPerson, friendsFreeFor, isMine, isPlanUpcoming, personName, rsvpOf } from '../state/selectors'
import { useRsvp } from '../state/hooks'
import { PageHead } from '../components/PageHead'
import { Avatar } from '../components/Avatar'
import { Duck } from '../components/Duck'
import { EmptyState } from '../components/EmptyState'
import { InviteLink } from '../components/InviteLink'
import { RsvpBadge } from '../components/PlanCards'
import { DemoTag, Notice } from '../components/Notice'
import { formatDayShort, formatRange } from '../lib/dates'
import { reminderDescription } from '../services/notifications'
import { joinPlanByToken, updateDemoInvitees } from '../services/plansApi'
import type { Rsvp } from '../types'

/** One join per invite token, so StrictMode's double effect doesn't join twice. */
const joins = new Map<string, Promise<string>>()
function joinOnce(token: string): Promise<string> {
  let pending = joins.get(token)
  if (!pending) {
    pending = joinPlanByToken(token)
    pending.catch(() => joins.delete(token))
    joins.set(token, pending)
  }
  return pending
}

export function PlanDetails() {
  const world = useApp()
  const { dispatch, plansLoaded, plansError, refreshPlans } = world
  const toast = useToast()
  const setRsvp = useRsvp()
  const navigate = useNavigate()
  const { id } = useParams()
  const [params] = useSearchParams()
  const inviteToken = params.get('invite')
  const plan = world.data.plans.find((p) => p.id === id)
  const hasPlan = !!plan
  const [joinError, setJoinError] = useState<{ token: string; message: string } | null>(null)

  // Opening an invite link for a plan I'm not in yet: join it, then reload my plans.
  useEffect(() => {
    if (hasPlan || !inviteToken || !plansLoaded) return
    let active = true
    joinOnce(inviteToken)
      .then(async (planId) => {
        await refreshPlans()
        if (active && planId !== id) navigate(`/plan/${planId}?invite=${inviteToken}`, { replace: true })
      })
      .catch((error: unknown) => {
        if (active) {
          setJoinError({ token: inviteToken, message: error instanceof Error ? error.message : "Couldn't join this plan." })
        }
      })
    return () => {
      active = false
    }
  }, [hasPlan, inviteToken, plansLoaded, refreshPlans, navigate, id])

  if (!plan) {
    const failed = joinError && joinError.token === inviteToken ? joinError.message : null
    if (!plansLoaded || (inviteToken && !failed && !plansError)) {
      return (
        <div className="page">
          <PageHead title="" fallback="/plans" />
          <div className="card stack-sm" aria-busy="true">
            <p role="status">{inviteToken ? 'Joining plan…' : 'Loading plan…'}</p>
            <div className="skeleton" style={{ height: 120 }} />
          </div>
        </div>
      )
    }
    return (
      <div className="page">
        <PageHead title="" fallback="/plans" />
        <EmptyState
          title={failed ? "Couldn't open this invite" : 'Plan not found'}
          actions={<Link to="/plans" className="btn btn-primary">Go to plans</Link>}
        >
          {failed ?? plansError ?? "It may have been removed, or the link is mistyped. Plans are private, so only the leader and invited people can open them."}
        </EmptyState>
      </div>
    )
  }

  // Plans are private: only the leader and invited people can see them.
  if (!isMine(plan)) {
    return (
      <div className="page">
        <PageHead title="" fallback="/plans" />
        <EmptyState title="This plan is private">Only people the leader invited can see it.</EmptyState>
      </div>
    )
  }

  const leaderFirst = personName(world, plan.leaderId, true)
  const amLeader = plan.leaderId === 'me'
  const mine = rsvpOf(plan, 'me')
  const upcoming = isPlanUpcoming(plan, world.now)
  const people = [
    { personId: plan.leaderId, rsvp: 'going' as Rsvp, role: 'Leader' },
    ...plan.invitees.map((i) => ({ ...i, role: i.personId === 'me' ? 'You' : 'Invited' })),
  ]
  const count = (r: Rsvp) => people.filter((p) => p.rsvp === r).length
  const summary = [`${count('going')} going`, count('waiting') && `${count('waiting')} waiting`, count('not_going') && `${count('not_going')} not going`]
    .filter(Boolean)
    .join(' · ')
  // Only sample friends can be simulated; real accounts answer for themselves.
  const waitingDemo = plan.invitees.filter((i) => i.rsvp === 'waiting' && (i.demo || !plan.shared))

  const simulateReplies = async () => {
    const free = friendsFreeFor(world, plan.date, plan.start, plan.end)
    const replies = new Map(waitingDemo.map((i) => [i.personId, (free.has(i.personId) ? 'going' : 'not_going') as Rsvp]))
    for (const [personId, rsvp] of replies) dispatch({ type: 'rsvp', planId: plan.id, personId, rsvp })
    if (plan.shared) {
      try {
        await updateDemoInvitees({
          ...plan,
          invitees: plan.invitees.map((i) => ({ ...i, rsvp: replies.get(i.personId) ?? i.rsvp })),
        })
      } catch (error) {
        toast.show(error instanceof Error ? error.message : "Couldn't save the simulated replies.")
        void refreshPlans()
        return
      }
    }
    toast.show('Simulated replies: free sample friends said going, busy ones said not going.')
  }

  return (
    <div className="page">
      <PageHead title="" fallback="/plans" right={<Duck facing="left" width={30} />} />
      {inviteToken && !amLeader && (
        <Notice tone="info">You opened an invite link for this plan. RSVP below so {leaderFirst} knows.</Notice>
      )}
      {!plan.shared && (
        <Notice tone="demo">
          <DemoTag /> Sample plan from a demo friend. It's saved only in your account, not shared with anyone.
        </Notice>
      )}
      <div className="stack-sm">
        <div className="inline-icon">
          <span className="badge badge-navy">Plan</span>
          <span className="small muted">{amLeader ? "You're the leader" : `Invited by ${personName(world, plan.leaderId)}`}</span>
        </div>
        <h1 className="page-title">{plan.title}</h1>
        <p className="small muted inline-icon">
          <Lock size={14} aria-hidden /> Private · only people {amLeader ? 'you' : leaderFirst} invited can see this.
        </p>
      </div>

      {!upcoming && <Notice tone="warm">This plan has already happened.</Notice>}

      <dl className="info-grid" style={{ margin: 0 }}>
        <div className="card">
          <dt>When</dt>
          <dd>
            {formatDayShort(plan.date)}
            <small>{formatRange(plan.start, plan.end)}</small>
          </dd>
        </div>
        <div className="card">
          <dt>Where</dt>
          <dd>{plan.location}</dd>
        </div>
        <div className="card">
          <dt>Est. cost</dt>
          <dd>
            {plan.cost}
            <small>Estimate, per person</small>
          </dd>
        </div>
        <div className="card">
          <dt>Getting there</dt>
          <dd>{plan.transport || <small>No transport note yet</small>}</dd>
        </div>
      </dl>

      {amLeader ? (
        <Notice tone="green" icon="none">
          You're the leader, so you're going. The details are set; friends just RSVP.
        </Notice>
      ) : (
        <section className="stack-sm" aria-labelledby="rsvp-title">
          <h2 id="rsvp-title" className="section-title">
            Your RSVP
          </h2>
          <div className="btn-row">
            <button
              type="button"
              className={`btn ${mine === 'going' ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={mine === 'going'}
              disabled={!upcoming}
              onClick={() => setRsvp(plan, 'going')}
            >
              Going
            </button>
            <button
              type="button"
              className={`btn ${mine === 'not_going' ? 'btn-outline' : 'btn-secondary'}`}
              aria-pressed={mine === 'not_going'}
              disabled={!upcoming}
              onClick={() => setRsvp(plan, 'not_going')}
            >
              Not going
            </button>
          </div>
        </section>
      )}

      <section className="stack-sm" aria-labelledby="who-title">
        <div className="section-title">
          <h2 id="who-title" style={{ font: 'inherit' }}>
            Who's coming
          </h2>
          <small>{summary}</small>
        </div>
        <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {people.map((p) => {
            const person = getPerson(world, p.personId)
            return (
              <div key={p.personId} className="person-row">
                <Avatar person={person} size={38} />
                <div className="grow">
                  <div className="name">
                    {p.personId === 'me' ? `${person?.name ?? 'You'} (you)` : person?.name ?? 'Unknown'}
                  </div>
                  <div className="sub">
                    {p.personId === 'me' && p.role !== 'Leader' ? 'You' : p.role}
                    {'demo' in p && p.demo ? ' · sample friend (demo)' : ''}
                  </div>
                </div>
                <RsvpBadge rsvp={p.rsvp} />
              </div>
            )
          })}
        </div>
        {amLeader && waitingDemo.length > 0 && upcoming && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={simulateReplies}>
            <DemoTag /> Simulate friends' replies
          </button>
        )}
      </section>

      {plan.note && (
        <Notice tone="warm" icon="none">
          <strong>Note:</strong> {plan.note}
        </Notice>
      )}
      <p className="small">
        <strong>Reminder:</strong> {reminderDescription(plan)}{' '}
        <span className="muted">
          <DemoTag /> Not delivered yet.
        </span>
      </p>

      {upcoming && plan.shared && <InviteLink plan={plan} />}
    </div>
  )
}
