import { describe, it, expect } from 'vitest'
import { computeExitScenarios, sellingCosts } from './exitScenarios'
import { EXIT_COSTS, EXIT_SCENARIOS } from '../constants/thresholds'

// 5702 Buttermill: $729,900, 20% down, 4.79% / 25 yr, −$1,833/mo, $169,776 cash in.
const BUTTERMILL = {
  price: 729_900,
  principal: 583_920,
  mortgageRate: 0.0479,
  amortizationYears: 25,
  cashFlowMonthly: -1_833,
  totalCashInvested: 169_776,
  baseAppreciationRate: 0.03,
  holdYears: 10,
}

describe('sellingCosts', () => {
  it('is commission, HST on the commission, and the legal fee', () => {
    const c = sellingCosts(1_000_000)
    expect(c).toBeCloseTo(
      1_000_000 * EXIT_COSTS.COMMISSION_RATE * (1 + EXIT_COSTS.HST_RATE) + EXIT_COSTS.LEGAL_FEES,
      2
    )
  })
})

describe('computeExitScenarios (D-110)', () => {
  it('returns the four columns in order with their rates', () => {
    const s = computeExitScenarios(BUTTERMILL)
    expect(s.map((x) => x.key)).toEqual(['stress', 'flat', 'conservative', 'base'])
    expect(s.map((x) => x.appreciationRate)).toEqual([
      EXIT_SCENARIOS.STRESS,
      EXIT_SCENARIOS.FLAT,
      EXIT_SCENARIOS.CONSERVATIVE,
      0.03,
    ])
  })

  it('flat: sale at the purchase price, less costs and the balance owed, against cash in plus the shortfall', () => {
    const flat = computeExitScenarios(BUTTERMILL)[1]!
    expect(flat.salePrice).toBe(729_900)
    expect(flat.sellingCosts).toBeCloseTo(sellingCosts(729_900), 2)
    expect(flat.mortgageBalance).toBeGreaterThan(400_000)
    expect(flat.mortgageBalance).toBeLessThan(583_920)
    expect(flat.netProceeds).toBeCloseTo(
      flat.salePrice - flat.sellingCosts - flat.mortgageBalance,
      2
    )
    expect(flat.cumulativeContribution).toBe(1_833 * 12 * 10)
    expect(flat.cumulativeCashFlow).toBe(0)
    expect(flat.cashIn).toBe(169_776 + 1_833 * 12 * 10)
    expect(flat.profit).toBeCloseTo(flat.cashOut - flat.cashIn, 2)
    expect(flat.profit).toBeLessThan(0)
    expect(flat.annualizedReturn).toBeLessThan(0)
  })

  it('stress sells for less than flat, base for more; the ordering of profit follows', () => {
    const [stress, flat, cons, base] = computeExitScenarios(BUTTERMILL)
    expect(stress!.salePrice).toBeLessThan(flat!.salePrice)
    expect(flat!.salePrice).toBeLessThan(cons!.salePrice)
    expect(cons!.salePrice).toBeLessThan(base!.salePrice)
    expect(stress!.profit).toBeLessThan(flat!.profit)
    expect(base!.profit).toBeGreaterThan(cons!.profit)
  })

  it('positive cash flow accumulates into cash out, never nets against cash in', () => {
    const s = computeExitScenarios({ ...BUTTERMILL, cashFlowMonthly: 400 })[1]!
    expect(s.cumulativeCashFlow).toBe(400 * 12 * 10)
    expect(s.cumulativeContribution).toBe(0)
    expect(s.cashIn).toBe(169_776)
    expect(s.cashOut).toBeCloseTo(s.netProceeds + 48_000, 2)
  })

  it('owned outright: no mortgage left, cash in is the equity alone', () => {
    const s = computeExitScenarios({
      ...BUTTERMILL,
      principal: 0,
      totalCashInvested: 729_900,
      cashFlowMonthly: 500,
    })[1]!
    expect(s.mortgageBalance).toBe(0)
    expect(s.multiple).toBeGreaterThan(0.9)
    expect(s.annualizedReturn).not.toBeNull()
  })

  it('a hold past the amortization owes nothing', () => {
    const s = computeExitScenarios({ ...BUTTERMILL, holdYears: 30 })[3]!
    expect(s.mortgageBalance).toBe(0)
  })

  it('a wipe-out reads as −100% a year, not NaN, and nothing in returns null', () => {
    const wiped = computeExitScenarios({ ...BUTTERMILL, holdYears: 1, cashFlowMonthly: -1 })[0]!
    expect(Number.isFinite(wiped.annualizedReturn ?? 0)).toBe(true)
    const nothingIn = computeExitScenarios({
      ...BUTTERMILL,
      totalCashInvested: 0,
      cashFlowMonthly: 0,
    })[1]!
    expect(nothingIn.multiple).toBeNull()
    expect(nothingIn.annualizedReturn).toBeNull()
  })

  it('no price, no scenarios', () => {
    expect(computeExitScenarios({ ...BUTTERMILL, price: 0 })).toEqual([])
  })
})
