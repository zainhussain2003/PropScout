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
import { medianOf } from '../../lib/comparableSales'

interface PBSalesSectionProps {
  /**
   * Demo fixtures. Rendered only on the demo route; on a live report these are
   * never shown, because they describe someone else's neighbourhood.
   */
  comps: PersonalComp[]
  /**
   * True in LIVE mode. The fixtures in `comps` must never be presented as this
   * listing's real neighbours, so a live report renders `liveComps` if there
   * are any and the honest empty state if there are not.
   */
  isSampleData?: boolean
  /**
   * Real comparable sales for this property, from the analysis payload. Empty
   * when no sales feed is configured or the area has no coverage.
   */
  liveComps?: PersonalComp[]
  /**
   * True when `liveComps` came from the provider's sample coverage area rather
   * than this property's neighbourhood. They are real sales, but not local
   * ones, so the section says so rather than implying they are next door.
   */
  liveCompsAreSample?: boolean
}

export function PBSalesSection({
  comps,
  isSampleData = false,
  liveComps = [],
  liveCompsAreSample = false,
}: PBSalesSectionProps): JSX.Element {
  // A live report shows real comps when we have them, and nothing invented when
  // we do not. Fixtures are for the demo route only.
  const rows: PersonalComp[] = isSampleData ? liveComps : comps

  if (rows.length === 0) {
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
          verdict="No comparable-sales source yet"
          tone="caution"
        />
        <div className="card" style={{ padding: 32 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 640 }}>
            No comparable-sales source yet — recent sold prices aren&apos;t available for this area.
            We show sold comparables once a licensed sales feed is connected; until then, confirm
            recent sales with a local agent.
          </p>
        </div>
      </section>
    )
  }

  // Median by sold price (middle value of sorted array)
  const sorted = [...rows].sort((a, b) => a.sold - b.sold)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted[mid]

  // DOM and $/sqft can be missing on live comps — median over what is known,
  // and null when nothing is, so the footer shows a dash instead of a zero.
  const medianDOM = medianOf(rows.map((c) => c.dom))
  const medianPpsqft = medianOf(rows.map((c) => c.ppsqft))

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
        verdict={`${rows.length} sales · last 6 mo`}
        tone="pass"
      />

      {isSampleData && liveCompsAreSample && (
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--caution)',
            letterSpacing: '0.12em',
            marginBottom: 16,
          }}
        >
          Real sales from the provider&apos;s sample coverage area — not this neighbourhood
        </p>
      )}
      {!isSampleData && (
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '0.12em',
            marginBottom: 16,
          }}
        >
          Sample comparables · demo report
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
        {rows.map((c, i) => (
          <div
            key={c.addr}
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              padding: '14px 24px',
              borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none',
              fontSize: 13.5,
              alignItems: 'center',
            }}
          >
            <div className="col" style={{ gap: 2 }}>
              <span style={{ color: 'var(--ink)' }}>{c.addr}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                {c.distance !== null ? `${c.distance} · ` : ''}sold {c.soldDate}
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
              {c.ppsqft !== null ? `$${c.ppsqft}` : '—'}
            </span>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>
              {c.dom !== null ? `${c.dom}d` : '—'}
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
            {medianPpsqft !== null ? `$${medianPpsqft}` : '—'}
          </span>
          <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--accent)' }}>
            {medianDOM !== null ? `${medianDOM}d` : '—'}
          </span>
        </div>
      </div>
    </section>
  )
}
