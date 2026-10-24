import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { useApp, useToast } from '../state/context'
import { currentEnergy } from '../state/selectors'
import { Avatar } from '../components/Avatar'
import { ChoiceGroup } from '../components/ChoiceGroup'
import { Duck } from '../components/Duck'
import { InterestPicker } from '../components/InterestPicker'
import { DemoTag, Notice } from '../components/Notice'
import { ENERGY_OPTIONS } from '../lib/labels'
import { scheduleSummary } from '../lib/schedule'
import { initialsOf } from '../lib/ids'
import { signOut } from '../services/auth'

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function Me() {
  const world = useApp()
  const { data, dispatch, today } = world
  const toast = useToast()
  const navigate = useNavigate()
  const profile = data.profile!
  const energy = currentEnergy(world) ?? null

  const [editingProfile, setEditingProfile] = useState(false)
  const [name, setName] = useState(profile.name)
  const [commuter, setCommuter] = useState(profile.commuter)
  const [town, setTown] = useState(profile.town)
  const [nameError, setNameError] = useState<string | null>(null)

  const [editingInterests, setEditingInterests] = useState(false)
  const [interests, setInterests] = useState(profile.interests)

  const [clock, setClock] = useState(toLocalInput(world.now))
  const [signingOut, setSigningOut] = useState(false)

  const saveProfile = () => {
    if (!name.trim()) return setNameError('Name can’t be empty.')
    dispatch({ type: 'updateProfile', patch: { name: name.trim(), initials: initialsOf(name), commuter, town: commuter ? town.trim() : '' } })
    setEditingProfile(false)
    setNameError(null)
    toast.show('Profile saved.')
  }

  return (
    <div className="page">
      <section className="topbar" style={{ justifyContent: 'flex-start', gap: 14 }} aria-label="Profile">
        <span style={{ position: 'relative' }}>
          <Avatar person={profile} size={72} />
          <span style={{ position: 'absolute', right: -10, bottom: -6 }}>
            <Duck width={28} />
          </span>
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: '1.6rem' }}>{profile.name}</h1>
          <p className="small muted" style={{ overflowWrap: 'anywhere' }}>
            {profile.email}
          </p>
          <p className="small muted">{profile.commuter ? `Commuter${profile.town ? ` · ${profile.town}` : ''}` : 'Lives on campus'}</p>
        </div>
        {!editingProfile && (
          <button type="button" className="btn-link" onClick={() => setEditingProfile(true)}>
            Edit<span className="visually-hidden"> profile</span>
          </button>
        )}
      </section>

      {editingProfile && (
        <div className="card stack">
          <label className="field">
            <span className="label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!nameError} />
            {nameError && <span className="error-text">{nameError}</span>}
          </label>
          <div className="segmented" role="group" aria-label="Commuter or resident">
            <button type="button" aria-pressed={commuter} onClick={() => setCommuter(true)}>
              I commute
            </button>
            <button type="button" aria-pressed={!commuter} onClick={() => setCommuter(false)}>
              I live on campus
            </button>
          </div>
          {commuter && (
            <label className="field">
              <span className="label">Home town</span>
              <input className="input" value={town} onChange={(e) => setTown(e.target.value)} placeholder="Ronkonkoma" />
            </label>
          )}
          <div className="btn-row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingProfile(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={saveProfile}>
              Save
            </button>
          </div>
        </div>
      )}

      <ChoiceGroup
        label="Energy today"
        hint={energy ? 'Resets at midnight' : 'Not set today · resets at midnight'}
        variant="tile"
        className="tiles tiles-3"
        value={energy}
        onChange={(level) => dispatch({ type: 'setEnergy', level, date: today })}
        options={ENERGY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />

      <section className="card stack-sm" aria-labelledby="interests-title">
        <div className="card-head">
          <h2 id="interests-title" className="section-title">
            Interests
          </h2>
          {!editingInterests && (
            <button type="button" className="btn-link" onClick={() => setEditingInterests(true)}>
              Edit<span className="visually-hidden"> interests</span>
            </button>
          )}
        </div>
        {editingInterests ? (
          <>
            <InterestPicker value={interests} onChange={setInterests} />
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setInterests(profile.interests)
                  setEditingInterests(false)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  dispatch({ type: 'updateProfile', patch: { interests } })
                  setEditingInterests(false)
                  toast.show('Interests saved.')
                }}
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <div className="chips">
            {profile.interests.length === 0 && <span className="small muted">No interests yet.</span>}
            {profile.interests.map((i) => (
              <span key={i} className="chip chip-static">
                {i}
              </span>
            ))}
          </div>
        )}
      </section>

      <Link to="/me/schedule" className="card card-link list-item-btn">
        <span>
          <strong style={{ display: 'block' }}>Weekly schedule</strong>
          <span className="small muted">{scheduleSummary(data.schedule?.blocks ?? [])}</span>
        </span>
        <span className="btn-link" aria-hidden>
          Edit
        </span>
      </Link>

      <section className="stack-sm" aria-labelledby="privacy-title">
        <h2 id="privacy-title" className="section-title">
          Who sees what
        </h2>
        <div className="card list-card">
          <div>
            <strong>Free times</strong>
            <p className="small muted">Accepted friends only. Free or busy, never class names.</p>
          </div>
          <div>
            <strong>Status</strong>
            <p className="small muted">Friends only. Disappears when its window ends.</p>
          </div>
          <div>
            <strong>Plans</strong>
            <p className="small muted">Private. Only invited people can see them.</p>
          </div>
          <Link to="/me/blocked" className="list-item-btn">
            <span>
              <strong style={{ display: 'block' }}>Blocked &amp; reported</strong>
              <span className="small muted">Manage people you've blocked</span>
            </span>
            <ChevronRight size={18} aria-hidden />
          </Link>
        </div>
      </section>

      <section className="card stack-sm" aria-labelledby="demo-title">
        <h2 id="demo-title" className="section-title">
          <span>
            Demo settings <DemoTag />
          </span>
        </h2>
        <p className="small muted">
          Friends' statuses are generated relative to this clock. Pin it to show the flow at a specific time, like
          lunchtime on a weekday.
        </p>
        <label className="field">
          <span className="label">Demo clock</span>
          <input className="input" type="datetime-local" value={clock} onChange={(e) => setClock(e.target.value)} />
        </label>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const d = new Date(clock)
              if (Number.isNaN(d.getTime())) return toast.show('Enter a valid date and time.')
              dispatch({ type: 'setDemoClock', iso: d.toISOString() })
              toast.show('Demo clock pinned.')
            }}
          >
            Pin clock
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!data.demoClock}
            onClick={() => {
              dispatch({ type: 'setDemoClock', iso: null })
              setClock(toLocalInput(new Date()))
              toast.show('Using real time.')
            }}
          >
            Use real time
          </button>
        </div>
        {data.demoClock && <Notice tone="warm">Clock pinned to {new Date(data.demoClock).toLocaleString()}.</Notice>}
      </section>

      <button
        type="button"
        className="btn btn-danger btn-block"
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true)
          try {
            await signOut()
            navigate('/welcome', { replace: true })
          } catch (error) {
            toast.show(error instanceof Error ? error.message : 'Could not sign out.')
          } finally {
            setSigningOut(false)
          }
        }}
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  )
}
