/**
 * RentalCompsSection — §03 of the investor / landlord report.
 *
 * One implementation for the live report and the demo route (D-073). The two
 * used to carry separate copies that had drifted: the demo's verdict chip
 * read "Within comp range" from the ask alone, and it never disclosed a
 * radius-widened search — the live copy did both differently. Sections that
 * exist twice diverge; this one now exists once.
 */

import { SectionHead } from '../shared/SectionHead'
import { RentalCompsBar } from '../analysis/RentalCompsBar'
import type { CompRow, CompUnitTypes } from '../../types/analysis'
import { CompRowsTable } from '../analysis/CompRowsTable'
import { CompsMap } from '../analysis/CompsMap'

function fmtCAD(n: number): string {
  return `$${Math.round(n).toLocaleString('en-CA')}`
}

export interface RentalCompsSectionProps {
  /** The analysis's rental estimate; null or zero comps renders nothing. */
  comps: {
    low: number
    mid: number
    high: number
    compCount: number
    confidence: 'low' | 'medium' | 'high'
    radiusKm?: number | null
    /** The comps behind the band (D-099); absent on the demo and older analyses. */
    rows?: CompRow[]
    /** How the comps' dwelling types compare with the subject's (D-117). */
    unitTypes?: CompUnitTypes
  } | null
  /** The rent the report is evaluating against the range. */
  askingRent: number
  /** True when askingRent is the price-based proxy (no comps, no listed rent) — D-101. */
  rentIsProxy?: boolean
  /** Subject coordinates — with them, comps that carry a position are mapped (D-109). */
  mapCenter?: { lat: number; lng: number } | null
}

export function RentalCompsSection({
  comps,
  askingRent,
  rentIsProxy = false,
  mapCenter = null,
}: RentalCompsSectionProps): JSX.Element | null {
  // No comps is a finding, not a missing section (D-101): the numbers above
  // and below rest on a rent that nothing observed supports, and the report
  // used to drop §03 entirely — the outline skipped from 02 to 04 and the only
  // trace of the proxy was a row in the Sources ledger.
  if (!comps || comps.compCount === 0) {
    return (
      <section className="container tr-section" data-section="03">
        <SectionHead
          n="03"
          topic="Rental comps"
          question={
            <>
              What can it <em>realistically</em> rent for?
            </>
          }
          verdict="No comparable rentals found"
          tone="fail"
        />
        <div className="card col" style={{ padding: 28, gap: 10 }}>
          <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>
            Nothing to compare against within 10 km.
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', margin: 0 }}>
            {rentIsProxy
              ? `Every rent-dependent figure on this report — cash flow, cap rate, DSCR, break-even, the score — assumes ${fmtCAD(askingRent)}/mo, which is 0.5% of the asking price (about a 6% gross yield), not a market observation. Treat those figures as indicative until you have real asking rents for the area.`
              : `The rent used is the listing's own ${fmtCAD(askingRent)}/mo; nothing in the nightly comps table tests it. Treat the rent-dependent figures as unverified.`}
          </p>
        </div>
      </section>
    )
  }

  const { low, mid, high, compCount, confidence } = comps
  const radiusKm = comps.radiusKm ?? null

  return (
    <section className="container tr-section" data-section="03">
      <SectionHead
        n="03"
        topic="Rental comps"
        question={
          <>
            What can it <em>realistically</em> rent for?
          </>
        }
        verdict={`${compCount} comparable rentals`}
        tone={confidence === 'high' ? 'pass' : confidence === 'medium' ? 'caution' : 'fail'}
      />

      <div className="card" style={{ padding: 28 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Market rent range · {compCount} comparable rentals
            {/* Disclosed, not hidden: when this FSA had no comps the search
                widened by radius, and comps from a few km away can sit in a
                different rental market. */}
            {radiusKm !== null && ` · within ${radiusKm}km, not this postal area`}
          </span>
          <span
            className="mono"
            style={{
              fontSize: 11,
              color:
                confidence === 'high'
                  ? 'var(--pass)'
                  : confidence === 'medium'
                    ? 'var(--caution)'
                    : 'var(--fail)',
            }}
          >
            {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
          </span>
        </div>
        <RentalCompsBar low={low} mid={mid} high={high} ask={askingRent} />
      </div>

      {/* The comps themselves (D-099): the rows after outlier removal,
          nearest first when the search used a radius. Sanitised. */}
      <CompRowsTable rows={comps.rows} compCount={compCount} unitTypes={comps.unitTypes} />
      <CompsMap
        rows={comps.rows}
        center={mapCenter}
        caption={radiusKm !== null ? `within ${radiusKm} km` : 'same postal area'}
      />
    </section>
  )
}
