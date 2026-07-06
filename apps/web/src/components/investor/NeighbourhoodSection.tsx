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
  listing: ListingData
  neighbourhood: NeighbourhoodData
}

export function NeighbourhoodSection({
  listing: _listing,
  neighbourhood,
}: NeighbourhoodSectionProps): JSX.Element {
  const n = neighbourhood

  const statTiles: Array<[string, string, string]> = [
    ['Median income (FSA)', n.avgIncome > 0 ? fmtMoney(n.avgIncome) : '—', 'StatsCan 2021'],
    ['5-year pop. growth', n.popGrowth5y !== 0 ? fmtPct(n.popGrowth5y, 1) : '—', 'StatsCan'],
    [
      'Walk Score',
      n.walkScore > 0 ? String(n.walkScore) : '—',
      n.walkScore >= 80 ? 'Very walkable' : 'Mostly walkable',
    ],
    [
      'Transit Score',
      n.transitScore > 0 ? String(n.transitScore) : '—',
      n.transitScore >= 80 ? 'Excellent' : 'Some transit',
    ],
    [
      'Active building permits',
      n.buildingPermits > 0 ? String(n.buildingPermits) : '—',
      'in 1km radius',
    ],
    ['Price per sqft trend', n.ppsqftTrend !== 'N/A' ? n.ppsqftTrend : '—', 'last 12 months'],
  ]

  // No appreciation figure means we have no neighbourhood market data for this
  // FSA yet — say so honestly rather than implying "modest growth" from a zero.
  const hasAppreciation = n.appreciation5y > 0
  const verdictTone = !hasAppreciation ? 'caution' : n.appreciation5y >= 0.2 ? 'pass' : 'caution'
  const verdictLabel = !hasAppreciation
    ? 'Market data pending'
    : n.appreciation5y >= 0.2
      ? 'Strong appreciation'
      : 'Modest growth'

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

      {/* Comparable sales + appreciation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
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
                    {comp.beds} bed · {comp.sqft.toLocaleString('en-CA')} sqft
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
