import { useAppDesign } from '../../hooks/useAppDesign'
import { HybridReportContents } from '../hybrid/HybridReportContents'
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
import type { ListingData, DealScoreData, ShadowScore } from '../../types/analysis'
import { DealScore } from './DealScore'
import { MiniMap } from './MiniMap'
import { ListingVisual } from './ListingVisual'
import { Chip } from '../shared/Chip'
import { Icon } from '../shared/Icon'
import { fmtMoney, fmtPct } from '../../lib/investorCalc'
import { scoreBreakdownBars } from '../../lib/scoreBreakdown'
import { OwnerValueForm, type OwnerValueSubmission } from '../landlord/OwnerValueForm'
import { ProvenanceBadge } from '../shared/ProvenanceBadge'
import { priceProvenance } from '../../lib/provenance'
import { ListingSourceLine } from '../shared/ListingSourceLine'

interface PropertyHeroProps {
  listing: ListingData
  score: DealScoreData
  /** Monthly cash flow — shown in the sticky score card */
  cashFlowMonthly: number
  /** Cap rate (decimal, e.g. 0.045) — shown in the sticky score card */
  capRate: number
  /** DSCR — shown in the sticky score card; null when there is no debt (D-108) */
  dscr: number | null
  /** Called when the user clicks "Analyze another listing" */
  onBack?: () => void
  /** Subject coordinates — renders the real Mapbox map when provided. */
  mapCenter?: { lat: number; lng: number } | null
  /** Breadcrumb view label, e.g. "Investor view" / "Landlord view". */
  viewLabel?: string
  /**
   * Landlord value input (D-107): when present, a price-less listing's card
   * asks what the property is worth, and a scored card lets them change it.
   */
  onSetValue?: (submission: OwnerValueSubmission) => void
  valueBusy?: boolean
  valueError?: string | null
  /** The version-3 shadow score (D-115) — shown on dev builds only, for calibration. */
  shadowScore?: ShadowScore | null
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
  onSetValue,
  valueBusy = false,
  valueError = null,
  shadowScore = null,
}: PropertyHeroProps): JSX.Element {
  const design = useAppDesign()
  // "Change" on a card scored on the landlord's own value re-opens the form.
  const [editingValue, setEditingValue] = useState(false)
  // A successful re-run arrives as a new ownerValue; the form has done its job.
  useEffect(() => setEditingValue(false), [listing.ownerValue])
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
    <section
      className={design === 'hybrid' ? 'container hy-property-hero' : 'container'}
      style={{ paddingTop: 56, paddingBottom: 48 }}
    >
      <HybridReportContents />
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
          {listing.price > 0 ? 'Live recalc · sliders below' : 'Rental listing · operating view'}
        </span>
      </div>

      {/* Two-column hero — collapses to one column via CSS (.report-hero), not
          a JS width check. See the rule in global.css for why. */}
      <div className={design === 'hybrid' ? 'report-hero hy-property-grid' : 'report-hero'}>
        {/* LEFT — photos + chips + address */}
        <div className={design === 'hybrid' ? 'col hy-property-facts' : 'col'} style={{ gap: 28 }}>
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
          <div
            className={design === 'hybrid' ? 'col hy-property-identity' : 'col'}
            style={{ gap: 18 }}
          >
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
            {/* Where the facts on this page came from, and when (D-111). */}
            <ListingSourceLine provenance={listing.provenance} />

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
                {/* ListingData carries 0 for an unknown size. A live
                    address-entered report printed "0 sqft" here (D-072). */}
                {listing.sqft > 0 ? `${listing.sqft.toLocaleString('en-CA')} sqft` : '— sqft'}
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

        {listing.price > 0 ? (
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
              {scoreBreakdownBars(score.breakdown, score.demandMeasured === true).map((bar) => (
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
                  {bar.note != null && <p className="scorecard-caption">{bar.note}</p>}
                </div>
              ))}
              {score.deductions > 0 && (
                <div className="scorecard-row">
                  <span>Risk deductions</span>
                  <span className="mono tabular scorecard-penalty">−{score.deductions}</span>
                </div>
              )}
              <p className="scorecard-caption">
                Components use a 95-point scale. The score above is shown out of 100; risk limits
                can lower the final verdict.
              </p>
              {/* Shadow model readout for calibration — dev builds only (D-115). */}
              {import.meta.env.DEV && shadowScore != null && (
                <p className="scorecard-caption mono" data-testid="shadow-score">
                  Shadow v{shadowScore.version} · property {shadowScore.propertyEconomics} ·
                  financing {shadowScore.financingResilience} · composite {shadowScore.composite} ·
                  risk {shadowScore.riskStatus}
                </p>
              )}
            </div>

            <dl className="scorecard-facts">
              <div className="scorecard-row">
                <dt>
                  {listing.ownerValue != null
                    ? 'Value · you entered'
                    : listing.price > 0
                      ? 'Asking'
                      : 'Asking rent'}
                </dt>
                <dd className="mono tabular">
                  {listing.price > 0
                    ? fmtMoney(listing.price)
                    : `${fmtMoney(listing.rentEstimate)}/mo`}
                  {listing.price > 0 && listing.provenance != null && (
                    <>
                      {' '}
                      <ProvenanceBadge provenance={priceProvenance(listing)} />
                    </>
                  )}
                  {listing.ownerValue != null && onSetValue != null && !editingValue && (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={() => setEditingValue(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          font: 'inherit',
                          fontSize: 12,
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Change
                      </button>
                    </>
                  )}
                </dd>
              </div>
              <div className="scorecard-row">
                <dt>Cap rate</dt>
                <dd className="mono tabular">{Number.isFinite(capRate) ? fmtPct(capRate) : '—'}</dd>
              </div>
              <div className="scorecard-row">
                <dt>DSCR</dt>
                <dd className="mono tabular">
                  {dscr == null ? 'no debt' : Number.isFinite(dscr) ? `${dscr.toFixed(2)}×` : '—'}
                </dd>
              </div>
            </dl>
            {editingValue && onSetValue != null && (
              <OwnerValueForm
                initialValue={listing.ownerValue ?? null}
                initialMortgageBalance={listing.ownerMortgageBalance ?? null}
                initialMortgageRate={listing.ownerMortgageRate ?? null}
                busy={valueBusy}
                error={valueError}
                onSubmit={onSetValue}
                onCancel={() => setEditingValue(false)}
              />
            )}
          </aside>
        ) : (
          /* A for-rent listing has no purchase, so the investment score does
             not apply until the landlord says what the property is worth
             (D-107, spec §9). The card shows the two rents that do exist and,
             on a live report, asks for the value — the old card printed
             "Hard pass · 14", "DSCR 0.00×" and the comps median under the
             label "Asking rent" (2026-09-14 review run, D-104). */
          <aside
            className="card report-hero-score scorecard"
            aria-label="Rental listing — no purchase score"
            style={{ '--score-tone': 'var(--caution)' } as React.CSSProperties}
          >
            <div className="scorecard-heading">
              <div className="scorecard-call">
                <span className="mono scorecard-eyebrow">Operating view</span>
                <h2 className="serif scorecard-verdict">No purchase score</h2>
                <p className="scorecard-tagline">
                  {onSetValue != null
                    ? 'The investment score rates a purchase, and a rental listing states no price. Tell us what the property is worth and every figure below is re-run on it.'
                    : 'The investment score rates a purchase; this is a rental listing, so nothing here is scored — the sections below show the rent, the comps and the running costs.'}
                </p>
              </div>
            </div>
            <dl className="scorecard-facts">
              <div className="scorecard-row">
                <dt>Asking rent</dt>
                <dd className="mono tabular">
                  {listing.askingRent != null && listing.askingRent > 0
                    ? `${fmtMoney(listing.askingRent)}/mo`
                    : 'not provided'}
                </dd>
              </div>
              <div className="scorecard-row">
                <dt>Market rent</dt>
                <dd className="mono tabular">
                  {listing.compCount > 0
                    ? `${fmtMoney(listing.rentEstimate)}/mo · ${listing.compCount} comps`
                    : 'no comps found'}
                </dd>
              </div>
            </dl>
            {onSetValue != null && (
              <OwnerValueForm busy={valueBusy} error={valueError} onSubmit={onSetValue} />
            )}
          </aside>
        )}
      </div>
    </section>
  )
}
