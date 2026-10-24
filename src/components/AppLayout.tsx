import { CalendarDays, House, LayoutGrid, Plus, User } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { useApp } from '../state/context'
import { isMine, isPlanUpcoming, rsvpOf } from '../state/selectors'
import { Duck } from './Duck'
import { Notice } from './Notice'

export function AppLayout() {
  const world = useApp()
  const pendingInvites = world.data.plans.filter(
    (p) => isMine(p) && rsvpOf(p, 'me') === 'waiting' && isPlanUpcoming(p, world.now),
  ).length

  const item = (to: string, label: string, Icon: typeof House, extra?: { dot?: boolean; free?: boolean; end?: boolean }) => (
    <li>
      <NavLink
        to={to}
        end={extra?.end}
        className={({ isActive }) => `nav-link${extra?.free ? ' nav-free' : ''}${isActive ? ' active' : ''}`}
      >
        {extra?.free ? (
          <span className="nav-plus">
            <Icon size={26} strokeWidth={2.4} aria-hidden />
          </span>
        ) : (
          <Icon size={22} aria-hidden />
        )}
        <span>{label}</span>
        {extra?.dot && (
          <>
            <span className="dot" aria-hidden />
            <span className="visually-hidden">, {pendingInvites} waiting on your RSVP</span>
          </>
        )}
      </NavLink>
    </li>
  )

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <nav className="nav" aria-label="Main">
        <Link to="/" className="brand nav-brand">
          <Duck width={30} />
          AdventureTime
        </Link>
        <ul>
          {item('/', 'Home', House, { end: true })}
          {item('/free-time', 'Free time', LayoutGrid)}
          {item('/status', "I'm free", Plus, { free: true })}
          {item('/plans', 'Plans', CalendarDays, { dot: pendingInvites > 0 })}
          {item('/me', 'Me', User)}
        </ul>
      </nav>
      <main id="main" className="app-main" tabIndex={-1}>
        {!world.storageOk && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <Notice tone="error" role="alert">
              This browser is blocking storage, so changes will be lost when you close the tab.
            </Notice>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
