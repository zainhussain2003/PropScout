/**
 * ReportPage — /r/:token
 *
 * Fetches a saved analysis by share token and renders the appropriate report
 * based on analysis.mode. Investor and landlord modes render the full
 * investment report. Tenant and personal buyer modes render focused summaries.
 */

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAnalysisByToken } from '../lib/services/analysisService'
import { useFlagOverrides } from '../hooks/useFlagOverrides'
import { PersonalBuyerPage } from './PersonalBuyerPage'
import { TenantReport } from './TenantReport'
import {
  enrichMetrics,
  toDealScoreData,
  computeLTT,
  computeOSFI,
  fmtMoney,
} from '../lib/investorCalc'
import { DEFAULT_HOUSEHOLD_INCOME, INCOME_SLIDER } from '../constants/osfi'
import { usePaywall } from '../components/paywall/PaywallContext'
import { TruncatedVerdict } from '../components/paywall/TruncatedVerdict'
import { LockedButton } from '../components/paywall/LockedButton'
import { usePdfExport } from '../hooks/usePdfExport'
import { Nav } from '../components/shared/Nav'
import { Footer } from '../components/shared/Footer'
import { StickyActionBar } from '../components/shared/StickyActionBar'
import { Icon } from '../components/shared/Icon'
import { SectionHead } from '../components/shared/SectionHead'
import { PropertyHero } from '../components/analysis/PropertyHero'
import { AIVerdictBlock } from '../components/analysis/AIVerdictBlock'
import { DealScore as DealScoreWidget } from '../components/analysis/DealScore'
import { RentalCompsBar } from '../components/analysis/RentalCompsBar'
import { RiskRow } from '../components/analysis/RiskRow'
import { InvestmentMetricsSection } from '../components/investor/InvestmentMetricsSection'
import { STRPlaceholderSection } from '../components/investor/STRPlaceholderSection'
import { LTTTable } from '../components/investor/LTTTable'
import { OSFICard } from '../components/investor/OSFICard'
import { EquityChart } from '../components/investor/EquityChart'
import { SunScoutPanel } from '../components/sunscout/SunScoutPanel'
import { TenantSchoolsSection } from '../components/tenant/TenantSchoolsSection'
import { shimToTenantSchools } from '../lib/reportShims'
import { DEFAULT_FINANCING_INPUTS } from '../constants/demoData'
import type {
  Analysis,
  ListingData,
  InvestorRiskFlag,
  DealScoreData,
  ComputedInvestorMetrics,
  FinancingInputs,
  FlagOverrideControls,
} from '../types/analysis'
import type { Listing } from '../types/property'

// ── Data mappers ──────────────────────────────────────────────────────────────

function splitAddress(address: string, city: string, province: string): [string, string] {
  const parts = address.split(',').map((s) => s.trim())
  const line1 = parts[0] ?? address
  const cityPart = city.length > 0 ? city : (parts[1] ?? '')
  const line2 = cityPart.length > 0 ? `${cityPart}, ${province}` : province
  return [line1, line2]
}

function buildChips(listing: Listing): string[] {
  const chips: string[] = []
  chips.push(`${listing.beds} bed`)
  chips.push(`${listing.baths} bath`)
  if (listing.sqft) chips.push(`${listing.sqft.toLocaleString('en-CA')} sqft`)
  if (listing.yearBuilt) chips.push(`Built ${listing.yearBuilt}`)
  const pt = listing.propertyType
  if (pt) chips.push(pt.charAt(0).toUpperCase() + pt.slice(1))
  if (listing.parkingSpots > 0) chips.push(`${listing.parkingSpots} parking`)
  if (listing.condoFeeKnown && listing.condoFeeMonthly != null && listing.condoFeeMonthly > 0) {
    chips.push(`$${listing.condoFeeMonthly}/mo condo fee`)
  }
  return chips
}

