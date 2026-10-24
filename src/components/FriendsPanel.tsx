import { useState, type FormEvent } from 'react'
import { useApp, useToast } from '../state/context'
import { friendStatus, getPerson } from '../state/selectors'
import { findDirectoryPersonByEmail } from '../services/friendsApi'
import { initialsOf, isSbuEmail } from '../lib/ids'
import { isNow, statusHeadline } from '../lib/statusText'
import { Avatar } from './Avatar'
import { DemoTag, Notice } from './Notice'
import type { Person } from '../types'

export function FriendsPanel() {
  const world = useApp()
  const { data, dispatch } = world
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmBlock, setConfirmBlock] = useState<string | null>(null)

  const byState = (s: string) =>
    data.friendships
      .filter((f) => f.state === s)
      .map((f) => getPerson(world, f.personId))
      .filter((p): p is Person => !!p)
  const incoming = byState('incoming')
  const outgoing = byState('outgoing')
  const accepted = byState('accepted').filter((p) => !data.blocked.includes(p.id))

  const add = (e: FormEvent) => {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!isSbuEmail(value)) return setError('Enter a @stonybrook.edu email.')
    if (value === data.profile?.email) return setError("That's your own email.")
    const known = findDirectoryPersonByEmail(value) ?? data.extraPeople.find((p) => p.email === value)
    const id = known?.id ?? value
    if (data.blocked.includes(id)) return setError('You blocked this person. Unblock them from Me → Blocked first.')
    if (data.friendships.some((f) => f.personId === id)) return setError("You're already connected or have a pending request.")
    const local = value.split('@')[0].replace(/[._-]+/g, ' ')
    const name = local.replace(/\b\w/g, (c) => c.toUpperCase())
    const person: Person = known ?? { id, name, initials: initialsOf(name), color: '#E5DCF3', email: value, interests: [] }
    dispatch({ type: 'sendRequest', person, isNew: !known })
    setEmail('')
    setError(null)
    toast.show(`Request saved for ${person.name}.`)
  }

  return (
    <>
      <form className="card stack-sm" onSubmit={add} noValidate>
        <label className="field">
          <span className="label">Add a friend by SBU email</span>
          <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              placeholder="netid@stonybrook.edu"
              aria-invalid={!!error}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 'none', minHeight: 48 }}>
              Send
            </button>
          </div>
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <p className="small muted">
          <DemoTag /> Requests are saved locally and nobody is notified.
        </p>
      </form>

      {incoming.length > 0 && (
        <section className="stack-sm" aria-labelledby="req-title">
          <h2 id="req-title" className="section-title">
            Friend requests
          </h2>
          <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {incoming.map((p) => (
              <div key={p.id} className="person-row" style={{ flexWrap: 'wrap' }}>
                <Avatar person={p} />
                <div className="grow">
                  <div className="name">{p.name}</div>
                  <div className="sub">Wants to see your free time</div>
                </div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      dispatch({ type: 'respondRequest', personId: p.id, accept: true })
                      toast.show(`You and ${p.name.split(' ')[0]} are now friends.`)
                    }}
                  >
                    Accept<span className="visually-hidden"> {p.name}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => dispatch({ type: 'respondRequest', personId: p.id, accept: false })}
                  >
                    Decline<span className="visually-hidden"> {p.name}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="stack-sm" aria-labelledby="friends-title">
        <h2 id="friends-title" className="section-title">
          <span>Friends</span>
          <small>{accepted.length}</small>
        </h2>
        {accepted.length === 0 ? (
          <p className="small muted">No friends yet. Add someone by email above.</p>
        ) : (
          <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {accepted.map((p) => {
              const st = friendStatus(world, p.id)
              return (
                <div key={p.id} className="person-row" style={{ flexWrap: 'wrap' }}>
                  <Avatar person={p} ring={st ? (isNow(st, world.today, world.nowMinutes) ? 'now' : 'later') : undefined} />
                  <div className="grow">
                    <div className="name">{p.name}</div>
                    <div className="sub">
                      {st ? `Down to hang · ${statusHeadline(st, world.today, world.nowMinutes)}` : 'No status right now'}
                    </div>
                  </div>
                  {confirmBlock === p.id ? (
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          dispatch({ type: 'block', personId: p.id })
                          setConfirmBlock(null)
                          toast.show(`${p.name} is blocked. They can't see your free time or statuses.`)
                        }}
                      >
                        Confirm block
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmBlock(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="btn-link danger small" onClick={() => setConfirmBlock(p.id)}>
                      Block<span className="visually-hidden"> {p.name}</span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="stack-sm" aria-labelledby="sent-title">
          <h2 id="sent-title" className="section-title">
            Sent requests
          </h2>
          <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {outgoing.map((p) => (
              <div key={p.id} className="person-row">
                <Avatar person={p} />
                <div className="grow">
                  <div className="name">{p.name}</div>
                  <div className="sub">Pending · {p.email}</div>
                </div>
                <button
                  type="button"
                  className="btn-link small"
                  onClick={() => dispatch({ type: 'cancelRequest', personId: p.id })}
                >
                  Cancel<span className="visually-hidden"> request to {p.name}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <Notice tone="info" icon="lock">
        Accepted friends see when you're free or busy, never your class names. Like a private account, nobody else can.
      </Notice>
    </>
  )
}
