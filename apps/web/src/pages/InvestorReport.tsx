/**
 * InvestorReport — Report A (investor purchase) page.
 *
 * Demo mode: ?demo=hamilton loads the Hamilton (strong buy) dataset.
 *            Default: Vaughan (hard pass).
 *
 * Sections rendered in order:
 *   PropertyHero + AIVerdictBlock (above numbered sections)
 *   §01  Investment metrics       → InvestmentMetricsSection
 *   §02  Financing scenarios      → FinancingSliders
 *   §03  Rental comps             → RentalCompsBar
 *   §04  Cash to close            → LTTTable + closing cost summary
 *   §05  OSFI stress test         → OSFICard
 *   §06  Risk flags               → RiskRow list
 *   §07  Equity build             → EquityChart
 *   §08  Neighbourhood            → NeighbourhoodSection
 *   §09  SunScout                 → Phase 2 placeholder
 *   §10  STR analysis             → STRPlaceholderSection
 *   §11  Due diligence checklist  → Static checklist
 */

import { useState, useCallback, type ReactNode } from 'react'
import { TruncatedVerdict } from '../components/paywall/TruncatedVerdict'
import { usePaywall } from '../components/paywall/PaywallContext'
import { useInvestorReport } from '../hooks/useInvestorReport'
import {
  VAUGHAN_LISTING,
  VAUGHAN_RENTAL,
  VAUGHAN_NEIGHBOURHOOD,
  HAMILTON_LISTING,
  HAMILTON_RENTAL,
  HAMILTON_NEIGHBOURHOOD,
} from '../constants/demoData'
import type { ListingData, NeighbourhoodData, FinancingInputs } from '../types/analysis'
import type { RentalInput } from '../types/api'
import { Nav } from '../components/shared/Nav'
import { Footer } from '../components/shared/Footer'
import { StickyActionBar } from '../components/shared/StickyActionBar'
import { SectionHead } from '../components/shared/SectionHead'
import { Icon } from '../components/shared/Icon'
import { Chip } from '../components/shared/Chip'
import { PropertyHero } from '../components/analysis/PropertyHero'
import { AIVerdictBlock } from '../components/analysis/AIVerdictBlock'
import { RentalCompsBar } from '../components/analysis/RentalCompsBar'
import { RiskRow } from '../components/analysis/RiskRow'
import { InvestmentMetricsSection } from '../components/investor/InvestmentMetricsSection'
import { FinancingSliders } from '../components/investor/FinancingSliders'
import { LTTTable } from '../components/investor/LTTTable'
import { OSFICard } from '../components/investor/OSFICard'
import { EquityChart } from '../components/investor/EquityChart'
import { NeighbourhoodSection } from '../components/investor/NeighbourhoodSection'
import { STRPlaceholderSection } from '../components/investor/STRPlaceholderSection'
import { fmtMoney } from '../lib/investorCalc'

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

// ── Due diligence checklist data ───────────────────────────────────────────────

const DUE_DILIGENCE_ITEMS = [
  {
    category: 'Title & legal',
    items: [
      'Order title search — confirm no liens, encumbrances, or work orders',
      'Review status certificate (condos) — check for pending special assessments and reserve fund health',
      'Verify zoning and permitted uses with the municipality',
      'Confirm HST treatment with your accountant (new construction vs resale)',
    ],
  },
  {
    category: 'Physical inspection',
    items: [
      'Schedule a licensed home inspector — attend the inspection yourself',
      'Request HVAC service records; confirm system age and warranty status',
      'Check electrical panel — knob-and-tube and 60A panels affect insurability',
      'Inspect roof (freehold): ask for age and any recent repairs',
    ],
  },
  {
    category: 'Tenancy & income',
    items: [
      'Obtain copy of current lease(s) — confirm term, rent, last increase date',
      'Verify rent is at or below guideline maximum if property is rent-controlled',
      'Request last 12 months of utility bills to validate expense estimates',
      'Confirm no outstanding N1 (rent increase) or N12 (personal use) notices',
    ],
  },
  {
    category: 'Financing & insurance',
    items: [
      'Get mortgage pre-approval with a DSCR lender (not just your primary bank)',
      'Confirm property insurability — high-rise condos above 10 floors need specialist',
      'Get fire insurance quote before waiving conditions',
      'Ask lender about rental property surcharge on rate and down-payment minimum',
    ],
  },
] as const

// ── Section: Due diligence checklist (§11) ─────────────────────────────────────

