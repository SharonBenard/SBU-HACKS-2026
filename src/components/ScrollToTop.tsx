import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** Scroll to the top on navigation and move focus to the page for screen readers. */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])
  return null
}
