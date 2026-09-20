/**
 * Exit scenarios (D-110): what a sale returns under a soft, flat, modest and
 * base appreciation path, after the cost of selling and the mortgage still
 * owed, against the cash actually put in over the hold.
 *
 * Pure: takes the same inputs the equity curve and the break-even card use,
 * so the three always describe one financing scenario. Before tax — capital
 * gains depend on the seller's marginal rate, which the report does not ask
 * for, and the card says so.
 *
 * Cash convention, shared with the break-even appreciation card (D-062):
 * only a shortfall is money the holder has to find. Negative monthly cash
 * flow accumulates into cash in; positive cash flow accumulates into cash
 * out. Nothing is netted across the two.
 */

import { EXIT_COSTS, EXIT_SCENARIOS } from '../constants/thresholds'
import { remainingBalance } from './investorCalc'
import { irr } from './irr'

export interface ExitScenarioInput {
  price: number
  /** Mortgage principal at the start of the hold. */
  principal: number
  mortgageRate: number
  amortizationYears: number
  cashFlowMonthly: number
  /** Down payment plus closing costs — or the equity alone when owned (D-108). */
  totalCashInvested: number
  /** The slider's appreciation rate — the "Base" column. */
  baseAppreciationRate: number
  holdYears: number
}

export interface ExitScenario {
  key: 'stress' | 'flat' | 'conservative' | 'base'
  label: string
  appreciationRate: number
  salePrice: number
  sellingCosts: number
  mortgageBalance: number
  /** Sale price less selling costs and the mortgage paid off. */
  netProceeds: number
  /** Positive cash flow over the hold (0 when the hold ran a shortfall). */
  cumulativeCashFlow: number
  /** Shortfall funded over the hold (0 when cash flow was positive). */
  cumulativeContribution: number
  /** totalCashInvested + cumulativeContribution. */
  cashIn: number
  /** netProceeds + cumulativeCashFlow. */
  cashOut: number
  profit: number
  /** cashOut / cashIn; null when nothing was put in. */
  multiple: number | null
  /** Simple annualized return on cashIn over the hold; null when nothing was put in. */
  annualizedReturn: number | null
  /**
   * Internal rate of return on the dated stream (D-123): the cash invested at
   * closing, each year's cash flow when it happens, the net proceeds at the
   * sale. Null when nothing was put in; −1 on a total loss.
   */
  irr: number | null
  /** The stream the IRR was solved on: outlay, then one entry per year of the hold. */
  cashFlows: number[]
}

/** The cost of selling at a given price: commission, HST on it, legal. */
export function sellingCosts(salePrice: number): number {
  const commission = salePrice * EXIT_COSTS.COMMISSION_RATE
  return commission * (1 + EXIT_COSTS.HST_RATE) + EXIT_COSTS.LEGAL_FEES
}

function scenario(
  key: ExitScenario['key'],
  label: string,
  appreciationRate: number,
  input: ExitScenarioInput
): ExitScenario {
  const years = Math.max(1, Math.round(input.holdYears))
  const salePrice = input.price * Math.pow(1 + appreciationRate, years)
  const costs = sellingCosts(salePrice)
  const mortgageBalance =
    input.principal <= 0 || years >= input.amortizationYears
      ? 0
      : Math.max(
          0,
          remainingBalance(input.principal, input.mortgageRate, input.amortizationYears, years * 12)
        )
  const netProceeds = salePrice - costs - mortgageBalance
  const annualCashFlow = input.cashFlowMonthly * 12
  const cumulativeCashFlow = annualCashFlow > 0 ? annualCashFlow * years : 0
  const cumulativeContribution = annualCashFlow < 0 ? -annualCashFlow * years : 0
  const cashIn = input.totalCashInvested + cumulativeContribution
  const cashOut = netProceeds + cumulativeCashFlow
  const profit = cashOut - cashIn
  const multiple = cashIn > 0 ? cashOut / cashIn : null
  const annualizedReturn =
    cashIn > 0 && cashOut > 0 ? Math.pow(cashOut / cashIn, 1 / years) - 1 : cashIn > 0 ? -1 : null
  // The dated stream: the outlay at closing, each year's cash flow as it
  // happens (a shortfall is a further outlay that year), the sale at the end.
  const cashFlows = [-input.totalCashInvested]
  for (let y = 1; y <= years; y += 1) {
    cashFlows.push(annualCashFlow + (y === years ? netProceeds : 0))
  }
  const rate = input.totalCashInvested > 0 ? irr(cashFlows) : null
  return {
    key,
    label,
    appreciationRate,
    salePrice,
    sellingCosts: costs,
    mortgageBalance,
    netProceeds,
    cumulativeCashFlow,
    cumulativeContribution,
    cashIn,
    cashOut,
    profit,
    multiple,
    annualizedReturn,
    irr: rate,
    cashFlows,
  }
}

/** Four columns: stress, flat, conservative, and the slider's own rate. */
export function computeExitScenarios(input: ExitScenarioInput): ExitScenario[] {
  if (input.price <= 0) return []
  return [
    scenario('stress', 'Stress', EXIT_SCENARIOS.STRESS, input),
    scenario('flat', 'Flat', EXIT_SCENARIOS.FLAT, input),
    scenario('conservative', 'Conservative', EXIT_SCENARIOS.CONSERVATIVE, input),
    scenario('base', 'Base', input.baseAppreciationRate, input),
  ]
}
