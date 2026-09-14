/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { ScoutMark } from '../shared/ScoutMark'

// ── FounderNoteSection ────────────────────────────────────────────────
// PR10 part 5 — founder note ("WHY THIS EXISTS"). The body must be Zain's
// own words: the spec's rule is "the section ships with your words or it
// doesn't ship", so the section renders nothing until FOUNDER_NOTE_BODY is
// filled in. Do NOT invent biographical details here.

// Zain: replace with your actual story — 3-4 first-person sentences
// (solo developer in Ontario, why listing numbers don't tell the truth,
// every formula documented and testable).
const FOUNDER_NOTE_BODY: string | null = null

// Placeholder framing from the PR10 spec — edit alongside the body.
const FOUNDER_NOTE_HEADING = 'Built by one person who got burned by a bad listing.'

export function FounderNoteSection(): JSX.Element | null {
  if (FOUNDER_NOTE_BODY === null) return null

  return (
    <section className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div
        className="card"
        style={{ padding: 'clamp(36px, 5vw, 64px)', display: 'flex', justifyContent: 'center' }}
      >
        <div className="col gap-16" style={{ maxWidth: 680 }}>
          <span className="section-tag">Why this exists</span>
          <h2 className="serif" style={{ textWrap: 'balance' } as React.CSSProperties}>
            {FOUNDER_NOTE_HEADING}
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.65 }}>
            {FOUNDER_NOTE_BODY}
          </p>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            PropScout is independent. No brokerage owns it, no listing site pays it.
          </p>
          <div className="row gap-12" style={{ alignItems: 'center', marginTop: 8 }}>
            <ScoutMark size={22} />
            <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
              — Zain, founder
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
