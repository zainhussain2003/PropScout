/**
 * investorCalc — client-side enrichment functions for the investor report.
 *
 * These functions compute the display-only extras that are NOT returned by the
 * Python calc engine API (equity curve, expense breakdown, LTT bracket table,
 * OSFI stress test). They are pure functions — no side effects, no API calls.
 *
 * The Python calc engine is the authoritative source for core investment metrics
 * (cap rate, cash flow, DSCR, etc.). These functions only compute:
 *   - Breakdowns already implied by the API response (LTT rows, expense line items)
 *   - Projections beyond the API response (equity curve)
 *   - Display data derived from the API response (deal score label/tagline/tone)
 */

import type {
  DealScore,
  DealVerdict,
  DealScoreData,
  LTTResult,
  LTTRow,
  OSFIResult,
  EquityDataPoint,
  ExpenseBreakdown,
  ComputedInvestorMetrics,
  InvestmentMetrics,
  FinancingInputs,
  ListingData,
} from '../types/analysis'
import { DEAL_SCORE } from '../constants/thresholds'

// ── Deal score display metadata ────────────────────────────────────────────────

const VERDICT_DISPLAY: Record<
  DealVerdict,
  { label: string; tagline: string; tone: 'pass' | 'caution' | 'fail' }
> = {
  strong_buy: {
    label: 'Strong deal',
    tagline: 'Proceed — fundamentals are solid.',
    tone: 'pass',
  },
  good_deal: {
    label: 'Good deal',
    tagline: 'Proceed with standard due diligence.',
    tone: 'pass',
  },
  caution: {
    label: 'Caution',
    tagline: 'Real issues — model the risks carefully.',
    tone: 'caution',
  },
  marginal: {
    label: 'Marginal',
    tagline: 'Significant headwinds — need a specific thesis.',
    tone: 'caution',
  },
  do_not_buy: {
    label: 'Do not buy',
    tagline: "Numbers don't pencil as a rental.",
    tone: 'fail',
  },
  hard_pass: {
    label: 'Hard pass',
    tagline: 'Fails on multiple fundamentals.',
    tone: 'fail',
  },
}

/**
 * Derive a verdict for a score that has NO backend verdict — demo/standalone
 * gauges only. Mirrors the calc engine's get_verdict brackets exactly
 * (DEAL_SCORE: ≥80 strong / ≥65 good / ≥50 caution / ≥35 marginal / ≥20 do
 * not buy / <20 hard pass).
 *
 * NEVER use this on the live /r/:token path: the backend verdict is the one
 * source of truth there. A frontend re-derivation once inflated a gated
 * grow-op property from 40 to ~90 by ignoring the severe-flag ceiling.
 */
export function verdictForScore(score: number): DealVerdict {
  if (score >= DEAL_SCORE.STRONG) return 'strong_buy'
  if (score >= DEAL_SCORE.GOOD) return 'good_deal'
  if (score >= DEAL_SCORE.CAUTION) return 'caution'
  if (score >= DEAL_SCORE.MARGINAL) return 'marginal'
  if (score >= DEAL_SCORE.DO_NOT_BUY) return 'do_not_buy'
  return 'hard_pass'
}

/** Display label for verdictForScore — same demo-only caveat applies. */
export function verdictLabelForScore(score: number): string {
  return VERDICT_DISPLAY[verdictForScore(score)].label
}

/**
 * Adds human-readable label, tagline, and tone to a core DealScore API object.
 */
export function toDealScoreData(score: DealScore): DealScoreData {
  const display = VERDICT_DISPLAY[score.verdict]
  return {
    total: score.total,
    displayTotal: score.displayTotal,
    verdict: score.verdict,
    label: display.label,
    tagline: display.tagline,
    tone: display.tone,
    breakdown: score.breakdown,
    deductions: score.breakdown.deduction,
  }
}

// ── Ontario LTT ────────────────────────────────────────────────────────────────

const ONTARIO_LTT_BRACKETS = [
  { upTo: 55000, rate: 0.005 },
  { upTo: 250000, rate: 0.01 },
  { upTo: 400000, rate: 0.015 },
  { upTo: 2000000, rate: 0.02 },
  { upTo: Infinity, rate: 0.025 },
] as const

/**
 * Computes Ontario LTT bracket table.
 * isToronto=true stacks a matching municipal LTT on top of provincial.
 */
export function computeLTT(price: number, isToronto: boolean): LTTResult {
  let remaining = price
  let prevCap = 0
  const rows: LTTRow[] = []
  let provincial = 0

  for (const bracket of ONTARIO_LTT_BRACKETS) {
    if (remaining <= 0) break
    const cap = bracket.upTo === Infinity ? price : Math.min(bracket.upTo, price)
    const span = cap - prevCap
    if (span > 0) {
      const ltt = span * bracket.rate
      rows.push({
        band:
          bracket.upTo === Infinity
            ? `$${prevCap.toLocaleString('en-CA')} – ∞`
            : `$${prevCap.toLocaleString('en-CA')} – $${bracket.upTo.toLocaleString('en-CA')}`,
        rate: bracket.rate,
        amount: span,
        ltt,
      })
      provincial += ltt
      remaining -= span
      prevCap = cap
    }
  }

  const municipal = isToronto ? provincial : 0
  return { rows, provincial, municipal, total: provincial + municipal }
}

