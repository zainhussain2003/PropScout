/**
 * LandlordPage — Report D (landlord rental).
 *
 * Route: /landlord-report
 * Demo data: Unit 3208 · 88 Harbour Street, Toronto (LL_PROPERTY / LL_RENT_COMPS)
 *
 * Key behaviour:
 *   - askingRent is React state — slider drives live metric recalculation.
 *   - financing is React state — FinancingSliders drives live recalculation.
 *   - All metrics (cash flow, cap rate, DSCR, score) recalculate on every
 *     askingRent or financing change via useMemo.
 *
 * Sections:
 *   LandlordPropertyHero      — photo grid + ownership strip + sticky score
 *   LandlordVerdictHero       — dark AI verdict card
 *   §01  Rent positioning     → LandlordRentPositioningSection (rent slider)
 *   §02  Investment metrics   → InvestmentMetricsSection (reused investor)
 *   §03  Financing scenarios  → FinancingSliders (reused investor)
 *   §04  Rental comps         → RentalCompsBar (reused investor)
 *   §05  OSFI stress test     → OSFICard (reused investor)
 *   §06  Risk flags           → RiskRow list
 *   §07  Equity build         → EquityChart (reused investor)
 *   §08  Neighbourhood        → NeighbourhoodSection (reused investor)
 *   §09  SunScout             → STRPlaceholderSection (reused investor)
 *   §10  STR analysis         → STRPlaceholderSection (reused investor)
 *   §11  Landlord checklist   → static checklist
 */

import { useState, useMemo, useCallback } from 'react'
import { LockedButton } from '../components/paywall/LockedButton'
import { TruncatedVerdict } from '../components/paywall/TruncatedVerdict'
import { usePaywall } from '../components/paywall/PaywallContext'
import {
  LL_PROPERTY,
  LL_RENT_COMPS,
  LL_DEFAULT_FINANCING,
  computeRentPositioning,
  computeLandlordStable,
  computeLandlordDealScore,
} from '../data/landlordData'
import type { LandlordProperty } from '../types/landlord'
import type {
  FinancingInputs,
  ListingData,
  NeighbourhoodData,
  InvestorRiskFlag,
} from '../types/analysis'
import {
  enrichMetrics,
  computeDemoMetrics,
  toDealScoreData,
  fmtMoney,
  fmtPct,
} from '../lib/investorCalc'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'
import { shimToListingData, shimToNeighbourhood, shimToLandlordProperty } from '../lib/reportShims'
import { Nav } from '../components/shared/Nav'
import { Footer } from '../components/shared/Footer'
import { StickyActionBar } from '../components/shared/StickyActionBar'
import { SectionHead } from '../components/shared/SectionHead'
import { Icon } from '../components/shared/Icon'
import { LandlordPropertyHero } from '../components/landlord/LandlordPropertyHero'
import { LandlordVerdictHero } from '../components/landlord/LandlordVerdictHero'
import { LandlordRentPositioningSection } from '../components/landlord/LandlordRentPositioningSection'
import { InvestmentMetricsSection } from '../components/investor/InvestmentMetricsSection'
import { FinancingSliders } from '../components/investor/FinancingSliders'
import { LTTTable } from '../components/investor/LTTTable'
import { OSFICard } from '../components/investor/OSFICard'
import { EquityChart } from '../components/investor/EquityChart'
import { NeighbourhoodSection } from '../components/investor/NeighbourhoodSection'
import { STRPlaceholderSection } from '../components/investor/STRPlaceholderSection'
import { RentalCompsBar } from '../components/analysis/RentalCompsBar'
import { RiskRow } from '../components/analysis/RiskRow'

// ── Converts LandlordProperty to ListingData for shared investor components ───

function toListing(property: LandlordProperty, currentRent: number): ListingData {
  return {
    id: property.id,
    addressLine1: property.addressLine1,
    addressLine2: property.addressLine2,
    postal: property.postal,
    province: property.province,
    isToronto: property.toronto,
    propertyType: property.propertyType,
    beds: property.beds,
    baths: property.baths,
    sqft: property.sqft,
    parking: property.parking,
    yearBuilt: property.yearBuilt,
    rentControl: property.rentControl,
    price: property.price,
    annualTaxes: property.annualTaxes,
    condoFeeMonthly: property.condoFeeMonthly,
    rentEstimate: currentRent,
    rentLow: property.rentLow,
    rentHigh: property.rentHigh,
    compCount: property.compCount,
    compConfidence: property.compConfidence,
    market: property.market,
    riskFlags: property.riskFlags as InvestorRiskFlag[],
    chips: property.chips,
  }
}

// ── Toronto South Core neighbourhood data (demo) ─────────────────────────────

