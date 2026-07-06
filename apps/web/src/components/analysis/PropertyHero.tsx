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
}

export function PropertyHero({
  listing,
  score,
  cashFlowMonthly,
  capRate,
  dscr,
  onBack,
  mapCenter,
}: PropertyHeroProps): JSX.Element {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)

  useEffect(() => {
    const handler = (): void => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

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
          Report · Investor view
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

      {/* Two-column hero — single column on mobile, score card first */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr',
          gap: 'clamp(28px, 3.5vw, 52px)',
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT — photos + chips + address */}
        <div className="col" style={{ gap: 28 }}>
          {/* Photo grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 8,
              height: 360,
            }}
          >
            {/* Main photo */}
            <div
              className={listing.photoUrls?.[0] ? undefined : 'photo-ph'}
              style={{ borderRadius: 18, height: '100%', overflow: 'hidden' }}
            >
              {listing.photoUrls?.[0] ? (
                <img
                  src={listing.photoUrls[0]}
                  alt={`Exterior of ${listing.addressLine1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span>exterior · {listing.propertyType.toLowerCase()}</span>
              )}
            </div>

            {/* Thumbnail stack */}
            <div className="col" style={{ gap: 8 }}>
              {(['living', 'kitchen', 'floorplan'] as const).map((label, idx) => (
                <div
                  key={label}
                  className={listing.photoUrls?.[idx + 1] ? undefined : 'photo-ph'}
                  style={{
                    borderRadius: 14,
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {listing.photoUrls?.[idx + 1] ? (
                    <img
                      src={listing.photoUrls[idx + 1]}
                      alt={label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{label}</span>
                  )}
                  {idx === 2 && (
                    <div
                      className="mono"
                      style={{
                        position: 'absolute',
                        right: 10,
                        bottom: 10,
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        padding: '3px 8px',
                        background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
                        borderRadius: 999,
                        color: 'var(--ink)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      + more
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

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

          {/* MiniMap — rental comp markers near the property */}
          <MiniMap
            height={180}
            address={`${listing.addressLine1}, ${listing.addressLine2}`}
            pins={[]}
            center={mapCenter}
          />
        </div>

        {/* RIGHT — sticky score card (order: -1 on mobile to appear above photo grid) */}
        <div
          className="card col"
          style={{ padding: 32, gap: 24, position: 'sticky', top: 84, order: isMobile ? -1 : 0 }}
        >
          {/* Gauge — capped at 84px on mobile */}
          <div className="col" style={{ alignItems: 'center', gap: 8 }}>
            <DealScore
              score={score.displayTotal}
              max={100}
              tone={score.tone}
              size={isMobile ? 'sm' : 'lg'}
              label="Deal score / 100"
              showVerdict={!isMobile}
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
