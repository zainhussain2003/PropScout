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

export interface RentalCompsSectionProps {
  /** The analysis's rental estimate; null or zero comps renders nothing. */
  comps: {
    low: number
    mid: number
    high: number
    compCount: number
    confidence: 'low' | 'medium' | 'high'
    radiusKm?: number | null
  } | null
  /** The rent the report is evaluating against the range. */
  askingRent: number
}

export function RentalCompsSection({
  comps,
  askingRent,
}: RentalCompsSectionProps): JSX.Element | null {
  if (!comps || comps.compCount === 0) return null

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
    </section>
  )
}
