/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { Icon } from '../shared/Icon'
import { SectionHeader } from './SectionHeader'

// ── CoverageSection ───────────────────────────────────────────────────

export function CoverageSection(): JSX.Element {
  const features = [
    {
      icon: 'shield' as const,
      t: 'Risk flags, not vibes',
      d: 'Ontario rent control, condo-fee burden, flood overlays, basement-bedroom heuristics, supply pressure. Each flag carries a deduction, a source, and an override.',
    },
    {
      icon: 'map' as const,
      t: 'Live rental comps',
      d: 'Nightly scrape of Rentals.ca, Kijiji and PadMapper. Same FSA, ±1 bedroom, last 90 days. Outliers removed. Confidence shown.',
    },
    {
      icon: 'chart' as const,
      t: 'Canadian rules baked in',
      d: 'OSFI stress test, Ontario LTT with Toronto stack, CMHC vacancy by city, Bank of Canada rate feed. No US tools pretending.',
    },
    {
      icon: 'house' as const,
      t: 'Schools that matter',
      d: 'The nearest schools by board with their EQAO scores and straight-line distance. Catchment boundaries and Fraser rankings are not in yet, and we say so on the report.',
    },
    {
      icon: 'sun' as const,
      t: 'SunScout · light score',
      d: 'NREL sun-path math, window by window, month by month. Building obstruction in dense cores on Investor Pro.',
    },
    {
      icon: 'doc' as const,
      t: 'Share or export',
      d: 'Branded PDF and a 30-day shareable link. Your clients see the verdict without seeing the seams.',
    },
  ]

  return (
    <section className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div className="col gap-32">
        <SectionHeader
          tag="Inside the report"
          title={<>Every assumption in the report is listed with its source, date, and method.</>}
        >
          Rental comps scraped nightly from Rentals.ca, Kijiji, and PadMapper. Rates from the Bank
          of Canada feed. Schools from EQAO. Walkability from Walk Score. The last section of every
          report is a ledger of what the numbers rest on — and when one is a PropScout default with
          no source behind it, it says so.
        </SectionHeader>

        <div
          className="grid-1col-mobile"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            borderTop: '1px solid var(--line)',
            borderLeft: '1px solid var(--line)',
          }}
        >
          {features.map((f) => (
            <div
              key={f.t}
              className="col gap-12"
              style={{
                padding: '28px 26px',
                borderRight: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div style={{ color: 'var(--accent)' }}>
                <Icon name={f.icon} size={22} stroke={1.4} />
              </div>
              <h3 className="serif" style={{ fontSize: 22, lineHeight: 1.1 }}>
                {f.t}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
