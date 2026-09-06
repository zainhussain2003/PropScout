/**
 * PropertyHero — shared photo grid + chips + address + sticky score card.
 *
 * Layout (2-column grid):
 *   Left  — photo grid (2fr + 1fr), chips, address, bedroom/bath/sqft/parking row
 *   Right — sticky card with DealScore gauge, verdict, score breakdown, key metrics
 *
 * Photo grid is a placeholder (grey fill) until photo URLs are provided.
 * Chips come from listing.chips (set by scraper or demo data).
 */

import { useState, useEffect } from 'react'
import type { ListingData, DealScoreData } from '../../types/analysis'
import { DealScore } from './DealScore'
import { MiniMap } from './MiniMap'
import { ListingVisual } from './ListingVisual'
import { Chip } from '../shared/Chip'
import { Icon } from '../shared/Icon'
import { fmtMoney, fmtPct } from '../../lib/investorCalc'

interface PropertyHeroProps {
  listing: ListingData
  score: DealScoreData
  /** Monthly cash flow — shown in the sticky score card */
  cashFlowMonthly: number
  /** Cap rate (decimal, e.g. 0.045) — shown in the sticky score card */
  capRate: number
  /** DSCR — shown in the sticky score card */
  dscr: number
  /** Called when the user clicks "Analyze another listing" */
  onBack?: () => void
  /** Subject coordinates — renders the real Mapbox map when provided. */
  mapCenter?: { lat: number; lng: number } | null
  /** Breadcrumb view label, e.g. "Investor view" / "Landlord view". */
  viewLabel?: string
}

