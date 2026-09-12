/**
 * LandlordRentPositioningSection — §01 Rent positioning with live asking-rent slider.
 *
 * Left: asking rent display + gradient range bar with P25/P50/P75 markers +
 *       diamond position marker + range slider + quick-snap preset buttons.
 * Right: live building listings table (unit, status, asking rent, sqft).
 * Footer: methodology note.
 *
 * Design source: landlord-sections.jsx > LandlordRentPositioningSection
 */

import type { LandlordProperty, LandlordRentComps, RentPositioning } from '../../types/landlord'
import { SectionHead } from '../shared/SectionHead'
import { RentalCompsBar } from '../analysis/RentalCompsBar'
import { fmtMoney } from '../../lib/investorCalc'

interface LandlordRentPositioningSectionProps {
  property: LandlordProperty
  askingRent: number
  onRentChange: (rent: number) => void
  /** Null when there are no comparables to position against. */
  positioning: RentPositioning | null
  /** Null when the analysis returned no comparable rentals. */
  comps: LandlordRentComps | null
  /**
   * Where the range came from, for the label — e.g. "8 comparable rentals
   * within 5 km". Absent on the demo route, whose fixture has no provenance.
   */
  compsSource?: string
}

/**
 * Slider bounds follow the comparable range rather than fixed dollars. The
 * previous constants were 2,500–3,800 — the demo condo's neighbourhood — so a
 * real $1,800 basement or $5,500 house could not even be represented on it.
 * Generous margins either side so the user can explore beyond the comps.
 */
function sliderBounds(comps: LandlordRentComps, askingRent: number): { min: number; max: number } {
  const lo = Math.min(comps.buildingP25, askingRent)
  const hi = Math.max(comps.buildingP75, askingRent)
  return {
    min: Math.max(0, Math.floor((lo * 0.6) / 50) * 50),
    max: Math.ceil((hi * 1.5) / 50) * 50,
  }
}