function DueDiligenceSection(): JSX.Element {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = useCallback((key: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const totalItems = DUE_DILIGENCE_ITEMS.reduce((s, g) => s + g.items.length, 0)
  const doneCount = checked.size
  const pct = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0

  return (
    <section className="container tr-section" data-section="11">
      <SectionHead
        n="11"
        topic="Due diligence"
        question={
          <>
            What to check before you <em>sign</em>.
          </>
        }
        verdict={`${doneCount} / ${totalItems} complete`}
        tone={pct === 100 ? 'pass' : pct > 50 ? 'caution' : 'fail'}
      />

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: 'var(--line)',
          marginBottom: 28,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 999,
            background: pct === 100 ? 'var(--pass)' : 'var(--accent)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div
        className="grid-1col-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}
      >
        {DUE_DILIGENCE_ITEMS.map((group) => (
          <div key={group.category} className="card col" style={{ padding: 24, gap: 16 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              {group.category}
            </div>
            <div className="col" style={{ gap: 10 }}>
              {group.items.map((item, idx) => {
                const key = `${group.category}-${idx}`
                const done = checked.has(key)
                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: done ? 'var(--muted)' : 'var(--ink)',
                      textDecoration: done ? 'line-through' : 'none',
                      transition: 'color 0.12s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggle(key)}
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        accentColor: 'var(--pass)',
                        width: 15,
                        height: 15,
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ lineHeight: 1.5 }}>{item}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Section: SunScout placeholder (§09) ───────────────────────────────────────

function SunScoutPlaceholderSection(): JSX.Element {
  return (
    <section className="container tr-section" data-section="09">
      <SectionHead
        n="09"
        topic="SunScout"
        question={
          <>
            How much <em>light</em> does it get?
          </>
        }
        verdict="Modeling · Phase 2"
        tone="caution"
      />

      <div
        className="card col"
        style={{ padding: 40, gap: 20, alignItems: 'center', textAlign: 'center' }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            background: 'color-mix(in oklab, var(--caution) 14%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="sun" size={28} />
        </div>

        <div className="col" style={{ gap: 8, maxWidth: 560 }}>
          <Chip>Coming Phase 2</Chip>
          <h4 className="serif" style={{ fontSize: 24 }}>
            Solar path analysis — shipping Q3 2026.
          </h4>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            SunScout will use NASA NREL sun-path data and building-height obstruction modelling to
            show you peak sun hours by season and window orientation. Ideal for evaluating
            south-facing condos and adding solar panels.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginTop: 8,
            width: '100%',
            filter: 'blur(2px)',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {(['Dec', 'Mar', 'Jun', 'Sep'] as const).map((month) => (
            <div
              key={month}
              className="col"
              style={{
                padding: '16px',
                borderRadius: 12,
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
                gap: 4,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                {month}
              </span>
              <span className="serif tabular" style={{ fontSize: 22, lineHeight: 1 }}>
                {month === 'Jun'
                  ? '6.8'
                  : month === 'Sep'
                    ? '5.1'
                    : month === 'Mar'
                      ? '4.4'
                      : '2.9'}
                h
              </span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                peak sun / day
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section: Cash to close (§04) ──────────────────────────────────────────────

interface CashToCloseSectionProps {
  price: number
  lttTotal: number
  downPayment: number
  closingCostsTotal: number
  lttComponent: ReactNode
}

function CashToCloseSection({
  price,
  lttTotal,
  downPayment,
  closingCostsTotal,
  lttComponent,
}: CashToCloseSectionProps): JSX.Element {
  const legalFees = 1500
  const titleInsurance = 350
  const homeinspection = 650
  const miscellaneous = closingCostsTotal - lttTotal - legalFees - titleInsurance - homeinspection
  const adjustedMisc = Math.max(0, miscellaneous)
  const computedTotal =
    downPayment + lttTotal + legalFees + titleInsurance + homeinspection + adjustedMisc

  const costRows: Array<[string, number, string]> = [
    ['Down payment', downPayment, `${Math.round((downPayment / price) * 100)}% of purchase price`],
    ['Land Transfer Tax', lttTotal, 'Ontario provincial (+ Toronto if applicable)'],
    ['Legal fees', legalFees, 'Estimated — get a quote from a real estate lawyer'],
    ['Title insurance', titleInsurance, 'One-time · protects against title defects'],
    ['Home inspection', homeinspection, 'Strongly recommended before waiving condition'],
    ['Miscellaneous', adjustedMisc, 'Moving costs, minor repairs, utility setup'],
  ]

  return (
    <section className="container tr-section" data-section="04">
      <SectionHead
        n="04"
        topic="Cash to close"
        question={
          <>
            What do you need <em>on day one</em>?
          </>
        }
        verdict={fmtMoney(computedTotal)}
        tone="caution"
      />

      <div className="col" style={{ gap: 16 }}>
        {/* LTT bracket table */}
        {lttComponent}

        {/* Summary table */}
        <div className="card" style={{ padding: 28 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 18,
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
                Closing cost summary
              </span>
              <h4 className="serif" style={{ fontSize: 22 }}>
                Total cash required at closing.
              </h4>
            </div>
            <span
              className="serif tabular"
              style={{ fontSize: 30, lineHeight: 1, color: 'var(--accent)' }}
            >
              {fmtMoney(computedTotal)}
            </span>
          </div>

          <div className="col" style={{ gap: 0 }}>
            {costRows.map(([label, value, note], i) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: i < costRows.length - 1 ? '1px solid var(--line)' : 'none',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>{label}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {note}
                  </span>
                </div>
                <span
                  className="mono tabular"
                  style={{ fontWeight: 500, color: 'var(--ink)', flexShrink: 0 }}
                >
                  {fmtMoney(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section: Rental comps (§03) ───────────────────────────────────────────────

interface RentalCompsSectionProps {
  low: number
  mid: number
  high: number
  ask: number
  compCount: number
  confidence: 'low' | 'medium' | 'high'
}

function RentalCompsSection({
  low,
  mid,
  high,
  ask,
  compCount,
  confidence,
}: RentalCompsSectionProps): JSX.Element {
  const aboveMarket = ask > high
  const belowMarket = ask < low
  const verdictLabel = aboveMarket
    ? 'Above comp range'
    : belowMarket
      ? 'Below comp range'
      : 'Within comp range'
  const verdictTone = aboveMarket || belowMarket ? 'caution' : 'pass'

  return (
    <section className="container tr-section" data-section="03">
      <SectionHead
        n="03"
        topic="Rental comps"
        question={
          <>
            What will tenants <em>actually</em> pay?
          </>
        }
        verdict={verdictLabel}
        tone={verdictTone}
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
              Market rent range · {compCount} comparable rentals
            </span>
          </div>
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
        <RentalCompsBar low={low} mid={mid} high={high} ask={ask} />
      </div>
    </section>
  )
}

// ── Section: Risk flags (§06) ─────────────────────────────────────────────────

interface RiskFlagsSectionProps {
  listing: ListingData
}

function RiskFlagsSection({ listing }: RiskFlagsSectionProps): JSX.Element {
  const redFlags = listing.riskFlags.filter((f) => f.tone === 'red')
  const amberFlags = listing.riskFlags.filter((f) => f.tone === 'amber')
  const greenFlags = listing.riskFlags.filter((f) => f.tone === 'green')
  const totalDeductions = listing.riskFlags.reduce((s, f) => s + f.deduct, 0)

  const verdictTone = redFlags.length > 1 ? 'fail' : redFlags.length === 1 ? 'caution' : 'pass'
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
            What could go <em>wrong</em>?
          </>
        }
        verdict={verdictLabel}
        tone={verdictTone}
      />

      <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
        {totalDeductions > 0 && (
          <div
            style={{
              padding: '12px 24px',
              background: 'color-mix(in oklab, var(--fail) 8%, transparent)',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--ink-2)' }}>Total deal score deductions</span>
            <span className="mono tabular" style={{ color: 'var(--fail)', fontWeight: 600 }}>
              −{totalDeductions} pts
            </span>
          </div>
        )}

        {listing.riskFlags.length === 0 && (
          <div
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 14,
            }}
          >
            No risk flags detected for this property.
          </div>
        )}

        {[...redFlags, ...amberFlags, ...greenFlags].map((flag, i) => (
          <div
            key={flag.id}
            style={{
              borderBottom: i < listing.riskFlags.length - 1 ? '1px solid var(--line)' : 'none',
              padding: '4px 0',
            }}
          >
            <RiskRow tone={flag.tone} label={flag.label} detail={flag.detail} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Section: Financing sliders (§02) ──────────────────────────────────────────

interface FinancingSectionProps {
  listing: ListingData
  financing: FinancingInputs
  onFinancingChange: (f: FinancingInputs) => void
}

function FinancingSection({
  listing,
  financing,
  onFinancingChange,
}: FinancingSectionProps): JSX.Element {
  return (
    <section className="container tr-section" data-section="02">
      <SectionHead
        n="02"
        topic="Financing scenarios"
        question={
          <>
            How does leverage change the <em>return</em>?
          </>
        }
      />
      <FinancingSliders financing={financing} price={listing.price} onChange={onFinancingChange} />
    </section>
  )
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

// ── AI narrative helpers ───────────────────────────────────────────────────────

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
}

export function InvestorReport({ tier = 'pro' }: InvestorReportProps): JSX.Element {
  const { openUpgradeModal } = usePaywall()
  const [dark, setDark] = useState<boolean>(false)
  const { listing, rental, neighbourhood } = getDemoDataset()

  const { loading, error, financing, metrics, dealScore, updateFinancing } = useInvestorReport(
    listing,
    rental
  )

  const handleToggleDark = useCallback(() => {
    setDark((d) => {
      const next = !d
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  const handleBack = useCallback(() => {
    window.history.back()
  }, [])

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
            {/* ── Hero + AI verdict ──────────────────────────────────── */}
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
                  firstParagraph={buildNarrativeFirstParaStr(listing, dealScore.label)}
                  onUnlock={() => openUpgradeModal('verdict')}
                />
              ) : (
                <AIVerdictBlock
                  eyebrow="Scout AI · investor verdict"
                  headline={buildNarrativeHeadline(listing, dealScore.label)}
                  sub={buildNarrativeSub(listing, metrics.capRate, metrics.cashFlowMonthly)}
                />
              )}
            </div>

            {/* ── §01 Investment metrics ─────────────────────────────── */}
            <InvestmentMetricsSection metrics={metrics} listing={listing} />

            {/* ── §02 Financing scenarios ────────────────────────────── */}
            <FinancingSection
              listing={listing}
              financing={financing}
              onFinancingChange={updateFinancing}
            />

            {/* ── §03 Rental comps ───────────────────────────────────── */}
            <RentalCompsSection
              low={listing.rentLow}
              mid={listing.rentEstimate}
              high={listing.rentHigh}
              ask={listing.rentEstimate}
              compCount={listing.compCount}
              confidence={listing.compConfidence}
            />

            {/* ── §04 Cash to close ──────────────────────────────────── */}
            <CashToCloseSection
              price={listing.price}
              lttTotal={metrics.ltt.total}
              downPayment={metrics.downPayment}
              closingCostsTotal={metrics.closingCostsTotal}
              lttComponent={
                <LTTTable
                  ltt={metrics.ltt}
                  price={listing.price}
                  toronto={listing.isToronto || financing.isToronto}
                />
              }
            />

            {/* ── §05 OSFI stress test ───────────────────────────────── */}
            <section className="container tr-section" data-section="05">
              <SectionHead
                n="05"
                topic="OSFI stress test"
                question={
                  <>
                    Can you <em>qualify</em> at the stress-test rate?
                  </>
                }
                verdict={metrics.osfi.pass ? 'Passes GDS test' : 'Fails GDS test'}
                tone={metrics.osfi.pass ? 'pass' : 'fail'}
              />
              <OSFICard osfi={metrics.osfi} financing={financing} />
            </section>

            {/* ── §06 Risk flags ─────────────────────────────────────── */}
            <RiskFlagsSection listing={listing} />

            {/* ── §07 Equity build ───────────────────────────────────── */}
            <section className="container tr-section" data-section="07">
              <SectionHead
                n="07"
                topic="Equity build"
                question={
                  <>
                    How does your wealth grow over <em>20 years</em>?
                  </>
                }
              />
              <EquityChart
                equityCurve={metrics.equityCurve}
                totalCashInvested={metrics.totalCashInvested}
              />
            </section>

            {/* ── §08 Neighbourhood ──────────────────────────────────── */}
            <NeighbourhoodSection listing={listing} neighbourhood={neighbourhood} />

            {/* ── §09 SunScout ───────────────────────────────────────── */}
            <SunScoutPlaceholderSection />

            {/* ── §10 STR analysis ───────────────────────────────────── */}
            <STRPlaceholderSection listing={listing} />

            {/* ── §11 Due diligence ──────────────────────────────────── */}
            <DueDiligenceSection />
          </>
        )}
      </main>

      <Footer />
      <StickyActionBar onSave={() => undefined} onShare={() => undefined} onPDF={() => undefined} />
    </div>
  )
}
