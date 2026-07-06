/**
 * testHelpers — shared fixtures and render utilities for PR4 investor report tests.
 *
 * Exports:
 *   mockVaughanAnalysis    — API Analysis object for 5702 Buttermill Ave (bad deal)
 *   mockHamiltonAnalysis   — API Analysis object for 146 East 19th St (good deal)
 *   mockFinancingInputs    — default FinancingInputs matching DEFAULT_FINANCING_INPUTS
 *   mockVaughanEquityCurve — 21-point equity curve for Vaughan at default financing
 *   renderWithRouter       — wraps RTL render in MemoryRouter for routed components
 *
 * Calibration values below come from the spec regression fixtures.
 * Do NOT change the expected numeric values — they are used in regression tests.
 */

import { render } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type {
  Analysis,
  FinancingInputs,
  EquityDataPoint,
  DealScoreBreakdown,
} from '../../apps/web/src/types/analysis'
import { computeEquityCurve } from '../../apps/web/src/lib/investorCalc'

// ── Known calibration constants ────────────────────────────────────────────────

/** Vaughan (5702 Buttermill Ave) — bad deal calibration property */
const VAUGHAN_PRICE = 729900
const VAUGHAN_DOWN_PAYMENT = 145980 // price × 0.20
const VAUGHAN_PRINCIPAL = 583920 // price × 0.80
const VAUGHAN_LTT_PROVINCIAL = 11073 // computeLTT(729900, false).provincial
const VAUGHAN_CLOSING_COSTS = 3000

/** Hamilton (146 East 19th St) — good deal calibration property */
const HAMILTON_DOWN_PAYMENT = 89800 // 449000 × 0.20
const HAMILTON_PRINCIPAL = 359200 // 449000 × 0.80
// LTT for $449,000: 275 + 1950 + 2250 + 980 = $5,455
// Brackets: 0-55k@0.5% + 55k-250k@1% + 250k-400k@1.5% + 400k-449k@2%
const HAMILTON_LTT_PROVINCIAL = 5455 // computeLTT(449000, false).provincial

// ── Default financing ──────────────────────────────────────────────────────────

/** Matches DEFAULT_FINANCING_INPUTS from constants/demoData.ts exactly. */
export const mockFinancingInputs: FinancingInputs = {
  downPaymentPct: 0.2,
  mortgageRate: 0.0479,
  amortizationYears: 25,
  includeManagementFee: false,
  isToronto: false,
  appreciationRate: 0.03,
  assumedIncome: 125000,
}

// ── Deal score breakdown helpers ───────────────────────────────────────────────

const VAUGHAN_BREAKDOWN: DealScoreBreakdown = {
  capRate: 0,
  cashFlow: 0,
  cashOnCash: 0,
  dscr: 0,
  demand: 3,
  subtotal: 3,
  deduction: 6,
  componentMaxes: {
    capRate: 25,
    cashFlow: 25,
    cashOnCash: 20,
    dscr: 15,
    demand: 10,
  },
}

const HAMILTON_BREAKDOWN: DealScoreBreakdown = {
  capRate: 22,
  cashFlow: 20,
  cashOnCash: 16,
  dscr: 12,
  demand: 7,
  subtotal: 77,
  deduction: 5,
  componentMaxes: {
    capRate: 25,
    cashFlow: 25,
    cashOnCash: 20,
    dscr: 15,
    demand: 10,
  },
}

// ── Mock Analysis objects ──────────────────────────────────────────────────────

/**
 * Vaughan condo — hard_pass, score 8.
 * Deeply negative cash flow, DSCR 0.44, cap rate 1.47%.
 */
