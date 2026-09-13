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
import { useAuth } from '../hooks/useAuth'
import { PersonalBuyerPage } from './PersonalBuyerPage'
import { TenantReport } from './TenantReport'
import {
  enrichMetrics,
  computeDemoMetrics,
  noiForManagementState,
  toDealScoreData,
  fmtMoney,
} from '../lib/investorCalc'
import { usePaywall } from '../components/paywall/PaywallContext'
import { TruncatedVerdict } from '../components/paywall/TruncatedVerdict'
import { LockedButton } from '../components/paywall/LockedButton'
import { usePdfExport } from '../hooks/usePdfExport'
import { Nav } from '../components/shared/Nav'
import { Footer } from '../components/shared/Footer'
import { StickyActionBar } from '../components/shared/StickyActionBar'
import { SignInModal } from '../components/shared/SignInModal'
import { ReportSectionRail } from '../components/shared/ReportSectionRail'
import { Icon } from '../components/shared/Icon'
import { SectionHead } from '../components/shared/SectionHead'
import { PropertyHero } from '../components/analysis/PropertyHero'
import { AIVerdictBlock } from '../components/analysis/AIVerdictBlock'
import { RentalCompsBar } from '../components/analysis/RentalCompsBar'
import { RiskRow } from '../components/analysis/RiskRow'
import { DealScore as DealScoreWidget } from '../components/analysis/DealScore'
import { InvestmentMetricsSection } from '../components/investor/InvestmentMetricsSection'
import { FinancingSection } from '../components/investor/FinancingSection'
import { NeighbourhoodSection } from '../components/investor/NeighbourhoodSection'
import { STRPlaceholderSection } from '../components/investor/STRPlaceholderSection'
import { DueDiligenceSection } from '../components/investor/DueDiligenceSection'
import { RentalCompsSection } from '../components/investor/RentalCompsSection'
import { RiskFlagsSection } from '../components/investor/RiskFlagsSection'
import { CashToCloseSection } from '../components/investor/CashToCloseSection'
import { OSFISection } from '../components/investor/OSFISection'
import { EquitySection } from '../components/investor/EquitySection'
import { SunScoutPanel } from '../components/sunscout/SunScoutPanel'
import { TenantSchoolsSection } from '../components/tenant/TenantSchoolsSection'
import { shimToTenantSchools, shimToNeighbourhood } from '../lib/reportShims'
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
import { bareCount, knownCount } from '../lib/listingFacts'
import { useTheme } from '../hooks/useTheme'

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
  chips.push(`${bareCount(listing.beds)} bed`)
  chips.push(`${bareCount(listing.baths)} bath`)
  if (listing.sqft) chips.push(`${listing.sqft.toLocaleString('en-CA')} sqft`)
  if (listing.yearBuilt) chips.push(`Built ${listing.yearBuilt}`)
  const pt = listing.propertyType
  if (pt) chips.push(pt.charAt(0).toUpperCase() + pt.slice(1))
  if (knownCount(listing.parkingSpots) != null) chips.push(`${listing.parkingSpots} parking`)
  if (listing.condoFeeKnown && listing.condoFeeMonthly != null && listing.condoFeeMonthly > 0) {
    chips.push(`$${listing.condoFeeMonthly}/mo condo fee`)
  }
  return chips
}

function toListingData(listing: Listing, analysis: Analysis): ListingData {
  const [addressLine1, addressLine2] = splitAddress(listing.address, listing.city, listing.province)
  const price = listing.price ?? 0
  const listedAnnualTaxes =
    listing.annualTaxes != null && listing.annualTaxes > 0 ? listing.annualTaxes : null
  const annualTaxes = listedAnnualTaxes ?? analysis.metrics?.annualTaxesUsed ?? 0
  const condoFeeMonthly = listing.condoFeeMonthly ?? 0
  // Zero is the display model's unknown-year sentinel, not an estimated age.
  const yearBuilt = listing.yearBuilt ?? 0
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
    beds: bareCount(listing.beds),
    baths: bareCount(listing.baths),
    sqft: listing.sqft ?? 0,
    parking: bareCount(listing.parkingSpots),
    yearBuilt,
    rentControl: yearBuilt <= 2018,
    price,
    annualTaxes,
    annualTaxesKnown: listedAnnualTaxes != null,
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

function LoadFailedState(): JSX.Element {
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
      <div className="col" style={{ gap: 8, maxWidth: 420 }}>
        <h3 className="serif" style={{ fontSize: 24 }}>
          Report temporarily unavailable
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          The report service could not be reached. Your report may still exist — try again in a
          moment.
        </p>
      </div>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>
        Try again
      </button>
    </div>
  )
}