function toListingData(listing: Listing, analysis: Analysis): ListingData {
  const [addressLine1, addressLine2] = splitAddress(listing.address, listing.city, listing.province)
  const price = listing.price ?? 0
  const annualTaxes = listing.annualTaxes ?? 0
  const condoFeeMonthly = listing.condoFeeMonthly ?? 0
  // Internal fallback only (maintenance-rate display buckets); the hero hides
  // the "Built" fact when the listing didn't carry a year (a fabricated
  // "Built 2016" rendered live 2026-07-02).
  const yearBuilt = listing.yearBuilt ?? new Date().getFullYear() - 10
  const isToronto =
    listing.city.toLowerCase().includes('toronto') ||
    listing.postalCode.toUpperCase().startsWith('M')

  const riskFlags: InvestorRiskFlag[] = (analysis.riskFlags ?? []).map((f) => ({
    id: f.id,
    tone: f.severity,
    label: f.label,
    detail: f.evidence ?? '',
    deduct: f.severity === 'red' ? 5 : 0,
  }))

  return {
    id: listing.id,
    addressLine1,
    addressLine2,
    postal: listing.postalCode,
    province: listing.province,
    isToronto,
    propertyType: listing.propertyType.charAt(0).toUpperCase() + listing.propertyType.slice(1),
    // PropertyHero renders "{beds} bed · {baths} bath" / "{parking} parking" —
    // these carry the bare numbers (was "2 bed bed · 2 bath bath", live 2026-07-02)
    beds: String(listing.beds),
    baths: String(listing.baths),
    sqft: listing.sqft ?? 0,
    parking: String(listing.parkingSpots),
    yearBuilt,
    rentControl: yearBuilt <= 2018,
    price,
    annualTaxes,
    condoFeeMonthly,
    // Comps mid when available; otherwise the listing's own asking rent —
    // the hero once rendered "Asking rent $0/mo" on a $2,650 rental because
    // comps were null (live 2026-07-02).
    rentEstimate: analysis.rentalComps?.mid ?? listing.rentMonthly ?? 0,
    rentLow: analysis.rentalComps?.low ?? 0,
    rentHigh: analysis.rentalComps?.high ?? 0,
    compCount: analysis.rentalComps?.compCount ?? 0,
    compConfidence: analysis.rentalComps?.confidence ?? 'low',
    market: { cmhcVacancy: 0.035, rentalDOM: 18, rentTrend: 'flat' as const },
    riskFlags,
    chips: buildChips(listing),
    photoUrls: listing.photos.length > 0 ? listing.photos : undefined,
    yearBuiltKnown: listing.yearBuilt != null,
  }
}

function toFinancingInputs(metrics: Analysis['metrics'], listing: ListingData): FinancingInputs {
  const price = listing.price
  const downPayment = metrics?.downPayment ?? price * DEFAULT_FINANCING_INPUTS.downPaymentPct
  const downPaymentPct = price > 0 ? downPayment / price : DEFAULT_FINANCING_INPUTS.downPaymentPct
  return {
    ...DEFAULT_FINANCING_INPUTS,
    downPaymentPct,
    mortgageRate: metrics?.mortgageRate ?? DEFAULT_FINANCING_INPUTS.mortgageRate,
    amortizationYears: metrics?.amortizationYears ?? DEFAULT_FINANCING_INPUTS.amortizationYears,
    isToronto: listing.isToronto,
  }
}

// ── Loading state ─────────────────────────────────────────────────────────────

function LoadingState(): JSX.Element {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid var(--line)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading report…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Not found state ───────────────────────────────────────────────────────────

function NotFoundState(): JSX.Element {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        textAlign: 'center',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          background: 'color-mix(in oklab, var(--caution) 12%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="flag" size={24} />
      </div>
      <div className="col" style={{ gap: 8, maxWidth: 420 }}>
        <h3 className="serif" style={{ fontSize: 24 }}>
          Report not found
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          This report has expired or does not exist. Shared reports are available for 30 days.
        </p>
      </div>
      <a href="/" className="btn btn-primary">
        Analyse another property <Icon name="arrow" size={13} />
      </a>
    </div>
  )
}

// ── Rental comps section ──────────────────────────────────────────────────────

interface RentalCompsSectionProps {
  analysis: Analysis
  listing: ListingData
}

function RentalCompsSection({ analysis, listing }: RentalCompsSectionProps): JSX.Element | null {
  const comps = analysis.rentalComps
  if (!comps || comps.compCount === 0) return null

  const { low, mid, high, compCount, confidence } = comps

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
        <RentalCompsBar low={low} mid={mid} high={high} ask={listing.rentEstimate} />
      </div>
    </section>
  )
}