const HARBOUR_NEIGHBOURHOOD: NeighbourhoodData = {
  avgIncome: 102500,
  popGrowth5y: 0.094,
  walkScore: 96,
  transitScore: 100,
  bikeScore: 84,
  buildingPermits: 18,
  appreciation5y: 0.194,
  appreciation10y: 0.621,
  ppsqftTrend: 'Flat +0.8% YoY',
  comps: [
    {
      addr: 'Unit 2604 · 88 Harbour St',
      beds: '1+1',
      sqft: 710,
      sold: '$895,000',
      date: 'Mar 2026',
    },
    {
      addr: 'Unit 1208 · 88 Harbour St',
      beds: '1+1',
      sqft: 690,
      sold: '$878,000',
      date: 'Feb 2026',
    },
    {
      addr: 'Unit 4108 · 88 Harbour St',
      beds: '1+1',
      sqft: 770,
      sold: '$920,000',
      date: 'Jan 2026',
    },
    {
      addr: 'Unit 2101 · 65 Harbour St',
      beds: '1+1',
      sqft: 725,
      sold: '$903,000',
      date: 'Dec 2025',
    },
  ],
}

// ── Landlord checklist ────────────────────────────────────────────────────────

const LANDLORD_CHECKLIST = [
  { label: 'Confirm rent is at or below the market range before re-listing', critical: true },
  { label: 'Screen all prospective tenants under HRTO and RTA guidelines', critical: true },
  { label: 'Use the OREA Standard Form lease — custom clauses must be addenda', critical: true },
  { label: "Run a full credit + reference check — don't rely on email alone", critical: true },
  { label: 'File N1 within 90 days if planning a guideline increase this year', critical: false },
  { label: 'Document property condition with a time-stamped walkthrough video', critical: false },
  {
    label: 'Review condo rules on tenant move-in/out procedures and elevator booking',
    critical: false,
  },
  { label: 'Confirm building rental ratio and verify CMHC vacancy allowance', critical: false },
] as const

