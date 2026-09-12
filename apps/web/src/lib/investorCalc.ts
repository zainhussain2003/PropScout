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
  HoldCaseRow,
  ExpenseBreakdown,
  ComputedInvestorMetrics,
  InvestmentMetrics,
  FinancingInputs,
  ListingData,
} from '../types/analysis'
import { DEAL_SCORE } from '../constants/thresholds'
import { PROPERTY_COST_ESTIMATES } from '../constants/defaults'

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

const TORONTO_MLTT_BRACKETS = [
  { upTo: 55000, rate: 0.005 },
  { upTo: 400000, rate: 0.01 },
  { upTo: 2000000, rate: 0.02 },
  { upTo: Infinity, rate: 0.025 },
] as const

function taxForBrackets(
  price: number,
  brackets: ReadonlyArray<{ upTo: number; rate: number }>
): number {
  let tax = 0
  let previous = 0
  for (const bracket of brackets) {
    const taxable = Math.min(price, bracket.upTo) - previous
    if (taxable <= 0) break
    tax += taxable * bracket.rate
    previous = bracket.upTo
    if (price <= bracket.upTo) break
  }
  return tax
}

/**
 * Computes Ontario LTT bracket table.
 * isToronto=true adds Toronto's separate municipal bracket schedule.
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

  const municipal = isToronto ? taxForBrackets(price, TORONTO_MLTT_BRACKETS) : 0
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
/**
 * Nominal annual Canadian mortgage rate to its monthly equivalent.
 *
 * The Interest Act requires semi-annual compounding for Canadian fixed-rate
 * mortgages, so the monthly equivalent is the sixth root of the semi-annual
 * factor — NOT the annual rate divided by twelve. Dividing by twelve is the US
 * convention and overstates the payment: on $583,920 at 4.79% over 25 years it
 * gives $3,342.48/mo against the correct $3,326.64, which is $190 a year and
 * $4,751 over the amortization.
 *
 * Mirrors `_monthly_rate` in services/calc-engine/calculations/mortgage.py.
 * The two implementations must agree; `investorCalc.test.ts` pins this one
 * against the calc engine's known values.
 */
function monthlyRate(annualRate: number): number {
  if (annualRate === 0) return 0
  return Math.pow(1 + annualRate / 2, 1 / 6) - 1
}

export function computeMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number
): number {
  if (principal <= 0) return 0
  const r = monthlyRate(annualRate)
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
  const r = monthlyRate(annualRate)
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
  const insurance = price * PROPERTY_COST_ESTIMATES.INSURANCE_RATE_ANNUAL
  const maintenance = price * maintenanceRate(yearBuilt)
  const vacancy = annualGrossRent * PROPERTY_COST_ESTIMATES.VACANCY_ALLOWANCE
  const condo = condoFeeMonthly * 12
  const management = includeManagementFee
    ? annualGrossRent * PROPERTY_COST_ESTIMATES.MANAGEMENT_FEE
    : 0
  const total = annualTaxes + insurance + maintenance + vacancy + condo + management

  return { taxes: annualTaxes, insurance, maintenance, vacancy, condo, management, total }
}

// ── Break-even appreciation ────────────────────────────────────────────────────

/**
 * Minimum annual price growth needed to return the cash a hold consumes, at
 * 5/10/20 years. Mirrors `services/calc-engine/calculations/hold_case.py`.
 *
 * Recomputed here rather than taken from the API because it depends on every
 * financing slider — down payment, rate, amortization and the resulting cash
 * flow. A figure held at the submitted financing while the numbers beside it
 * moved would describe a different scenario from the rest of the page.
 *
 * SELLING COSTS ARE EXCLUDED, so every result is a floor: realtor commission is
 * negotiated rather than published in Ontario, so the model stops at the
 * mortgage discharge and the report says "at least". See D-062.
 *
 * Two implementations of one calculation is the drift risk D-054 and D-055
 * record; `investorCalc.test.ts` pins this against the calc engine's regression
 * values so they cannot diverge silently.
 */
export function computeBreakEvenAppreciation(
  price: number,
  principal: number,
  mortgageRate: number,
  amortizationYears: number,
  monthlyCashFlow: number,
  totalCashInvested: number,
  snapshotYears: readonly number[] = [5, 10, 20]
): HoldCaseRow[] {
  if (price <= 0) return []

  // Only a shortfall is money the buyer has to find. A surplus is deliberately
  // not credited back — that would let strong rent flatter the required rate.
  const monthlyContribution = monthlyCashFlow < 0 ? -monthlyCashFlow : 0

  return snapshotYears.map((year) => {
    const balance =
      year >= amortizationYears
        ? 0
        : Math.max(0, remainingBalance(principal, mortgageRate, amortizationYears, year * 12))

    const cumulativeContribution = monthlyContribution * 12 * year
    const totalCashIn = totalCashInvested + cumulativeContribution
    const breakEvenSalePrice = totalCashIn + balance

    return {
      year,
      cashInvested: totalCashInvested,
      cumulativeContribution,
      totalCashIn,
      mortgageBalance: balance,
      principalRepaid: principal - balance,
      breakEvenSalePrice,
      breakEvenAnnualRate: Math.pow(breakEvenSalePrice / price, 1 / year) - 1,
    }
  })
}

// ── Enrich API metrics ─────────────────────────────────────────────────────────

/**
 * Re-state the engine's NOI for the management toggle the user is looking at.
 *
 * The expense table is recomputed in the browser from the live toggle, while
 * NOI comes from the backend and reflects whatever state the analysis was run
 * with. When those disagree the page shows an expense total that cannot be
 * reconciled with the NOI beside it — audit R-01, a $2,160 contradiction on a
 * $27,000 gross rent, and the arithmetic the product is selling.
 *
 * Adjusting by exactly the fee is deliberate: NOI is not re-derived here, so
 * the engine stays the only place the full NOI formula lives. Only the one
 * term that changed is added or removed.
 */
export function noiForManagementState(
  apiNoi: number,
  annualGrossRent: number,
  usedByEngine: boolean,
  wantedByUser: boolean
): number {
  if (usedByEngine === wantedByUser) return apiNoi
  const fee = annualGrossRent * PROPERTY_COST_ESTIMATES.MANAGEMENT_FEE
  // Engine excluded it and the user wants it → NOI falls by the fee.
  return wantedByUser ? apiNoi - fee : apiNoi + fee
}

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
  // API closingCostsTotal already includes provincial and municipal LTT.
  const totalCashInvested = metrics.downPayment + metrics.closingCostsTotal

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
  const holdCase = computeBreakEvenAppreciation(
    listing.price,
    principal,
    financing.mortgageRate,
    financing.amortizationYears,
    metrics.cashFlowMonthly,
    totalCashInvested
  )

  return {
    ...metrics,
    expenses,
    ltt,
    osfi,
    equityCurve,
    holdCase,
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
    closingCostsTotal: closingCostsTotal + lttResult.provincial + lttResult.municipal,
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
