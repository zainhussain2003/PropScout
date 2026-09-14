/**
 * InvestorReport — Report A (investor purchase) page.
 *
 * Demo mode: ?demo=hamilton loads the Hamilton (strong buy) dataset.
 *            Default: Vaughan (hard pass).
 *
 * Sections rendered in order — every one is the component the live report
 * (ReportPage → InvestorReportContent) renders. The demo differs only in
 * where its data comes from (D-073); it must never carry its own copy of a
 * section, because copies drift.
 *   PropertyHero + deterministic verdict block (above numbered sections)
 *   §01  Investment metrics       → InvestmentMetricsSection
 *   §02  Financing scenarios      → FinancingSection
 *   §03  Rental comps             → RentalCompsSection
 *   §04  Cash to close            → CashToCloseSection
 *   §05  OSFI stress test         → OSFISection
 *   §06  Risk flags               → RiskFlagsSection
 *   §07  Equity build             → EquitySection (chart + break-even appreciation)
 *   §08  Neighbourhood            → NeighbourhoodSection
 *   §09  SunScout                 → SunScoutPanel
 *   §10  STR analysis             → STRPlaceholderSection
 *   §11  Due diligence checklist  → DueDiligenceSection
 */

import { useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { TruncatedVerdict } from '../components/paywall/TruncatedVerdict'
import { usePaywall } from '../components/paywall/PaywallContext'
import { usePdfExport } from '../hooks/usePdfExport'
import { useInvestorReport } from '../hooks/useInvestorReport'
import {
  VAUGHAN_LISTING,
  VAUGHAN_RENTAL,
  VAUGHAN_NEIGHBOURHOOD,
  HAMILTON_LISTING,
  HAMILTON_RENTAL,
  HAMILTON_NEIGHBOURHOOD,
} from '../constants/demoData'
import type { Analysis, ListingData, NeighbourhoodData } from '../types/analysis'
import type { RentalInput } from '../types/api'
import type { Listing } from '../types/property'
import { shimToListingData, shimToNeighbourhood } from '../lib/reportShims'
import { Nav } from '../components/shared/Nav'
import { Footer } from '../components/shared/Footer'
import { StickyActionBar } from '../components/shared/StickyActionBar'
import { Icon } from '../components/shared/Icon'
import { PropertyHero } from '../components/analysis/PropertyHero'
import { AIVerdictBlock } from '../components/analysis/AIVerdictBlock'
import { InvestmentMetricsSection } from '../components/investor/InvestmentMetricsSection'
import { FinancingSection } from '../components/investor/FinancingSection'
import { RentalCompsSection } from '../components/investor/RentalCompsSection'
import { CashToCloseSection } from '../components/investor/CashToCloseSection'
import { OSFISection } from '../components/investor/OSFISection'
import { RiskFlagsSection } from '../components/investor/RiskFlagsSection'
import { EquitySection } from '../components/investor/EquitySection'
import { DueDiligenceSection } from '../components/investor/DueDiligenceSection'
import { NeighbourhoodSection } from '../components/investor/NeighbourhoodSection'
import { STRPlaceholderSection } from '../components/investor/STRPlaceholderSection'
import { SunScoutPanel } from '../components/sunscout/SunScoutPanel'
import { fmtMoney } from '../lib/investorCalc'
import { useTheme } from '../hooks/useTheme'

// ── Demo dataset selection ─────────────────────────────────────────────────────

function getDemoDataset(): {
  listing: ListingData
  rental: RentalInput
  neighbourhood: NeighbourhoodData
} {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  if (params.get('demo') === 'hamilton') {
    return {
      listing: HAMILTON_LISTING,
      rental: HAMILTON_RENTAL,
      neighbourhood: HAMILTON_NEIGHBOURHOOD,
    }
  }
  return {
    listing: VAUGHAN_LISTING,
    rental: VAUGHAN_RENTAL,
    neighbourhood: VAUGHAN_NEIGHBOURHOOD,
  }
}

// ── Loading state ──────────────────────────────────────────────────────────────

function LoadingState(): JSX.Element {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          border: '3px solid var(--line)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }}
        aria-hidden="true"
      />
      <div className="col" style={{ alignItems: 'center', gap: 8 }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Running analysis
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Calculating investment metrics…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Error state ────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps): JSX.Element {
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
          background: 'color-mix(in oklab, var(--fail) 12%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="flag" size={24} />
      </div>
      <div className="col" style={{ gap: 8, maxWidth: 420 }}>
        <h3 className="serif" style={{ fontSize: 24 }}>
          Analysis failed
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>{message}</p>
      </div>
      <button className="btn btn-primary" onClick={onRetry}>
        Try again <Icon name="arrow" size={13} />
      </button>
    </div>
  )
}

// ── Written verdict helpers ───────────────────────────────────────────────────

/** Returns a plain-text first paragraph for TruncatedVerdict (free tier). */
function buildNarrativeFirstParaStr(listing: ListingData, dealLabel: string): string {
  const verdict = dealLabel.toLowerCase()
  if (verdict.includes('hard') || verdict.includes('do not')) {
    return `At ${fmtMoney(listing.price)}, this property fails on the fundamentals — deeply negative cash flow and a DSCR far below investment grade.`
  }
  if (verdict.includes('strong') || verdict.includes('good')) {
    return `A genuinely cash-flow positive rental at ${fmtMoney(listing.price)} — the numbers work without needing heroic rent assumptions.`
  }
  return `${listing.addressLine1} shows mixed signals — the deal carries real risk at current market rents.`
}

function buildNarrativeHeadline(listing: ListingData, dealLabel: string): ReactNode {
  const verdict = dealLabel.toLowerCase()
  if (verdict.includes('hard') || verdict.includes('do not')) {
    return (
      <>
        At {fmtMoney(listing.price)}, this property <em>fails on the fundamentals</em> — deeply
        negative cash flow and a DSCR far below investment grade.
      </>
    )
  }
  if (verdict.includes('strong') || verdict.includes('good')) {
    return (
      <>
        A genuinely <em>cash-flow positive</em> rental at {fmtMoney(listing.price)} — the numbers
        work without needing heroic rent assumptions.
      </>
    )
  }
  return (
    <>
      {listing.addressLine1} shows <em>mixed signals</em> — the deal carries real risk at current
      market rents.
    </>
  )
}

function buildNarrativeSub(
  listing: ListingData,
  capRate: number,
  cashFlowMonthly: number
): ReactNode {
  const capStr = `${(capRate * 100).toFixed(2)}%`
  const cfStr = fmtMoney(Math.abs(cashFlowMonthly))
  const positive = cashFlowMonthly >= 0

  return (
    <>
      The cap rate of {capStr} at the {fmtMoney(listing.price)} asking price sits{' '}
      {capRate < 0.03 ? 'well below' : capRate < 0.05 ? 'in' : 'above'} the standard 5% investment
      threshold for Ontario condos. Monthly cash flow of {positive ? '+' : '−'}
      {cfStr} {positive ? 'covers all operating costs' : 'requires top-up from your pocket'} at
      current market rents of {fmtMoney(listing.rentEstimate)}/mo. Adjust the financing sliders
      below to model different down payment and rate scenarios.
    </>
  )
}

// ── Main page component ────────────────────────────────────────────────────────

interface InvestorReportProps {
  /** User tier — controls AIVerdictBlock (pro) vs TruncatedVerdict (free). */
  tier?: string
  /** Real analysis from the API — when provided, demo data is replaced with live data. */
  analysis?: Analysis | null
  /** Real listing from the API — required alongside analysis to activate live mode. */
  listing?: Listing | null
}

export function InvestorReport({
  tier = 'pro',
  analysis: realAnalysis,
  listing: realListing,
}: InvestorReportProps): JSX.Element {
  const { openUpgradeModal } = usePaywall()
  const pdf = usePdfExport(realAnalysis?.token ?? null)
  const { dark, toggle: handleToggleDark } = useTheme()
  const demoData = getDemoDataset()

  // Shim: use real data when provided, fall back to demo fixtures
  const listing: ListingData =
    realAnalysis && realListing ? shimToListingData(realListing, realAnalysis) : demoData.listing
  const neighbourhood: NeighbourhoodData = realAnalysis
    ? shimToNeighbourhood(realAnalysis)
    : demoData.neighbourhood

  const { loading, error, financing, metrics, dealScore, sunScout, updateFinancing } =
    useInvestorReport(
      listing,
      demoData.rental,
      undefined,
      realAnalysis ?? null // skip internal API call when analysis is preloaded
    )

  const navigate = useNavigate()
  const handleBack = useCallback(() => navigate('/'), [navigate])

  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  const addressSlug = listing.addressLine1
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return (
    <div
      className="report-page-mobile-padding"
      style={{ minHeight: '100vh', background: 'var(--bg)' }}
    >
      <Nav
        variant="report"
        dark={dark}
        onToggleDark={handleToggleDark}
        onSignIn={() => undefined}
        reportLabel="Investor report"
        addressSlug={addressSlug}
      />

      <main>
        {loading && <LoadingState />}

        {!loading && error && (
          <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
            <ErrorState message={error} onRetry={handleRetry} />
          </div>
        )}

        {!loading && !error && metrics && dealScore && (
          <>
            {/* ── Hero + evidence-based verdict ──────────────────────── */}
            <PropertyHero
              listing={listing}
              score={dealScore}
              cashFlowMonthly={metrics.cashFlowMonthly}
              capRate={metrics.capRate}
              dscr={metrics.dscr}
              onBack={handleBack}
            />

            <div className="container" style={{ marginBottom: 32 }}>
              {tier === 'free' ? (
                <TruncatedVerdict
                  firstParagraph={
                    realAnalysis?.narrative
                      ? realAnalysis.narrative.split('. ')[0] + '.'
                      : buildNarrativeFirstParaStr(listing, dealScore.label)
                  }
                  onUnlock={() => openUpgradeModal('verdict')}
                />
              ) : (
                <AIVerdictBlock
                  eyebrow="PropScout · investor verdict"
                  headline={buildNarrativeHeadline(listing, dealScore.label)}
                  sub={
                    realAnalysis?.narrative ??
                    buildNarrativeSub(listing, metrics.capRate, metrics.cashFlowMonthly)
                  }
                />
              )}
            </div>

            {/* ── §01 Investment metrics ─────────────────────────────── */}
            <InvestmentMetricsSection metrics={metrics} listing={listing} />

            {/* ── §02 Financing scenarios ────────────────────────────── */}
            <FinancingSection
              price={listing.price}
              financing={financing}
              onFinancingChange={updateFinancing}
            />

            {/* §03–§07 are the same components the live report renders
                (D-073) — the demo is a preview of the product, not a second
                product. Only the data source differs. */}
            {/* ── §03 Rental comps ───────────────────────────────────── */}
            <RentalCompsSection
              comps={{
                low: listing.rentLow,
                mid: listing.rentEstimate,
                high: listing.rentHigh,
                compCount: listing.compCount,
                confidence: listing.compConfidence,
                radiusKm: null,
              }}
              askingRent={listing.rentEstimate}
            />

            {/* ── §04 Cash to close ──────────────────────────────────── */}
            <CashToCloseSection metrics={metrics} listing={listing} financing={financing} />

            {/* ── §05 OSFI stress test ───────────────────────────────── */}
            <OSFISection financing={financing} listing={listing} />

            {/* ── §06 Risk flags ─────────────────────────────────────── */}
            <RiskFlagsSection listing={listing} />

            {/* ── §07 Equity build ───────────────────────────────────── */}
            <EquitySection metrics={metrics} />

            {/* ── §08 Neighbourhood ──────────────────────────────────── */}
            <NeighbourhoodSection listing={listing} neighbourhood={neighbourhood} />

            {/* ── §09 SunScout ───────────────────────────────────────── */}
            <SunScoutPanel sunScout={sunScout} sectionNumber="09" />

            {/* ── §10 STR analysis ───────────────────────────────────── */}
            <STRPlaceholderSection listing={listing} />

            {/* ── §11 Due diligence ──────────────────────────────────── */}
            <DueDiligenceSection />
          </>
        )}
      </main>

      <Footer />
      <StickyActionBar
        onSave={() => undefined}
        onShare={() => void navigator.clipboard.writeText(window.location.href)}
        onPDF={pdf.exportPdf}
      />
    </div>
  )
}