// ── Risk flags section ────────────────────────────────────────────────────────

function RiskFlagsSection({
  listing,
  flagOverrides,
}: {
  listing: ListingData
  flagOverrides: FlagOverrideControls
}): JSX.Element {
  const redFlags = listing.riskFlags.filter((f) => f.tone === 'red')
  const amberFlags = listing.riskFlags.filter((f) => f.tone === 'amber')
  // No "−X pts" line here: with the severe gate, score impact is gate + standard
  // tier, not a single deduction — and re-deriving it on the frontend is exactly
  // the second computation that drifts from the calc engine. The score itself is
  // shown (from the backend) in the hero gauge.

  // Ambers are soft warnings — the chip must read caution, not pass-green
  const verdictTone =
    redFlags.length > 1
      ? 'fail'
      : redFlags.length === 1 || amberFlags.length > 0
        ? 'caution'
        : 'pass'
  const verdictLabel =
    redFlags.length > 0
      ? `${redFlags.length} red · ${amberFlags.length} amber`
      : amberFlags.length > 0
        ? `${amberFlags.length} amber flag${amberFlags.length > 1 ? 's' : ''}`
        : 'No red flags'

  return (
    <section className="container tr-section" data-section="06">
      <SectionHead
        n="06"
        topic="Risk flags"
        question={
          <>
            What could <em>break</em> this thesis?
          </>
        }
        verdict={verdictLabel}
        tone={verdictTone}
      />

      <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
        {listing.riskFlags.length === 0 ? (
          <div
            style={{
              padding: 28,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              color: 'var(--pass)',
            }}
          >
            <Icon name="check" size={16} />
            <span style={{ fontSize: 14 }}>No risk flags detected in this listing.</span>
          </div>
        ) : (
          listing.riskFlags.map((f) => (
            <RiskRow
              key={f.id}
              tone={f.tone}
              label={f.label}
              detail={f.detail}
              dismissable={flagOverrides.canOverride}
              dismissed={flagOverrides.overrides.has(f.id)}
              onToggleDismiss={() => flagOverrides.onToggle(f.id)}
            />
          ))
        )}
      </div>
    </section>
  )
}

// ── Cash to close section ─────────────────────────────────────────────────────

