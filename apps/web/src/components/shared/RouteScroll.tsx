import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** New documents start at the top; hash links retain their section destination. */
export function RouteScroll(): null {
  const { pathname, hash } = useLocation()
  useLayoutEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      return
    }
    let id: string
    try {
      id = decodeURIComponent(hash.slice(1))
    } catch {
      return
    }
    const scroll = (): boolean => {
      const target = document.getElementById(id)
      if (!target) return false
      target.scrollIntoView({ block: 'start', behavior: 'instant' })
      return true
    }
    if (scroll()) return
    // Saved reports may arrive after the route mounts. Disconnect as soon as
    // the destination exists, or when navigation replaces this document.
    const observer = new MutationObserver(() => {
      if (scroll()) observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [pathname, hash])
  return null
}
