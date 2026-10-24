import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { MailCheck } from 'lucide-react'
import { OnboardingFrame } from './OnboardingFrame'
import { DemoTag, Notice } from '../../components/Notice'
import { completeDemoSignIn, requestSignInLink, validateSignUp } from '../../services/auth'
import { useApp } from '../../state/context'

export function SignUp() {
  const { dispatch } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({})
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validateSignUp(name, email)
    setErrors(found)
    if (found.name || found.email) return
    setSending(true)
    try {
      const result = await requestSignInLink(email)
      if (result.ok) setSentTo(result.email)
      else setErrors({ email: result.error })
    } catch {
      setErrors({ form: 'Something went wrong sending your link. Try again.' })
    } finally {
      setSending(false)
    }
  }

  const finish = () => {
    if (!sentTo) return
    dispatch({ type: 'signIn', session: completeDemoSignIn(sentTo), name })
    navigate('/onboarding/schedule')
  }

  if (sentTo) {
    return (
      <OnboardingFrame title="Check your inbox" step={1}>
        <div className="card stack" style={{ alignItems: 'flex-start' }}>
          <MailCheck size={32} aria-hidden color="var(--blue-text)" />
          <p>
            In the real app we'd send a sign-in link to <strong>{sentTo}</strong>. Opening it proves you're an SBU
            student.
          </p>
        </div>
        <Notice tone="demo">
          <DemoTag /> No email was sent. Demo sign-in skips the link and marks this address as verified on this
          device only.
        </Notice>
        <button type="button" className="btn btn-primary btn-block" onClick={finish}>
          Continue as verified (demo)
        </button>
        <button type="button" className="btn-link" onClick={() => setSentTo(null)}>
          Use a different email
        </button>
      </OnboardingFrame>
    )
  }

  return (
    <OnboardingFrame title="Join with your SBU email" step={1}>
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span className="label">Your name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-err' : undefined}
            placeholder="Abby Lin"
          />
          {errors.name && (
            <span id="name-err" className="error-text">
              {errors.name}
            </span>
          )}
        </label>
        <label className="field">
          <span className="label">SBU email</span>
          <input
            className="input"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-err' : 'email-hint'}
            placeholder="netid@stonybrook.edu"
          />
          {errors.email ? (
            <span id="email-err" className="error-text">
              {errors.email}
            </span>
          ) : (
            <span id="email-hint" className="hint">
              We'll send a one-tap sign-in link. No password.
            </span>
          )}
        </label>
        {errors.form && (
          <Notice tone="error" role="alert">
            {errors.form}
          </Notice>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
          {sending ? (
            <>
              <span className="spinner" aria-hidden /> Sending link…
            </>
          ) : (
            'Send sign-in link'
          )}
        </button>
      </form>
      <Notice tone="demo">
        <DemoTag /> Authentication is simulated. The @stonybrook.edu check here is in the browser only. A production
        backend must enforce it on the server.
      </Notice>
    </OnboardingFrame>
  )
}
