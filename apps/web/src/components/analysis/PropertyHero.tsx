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
import { scoreBreakdownBars } from '../../lib/scoreBreakdown'

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
                {listing.parking === '—' && ' · not provided'}
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

        <aside
          className="card report-hero-score scorecard"
          aria-label="Investment verdict"
          style={{ '--score-tone': verdictColor } as React.CSSProperties}
        >
          <div className="scorecard-heading">
            <div className="scorecard-call">
              <span className="mono scorecard-eyebrow">The investment verdict</span>
              <h2 className="serif scorecard-verdict">{score.label}</h2>
              <p className="scorecard-tagline">{score.tagline}</p>
            </div>
            <div className="scorecard-gauge">
              <DealScore
                score={score.displayTotal}
                max={100}
                tone={score.tone}
                size={isMobile ? 'sm' : 'md'}
                animate
              />
              <span className="mono scorecard-caption">Score / 100</span>
            </div>
          </div>

          <div className="scorecard-cashflow">
            <span className="scorecard-eyebrow mono">Monthly cash flow</span>
            <strong
              className="mono tabular scorecard-cashflow-value"
              style={{ color: cashFlowMonthly >= 0 ? 'var(--pass)' : 'var(--fail)' }}
            >
              {Number.isFinite(cashFlowMonthly) ? fmtMoney(cashFlowMonthly) : '—'}
              <span className="scorecard-caption"> /mo</span>
            </strong>
            <p className="scorecard-caption">
              {Number.isFinite(cashFlowMonthly)
                ? 'After operating costs and mortgage, with the assumptions below.'
                : 'Cash flow is unavailable because the analysis did not return a valid value.'}
            </p>
          </div>

          <div className="scorecard-breakdown">
            <h3 className="mono scorecard-eyebrow">Score breakdown</h3>
            <p className="scorecard-caption">Points earned · longer tracks carry more weight</p>
            {scoreBreakdownBars(score.breakdown).map((bar) => (
              <div key={bar.label} className="scorecard-factor">
                <div className="scorecard-row">
                  <span>{bar.label}</span>
                  <span className="mono tabular">
                    {bar.value ?? '—'} / {bar.max}
                  </span>
                </div>
                <div
                  className="scorecard-track"
                  style={{ width: `${bar.trackPercent}%` }}
                  role={bar.value === null ? undefined : 'meter'}
                  aria-label={bar.label}
                  aria-valuemin={bar.value === null ? undefined : 0}
                  aria-valuemax={bar.value === null ? undefined : bar.max}
                  aria-valuenow={bar.value ?? undefined}
                  aria-valuetext={
                    bar.value === null ? undefined : `${bar.value} of ${bar.max} points`
                  }
                >
                  <div className="scorecard-fill" style={{ width: `${bar.fillPercent}%` }} />
                </div>
                {bar.value === null && (
                  <p className="scorecard-caption">
                    Component points unavailable from the analysis.
                  </p>
                )}
              </div>
            ))}
            {score.deductions > 0 && (
              <div className="scorecard-row">
                <span>Risk deductions</span>
                <span className="mono tabular scorecard-penalty">−{score.deductions}</span>
              </div>
            )}
            <p className="scorecard-caption">
              Components use a 95-point scale. The score above is shown out of 100; risk limits can
              lower the final verdict.
            </p>
          </div>

          <dl className="scorecard-facts">
            <div className="scorecard-row">
              <dt>{listing.price > 0 ? 'Asking' : 'Asking rent'}</dt>
              <dd className="mono tabular">
                {listing.price > 0
                  ? fmtMoney(listing.price)
                  : `${fmtMoney(listing.rentEstimate)}/mo`}
              </dd>
            </div>
            <div className="scorecard-row">
              <dt>Cap rate</dt>
              <dd className="mono tabular">{Number.isFinite(capRate) ? fmtPct(capRate) : '—'}</dd>
            </div>
            <div className="scorecard-row">
              <dt>DSCR</dt>
              <dd className="mono tabular">
                {Number.isFinite(dscr) ? `${dscr.toFixed(2)}×` : '—'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  )
}
