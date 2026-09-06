/**
 * ReportSectionRail — a fixed rail showing where you are in a report.
 *
 * ## Why
 *
 * A report is eleven sections and several thousand pixels of dense numbers.
 * The only way through it was to scroll and hope. There was no way to see how
 * much was left, to tell which section you were in, or to get back to the one
 * you half-remember — the page gave no sense of its own shape.
 *
 * This is the cheapest fix for that: a small persistent map of the document
 * that tracks the reader and jumps where they click.
 *
 * ## Design
 *
 * - **Reads the DOM, keeps no list.** Sections are discovered from
 *   `[data-section]` and labelled from the `data-section-topic` that
 *   `SectionHead` emits, so a section added, removed or renamed shows up here
 *   with no second place to update. A hardcoded list would silently drift.
 * - **Desktop only.** It lives in the left margin, which does not exist below
 *   ~1240px. On a phone the sticky action bar already handles navigation.
 * - **Labels on hover, numbers at rest.** At rest it is a column of section
 *   numbers — quiet enough to ignore. The topic appears on hover or focus, so
 *   the rail costs nothing until it is wanted.
 * - **Keyboard reachable.** Each stop is a real button, so the rail is a
 *   genuine way to move through the document, not a decorative scroll spy.
 */

import { useEffect, useState } from 'react'

interface RailStop {
  /** Section number, e.g. "03". */
  n: string
  /** Topic label, e.g. "Rent positioning". */
  topic: string
  /** The section element, kept for scrolling. */
  el: HTMLElement
}

/**
 * Fraction of the viewport height above which a section counts as "current".
 * A section becomes active once its heading passes the upper third, which is
 * where the eye actually sits when reading — using the exact top makes the
 * highlight lag a section behind.
 */
const ACTIVE_LINE = 0.34

interface ReportSectionRailProps {
  /**
   * Changes when a different report is shown (the share token works well).
   *
   * The sections do not exist at mount — the report renders them once the
   * analysis has loaded — so a scan that ran only on mount always found
   * nothing. Re-scanning when this changes catches the content arriving.
   */
  scanKey?: string | null
}

export function ReportSectionRail({ scanKey }: ReportSectionRailProps): JSX.Element | null {
  const [stops, setStops] = useState<RailStop[]>([])
  const [activeN, setActiveN] = useState<string | null>(null)

  // Collect the sections once the report has rendered. Sections mount in DOM
  // order but their data-section numbers are not sequential in source, so they
  // are sorted by number to read as a table of contents.
  useEffect(() => {
    const found = [...document.querySelectorAll<HTMLElement>('[data-section]')]
      .map((el) => {
        const head = el.querySelector<HTMLElement>('[data-section-topic]')
        return {
          n: el.dataset.section ?? '',
          topic: head?.dataset.sectionTopic ?? '',
          el,
        }
      })
      .filter((s) => s.n !== '' && s.topic !== '')
      .sort((a, b) => a.n.localeCompare(b.n))

    setStops(found)
  }, [scanKey])

  // Track the current section on scroll. A plain scroll listener beats
  // IntersectionObserver here: sections are taller than the viewport, so
  // several are intersecting at once and the observer cannot say which one is
  // being read without re-deriving positions anyway.
  useEffect(() => {
    if (stops.length === 0) return

    const onScroll = (): void => {
      const line = window.innerHeight * ACTIVE_LINE
      let current: string | null = stops[0]?.n ?? null
      for (const s of stops) {
        if (s.el.getBoundingClientRect().top <= line) current = s.n
      }
      setActiveN(current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [stops])

  if (stops.length < 3) return null

  return (
    <nav className="report-rail" aria-label="Report sections">
      <ol className="report-rail-list">
        {stops.map((s) => {
          const active = s.n === activeN
          return (
            <li key={s.n}>
              <button
                type="button"
                className={`report-rail-stop${active ? ' is-active' : ''}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => s.el.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                <span className="report-rail-n mono">{s.n}</span>
                <span className="report-rail-topic">{s.topic}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
