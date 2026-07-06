/**
 * WhatsIncludedSection — §06 of the tenant report.
 *
 * Auto-fit amenities grid with three colouring states:
 *   incl    → green (pass)    — included in rent
 *   extra   → amber (caution) — additional cost on top of rent
 *   unclear → red (fail)      — needs landlord confirmation
 *
 * Each cell shows a circular glyph (✓ / $ / ?), the amenity label,
 * and an optional note line (e.g. "~$80–110/mo").
 *
 * Props:
 *   amenities      — array of TenantAmenity items
 *   askingRent     — asking rent in dollars (used in the section question)
 *   estimatedValue — formatted string for total amenity value (e.g. "~$320/mo")
 *   adjustedRent   — formatted string for adjusted effective rent (e.g. "$1,830/mo")
 */

import type { TenantAmenity } from '../../types/analysis'
import { SectionHead } from '../shared/SectionHead'

interface WhatsIncludedSectionProps {
  amenities: TenantAmenity[]
  askingRent?: number
  estimatedValue?: string
  adjustedRent?: string
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AmenityCell({ amenity }: { amenity: TenantAmenity }): JSX.Element {
  const color =
    amenity.status === 'incl'
      ? 'var(--pass)'
      : amenity.status === 'extra'
        ? 'var(--caution)'
        : 'var(--fail)'

  const glyph = amenity.status === 'incl' ? '✓' : amenity.status === 'extra' ? '$' : '?'

  return (
    <div
      className="row"
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        background: `color-mix(in oklab, ${color} 6%, var(--bg-elev))`,
        border: `1px solid color-mix(in oklab, ${color} 20%, var(--line))`,
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Glyph */}
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: 999,
          background: `color-mix(in oklab, ${color} 18%, transparent)`,
          color,
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {glyph}
      </span>

      {/* Label + note — span (not div) so .closest('div') reaches the outer row cell */}
      <span
        className="col"
        style={{ gap: 0, minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{amenity.label}</span>
        {amenity.note && (
          <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
            {amenity.note}
          </span>
        )}
      </span>
    </div>
  )
}

function Legend({
  swatch,
  label,
}: {
  swatch: 'pass' | 'caution' | 'fail'
  label: string
}): JSX.Element {
  const color =
    swatch === 'pass' ? 'var(--pass)' : swatch === 'caution' ? 'var(--caution)' : 'var(--fail)'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: 'var(--muted)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </span>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

export function WhatsIncludedSection({
  amenities,
  askingRent,
  estimatedValue,
  adjustedRent,
}: WhatsIncludedSectionProps): JSX.Element {
  const rentLabel = askingRent ? `$${askingRent.toLocaleString('en-CA')}` : 'rent'
  const inclCount = amenities.filter((a) => a.status === 'incl').length
  const unclearCount = amenities.filter((a) => a.status === 'unclear').length
  // The "$X replace value → adjusted rent" narrative needs a real dollar estimate.
  // Live mode has no amenity-valuation source, so we only show that framing when
  // both figures are supplied (demo); otherwise a plain, honest included/confirm tally.
  const hasValuation = estimatedValue != null && adjustedRent != null

  return (
    <section className="container tr-section" data-section="06">
      <SectionHead
        n="06"
        topic="What's included"
        question={
          <>
            What does <em>{rentLabel}</em> actually buy you?
          </>
        }
        verdict={
          hasValuation
            ? `+${estimatedValue} included`
            : `${inclCount} of ${amenities.length} confirmed`
        }
        tone={inclCount > 0 ? 'pass' : 'caution'}
      />

      <div className="card" style={{ padding: 28 }}>
        {/* Summary + legend row */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            marginBottom: 18,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 560 }}>
            {hasValuation ? (
              <>
                Tenant unions estimate the included amenities + utilities below would cost{' '}
                <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {estimatedValue}
                </span>{' '}
                to replace independently. Adjusted for that, you're paying closer to{' '}
                <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {adjustedRent}
                </span>{' '}
                for the unit itself.{' '}
              </>
            ) : (
              <>
                {inclCount} of {amenities.length} items are confirmed included from the listing;{' '}
                {unclearCount > 0
                  ? `${unclearCount} still need confirming with the landlord`
                  : 'the rest are extra'}
                . Utility costs shown are estimates.{' '}
              </>
            )}
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {inclCount} of {amenities.length} items confirmed included.
            </span>
          </p>

          <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
            <Legend swatch="pass" label="Included" />
            <Legend swatch="caution" label="Extra" />
            <Legend swatch="fail" label="Unclear" />
          </div>
        </div>

        {/* Amenity grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 10,
          }}
          aria-label="Amenities breakdown"
        >
          {amenities.map((a) => (
            <AmenityCell key={a.label} amenity={a} />
          ))}
        </div>
      </div>
    </section>
  )
}
