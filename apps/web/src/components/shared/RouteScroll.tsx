import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { HASH_SCROLL_SETTLE_MS } from '../../constants/navigation'

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
    let stopped = false
    let frame = 0
    let previousTop: number | undefined
    let deadline: number | undefined
    const observer = new MutationObserver(() => scroll())
    const stop = (): void => {
      stopped = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('wheel', stop, true)
      window.removeEventListener('touchstart', stop, true)
      window.removeEventListener('pointerdown', stop, true)
      window.removeEventListener('keydown', stop, true)
    }
    const scroll = (): void => {
      if (stopped) return
      if (deadline !== undefined && performance.now() >= deadline) {
        stop()
        return
      }
      const target = document.getElementById(id)
      if (!target) {
        if (deadline !== undefined) stop()
        return
      }
      observer.disconnect()
      deadline ??= performance.now() + HASH_SCROLL_SETTLE_MS
      // Compare document coordinates, not viewport coordinates: our own jump
      // must not trigger another jump. Later content/fonts can move the anchor.
      const top = target.getBoundingClientRect().top + window.scrollY
      if (top !== previousTop) {
        target.scrollIntoView({ block: 'start', behavior: 'instant' })
        previousTop = target.getBoundingClientRect().top + window.scrollY
      }
      if (performance.now() < deadline) frame = requestAnimationFrame(scroll)
      else stop()
    }
    // Hand control back immediately on user intent, including scrollbar dragging
    // and keyboard navigation. Never prevent the input's default behavior.
    window.addEventListener('wheel', stop, { passive: true, capture: true })
    window.addEventListener('touchstart', stop, { passive: true, capture: true })
    window.addEventListener('pointerdown', stop, { passive: true, capture: true })
    window.addEventListener('keydown', stop, true)
    // Preserve delayed saved-report anchors without polling while data loads.
    observer.observe(document.body, { childList: true, subtree: true })
    scroll()
    return stop
  }, [pathname, hash])
  return null
}
