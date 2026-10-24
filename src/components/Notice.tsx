import type { ReactNode } from 'react'
import { CircleAlert, FlaskConical, Info, Lock } from 'lucide-react'

interface NoticeProps {
  tone?: 'info' | 'warm' | 'green' | 'error' | 'demo'
  icon?: 'info' | 'lock' | 'alert' | 'demo' | 'none'
  children: ReactNode
  role?: 'alert' | 'status'
}

export function Notice({ tone = 'info', icon, children, role }: NoticeProps) {
  const which = icon ?? (tone === 'error' ? 'alert' : tone === 'demo' ? 'demo' : 'info')
  const Icon = { info: Info, lock: Lock, alert: CircleAlert, demo: FlaskConical, none: null }[which]
  return (
    <div className={`notice notice-${tone}`} role={role}>
      {Icon && <Icon size={16} aria-hidden />}
      <div>{children}</div>
    </div>
  )
}

/** Marks text that describes a mocked integration. */
export function DemoTag() {
  return <span className="demo-tag">Demo</span>
}
