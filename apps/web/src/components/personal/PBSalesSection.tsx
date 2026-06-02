/**
 * PBSalesSection — §03 Comparable sales (recent · within 1km).
 *
 * 6-column table: Address | Beds | Sqft | Sold for | $/sqft | DOM
 * Footer row shows the median comp values highlighted in accent colour.
 *
 * Design source: personal-sections-2.jsx > PBSalesSection
 */

import type { PersonalComp } from '../../types/personal'
import { SectionHead } from '../shared/SectionHead'
import { fmtMoney } from '../../lib/investorCalc'

interface PBSalesSectionProps {
  comps: PersonalComp[]
  /**
   * When true, renders a "Sample comparables · real sales data in Phase 2"
   * label above the comps table to indicate the data is not derived from
   * the current listing's location.
   */
  isSampleData?: boolean
}

export function PBSalesSection({ comps, isSampleData = false }: PBSalesSectionProps): JSX.Element {
  // Median by sold price (middle value of sorted array)
  const sorted = [...comps].sort((a, b) => a.sold - b.sold)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted[mid]

  // Median DOM (middle value of DOM-sorted array)
  const sortedByDOM = [...comps].sort((a, b) => a.dom - b.dom)
  const medianDOM = sortedByDOM[Math.floor(sortedByDOM.length / 2)].dom

  const COLS = 'repeat(1, 2fr) 0.8fr 0.8fr 1fr 0.8fr 0.8fr'

  return (
    <section className="container tr-section">
      <SectionHead
        n="03"
        topic="Comparable sales"
        question={
          <>
            What's <em>actually</em> selling around here?
          </>
        }
        verdict={`${comps.length} sales · last 6 mo`}
        tone="pass"
      />

      {isSampleData && (
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '0.12em',
            marginBottom: 16,
          }}
        >
          Sample comparables · real sales data in Phase 2
        </p>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COLS,
            padding: '14px 24px',
            background: 'var(--bg-elev)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {(['Address', 'Beds', 'Sqft', 'Sold for', '$/sqft', 'DOM'] as const).map((h, i) => (
            <div
              key={h}
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                textAlign: i === 0 ? 'left' : 'right',
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {comps.map((c, i) => (
          <div
            key={c.addr}
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              padding: '14px 24px',
              borderBottom: i < comps.length - 1 ? '1px solid var(--line)' : 'none',
              fontSize: 13.5,
              alignItems: 'center',
            }}
          >
            <div className="col" style={{ gap: 2 }}>
              <span style={{ color: 'var(--ink)' }}>{c.addr}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                {c.distance} · sold {c.soldDate}
              </span>
            </div>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink)' }}>
              {c.beds}
            </span>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink)' }}>
              {c.sqft.toLocaleString()}
            </span>
            <span className="serif tabular" style={{ textAlign: 'right', fontSize: 16 }}>
              {fmtMoney(c.sold)}
            </span>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>
              ${c.ppsqft}
            </span>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>
              {c.dom}d
            </span>
          </div>
        ))}

        {/* Summary footer — median values */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COLS,
            padding: '16px 24px',
            background: 'color-mix(in oklab, var(--accent) 5%, var(--bg-elev))',
            borderTop: '1px solid var(--line-strong)',
            alignItems: 'center',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Median · last 6 mo
          </span>
          <span />
          <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>
            {median.sqft.toLocaleString()}
          </span>
          <span
            className="serif tabular"
            style={{ textAlign: 'right', fontSize: 18, color: 'var(--accent)' }}
          >
            {fmtMoney(median.sold)}
          </span>
          <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--accent)' }}>
            ${median.ppsqft}
          </span>
          <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--accent)' }}>
            {medianDOM}d
          </span>
        </div>
      </div>
    </section>
  )
}
