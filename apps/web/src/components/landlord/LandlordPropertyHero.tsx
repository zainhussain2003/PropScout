/**
 * LandlordPropertyHero — property hero for the Landlord report.
 *
 * Left: photo grid + chips + address + property meta + ownership context strip
 *   (purchased price/year, current value + appreciation, mortgage balance + rate).
 * Right: sticky score card showing DealScore gauge, asking rent, rent positioning
 *   badge, and live cash flow / cap rate / DSCR / days-on-market row.
 *
 * Design source: landlord-sections.jsx > LandlordPropertyHero
 */

import type { LandlordProperty, RentPositioning } from '../../types/landlord'
import { ListingVisual } from '../analysis/ListingVisual'
import type { DealScoreData, ComputedInvestorMetrics } from '../../types/analysis'
import { DealScore } from '../analysis/DealScore'
import { Chip } from '../shared/Chip'
import { Icon } from '../shared/Icon'
import { fmtMoney, fmtPct } from '../../lib/investorCalc'

interface LandlordPropertyHeroProps {
  property: LandlordProperty
  askingRent: number
  metrics: ComputedInvestorMetrics
  score: DealScoreData
  /** Null when there are no comparables to position the rent against. */
  positioning: RentPositioning | null
  /** Photo URLs from the scraper; absent for address-entered listings. */
  photoUrls?: string[]
  /** Subject coordinates — renders the real map when there are no photos. */
  mapCenter?: { lat: number; lng: number } | null
}

