import type { ReactNode } from 'react'
import { Duck } from './Duck'

interface EmptyStateProps {
  title: string
  children?: ReactNode
  actions?: ReactNode
  duck?: boolean
}

export function EmptyState({ title, children, actions, duck = true }: EmptyStateProps) {
  return (
    <div className="empty">
      {duck && <Duck facing="left" width={110} />}
      <h2>{title}</h2>
      {children && <div className="muted">{children}</div>}
      {actions && <div className="stack" style={{ width: '100%', maxWidth: 360 }}>{actions}</div>}
    </div>
  )
}