export function LandlordRentPositioningSection({
  property,
  askingRent,
  onRentChange,
  positioning,
  comps,
  compsSource,
}: LandlordRentPositioningSectionProps): JSX.Element {
  // No comparables: say so and stop. Positioning a rent against a range that
  // does not exist would be the fabrication the rest of the report avoids
  // (D-052 — an empty result is not an absent source, and this is absent).
  if (comps == null || positioning == null) {
    return (
      <section className="container tr-section" data-section="01">
        <SectionHead
          n="01"
          topic="Rent positioning"
          question={
            <>
              Is your rent <em>where the market is</em>?
            </>
          }
          verdict="No comparables"
          tone="caution"
        />
        <div className="card col" style={{ padding: 28, gap: 8 }}>
          <p style={{ fontSize: 15, color: 'var(--ink)', margin: 0 }}>
            We couldn&rsquo;t find comparable rentals for this address.
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, maxWidth: '64ch' }}>
            Rent positioning needs a local range to compare against, and none of our nightly sources
            returned one here. Your asking rent of {fmtMoney(askingRent)} is shown as entered, not
            judged.
          </p>
        </div>
      </section>
    )
  }

  const positioningColor =
    positioning.tone === 'pass'
      ? 'var(--pass)'
      : positioning.tone === 'caution'
        ? 'var(--caution)'
        : 'var(--fail)'

  const toneLabel = (tone: 'pass' | 'caution' | 'fail'): string =>
    tone === 'pass' ? 'var(--pass)' : tone === 'caution' ? 'var(--caution)' : 'var(--fail)'

  const bounds = sliderBounds(comps, askingRent)

  return (
    <section className="container tr-section" data-section="01">
      <SectionHead
        n="01"
        topic="Rent positioning"
        question={
          <>
            Is your rent <em>where the market is</em>?
          </>
        }
        verdict={positioning.label}
        tone={positioning.tone}
      />

      <div
        className="grid-1col-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 22,
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT — slider + bar */}
        <div className="card col gap-24" style={{ padding: 28 }}>
          {/* Current asking rent display */}
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
              Drag to model alternatives
            </span>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span
                className="serif tabular"
                style={{ fontSize: 40, lineHeight: 1, color: positioningColor }}
              >
                {fmtMoney(askingRent)}
              </span>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>/mo</span>
            </div>
          </div>

          {/* Rent comps bar — shared component; ask diamond tracks live askingRent */}
          <RentalCompsBar
            low={comps.buildingP25}
            mid={comps.buildingP50}
            high={comps.buildingP75}
            ask={askingRent}
          />

          {/* Slider */}
          <input
            type="range"
            className="scout-slider"
            min={bounds.min}
            max={bounds.max}
            step={25}
            value={askingRent}
            onChange={(e) => onRentChange(parseFloat(e.target.value))}
            aria-label="Asking rent"
          />

          {/* Slider endpoints */}
          <div className="row" style={{ justifyContent: 'space-between', marginTop: -8 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
              ${bounds.min.toLocaleString()}
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
              ${bounds.max.toLocaleString()}
            </span>
          </div>

          {/* Quick-snap preset buttons */}
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            <button
              onClick={() => onRentChange(comps.buildingP50)}
              className="btn btn-ghost"
              style={{ padding: '8px 12px', fontSize: 12 }}
            >
              Snap to median · {fmtMoney(comps.buildingP50)}
            </button>
            <button
              onClick={() => onRentChange(comps.buildingP25)}
              className="btn btn-ghost"
              style={{ padding: '8px 12px', fontSize: 12 }}
            >
              Aggressive · {fmtMoney(comps.buildingP25)}
            </button>
            <button
              onClick={() => onRentChange(comps.buildingP75)}
              className="btn btn-ghost"
              style={{ padding: '8px 12px', fontSize: 12 }}
            >
              Top of range · {fmtMoney(comps.buildingP75)}
            </button>
          </div>
        </div>

        {/* RIGHT — individual listings, when a source supplies them.
            The API returns only the aggregate today, so on a live report this
            is an absent-source state and NOT "0 units" under a "live" label —
            that heading with fixture rows beneath it was the audit's L-02. */}
        {comps.liveListings.length === 0 ? (
          <div className="card col" style={{ padding: 24, gap: 10 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Individual listings
            </span>
            <p style={{ fontSize: 14, color: 'var(--ink)', margin: 0 }}>
              Not available for this address yet.
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              The range on the left is built from{' '}
              {compsSource ?? 'comparable asking rents in the area'}. The individual listings behind
              it aren&rsquo;t returned yet, so there is nothing to list here — we won&rsquo;t show
              placeholder units.
            </p>
          </div>
        ) : (
          <div className="card col" style={{ padding: 24, gap: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Your building · live
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                {comps.liveListings.length} units
              </span>
            </div>

            <div className="col">
              {comps.liveListings.map((l, i, arr) => (
                <div
                  key={l.unit}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    padding: '12px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div className="col" style={{ gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      {l.unit}
                      <span
                        style={{
                          color: 'var(--muted)',
                          fontWeight: 400,
                          marginLeft: 8,
                        }}
                      >
                        · {l.beds}
                      </span>
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: toneLabel(l.tone) }}>
                      {l.status}
                    </span>
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
                    <span className="serif tabular" style={{ fontSize: 16, lineHeight: 1 }}>
                      {fmtMoney(l.askedAt)}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {l.sqft} sqft
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Methodology footnote */}
      <p
        style={{
          marginTop: 18,
          fontSize: 13,
          color: 'var(--muted)',
          maxWidth: 720,
        }}
      >
        Every number on this page moves with the slider above.{' '}
        {compsSource != null ? (
          <>
            The range comes from {compsSource} — asking rents, not signed leases — with a quarter
            below the lower end and a quarter above the upper end. Confidence:{' '}
            {property.compConfidence}.
          </>
        ) : (
          <>
            The range comes from the last 60 days of{' '}
            <span className="tabular">{property.compCount}</span> verified rentals in this building
            — a quarter asked less than the lower end, a quarter asked more than the upper end.
            Confidence: {property.compConfidence}.
          </>
        )}
      </p>
    </section>
  )
}
