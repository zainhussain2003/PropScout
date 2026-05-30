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
  positioning: RentPositioning
  comps: LandlordRentComps
}

const SLIDER_MIN = 2500
const SLIDER_MAX = 3800

export function LandlordRentPositioningSection({
  property,
  askingRent,
  onRentChange,
  positioning,
  comps,
}: LandlordRentPositioningSectionProps): JSX.Element {
  const positioningColor =
    positioning.tone === 'pass'
      ? 'var(--pass)'
      : positioning.tone === 'caution'
        ? 'var(--caution)'
        : 'var(--fail)'

  const toneLabel = (tone: 'pass' | 'caution' | 'fail'): string =>
    tone === 'pass' ? 'var(--pass)' : tone === 'caution' ? 'var(--caution)' : 'var(--fail)'

  return (
    <section className="container tr-section">
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
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={25}
            value={askingRent}
            onChange={(e) => onRentChange(parseFloat(e.target.value))}
            aria-label="Asking rent"
          />

          {/* Slider endpoints */}
          <div className="row" style={{ justifyContent: 'space-between', marginTop: -8 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
              ${SLIDER_MIN.toLocaleString()}
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
              ${SLIDER_MAX.toLocaleString()}
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

        {/* RIGHT — live building listings */}
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
        Every metric on this page recalculates from your slider above. P25/P50/P75 are the last 60
        days of <span className="tabular">{property.compCount}</span> verified rentals in this
        building. Confidence: {property.compConfidence}.
      </p>
    </section>
  )
}