export function PropertyHero({
  listing,
  score,
  cashFlowMonthly,
  capRate,
  dscr,
  onBack,
  mapCenter,
  viewLabel = 'Investor view',
}: PropertyHeroProps): JSX.Element {
  // Only the gauge size depends on this now; the layout collapse is CSS.
  // matchMedia reads the viewport, so it agrees with the stylesheet and is not
  // thrown off by horizontal overflow the way window.innerWidth was.
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const handler = (e: MediaQueryListEvent): void => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const hasPhotos = (listing.photoUrls?.length ?? 0) > 0

  const verdictColor =
    score.tone === 'pass'
      ? 'var(--pass)'
      : score.tone === 'caution'
        ? 'var(--caution)'
        : 'var(--fail)'

  return (
    <section className="container" style={{ paddingTop: 56, paddingBottom: 48 }}>
      {/* Breadcrumb */}
      <div
        className="row gap-12"
        style={{
          marginBottom: 28,
          color: 'var(--muted)',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            padding: 0,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          aria-label="Analyze another listing"
        >
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }} aria-hidden="true">
            <Icon name="arrow" size={13} />
          </span>
          Analyze another listing
        </button>
        <span style={{ opacity: 0.4 }}>·</span>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Report · {viewLabel}
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            className="live-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--pass)',
            }}
            aria-hidden="true"
          />
          Live recalc · sliders below
        </span>
      </div>

      {/* Two-column hero — collapses to one column via CSS (.report-hero), not
          a JS width check. See the rule in global.css for why. */}
      <div className="report-hero">
        {/* LEFT — photos + chips + address */}
        <div className="col" style={{ gap: 28 }}>
          {/* Photos when the listing has them, the property on a map when it
              does not. Never fixed room-labelled frames: an address-entered
              listing has no photos, and the old grid rendered four grey tiles
              and a "+ 18 more" badge regardless. */}
          <ListingVisual
            photoUrls={listing.photoUrls}
            address={`${listing.addressLine1}, ${listing.addressLine2}`}
            center={mapCenter}
            propertyType={listing.propertyType.toLowerCase()}
          />

          {/* Chips, address, quick facts */}
          <div className="col" style={{ gap: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {listing.chips.map((chip, i) => (
                <Chip key={i}>{chip}</Chip>
              ))}
            </div>

            <h1
              className="serif"
              style={{
                textWrap: 'balance',
                letterSpacing: '-0.035em',
                marginTop: 4,
              }}
            >
              {listing.addressLine1}
            </h1>
            <div style={{ fontSize: 16, color: 'var(--muted)' }}>{listing.addressLine2}</div>

            <div
              style={{
                display: 'flex',
                gap: 20,
                flexWrap: 'wrap',
                marginTop: 8,
                fontSize: 14,
                color: 'var(--ink-2)',
                alignItems: 'center',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="house" size={14} />
                {listing.beds} bed · {listing.baths} bath
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="dot" size={10} />
                {listing.sqft.toLocaleString('en-CA')} sqft
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="key" size={14} />
                {listing.parking} parking
              </span>
              {listing.yearBuiltKnown !== false && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="chart" size={14} />
                  Built {listing.yearBuilt}
                </span>
              )}
            </div>
          </div>

          {/* MiniMap — only when the hero visual is photos. With no photos the
              hero already shows this exact map, and rendering it twice looked
              like a bug. */}
          {hasPhotos && (
            <MiniMap
              height={180}
              address={`${listing.addressLine1}, ${listing.addressLine2}`}
              pins={[]}
              center={mapCenter}
            />
          )}
        </div>

        {/* RIGHT — sticky score card (order: -1 on mobile to appear above photo grid) */}
        <div
          className="card col report-hero-score"
          style={{ padding: 32, gap: 24, position: 'sticky', top: 84 }}
        >
          {/* Gauge — capped at 84px on mobile */}
          {/* showVerdict is deliberately off: the same verdict label is
              rendered directly below the gauge, so the in-ring pill was a
              duplicate — and a clipped one for long labels. */}
          <div className="col" style={{ alignItems: 'center', gap: 8 }}>
            <DealScore
              score={score.displayTotal}
              max={100}
              tone={score.tone}
              size={isMobile ? 'sm' : 'lg'}
              label="Deal score / 100"
              verdictLabel={score.label}
              animate
            />
          </div>

          {/* Verdict label + tagline */}
          <div className="col" style={{ textAlign: 'center', alignItems: 'center', gap: 8 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: verdictColor,
              }}
            >
              {score.label}
            </div>
            <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, textWrap: 'balance' }}>
              {score.tagline}
            </div>
          </div>

          <div className="divider" style={{ borderTop: '1px solid var(--line)' }} />

          {/* Score breakdown bars */}
          <div className="col" style={{ gap: 10 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Score breakdown
            </div>
            {(
              [
                ['Cap rate', score.breakdown.capRate, score.breakdown.componentMaxes.capRate],
                ['Cash flow', score.breakdown.cashFlow, score.breakdown.componentMaxes.cashFlow],
                [
                  'CoC return',
                  score.breakdown.cashOnCash,
                  score.breakdown.componentMaxes.cashOnCash,
                ],
                ['DSCR', score.breakdown.dscr, score.breakdown.componentMaxes.dscr],
                ['Demand', score.breakdown.demand, score.breakdown.componentMaxes.demand],
              ] as Array<[string, number, number]>
            ).map(([lbl, v, max]) => (
              <div key={lbl} className="col" style={{ gap: 4 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--ink-2)' }}>{lbl}</span>
                  <span className="mono tabular" style={{ color: 'var(--muted)' }}>
                    {v} / {max}
                  </span>
                </div>
                <div
                  style={{
                    height: 3,
                    borderRadius: 999,
                    background: 'var(--line)',
                  }}
                >
                  <div
                    style={{
                      width: `${max > 0 ? (v / max) * 100 : 0}%`,
                      height: '100%',
                      borderRadius: 999,
                      background:
                        v / max > 0.6
                          ? 'var(--pass)'
                          : v / max > 0.2
                            ? 'var(--caution)'
                            : 'var(--fail)',
                    }}
                  />
                </div>
              </div>
            ))}
            {score.deductions > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                <span style={{ color: 'var(--ink-2)' }}>Risk deductions</span>
                <span className="mono tabular" style={{ color: 'var(--fail)' }}>
                  −{score.deductions}
                </span>
              </div>
            )}
          </div>

          <div className="divider" style={{ borderTop: '1px solid var(--line)' }} />

          {/* Key metrics */}
          <div className="col" style={{ gap: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
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
                {listing.price > 0 ? 'Asking' : 'Asking rent'}
              </span>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>
                {/* For-rent listings carry no sale price — showing "$0" as the
                    asking figure is a data lie (live 2026-07-02). */}
                {listing.price > 0 ? (
                  fmtMoney(listing.price)
                ) : (
                  <>
                    {fmtMoney(listing.rentEstimate)}
                    <span style={{ fontSize: 16, color: 'var(--muted)' }}>/mo</span>
                  </>
                )}
              </span>
            </div>
            {[
              {
                label: 'Cash flow',
                value: `${fmtMoney(cashFlowMonthly)}/mo`,
                color: cashFlowMonthly >= 0 ? 'var(--pass)' : 'var(--fail)',
              },
              {
                label: 'Cap rate',
                value: fmtPct(capRate),
                color: 'var(--ink)',
              },
              {
                label: 'DSCR',
                value: `${dscr.toFixed(2)}×`,
                color: 'var(--ink)',
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'var(--ink-2)',
                }}
              >
                <span>{row.label}</span>
                <span className="mono tabular" style={{ fontWeight: 600, color: row.color }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
