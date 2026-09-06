/**
 * NeighbourhoodSection — §08 of the investor report.
 *
 * Shows:
 *   - 6 stat tiles: median income, pop growth, walk/transit/bike scores,
 *     active building permits
 *   - Comparable recent sales table
 *   - Appreciation card (5yr / 10yr)
 *
 * Data sourced from Walk Score API + Stats Canada + MLS comps.
 * Placeholder values from demo data until integrations are live.
 */

import type { NeighbourhoodData, ListingData } from '../../types/analysis'
import { SectionHead } from '../shared/SectionHead'
import { fmtMoney, fmtPct } from '../../lib/investorCalc'

interface NeighbourhoodSectionProps {
  /**
   * True when the comps come from the provider's sample coverage rather than
   * this property's area. They are real sales somewhere else, so they are
   * labelled rather than presented as local comparables.
   */
  compsAreSample?: boolean

  listing: ListingData
  neighbourhood: NeighbourhoodData
}

export function NeighbourhoodSection({
  listing: _listing,
  neighbourhood,
  compsAreSample = false,
}: NeighbourhoodSectionProps): JSX.Element {
  const n = neighbourhood

  // Every tile we *could* show, paired with whether we actually have the figure.
  // Tiles without data are not rendered as "—": a grid of dashes reads as a broken
  // page rather than an honest gap, and it buries the tiles that do have real
  // numbers. What is missing is still stated explicitly, in one line below the
  // grid, so nothing is quietly hidden.
  const candidateTiles: Array<{
    label: string
    value: string
    note: string
    present: boolean
  }> = [
    {
      label: 'Median income (FSA)',
      value: fmtMoney(n.avgIncome),
      note: 'StatsCan 2021',
      present: n.avgIncome > 0,
    },
    {
      label: '5-year pop. growth',
      value: fmtPct(n.popGrowth5y, 1),
      note: 'StatsCan · 2016 to 2021',
      present: n.popGrowth5y !== 0,
    },
    {
      label: 'Walk Score',
      value: String(n.walkScore),
      note: n.walkScore >= 80 ? 'Very walkable' : 'Mostly walkable',
      present: n.walkScore > 0,
    },
    {
      label: 'Transit Score',
      value: String(n.transitScore),
      note: n.transitScore >= 80 ? 'Excellent' : 'Some transit',
      present: n.transitScore > 0,
    },
    {
      label: 'Active building permits',
      value: String(n.buildingPermits),
      note: 'in 1km radius',
      present: n.buildingPermits > 0,
    },
    {
      label: 'Price per sqft trend',
      value: n.ppsqftTrend,
      note: 'last 12 months',
      present: n.ppsqftTrend !== 'N/A',
    },
  ]

  const statTiles: Array<[string, string, string]> = candidateTiles
    .filter((t) => t.present)
    .map((t) => [t.label, t.value, t.note])

  const missingLabels = candidateTiles.filter((t) => !t.present).map((t) => t.label)

  // Appreciation is a paid-source figure we often don't have. When it's missing
  // but we *do* have core neighbourhood signals (income, walkability), lead with
  // those rather than claiming all market data is pending — that would ignore the
  // real data on the tiles below. Only "pending" when we truly have nothing.
  const hasAppreciation = n.appreciation5y > 0
  const hasCoreData = n.walkScore > 0 || n.avgIncome > 0
  const verdictLabel = hasAppreciation
    ? n.appreciation5y >= 0.2
      ? 'Strong appreciation'
      : 'Modest growth'
    : hasCoreData
      ? n.walkScore >= 80
        ? 'Very walkable'
        : n.walkScore >= 50
          ? 'Somewhat walkable'
          : 'Partial market data'
      : 'Market data pending'
  const verdictTone = hasAppreciation
    ? n.appreciation5y >= 0.2
      ? 'pass'
      : 'caution'
    : hasCoreData && n.walkScore >= 80
      ? 'pass'
      : 'caution'

  return (
    <section className="container tr-section" data-section="08">
      <SectionHead
        n="08"
        topic="Neighbourhood"
        question={
          <>
            What's the <em>market</em> doing around it?
          </>
        }
        verdict={verdictLabel}
        tone={verdictTone}
      />

      {/* 6 stat tiles */}
      <div
        className="grid-1col-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          marginBottom: 22,
        }}
      >
        {statTiles.map(([label, value, sub]) => (
          <div key={label} className="card col" style={{ padding: '18px 22px', gap: 4 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              {label}
            </span>
            <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1 }}>
              {value}
            </span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {sub}
            </span>
          </div>
        ))}
      </div>

      {missingLabels.length > 0 && (
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--muted)',
            margin: '-8px 0 22px',
          }}
        >
          Not shown for this address:{' '}
          <span style={{ color: 'var(--ink-2)' }}>{missingLabels.join(', ').toLowerCase()}</span>.
          We leave a figure out rather than estimate one.
        </p>
      )}

      {/* Comparable sales + appreciation */}
      <div
        className="grid-1col-mobile"
        style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}
      >
        {/* Comparable sales */}
        <div className="card col" style={{ padding: 28, gap: 18 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div className="col" style={{ gap: 4 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Comparable recent sales
              </span>
              <h3 className="serif" style={{ fontSize: 22 }}>
                What sold nearby.
              </h3>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {n.comps.length} verified sales
            </span>
          </div>

          <div className="col" style={{ gap: 0 }}>
            {compsAreSample && n.comps.length > 0 && (
              <div
                style={{
                  padding: '10px 14px',
                  marginBottom: 12,
                  borderRadius: 10,
                  background: 'color-mix(in oklab, var(--caution) 12%, transparent)',
                  border: '1px solid color-mix(in oklab, var(--caution) 40%, transparent)',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: 'var(--ink-2)',
                }}
              >
                <strong style={{ color: 'var(--caution)' }}>Sample data — not this area.</strong>{' '}
                These are real recorded sales from the data provider&apos;s demo coverage, shown to
                exercise this section before Ontario comparables are licensed. Do not read them as
                comparables for this address.
              </div>
            )}

            {n.comps.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
                No comparable-sales source yet — recent sold prices aren&apos;t available for this
                area.
              </p>
            )}
            {n.comps.map((comp, i) => (
              <div
                key={comp.addr}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: i < n.comps.length - 1 ? '1px solid var(--line)' : 'none',
                  gap: 16,
                  alignItems: 'flex-start',
                }}
              >
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>{comp.addr}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {comp.beds === '—' ? '— bed' : `${comp.beds} bed`}
                    {comp.sqft > 0 ? ` · ${comp.sqft.toLocaleString('en-CA')} sqft` : ''}
                  </span>
                </div>
                <div className="col" style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                  <span
                    className="serif tabular"
                    style={{ fontSize: 18, lineHeight: 1, color: 'var(--ink)' }}
                  >
                    {comp.sold}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {comp.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appreciation card */}
        <div
          className="card col"
          style={{
            padding: 28,
            gap: 18,
            background: 'var(--ink)',
            color: 'var(--bg)',
            borderColor: 'var(--ink)',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'color-mix(in oklab, var(--bg) 55%, transparent)',
            }}
          >
            Appreciation
          </div>

          <div className="col" style={{ gap: 4 }}>
            <span
              className="serif tabular"
              style={{
                fontSize: 'clamp(36px, 4vw, 52px)',
                lineHeight: 1,
                color: 'var(--accent)',
              }}
            >
              {n.appreciation5y !== 0 ? `+${fmtPct(n.appreciation5y, 1)}` : '—'}
            </span>
            <span
              style={{ fontSize: 14, color: 'color-mix(in oklab, var(--bg) 75%, transparent)' }}
            >
              5-year median sale price
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 6,
              alignItems: 'center',
              fontSize: 13,
              color: 'color-mix(in oklab, var(--bg) 70%, transparent)',
            }}
          >
            <span>10-year:</span>
            <span className="mono tabular" style={{ color: 'var(--bg)', fontWeight: 500 }}>
              {n.appreciation10y !== 0 ? `+${fmtPct(n.appreciation10y, 1)}` : '—'}
            </span>
          </div>

          <div
            style={{
              height: 1,
              background: 'color-mix(in oklab, var(--bg) 15%, transparent)',
              margin: '4px 0',
            }}
          />

          <p
            style={{
              fontSize: 13,
              color: 'color-mix(in oklab, var(--bg) 70%, transparent)',
              lineHeight: 1.55,
            }}
          >
            Numbers from Teranet HPI · public MLS · adjusted for inflation. Past appreciation is not
            a guarantee of future returns.
          </p>
        </div>
      </div>
    </section>
  )
}