// ── OSFI stress test ───────────────────────────────────────────────────────────

/**
 * Computes the OSFI B-20 mortgage stress test result.
 * Qualifying rate = max(contractRate + 2%, 5.25%).
 * GDS = (qualifying payment + monthly taxes + 50% condo fee) / monthly income.
 */
export function computeOSFI(
  price: number,
  downPaymentPct: number,
  mortgageRate: number,
  amortizationYears: number,
  annualTaxes: number,
  condoFeeMonthly: number,
  assumedIncome: number
): OSFIResult {
  const principal = price * (1 - downPaymentPct)
  const qualifyingRate = Math.max(mortgageRate + 0.02, 0.0525)
  const qualifyingPmt = computeMonthlyPayment(principal, qualifyingRate, amortizationYears)
  const monthlyTaxes = annualTaxes / 12
  const gds = (qualifyingPmt + monthlyTaxes + 0.5 * condoFeeMonthly) / (assumedIncome / 12)

  return {
    qualifyingRate,
    qualifyingPmt,
    gds,
    pass: gds <= 0.44,
    threshold: 0.44,
  }
}

// ── Monthly mortgage payment ───────────────────────────────────────────────────

/**
 * Standard amortisation — monthly payment for a fixed-rate mortgage.
 * Uses simple monthly compounding (consistent with the Python calc engine).
 */
export function computeMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number
): number {
  if (principal <= 0) return 0
  const r = annualRate / 12
  const n = years * 12
  if (r === 0) return principal / n
  return (principal * r) / (1 - Math.pow(1 + r, -n))
}

// ── Remaining mortgage balance ─────────────────────────────────────────────────

function remainingBalance(
  principal: number,
  annualRate: number,
  years: number,
  monthsElapsed: number
): number {
  const r = annualRate / 12
  const n = years * 12
  if (r === 0) return Math.max(0, principal - (principal / n) * monthsElapsed)
  const pmt = computeMonthlyPayment(principal, annualRate, years)
  return (
    principal * Math.pow(1 + r, monthsElapsed) - (pmt * (Math.pow(1 + r, monthsElapsed) - 1)) / r
  )
}

// ── Equity build curve ─────────────────────────────────────────────────────────

/**
 * Computes 21 equity data points (year 0 through year 20).
 * Appreciation compounds annually. Equity = appreciated value − mortgage remaining.
 */
export function computeEquityCurve(
  price: number,
  principal: number,
  mortgageRate: number,
  amortizationYears: number,
  appreciationRate: number,
  totalCashInvested: number
): EquityDataPoint[] {
  const curve: EquityDataPoint[] = []

  for (let year = 0; year <= 20; year++) {
    const months = year * 12
    const remaining =
      year === 0 ? principal : remainingBalance(principal, mortgageRate, amortizationYears, months)
    const propertyValue = price * Math.pow(1 + appreciationRate, year)
    const equity = Math.max(0, propertyValue - Math.max(0, remaining))
    const cashOnCash =
      year === 0 || totalCashInvested === 0
        ? 0
        : (equity - price * (1 - principal / price)) / totalCashInvested
    curve.push({
      year,
      equity,
      propertyValue,
      remaining: Math.max(0, remaining),
      cashOnCash,
    })
  }

  return curve
}

// ── Maintenance reserve rate ───────────────────────────────────────────────────

function maintenanceRate(yearBuilt: number): number {
  if (yearBuilt === 0) return 0.01 // 1.0% — unknown year, matches Python calc engine default
  if (yearBuilt >= 2010) return 0.005 // 0.5%
  if (yearBuilt >= 1980) return 0.01 // 1.0%
  return 0.015 // 1.5%
}

// ── Annual expense breakdown ───────────────────────────────────────────────────

/**
 * Reconstructs the annual operating expense breakdown from property data.
 * These individual line items are not returned by the API, so we re-derive them
 * from the same inputs the Python calc engine uses.
 */
export function computeExpenses(
  price: number,
  annualTaxes: number,
  condoFeeMonthly: number,
  annualGrossRent: number,
  yearBuilt: number,
  includeManagementFee: boolean
): ExpenseBreakdown {
  const insurance = price * 0.0035
  const maintenance = price * maintenanceRate(yearBuilt)
  const vacancy = annualGrossRent * 0.05
  const condo = condoFeeMonthly * 12
  const management = includeManagementFee ? annualGrossRent * 0.08 : 0
  const total = annualTaxes + insurance + maintenance + vacancy + condo + management

  return { taxes: annualTaxes, insurance, maintenance, vacancy, condo, management, total }
}