function LandlordChecklistSection(): JSX.Element {
  const { tier, openUpgradeModal } = usePaywall()
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const toggle = useCallback((i: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }, [])

  const criticalCount = LANDLORD_CHECKLIST.filter((i) => i.critical).length

  return (
    <section className="container tr-section">
      <SectionHead
        n="11"
        topic="Landlord checklist"
        question={
          <>
            Do these <em>before</em> you list.
          </>
        }
        verdict={`${LANDLORD_CHECKLIST.length} items · ${criticalCount} critical`}
        tone="caution"
      />

      <div className="card" style={{ padding: 28 }}>
        <div className="col">
          {LANDLORD_CHECKLIST.map((it, i) => {
            const done = checked.has(i)
            return (
              <label
                key={i}
                className="row gap-14"
                style={{
                  padding: '14px 4px',
                  borderBottom:
                    i < LANDLORD_CHECKLIST.length - 1 ? '1px solid var(--line)' : 'none',
                  cursor: 'pointer',
                  alignItems: 'center',
                }}
              >
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(i)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: 'var(--accent)',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                />
                <div
                  className="col grow"
                  style={{
                    gap: 2,
                    color: done ? 'var(--muted)' : 'var(--ink)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{it.label}</span>
                </div>
                {it.critical && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      padding: '3px 8px',
                      borderRadius: 999,
                      border: '1px solid color-mix(in oklab, var(--accent) 35%, transparent)',
                      background: 'color-mix(in oklab, var(--accent) 8%, transparent)',
                      flexShrink: 0,
                    }}
                  >
                    Critical
                  </span>
                )}
              </label>
            )
          })}
        </div>

        <div
          className="row gap-12"
          style={{
            marginTop: 22,
            paddingTop: 22,
            borderTop: '1px solid var(--line)',
          }}
        >
          {tier === 'free' ? (
            <LockedButton
              label="Export as PDF"
              icon="doc"
              onClick={() => openUpgradeModal('pdf')}
            />
          ) : (
            <button className="btn btn-primary">
              <Icon name="doc" size={13} /> Export as PDF
            </button>
          )}
          <button className="btn btn-ghost">
            <Icon name="link" size={13} /> Share with tenant agent
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface LandlordPageProps {
  /** User tier — controls PDF button gating in LandlordChecklistSection. */
  tier?: string
  /** Real analysis from the API — when provided, live data replaces fixtures. */
  analysis?: Analysis | null
  /** Real listing from the API — required alongside analysis to activate live mode. */
  listing?: Listing | null
}

export function LandlordPage({
  tier = 'pro',
  analysis: realAnalysis,
  listing: realListing,
}: LandlordPageProps): JSX.Element {
  const { openUpgradeModal } = usePaywall()
  const [dark, setDark] = useState(false)
  const isReal = !!(realAnalysis && realListing)

  const [askingRent, setAskingRent] = useState(realListing?.rentMonthly ?? LL_PROPERTY.askingRent)
  const [financing, setFinancing] = useState<FinancingInputs>(LL_DEFAULT_FINANCING)

  // Real property shape for hero/verdict — shimmed when live, fixture when demo
  const property = useMemo(
    () => (isReal ? shimToLandlordProperty(realListing!, realAnalysis!) : LL_PROPERTY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReal]
  )

  // Convert to ListingData: prefer real data via shim, fall back to demo conversion
  const listing = useMemo(
    () =>
      isReal ? shimToListingData(realListing!, realAnalysis!) : toListing(LL_PROPERTY, askingRent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReal, askingRent]
  )

  // Neighbourhood: prefer real data
  const neighbourhood = useMemo(
    () => (realAnalysis ? shimToNeighbourhood(realAnalysis) : HARBOUR_NEIGHBOURHOOD),
    [realAnalysis]
  )

  // Stable NOI-level metrics (change only with rent or expense toggles)
  const stable = useMemo(
    () => computeLandlordStable(property, askingRent, financing.includeManagementFee),
    [property, askingRent, financing.includeManagementFee]
  )

  // Core InvestmentMetrics: recompute financing-dependent metrics so sliders work.
  // Use stored NOI/capRate as stable base, recompute payment/cashFlow/DSCR with current financing.
  const coreMetrics = useMemo(() => {
    if (isReal && realAnalysis?.metrics) {
      return computeDemoMetrics(
        {
          noi: realAnalysis.metrics.noi,
          capRate: realAnalysis.metrics.capRate,
          grm: realAnalysis.metrics.grm,
          closingCostsTotal: realAnalysis.metrics.closingCostsTotal,
        },
        listing,
        financing
      )
    }
    return computeDemoMetrics(stable, listing, financing)
  }, [isReal, realAnalysis?.metrics, stable, listing, financing])

  // Fully enriched ComputedInvestorMetrics (adds LTT, OSFI, equity curve, expenses)
  const metrics = useMemo(
    () => enrichMetrics(coreMetrics, listing, financing),
    [coreMetrics, listing, financing]
  )

  // Deal score: use real API score when available, fall back to landlord algorithm
  const score = useMemo(
    () =>
      realAnalysis?.dealScore
        ? toDealScoreData(realAnalysis.dealScore)
        : computeLandlordDealScore(
            {
              capRate: metrics.capRate,
              cashFlowMonthly: metrics.cashFlowMonthly,
              cashOnCashReturn: metrics.cashOnCashReturn,
              dscr: metrics.dscr,
            },
            {
              market: LL_PROPERTY.market,
              riskFlags: LL_PROPERTY.riskFlags,
            }
          ),
    [realAnalysis?.dealScore, metrics]
  )

  // Rent positioning (updates live with slider)
  const positioning = useMemo(() => computeRentPositioning(askingRent, LL_RENT_COMPS), [askingRent])

  const activeRiskFlags = isReal ? property.riskFlags : LL_PROPERTY.riskFlags
  const redFlags = activeRiskFlags.filter((f) => f.tone === 'red')
  const amberFlags = activeRiskFlags.filter((f) => f.tone === 'amber')
  const riskVerdictLabel =
    redFlags.length > 0
      ? `${redFlags.length} red · ${amberFlags.length} amber`
      : amberFlags.length > 0
        ? `${amberFlags.length} amber flag${amberFlags.length > 1 ? 's' : ''}`
        : 'No red flags'
  const riskVerdictTone = redFlags.length > 1 ? 'fail' : redFlags.length === 1 ? 'caution' : 'pass'

  const addressSlug = isReal
    ? (realListing!.address
        .split(',')[0]
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') ?? '88-harbour-st-toronto')
    : '3208-harbour-st-toronto'

  return (
    <div className="report-page-mobile-padding">
      <Nav
        variant="report"
        reportLabel="Landlord report"
        addressSlug={addressSlug}
        dark={dark}
        onToggleDark={() => {
          setDark((d) => {
            const next = !d
            document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
            return next
          })
        }}
        onSignIn={() => {
          /* TODO: wire sign-in modal */
        }}
      />

      {/* Hero + verdict */}
      <LandlordPropertyHero
        property={property}
        askingRent={askingRent}
        metrics={metrics}
        score={score}
        positioning={positioning}
      />
      {tier === 'free' ? (
        <section className="container" style={{ marginTop: 24, marginBottom: 16 }}>
          <TruncatedVerdict
            firstParagraph={
              realAnalysis?.narrative
                ? realAnalysis.narrative.split('. ')[0] + '.'
                : `You're above the building median, and ${property.ownership.daysOnMarket} days on market is telling you exactly what the tenants think of it.`
            }
            onUnlock={() => openUpgradeModal('verdict')}
          />
        </section>
      ) : (
        <LandlordVerdictHero
          property={property}
          askingRent={askingRent}
          positioning={positioning}
          metrics={metrics}
        />
      )}

      {/* §01 Rent positioning */}
      <LandlordRentPositioningSection
        property={property}
        askingRent={askingRent}
        onRentChange={setAskingRent}
        positioning={positioning}
        comps={LL_RENT_COMPS}
      />

      {/* §02 Investment metrics */}
      <InvestmentMetricsSection metrics={metrics} listing={listing} />

      {/* §03 Financing scenarios */}
      <section className="container tr-section">
        <SectionHead
          n="03"
          topic="Financing scenarios"
          question={
            <>
              What if you <em>refinanced</em>?
            </>
          }
          verdict="Live recalc"
          tone="pass"
        />
        <FinancingSliders
          financing={financing}
          price={property.price}
          onChange={(f) => setFinancing(f)}
        />
      </section>

      {/* §04 Rental comps */}
      <section className="container tr-section">
        <SectionHead
          n="04"
          topic="Rental comps"
          question={
            <>
              What will tenants <em>actually</em> pay?
            </>
          }
          verdict={`${property.compCount} comps · ${property.compConfidence} confidence`}
          tone="pass"
        />
        <div className="card" style={{ padding: 28 }}>
          <div
            className="row"
            style={{
              justifyContent: 'space-between',
              marginBottom: 8,
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
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
                Market rent range · {property.compCount} comparable rentals
              </span>
            </div>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color:
                  property.compConfidence === 'high'
                    ? 'var(--pass)'
                    : property.compConfidence === 'medium'
                      ? 'var(--caution)'
                      : 'var(--fail)',
              }}
            >
              {property.compConfidence.charAt(0).toUpperCase() + property.compConfidence.slice(1)}{' '}
              confidence
            </span>
          </div>
          <RentalCompsBar
            low={property.rentLow}
            mid={property.rentEstimate}
            high={property.rentHigh}
            ask={askingRent}
          />
        </div>
      </section>

      {/* §05 Cash to close */}
      <section className="container tr-section">
        <SectionHead
          n="05"
          topic="Cash to close"
          question={
            <>
              What did you need to <em>bring</em>?
            </>
          }
          verdict={fmtMoney(
            metrics.downPayment +
              metrics.lttProvincial +
              metrics.lttMunicipal +
              metrics.closingCostsTotal
          )}
          tone="pass"
        />
        <LTTTable ltt={metrics.ltt} price={property.price} toronto={financing.isToronto} />
      </section>

      {/* §06 OSFI stress test */}
      <section className="container tr-section">
        <SectionHead
          n="06"
          topic="OSFI stress test"
          question={
            <>
              Can you still <em>qualify</em>?
            </>
          }
          verdict={metrics.osfi.pass ? 'Pass' : 'Fail'}
          tone={metrics.osfi.pass ? 'pass' : 'fail'}
        />
        <OSFICard osfi={metrics.osfi} financing={financing} />
      </section>

      {/* §07 Risk flags */}
      <section className="container tr-section">
        <SectionHead
          n="07"
          topic="Risk flags"
          question={
            <>
              What could go <em>wrong</em>?
            </>
          }
          verdict={riskVerdictLabel}
          tone={riskVerdictTone}
        />
        <div className="col gap-12">
          {activeRiskFlags.map((f) => (
            <RiskRow
              key={f.id}
              tone={f.tone === 'red' ? 'red' : 'amber'}
              label={f.label}
              detail={f.detail}
            />
          ))}
        </div>
        {activeRiskFlags.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            No risk flags detected for this property.
          </p>
        )}
      </section>

      {/* §08 Equity build */}
      <section className="container tr-section">
        <SectionHead
          n="08"
          topic="Equity build"
          question={
            <>
              How does your wealth <em>compound</em>?
            </>
          }
          verdict={`${fmtPct(metrics.equityCurve[20]?.cashOnCash ?? 0)} CoC at year 20`}
          tone="pass"
        />
        <EquityChart
          equityCurve={metrics.equityCurve}
          totalCashInvested={metrics.totalCashInvested}
        />
      </section>

      {/* §09 Neighbourhood */}
      <NeighbourhoodSection listing={listing} neighbourhood={neighbourhood} />

      {/* §10 SunScout / STR — Phase 2 placeholders */}
      <STRPlaceholderSection listing={listing} />

      {/* §11 Landlord checklist */}
      <LandlordChecklistSection />

      <Footer />
      <StickyActionBar onSave={() => undefined} onShare={() => undefined} onPDF={() => undefined} />
    </div>
  )
}