function CashToCloseSection({
  metrics,
  listing,
  financing,
}: {
  metrics: ComputedInvestorMetrics
  listing: ListingData
  financing: FinancingInputs
}): JSX.Element {
  const lttResult = computeLTT(listing.price, financing.isToronto)
  const total =
    metrics.downPayment + metrics.lttProvincial + metrics.lttMunicipal + metrics.closingCostsTotal

  return (
    <section className="container tr-section" data-section="04">
      <SectionHead
        n="04"
        topic="Cash to close"
        question={
          <>
            What you need in the <em>bank</em> on closing day.
          </>
        }
        verdict={fmtMoney(total)}
        tone="caution"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        <LTTTable ltt={lttResult} price={listing.price} toronto={listing.isToronto} />

        <div className="card col" style={{ padding: 24, gap: 16 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Total cash required
          </div>
          {(
            [
              { label: 'Down payment', value: metrics.downPayment },
              { label: 'Provincial LTT', value: metrics.lttProvincial },
              ...(metrics.lttMunicipal > 0
                ? [{ label: 'Toronto municipal LTT', value: metrics.lttMunicipal }]
                : []),
              { label: 'Closing costs (est.)', value: metrics.closingCostsTotal },
            ] as Array<{ label: string; value: number }>
          ).map((row) => (
            <div
              key={row.label}
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}
            >
              <span style={{ color: 'var(--ink-2)' }}>{row.label}</span>
              <span className="mono tabular" style={{ fontWeight: 500 }}>
                {fmtMoney(row.value)}
              </span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span className="mono tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>
              {fmtMoney(total)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── OSFI section ──────────────────────────────────────────────────────────────

function OSFISection({
  financing,
  listing,
}: {
  financing: FinancingInputs
  listing: ListingData
}): JSX.Element {
  // Income is a live input — the OSFI GDS / qualifying figures recompute on every
  // change, so a buyer can see whether the property pencils at their real income
  // instead of the placeholder default.
  const [income, setIncome] = useState<number>(financing.assumedIncome || DEFAULT_HOUSEHOLD_INCOME)

  const osfi = useMemo(
    () =>
      computeOSFI(
        listing.price,
        financing.downPaymentPct,
        financing.mortgageRate,
        financing.amortizationYears,
        listing.annualTaxes,
        listing.condoFeeMonthly,
        income
      ),
    [
      listing.price,
      listing.annualTaxes,
      listing.condoFeeMonthly,
      financing.downPaymentPct,
      financing.mortgageRate,
      financing.amortizationYears,
      income,
    ]
  )

  return (
    <section className="container tr-section" data-section="05">
      <SectionHead
        n="05"
        topic="OSFI stress test"
        question={
          <>
            Will the bank actually <em>fund</em> this?
          </>
        }
        verdict={
          osfi.pass ? `Passes at ${fmtMoney(income)} income` : `Fails at ${fmtMoney(income)} income`
        }
        tone={osfi.pass ? 'pass' : 'fail'}
      />

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <label
          htmlFor="osfi-income"
          className="mono"
          style={{
            display: 'block',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-2)',
            marginBottom: 12,
          }}
        >
          Your gross household income
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input
            id="osfi-income"
            type="range"
            min={INCOME_SLIDER.min}
            max={INCOME_SLIDER.max}
            step={INCOME_SLIDER.step}
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            aria-label="Gross household income"
            style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span
            className="mono tabular"
            style={{ fontSize: 18, fontWeight: 600, minWidth: 110, textAlign: 'right' }}
          >
            {fmtMoney(income)}
          </span>
        </div>
      </div>

      <OSFICard osfi={osfi} financing={financing} income={income} />
    </section>
  )
}

// ── Equity section ────────────────────────────────────────────────────────────

function EquitySection({ metrics }: { metrics: ComputedInvestorMetrics }): JSX.Element {
  const finalPoint = metrics.equityCurve[metrics.equityCurve.length - 1]
  const year20Equity = finalPoint?.equity ?? 0

  return (
    <section className="container tr-section" data-section="07">
      <SectionHead
        n="07"
        topic="Equity build"
        question={
          <>
            What <em>builds</em> over time?
          </>
        }
        verdict={`${fmtMoney(year20Equity)} at year 20`}
        tone="pass"
      />
      <div className="card" style={{ padding: 28 }}>
        <EquityChart
          equityCurve={metrics.equityCurve}
          totalCashInvested={metrics.totalCashInvested}
        />
      </div>
    </section>
  )
}

// ── Narrative helpers ─────────────────────────────────────────────────────────

function buildHeadline(narrative: string | null, dealLabel: string, price: number): ReactNode {
  if (narrative) {
    const firstSentence = narrative.split('.')[0]?.trim()
    if (firstSentence && firstSentence.length > 10) return <>{firstSentence}.</>
  }
  const v = dealLabel.toLowerCase()
  if (v.includes('hard') || v.includes('do not')) {
    return (
      <>
        At {fmtMoney(price)}, this property <em>fails on the fundamentals</em> — deeply negative
        cash flow and a DSCR far below investment grade.
      </>
    )
  }
  if (v.includes('strong') || v.includes('good')) {
    return (
      <>
        A genuinely cash-flow positive rental at {fmtMoney(price)} — the numbers{' '}
        <em>work without heroic</em> rent assumptions.
      </>
    )
  }
  return (
    <>
      This property shows <em>mixed signals</em> — the deal carries real risk at current market
      rents.
    </>
  )
}

function buildSub(narrative: string | null, capRate: number, cashFlowMonthly: number): ReactNode {
  if (narrative) {
    const sentences = narrative.split('. ').filter((s) => s.trim().length > 0)
    if (sentences.length > 1) {
      return (
        <>
          {sentences.slice(1).join('. ')}
          {narrative.endsWith('.') ? '' : '.'}
        </>
      )
    }
  }
  return (
    <>
      Cap rate {(capRate * 100).toFixed(2)}% · Monthly cash flow {cashFlowMonthly >= 0 ? '+' : ''}
      {fmtMoney(cashFlowMonthly)}/mo
    </>
  )
}

// ── Tenant summary report ─────────────────────────────────────────────────────

function TenantReportContent({
  listing,
  analysis,
  flagOverrides,
}: {
  listing: Listing
  analysis: Analysis
  flagOverrides: FlagOverrideControls
}): JSX.Element {
  const [addressLine1, addressLine2] = splitAddress(listing.address, listing.city, listing.province)
  const asking = listing.rentMonthly ?? 0
  const comps = analysis.rentalComps
  const redFlags = analysis.riskFlags.filter((f) => f.severity === 'red')
  const amberFlags = analysis.riskFlags.filter((f) => f.severity === 'amber')

  return (
    <main>
      <div style={{ background: 'var(--ink)', padding: '40px 0 32px', marginBottom: 24 }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 8, flex: 1, minWidth: 200 }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: 'color-mix(in oklab, var(--bg) 50%, transparent)',
                  textTransform: 'uppercase',
                }}
              >
                Tenant report
              </div>
              <h1 className="serif" style={{ fontSize: 28, color: 'var(--bg)', lineHeight: 1.2 }}>
                {addressLine1}
              </h1>
              <p style={{ fontSize: 14, color: 'color-mix(in oklab, var(--bg) 60%, transparent)' }}>
                {addressLine2}
              </p>
            </div>
            {asking > 0 && (
              <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--bg)' }}>
                  {fmtMoney(asking)}/mo
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'color-mix(in oklab, var(--bg) 50%, transparent)',
                  }}
                >
                  Asking rent
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
            {buildChips(listing).map((c) => (
              <span
                key={c}
                className="mono"
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'color-mix(in oklab, var(--bg) 10%, transparent)',
                  color: 'color-mix(in oklab, var(--bg) 70%, transparent)',
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {analysis.narrative && (
        <div className="container" style={{ marginBottom: 32 }}>
          <AIVerdictBlock
            eyebrow="Scout AI · tenant verdict"
            headline={<>{analysis.narrative.split('.')[0]}.</>}
            sub={<>{analysis.narrative.split('. ').slice(1).join('. ')}</>}
          />
        </div>
      )}

      {comps && comps.compCount > 0 && (
        <section className="container tr-section" data-section="01">
          <SectionHead
            n="01"
            topic="Rent positioning"
            question={
              <>
                Is the rent <em>fair</em>?
              </>
            }
            verdict={
              asking > 0 && comps.mid > 0
                ? asking <= comps.mid
                  ? 'At or below market'
                  : 'Above market'
                : `${comps.compCount} comps`
            }
            tone={
              asking > 0 && comps.mid > 0 ? (asking <= comps.mid ? 'pass' : 'caution') : 'caution'
            }
          />
          <div className="card" style={{ padding: 28 }}>
            <RentalCompsBar
              low={comps.low}
              mid={comps.mid}
              high={comps.high}
              ask={asking || comps.mid}
            />
          </div>
        </section>
      )}

      {analysis.riskFlags.length > 0 && (
        <section className="container tr-section" data-section="02">
          <SectionHead
            n="02"
            topic="Listing flags"
            question={
              <>
                Is the listing <em>honest</em>?
              </>
            }
            verdict={
              redFlags.length > 0
                ? `${redFlags.length} red · ${amberFlags.length} amber`
                : `${amberFlags.length} amber`
            }
            tone={redFlags.length > 0 ? 'fail' : 'caution'}
          />
          <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
            {analysis.riskFlags.map((f) => (
              <RiskRow
                key={f.id}
                tone={f.severity}
                label={f.label}
                detail={f.evidence ?? ''}
                dismissable={flagOverrides.canOverride}
                dismissed={flagOverrides.overrides.has(f.id)}
                onToggleDismiss={() => flagOverrides.onToggle(f.id)}
              />
            ))}
          </div>
        </section>
      )}

      {analysis.schools && (
        <TenantSchoolsSection schools={shimToTenantSchools(analysis.schools)} sectionNumber="03" />
      )}

      <SunScoutPanel
        sunScout={analysis.sunScout}
        sectionNumber={analysis.schools ? '04' : '03'}
        token={analysis.token}
      />
    </main>
  )
}

// ── Investor / landlord report content ────────────────────────────────────────

function InvestorReportContent({
  listing,
  analysis,
  tier,
  flagOverrides,
  mode = 'investor',
}: {
  listing: Listing
  analysis: Analysis
  tier: string
  flagOverrides: FlagOverrideControls
  mode?: 'investor' | 'landlord'
}): JSX.Element {
  const { openUpgradeModal } = usePaywall()
  const verdictEyebrow = `Scout AI · ${mode} verdict`
  const listingData = toListingData(listing, analysis)
  const financing = toFinancingInputs(analysis.metrics, listingData)

  const metrics: ComputedInvestorMetrics | null =
    analysis.metrics != null ? enrichMetrics(analysis.metrics, listingData, financing) : null

  // ONE SOURCE OF TRUTH: the deal score comes straight from the calc engine
  // (gated, floored, the lot). The frontend does NOT re-derive it — a second
  // computation would drift from the gate (a dismissed flag once inflated a
  // grow-op property from its gated 40 up to ~90 by ignoring the ceiling).
  // Dismissing a flag persists the override; the gated score updates on re-run.
  const dealScore: DealScoreData | null =
    analysis.dealScore != null ? toDealScoreData(analysis.dealScore) : null

  const handleBack = useCallback(() => window.history.back(), [])

  if (!metrics || !dealScore) {
    return (
      <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div className="col" style={{ gap: 24, maxWidth: 480 }}>
          <h2 className="serif" style={{ fontSize: 28 }}>
            {listingData.addressLine1}
          </h2>
          <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>{listingData.addressLine2}</p>
          {dealScore && (
            <DealScoreWidget
              score={dealScore.total}
              label="Deal score"
              showVerdict
              verdictLabel={dealScore.label}
              tone={dealScore.tone}
            />
          )}
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Detailed metrics are not available for this report.
          </p>
        </div>
      </div>
    )
  }

  return (
    <main>
      <PropertyHero
        listing={listingData}
        score={dealScore}
        cashFlowMonthly={metrics.cashFlowMonthly}
        capRate={metrics.capRate}
        dscr={metrics.dscr}
        onBack={handleBack}
        mapCenter={analysis.coordinates ?? null}
      />

      <div className="container" style={{ marginBottom: 32 }}>
        {tier === 'free' ? (
          <TruncatedVerdict
            firstParagraph={
              analysis.narrative
                ? (analysis.narrative.split('.')[0] ?? '') + '.'
                : `At ${fmtMoney(listingData.price)}, this property shows ${dealScore.label.toLowerCase()} fundamentals.`
            }
            eyebrow={verdictEyebrow}
            onUnlock={() => openUpgradeModal('verdict')}
          />
        ) : (
          <AIVerdictBlock
            eyebrow={verdictEyebrow}
            headline={buildHeadline(analysis.narrative, dealScore.label, listingData.price)}
            sub={buildSub(analysis.narrative, metrics.capRate, metrics.cashFlowMonthly)}
          />
        )}
      </div>

      <InvestmentMetricsSection metrics={metrics} listing={listingData} />
      <RentalCompsSection analysis={analysis} listing={listingData} />
      {/* Purchase-transaction section — meaningless for a for-rent listing
          (no sale price: the LTT table computed $0 while the totals card used
          the estimated value, live 2026-07-02). */}
      {listingData.price > 0 && (
        <CashToCloseSection metrics={metrics} listing={listingData} financing={financing} />
      )}
      <OSFISection financing={financing} listing={listingData} />
      <RiskFlagsSection listing={listingData} flagOverrides={flagOverrides} />
      <EquitySection metrics={metrics} />
      <SunScoutPanel sunScout={analysis.sunScout} sectionNumber="08" token={analysis.token} />
      {/* STR analysis — a Phase-2 informational placeholder (municipal STR-rule
          guidance by postal code), not fabricated property data. Present in the
          demo investor/landlord reports; now mounted live too. */}
      <STRPlaceholderSection listing={listingData} />
    </main>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ReportPage({ tier = 'free' }: { tier?: string }): JSX.Element {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    if (!token) {
      setNotFound(true)
      setLoading(false)
      return
    }
    void getAnalysisByToken(token).then((result) => {
      if (result == null) {
        setNotFound(true)
      } else {
        setAnalysis(result.analysis)
        setListing(result.listing)
      }
      setLoading(false)
    })
  }, [token])

  const { overrides, dismiss, undismiss } = useFlagOverrides(token ?? null)
  const onToggleFlag = useCallback(
    (flagId: string) => {
      if (overrides.has(flagId)) void undismiss(flagId)
      else void dismiss(flagId)
    },
    [overrides, dismiss, undismiss]
  )
  const flagOverrides: FlagOverrideControls = {
    overrides,
    canOverride: token != null,
    onToggle: onToggleFlag,
  }

  const handleToggleDark = useCallback(() => {
    setDark((d) => {
      const next = !d
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  // Pro-gated PDF export (spec §14) — shared by the share bar + mobile action bar
  const pdf = usePdfExport(token)

  const mode = analysis?.mode ?? 'investor'
  const reportLabel =
    mode === 'investor'
      ? 'Investor report'
      : mode === 'tenant'
        ? 'Tenant report'
        : mode === 'personal'
          ? 'Personal buyer report'
          : 'Landlord report'

  const addressSlug = listing
    ? (listing.address
        .toLowerCase()
        .split(',')[0]
        ?.replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ?? 'property')
    : 'property'

  // Personal buyers get the HomeScore report (not the investment score). It's a
  // self-contained page with its own Nav/Footer, and it suppresses the numeric
  // gauge while showing the cost/location/risk readouts the investment report
  // would never give an owner-occupier (cap-rate/DSCR are the wrong question).
  if (!loading && !notFound && analysis && listing && mode === 'personal') {
    return <PersonalBuyerPage analysis={analysis} listing={listing} />
  }

  // Tenant gets the full 12-section report (Listed-vs-Reality, Negotiation,
  // Monthly cost, What's-included, Location & commute, Comps map, Unit details,
  // Before-you-sign) — the same self-contained page the demo renders, wired to
  // real data with honest empty states where a live source doesn't exist yet.
  // (Previously the live tenant path showed only 4 of 12 sections.)
  if (!loading && !notFound && analysis && listing && mode === 'tenant') {
    return (
      <TenantReport
        tier={tier}
        analysis={analysis}
        listing={listing}
        flagOverrides={flagOverrides}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav
        variant="report"
        dark={dark}
        onToggleDark={handleToggleDark}
        onSignIn={() => undefined}
        reportLabel={reportLabel}
        addressSlug={addressSlug}
      />

      {loading && <LoadingState />}

      {!loading && notFound && (
        <div className="container" style={{ paddingTop: 64, paddingBottom: 64 }}>
          <NotFoundState />
        </div>
      )}

      {!loading && !notFound && analysis && listing && (
        <>
          {(mode === 'investor' || mode === 'landlord') && (
            <InvestorReportContent
              listing={listing}
              analysis={analysis}
              tier={tier}
              flagOverrides={flagOverrides}
              mode={mode}
            />
          )}

          {mode === 'tenant' && (
            <TenantReportContent
              listing={listing}
              analysis={analysis}
              flagOverrides={flagOverrides}
            />
          )}

          <div className="container" style={{ paddingTop: 32, paddingBottom: 16 }}>
            <div
              className="card row"
              style={{
                padding: '16px 20px',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Share this report · expires in 30 days
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 13 }}
                  onClick={() => void navigator.clipboard.writeText(window.location.href)}
                >
                  <Icon name="share" size={14} /> Copy link
                </button>
                {pdf.isLocked ? (
                  <LockedButton label="Download PDF" icon="doc" onClick={pdf.exportPdf} />
                ) : (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 13, opacity: pdf.exporting ? 0.6 : 1 }}
                    disabled={pdf.exporting}
                    onClick={pdf.exportPdf}
                  >
                    <Icon name="doc" size={14} />{' '}
                    {pdf.exporting ? 'Preparing PDF…' : 'Download PDF'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="container" style={{ paddingBottom: 48 }}>
            <div
              className="card col"
              style={{ padding: 32, alignItems: 'center', textAlign: 'center', gap: 16 }}
            >
              <h3 className="serif" style={{ fontSize: 22 }}>
                Analyse another property
              </h3>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 360 }}>
                Paste any Realtor.ca listing URL to get a full investment analysis in seconds.
              </p>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Go to home <Icon name="arrow" size={13} />
              </button>
            </div>
          </div>
        </>
      )}

      <StickyActionBar
        onShare={() => void navigator.clipboard.writeText(window.location.href)}
        onPDF={pdf.exportPdf}
      />
      <Footer />
    </div>
  )
}