// ── Enrich API metrics ─────────────────────────────────────────────────────────

/**
 * Takes the core InvestmentMetrics from the API and enriches it with all the
 * display-only extras needed by the investor report sections.
 *
 * @param metrics   Core metrics from the Fastify API response
 * @param listing   The property listing data
 * @param financing The current financing inputs from the UI sliders
 */
export function enrichMetrics(
  metrics: InvestmentMetrics,
  listing: ListingData,
  financing: FinancingInputs
): ComputedInvestorMetrics {
  const grossRentAnnual = listing.rentEstimate * 12
  const principal = listing.price * (1 - financing.downPaymentPct)
  const totalCashInvested =
    metrics.downPayment + metrics.lttProvincial + metrics.lttMunicipal + metrics.closingCostsTotal

  const ltt = computeLTT(listing.price, financing.isToronto)
  const osfi = computeOSFI(
    listing.price,
    financing.downPaymentPct,
    financing.mortgageRate,
    financing.amortizationYears,
    listing.annualTaxes,
    listing.condoFeeMonthly,
    financing.assumedIncome
  )
  const equityCurve = computeEquityCurve(
    listing.price,
    principal,
    financing.mortgageRate,
    financing.amortizationYears,
    financing.appreciationRate,
    totalCashInvested
  )
  const expenses = computeExpenses(
    listing.price,
    listing.annualTaxes,
    listing.condoFeeMonthly,
    grossRentAnnual,
    listing.yearBuilt,
    financing.includeManagementFee
  )

  return {
    ...metrics,
    expenses,
    ltt,
    osfi,
    equityCurve,
    grossRentAnnual,
    totalCashInvested,
    principal,
  }
}

// ── Demo-mode local computation ────────────────────────────────────────────────

/**
 * Computes a complete InvestmentMetrics object locally — no API call.
 *
 * Used when the Fastify/calc-engine backend is not running (local dev / Chrome
 * UI testing). Pass the property's NOI-stable values (which don't change with
 * financing) plus the current slider state. All financing-dependent fields
 * (monthly payment, cash flow, DSCR, etc.) are recalculated from scratch.
 *
 * @param stable  NOI, cap rate, GRM, and closing costs — fixed for the property
 * @param listing Property listing data
 * @param financing Current slider state
 */
export function computeDemoMetrics(
  stable: {
    noi: number
    capRate: number
    grm: number
    closingCostsTotal: number
  },
  listing: ListingData,
  financing: FinancingInputs
): InvestmentMetrics {
  const { noi, capRate, grm, closingCostsTotal } = stable

  const downPayment = Math.round(listing.price * financing.downPaymentPct)
  const mortgageAmount = listing.price - downPayment
  const mortgagePaymentMonthly = Math.round(
    computeMonthlyPayment(mortgageAmount, financing.mortgageRate, financing.amortizationYears)
  )
  const annualMortgagePayments = mortgagePaymentMonthly * 12
  const cashFlowMonthly = Math.round(noi / 12 - mortgagePaymentMonthly)
  const cashFlowAnnual = cashFlowMonthly * 12
  const dscr = annualMortgagePayments > 0 ? noi / annualMortgagePayments : 0

  const lttResult = computeLTT(listing.price, financing.isToronto)
  const totalCashInvested =
    downPayment + lttResult.provincial + lttResult.municipal + closingCostsTotal
  const cashOnCashReturn = totalCashInvested > 0 ? cashFlowAnnual / totalCashInvested : 0

  // Break-even rent: (annual mortgage + annual operating expenses) / 12
  // Operating expenses = annualGrossRent − noi  (since NOI = grossRent − opex)
  const annualGrossRent = listing.rentEstimate * 12
  const operatingExpenses = Math.max(0, annualGrossRent - noi)
  const breakEvenRent = Math.round((annualMortgagePayments + operatingExpenses) / 12)

  return {
    cashFlowMonthly,
    cashFlowAnnual,
    capRate,
    cashOnCashReturn,
    dscr,
    grm,
    noi,
    mortgagePaymentMonthly,
    downPayment,
    mortgageAmount,
    amortizationYears: financing.amortizationYears,
    mortgageRate: financing.mortgageRate,
    breakEvenRent,
    closingCostsTotal,
    lttProvincial: lttResult.provincial,
    lttMunicipal: lttResult.municipal,
    hasSanityWarnings: false,
  }
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

/** Formats a number as a dollar amount, e.g. −$1,234. Non-finite values render as "—". */
export function fmtMoney(n: number, opts: { decimals?: number } = {}): string {
  if (!Number.isFinite(n)) return '—'
  const { decimals = 0 } = opts
  const abs = Math.abs(n)
  const s =
    '$' +
    abs.toLocaleString('en-CA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  return n < 0 ? `−${s}` : s
}

/** Formats a decimal as a percentage string, e.g. 0.045 → "4.50%". Non-finite values render as "—". */
export function fmtPct(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return '—'
  return (n * 100).toFixed(decimals) + '%'
}