export function LandlordPropertyHero({
  property,
  askingRent,
  metrics,
  score,
  positioning,
  photoUrls,
  mapCenter = null,
}: LandlordPropertyHeroProps): JSX.Element {
  const verdictColor =
    score.tone === 'pass'
      ? 'var(--pass)'
      : score.tone === 'caution'
        ? 'var(--caution)'
        : 'var(--fail)'

  // No comparables reads as a caution, and the gap line is omitted rather
  // than rendered as "+$0" — zero would be a claim the rent sits on the median.
  const positioningColor =
    positioning == null || positioning.tone === 'caution'
      ? 'var(--caution)'
      : positioning.tone === 'pass'
        ? 'var(--pass)'
        : 'var(--fail)'

  const domColor =
    property.ownership.daysOnMarket > 30
      ? 'var(--fail)'
      : property.ownership.daysOnMarket > 14
        ? 'var(--caution)'
        : 'var(--pass)'

  return (
    <section className="container" style={{ paddingTop: 56, paddingBottom: 48 }}>
      {/* Breadcrumb strip */}
      <div className="row gap-12" style={{ marginBottom: 28, color: 'var(--muted)', fontSize: 13 }}>
        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>
            <Icon name="arrow" size={13} />
          </span>
          Analyze another listing
        </a>
        <span style={{ opacity: 0.4 }}>·</span>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Report · Landlord view
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            className="live-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--accent)',
            }}
          />
          You own this unit · listed {property.ownership.daysOnMarket} days ago
        </span>
      </div>

      <div
        className="grid-1col-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 'clamp(28px, 3.5vw, 52px)',
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT — photos + property meta */}
        <div className="col" style={{ gap: 28 }}>
          {/* Photos when the listing has them, the property on a map when it
              does not — never grey frames with a hardcoded "+ 18 more". */}
          <ListingVisual
            photoUrls={photoUrls}
            address={property.addressLine1}
            center={mapCenter}
            propertyType="unit"
          />

          {/* Address + chips + meta */}
          <div className="col" style={{ gap: 18 }}>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {property.chips.map((c, i) => (
                <Chip key={i}>{c}</Chip>
              ))}
            </div>
            <h1
              className="serif"
              style={
                {
                  textWrap: 'balance',
                  letterSpacing: '-0.035em',
                  marginTop: 4,
                } as React.CSSProperties
              }
            >
              {property.addressLine1}
            </h1>
            <div style={{ fontSize: 16, color: 'var(--muted)' }}>{property.addressLine2}</div>

            <div
              className="row gap-20"
              style={{
                flexWrap: 'wrap',
                marginTop: 8,
                fontSize: 14,
                color: 'var(--ink-2)',
              }}
            >
              <span className="row gap-8">
                <Icon name="house" size={14} />
                {property.beds} · {property.baths} bath
              </span>
              <span className="row gap-8">
                <Icon name="dot" size={10} />
                {property.sqft.toLocaleString()} sqft
              </span>
              <span className="row gap-8">
                <Icon name="key" size={14} />
                {property.parking}
              </span>
              <span className="row gap-8">
                <Icon name="chart" size={14} />
                Built {property.yearBuilt}
              </span>
            </div>

            {/* Ownership context strip */}
            <div
              className="row gap-12"
              style={{
                marginTop: 16,
                padding: '14px 18px',
                borderRadius: 14,
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
                flexWrap: 'wrap',
              }}
            >
              <div className="col" style={{ gap: 2, minWidth: 130 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Purchased
                </span>
                <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1 }}>
                  {fmtMoney(property.purchasedFor)}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {' '}
                    · {property.purchasedYear}
                  </span>
                </span>
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
              <div className="col" style={{ gap: 2, minWidth: 130 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Current value
                </span>
                <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1 }}>
                  {fmtMoney(property.price)}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--pass)' }}>
                    {' '}
                    · +{fmtPct(property.appreciation, 1)}
                  </span>
                </span>
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
              <div className="col" style={{ gap: 2, minWidth: 130 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Mortgage balance
                </span>
                <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1 }}>
                  {fmtMoney(property.ownership.mortgageBalance)}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {' '}
                    · {fmtPct(property.ownership.contractRate, 2)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — sticky beside photos; static once the hero becomes one column. */}
        <div
          className="card col report-side-score"
          style={{ padding: 32, gap: 24, position: 'sticky', top: 84 }}
        >
          {/* DealScore gauge */}
          <div className="col" style={{ alignItems: 'center', gap: 8 }}>
            <DealScore
              score={score.displayTotal}
              max={100}
              tone={score.tone}
              size="lg"
              label="Landlord score / 100"
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
            <div
              className="serif"
              style={{ fontSize: 20, lineHeight: 1.2, textWrap: 'balance' } as React.CSSProperties}
            >
              {score.tagline}
            </div>
          </div>

          <div className="divider" />

          {/* Asking rent + positioning badge */}
          <div className="col" style={{ gap: 12 }}>
            <div
              className="row"
              style={{
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
                Your asking rent
              </span>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>
                {fmtMoney(askingRent)}
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>/mo</span>
              </span>
            </div>
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '12px 14px',
                borderRadius: 12,
                background: `color-mix(in oklab, ${positioningColor} 8%, transparent)`,
                border: `1px solid color-mix(in oklab, ${positioningColor} 25%, transparent)`,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: positioningColor,
                }}
              >
                {positioning?.label ?? 'No comparables'}
              </span>
              {positioning != null && (
                <span
                  className="serif tabular"
                  style={{ fontSize: 22, lineHeight: 1, color: positioningColor }}
                >
                  {positioning.gap >= 0 ? '+' : '−'}
                  {fmtMoney(Math.abs(positioning.gap), { decimals: 0 })}
                </span>
              )}
            </div>
          </div>

          <div className="divider" />

          {/* Cash flow + cap rate + DSCR + DOM */}
          <div className="col" style={{ gap: 10 }}>
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                fontSize: 13,
                color: 'var(--ink-2)',
              }}
            >
              <span>Net cash flow</span>
              <span
                className="mono tabular"
                style={{
                  fontWeight: 600,
                  color: metrics.cashFlowMonthly >= 0 ? 'var(--pass)' : 'var(--fail)',
                }}
              >
                {fmtMoney(metrics.cashFlowMonthly)}/mo
              </span>
            </div>
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                fontSize: 13,
                color: 'var(--ink-2)',
              }}
            >
              <span>Cap rate</span>
              <span className="mono tabular" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {fmtPct(metrics.capRate)}
              </span>
            </div>
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                fontSize: 13,
                color: 'var(--ink-2)',
              }}
            >
              <span>DSCR</span>
              <span className="mono tabular" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {metrics.dscr.toFixed(2)}×
              </span>
            </div>
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                fontSize: 13,
                color: 'var(--ink-2)',
              }}
            >
              <span>Days on market</span>
              <span className="mono tabular" style={{ fontWeight: 600, color: domColor }}>
                {property.ownership.daysOnMarket} days
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