export const mockVaughanAnalysis: Analysis = {
  id: 'vaughan-001',
  token: 'test-token-vaughan',
  mode: 'investor',
  createdAt: '2026-05-28T00:00:00Z',
  metrics: {
    cashFlowMonthly: -2431,
    cashFlowAnnual: -29172,
    capRate: 0.0147,
    cashOnCashReturn: -0.042,
    dscr: 0.44,
    grm: 20.97,
    noi: 10730,
    mortgagePaymentMonthly: 3327,
    downPayment: VAUGHAN_DOWN_PAYMENT,
    mortgageAmount: VAUGHAN_PRINCIPAL,
    amortizationYears: 25,
    mortgageRate: 0.0479,
    breakEvenRent: 4585,
    closingCostsTotal: VAUGHAN_CLOSING_COSTS,
    lttProvincial: VAUGHAN_LTT_PROVINCIAL,
    lttMunicipal: 0,
    hasSanityWarnings: false,
  },
  dealScore: {
    total: 8,
    displayTotal: 8,
    verdict: 'hard_pass',
    breakdown: VAUGHAN_BREAKDOWN,
  },
  rentalComps: {
    low: 2700,
    mid: 2900,
    high: 3200,
    compCount: 8,
    confidence: 'medium',
    postalCode: 'L4K',
  },
  riskFlags: [
    {
      id: 'condo_fee',
      severity: 'red',
      label: 'Condo-fee burden',
      evidence: '$761/mo · 26% of estimated gross rent (threshold 20%)',
      confidence: 95,
    },
    {
      id: 'cash_flow',
      severity: 'red',
      label: 'Deeply negative cash flow',
      evidence: 'Break-even rent $4,585 vs. market $2,900',
      confidence: 100,
    },
  ],
  narrative:
    'This property does not pencil as a rental investment at the current asking price. ' +
    'Deeply negative cash flow and a DSCR of 0.44× place it firmly outside investable parameters.',
  hasSanityWarnings: false,
}

/**
 * Hamilton duplex — good_deal, score 72.
 * Positive cash flow $324/mo, DSCR 1.16, cap rate 5.6%.
 */
export const mockHamiltonAnalysis: Analysis = {
  id: 'hamilton-001',
  token: 'test-token-hamilton',
  mode: 'investor',
  createdAt: '2026-05-28T00:00:00Z',
  metrics: {
    cashFlowMonthly: 324,
    cashFlowAnnual: 3888,
    capRate: 0.056,
    cashOnCashReturn: 0.038,
    dscr: 1.16,
    grm: 10.4,
    noi: 25144,
    mortgagePaymentMonthly: 1954,
    downPayment: HAMILTON_DOWN_PAYMENT,
    mortgageAmount: HAMILTON_PRINCIPAL,
    amortizationYears: 25,
    mortgageRate: 0.0479,
    breakEvenRent: 2876,
    closingCostsTotal: 3000,
    lttProvincial: HAMILTON_LTT_PROVINCIAL,
    lttMunicipal: 0,
    hasSanityWarnings: false,
  },
  dealScore: {
    total: 72,
    displayTotal: 76,
    verdict: 'good_deal',
    breakdown: HAMILTON_BREAKDOWN,
  },
  rentalComps: {
    low: 3400,
    mid: 3600,
    high: 3800,
    compCount: 12,
    confidence: 'high',
    postalCode: 'L8V',
  },
  riskFlags: [],
  narrative:
    'Hamilton duplex at $449,000 offers strong fundamentals. ' +
    'Positive cash flow of $324/mo with a DSCR of 1.16× meets investment-grade thresholds.',
  hasSanityWarnings: false,
}

// ── Equity curve ───────────────────────────────────────────────────────────────

/**
 * 21-point equity curve for the Vaughan condo at default financing inputs.
 * Year 0–20 with 3% annual appreciation.
 */
export const mockVaughanEquityCurve: EquityDataPoint[] = computeEquityCurve(
  VAUGHAN_PRICE,
  VAUGHAN_PRINCIPAL,
  mockFinancingInputs.mortgageRate,
  mockFinancingInputs.amortizationYears,
  mockFinancingInputs.appreciationRate,
  VAUGHAN_DOWN_PAYMENT + VAUGHAN_LTT_PROVINCIAL + VAUGHAN_CLOSING_COSTS
)

// ── Render utilities ───────────────────────────────────────────────────────────

/**
 * Renders a component inside a MemoryRouter.
 * Required for any component that contains <Link>, <NavLink>, or calls useNavigate.
 */
export function renderWithRouter(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: MemoryRouter })
}