// ── Narrative helpers ─────────────────────────────────────────────────────────

/**
 * Everything after the first sentence — the real remainder of this property's
 * verdict, used as the blurred paywall teaser.
 *
 * Returns undefined when the narrative is a single sentence, so TruncatedVerdict
 * falls back to neutral skeleton bars rather than showing invented prose.
 */
export function restAfterFirstSentence(narrative: string): string | undefined {
  const parts = narrative.split(/(?<=[.!?])\s+/).slice(1)
  const rest = parts.join(' ').trim()
  return rest.length > 0 ? rest : undefined
}

/** First sentence of a narrative, split on real sentence boundaries (punctuation
 *  + whitespace) so decimals like "$1.9M" aren't cut mid-number. No trailing dot. */
export function firstSentence(narrative: string): string {
  const s = narrative.split(/(?<=[.!?])\s+/)[0]?.trim() ?? narrative.trim()
  return s.replace(/[.!?]+$/, '')
}

function buildHeadline(narrative: string | null, dealLabel: string, price: number): ReactNode {
  if (narrative) {
    const first = firstSentence(narrative)
    if (first && first.length > 10) return <>{first}.</>
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
            eyebrow="PropScout · tenant verdict"
            headline={<>{firstSentence(analysis.narrative)}.</>}
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
  const verdictEyebrow = `PropScout · ${mode} verdict`
  const listingData = toListingData(listing, analysis)

  // Financing is LIVE: the sliders drive every financing-dependent metric on the
  // page — mortgage payment, cash flow, DSCR, cash-on-cash, break-even rent,
  // cash-to-close, OSFI, equity and break-even appreciation.
  //
  // This previously called enrichMetrics alone, which spreads the API's metrics
  // through untouched, so cash flow and DSCR stayed at the submitted financing
  // while cash-to-close and the equity curve moved. The page then showed a
  // 50%-down cash-to-close beside a 20%-down cash flow. computeDemoMetrics
  // recomputes the financing-dependent fields from NOI-stable API values, which
  // is what useInvestorReport already does for its own live path.
  //
  // NOI, cap rate and GRM are NOT financing-dependent (they divide by price, not
  // by the loan), so they stay as the engine calculated them. The deal SCORE is
  // not recomputed either — it stays the backend value (one source of truth);
  // sliders explore the numbers, they don't re-grade the deal.
  // What the engine actually ran with. The sliders start here, and the
  // presets and "vs Base" are expressed against it — not against the demo's
  // 4.79%, which a live report at the Bank of Canada rate never used.
  const baseFinancing = useMemo(
    () => toFinancingInputs(analysis.metrics, listingData),
    [analysis.metrics, listingData]
  )
  const [financing, setFinancing] = useState<FinancingInputs>(baseFinancing)

  const metrics: ComputedInvestorMetrics | null = useMemo(() => {
    if (analysis.metrics == null) return null
    // The management fee is an operating expense inside NOI, not a display
    // line, so the toggle has to move NOI — and with it cap rate, cash flow,
    // DSCR, cash-on-cash and break-even rent. Without this the expense table
    // showed a management row that none of those numbers reflected, and the
    // rows could not be summed to the NOI beside them (audit R-01).
    const grossRentAnnual = listingData.rentEstimate * 12
    const noi = noiForManagementState(
      analysis.metrics.noi,
      grossRentAnnual,
      analysis.metrics.managementFeeIncluded === true,
      financing.includeManagementFee
    )
    const stable = {
      noi,
      // Cap rate is NOI / price, so it follows NOI rather than being fixed.
      capRate: listingData.price > 0 ? noi / listingData.price : analysis.metrics.capRate,
      grm: analysis.metrics.grm,
      // The local calculator takes non-tax closing costs and adds the current
      // LTT itself, so strip the engine's LTT to avoid counting it twice (D-039
      // is the same double-count on the cash-to-close card).
      closingCostsTotal:
        analysis.metrics.closingCostsTotal -
        analysis.metrics.lttProvincial -
        analysis.metrics.lttMunicipal,
    }
    const recomputed = computeDemoMetrics(stable, listingData, financing)
    return enrichMetrics(recomputed, listingData, financing)
  }, [analysis.metrics, listingData, financing])

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
        viewLabel={mode === 'landlord' ? 'Landlord view' : 'Investor view'}
      />

      <div className="container" style={{ marginBottom: 32 }}>
        {tier === 'free' ? (
          <TruncatedVerdict
            firstParagraph={
              analysis.narrative
                ? firstSentence(analysis.narrative) + '.'
                : `At ${fmtMoney(listingData.price)}, this property shows ${dealScore.label.toLowerCase()} fundamentals.`
            }
            blurredParagraph={
              analysis.narrative ? restAfterFirstSentence(analysis.narrative) : undefined
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
      {/* Financing / cash-to-close / OSFI / equity are PURCHASE economics that
          need a sale price. A for-rent listing (landlord mode) has none, so those
          sections would render $0 / NaN — gate them all on a real price. The
          rental economics above (cap rate, cash flow, comps) still show. */}
      {listingData.price > 0 && (
        <>
          {/* §02 Financing — live sliders; every metric recomputes on drag. */}
          <FinancingSection
            price={listingData.price}
            financing={financing}
            onFinancingChange={setFinancing}
            base={baseFinancing}
          />
        </>
      )}
      <RentalCompsSection comps={analysis.rentalComps} askingRent={listingData.rentEstimate} />
      {listingData.price > 0 && (
        <CashToCloseSection metrics={metrics} listing={listingData} financing={financing} />
      )}
      {listingData.price > 0 && <OSFISection financing={financing} listing={listingData} />}
      <RiskFlagsSection listing={listingData} flagOverrides={flagOverrides} />
      {listingData.price > 0 && <EquitySection metrics={metrics} />}
      {/* §08 Neighbourhood — stat tiles + comps + appreciation. Every field is
          data-honest: unknown stats render "—" and empty comps show the "no
          comparable-sales source yet" state (shimToNeighbourhood returns zeros
          when the API has no neighbourhood data, never fabricated figures). */}
      <NeighbourhoodSection
        listing={listingData}
        neighbourhood={shimToNeighbourhood(analysis)}
        compsAreSample={analysis.comparableSalesAreSample ?? false}
      />
      <SunScoutPanel sunScout={analysis.sunScout} sectionNumber="09" token={analysis.token} />
      {/* §10 STR analysis — a Phase-2 informational placeholder (municipal STR-rule
          guidance by postal code), not fabricated property data. Present in the
          demo investor/landlord reports; now mounted live too. */}
      <STRPlaceholderSection listing={listingData} />
      {/* §11 Due diligence — generic, property-agnostic buyer checklist. */}
      <DueDiligenceSection />
    </main>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ReportPage({ tier = 'free' }: { tier?: string }): JSX.Element {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const { dark, toggle: handleToggleDark } = useTheme()
  const [showSignIn, setShowSignIn] = useState(false)
  // Server-decided: false until the API says this viewer owns the analysis.
  const [canOverride, setCanOverride] = useState(false)
  const { session } = useAuth()

  useEffect(() => {
    if (!token) {
      setNotFound(true)
      setLoading(false)
      return
    }
    void getAnalysisByToken(token, session?.access_token ?? null)
      .then((result) => {
        if (result == null) {
          setNotFound(true)
        } else {
          setAnalysis(result.analysis)
          setListing(result.listing)
          setCanOverride(result.canOverride === true)
        }
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false))
  }, [token, session])

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
    // The API decides this from the caller's session. Holding the share token
    // is NOT ownership — it is the capability the owner hands to viewers — so
    // inferring `token != null` put a Dismiss button in front of every
    // recipient and let them rewrite the owner's dismissals.
    canOverride,
    onToggle: onToggleFlag,
  }

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
        onSignIn={() => setShowSignIn(true)}
        reportLabel={reportLabel}
        addressSlug={addressSlug}
      />
      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />

      {loading && <LoadingState />}

      {!loading && notFound && (
        <div className="container" style={{ paddingTop: 64, paddingBottom: 64 }}>
          <NotFoundState />
        </div>
      )}

      {!loading && loadFailed && (
        <div className="container" style={{ paddingTop: 64, paddingBottom: 64 }}>
          <LoadFailedState />
        </div>
      )}

      {!loading && !notFound && !loadFailed && analysis && listing && (
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

      {/* Desktop-only map of the document; renders nothing until the report's
          sections exist, and nothing at all on narrow screens. */}
      <ReportSectionRail scanKey={analysis?.token ?? null} />

      <StickyActionBar
        onShare={() => void navigator.clipboard.writeText(window.location.href)}
        onPDF={pdf.exportPdf}
      />
      <Footer />
    </div>
  )
}
