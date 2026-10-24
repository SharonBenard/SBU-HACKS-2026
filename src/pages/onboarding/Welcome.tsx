import { Link } from 'react-router'
import { MapPin, Sparkle } from 'lucide-react'
import { Duck } from '../../components/Duck'

export function Welcome() {
  return (
    <div className="onb welcome">
      <div className="welcome-hero" aria-hidden>
        <Sparkle className="sparkle" style={{ left: '14%', top: '22%' }} size={22} fill="currentColor" />
        <Sparkle className="sparkle" style={{ right: '20%', top: '36%' }} size={14} fill="currentColor" />
        <Sparkle className="sparkle" style={{ left: '44%', top: '12%', color: '#fff' }} size={10} fill="currentColor" />
        <div className="hill back" />
        <div className="hill" />
        <svg className="path" width="150" height="70" viewBox="0 0 150 70" fill="none">
          <path d="M2 66 C 40 60, 70 50, 100 34 S 140 14, 140 14" stroke="#fff" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
        </svg>
        <MapPin className="path" style={{ right: 'calc(12% - 8px)', bottom: 150 }} size={26} fill="#e2643f" color="#fff" />
        <Duck className="duck" />
      </div>
      <main className="welcome-body" id="main">
        <div className="brand" style={{ fontSize: '1.15rem' }}>
          <MapPin size={18} color="#e2643f" fill="#e2643f" aria-hidden />
          AdventureTime
        </div>
        <h1>Turn free time into plans with friends.</h1>
        <p className="muted">
          See who's down between classes, get ideas that fit everyone's time and budget, and lock in the plan.
        </p>
        <div className="spacer" />
        <Link to="/signup" className="btn btn-primary btn-block">
          Get started with SBU email
        </Link>
        <p className="small muted" style={{ textAlign: 'center' }}>
          Only verified @stonybrook.edu students can join.
        </p>
      </main>
    </div>
  )
}
