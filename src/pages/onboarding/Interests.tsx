import { useState } from 'react'
import { useNavigate } from 'react-router'
import { OnboardingFrame } from './OnboardingFrame'
import { InterestPicker } from '../../components/InterestPicker'
import { useApp } from '../../state/context'
import { takeReturnTo } from '../../lib/returnTo'

export function Interests() {
  const { data, dispatch } = useApp()
  const navigate = useNavigate()
  const [interests, setInterests] = useState<string[]>(data.profile?.interests ?? [])
  const [commuter, setCommuter] = useState(data.profile?.commuter ?? true)
  const [town, setTown] = useState(data.profile?.town ?? '')
  const [error, setError] = useState<string | null>(null)

  const finish = () => {
    if (interests.length === 0) {
      setError('Pick at least one interest so suggestions fit you.')
      return
    }
    dispatch({ type: 'updateProfile', patch: { interests, commuter, town: commuter ? town.trim() : '' } })
    dispatch({ type: 'setOnboarding', step: 'done' })
    navigate(takeReturnTo() ?? '/')
  }

  return (
    <OnboardingFrame title="What do you like doing?" step={4} back="/onboarding/review">
      <p className="muted">We use these to pick activity ideas your group will enjoy.</p>
      <InterestPicker value={interests} onChange={(v) => { setInterests(v); setError(null) }} />
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      <fieldset className="stack-sm">
        <legend className="section-title">How do you get to campus?</legend>
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
            <span className="label">Home town (optional)</span>
            <input className="input" value={town} onChange={(e) => setTown(e.target.value)} placeholder="Ronkonkoma" />
            <span className="hint">Helps with travel notes later. Only shown on your profile.</span>
          </label>
        )}
      </fieldset>

      <button type="button" className="btn btn-primary btn-block" onClick={finish}>
        Finish setup
      </button>
    </OnboardingFrame>
  )
}
