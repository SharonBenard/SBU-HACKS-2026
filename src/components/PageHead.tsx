import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

interface PageHeadProps {
  title: ReactNode
  /** Where "back" goes when there's no history (for example after a refresh). */
  fallback?: string
  right?: ReactNode
}

export function PageHead({ title, fallback = '/', right }: PageHeadProps) {
  const navigate = useNavigate()
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback)
  }
  return (
    <div className="page-head">
      <button type="button" className="icon-btn" onClick={goBack} aria-label="Back">
        <ChevronLeft size={22} aria-hidden />
      </button>
      <h1 style={{ flex: 1 }}>{title}</h1>
      {right}
    </div>
  )
}
