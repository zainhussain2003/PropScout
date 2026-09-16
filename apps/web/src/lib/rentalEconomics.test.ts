import { describe, it, expect } from 'vitest'
import { computeRentalEconomics } from './rentalEconomics'

// 5702 Buttermill at the engine's own figures — computed by
// calculations/investment.py::calculate_rental_economics on 2026-09-16:
//   mortgage 3,326.64 · break-even 5,138.76 · effective income 2,755.00 ·
//   cash flow −2,126.82 · gap 2,238.76 (D-112). If the engine changes, this
//   test is the client's tripwire.
const FIXED = 3326 / 12 + (729_900 * 0.0035) / 12 + 761 + (729_900 * 0.005) / 12

describe('computeRentalEconomics (D-112)', () => {
  it('reproduces the engine for the calibration property', () => {
    const e = computeRentalEconomics({
      rentMonthly: 2900,
      mortgagePaymentMonthly: 3326.64,
      fixedOperatingMonthly: FIXED,
      includeManagementFee: false,
    })
    expect(e.breakEvenAskingRent).toBeCloseTo(5138.76, 1)
    expect(e.effectiveRentalIncome).toBeCloseTo(2755, 1)
    expect(e.monthlyCashFlow).toBeCloseTo(-2126.82, 1)
    expect(e.askingRentGap).toBeCloseTo(2238.76, 1)
  })

  it('at the break-even ask the cash flow is zero, so the gap is not the shortfall', () => {
    const e = computeRentalEconomics({
      rentMonthly: 2900,
      mortgagePaymentMonthly: 3326.64,
      fixedOperatingMonthly: FIXED,
      includeManagementFee: false,
    })
    const atBreakEven = computeRentalEconomics({
      rentMonthly: e.breakEvenAskingRent,
      mortgagePaymentMonthly: 3326.64,
      fixedOperatingMonthly: FIXED,
      includeManagementFee: false,
    })
    expect(atBreakEven.monthlyCashFlow).toBeCloseTo(0, 6)
    expect(-e.monthlyCashFlow).toBeCloseTo(e.askingRentGap * 0.95, 6)
  })

  it('management is proportional to rent and lifts the break-even ask', () => {
    const off = computeRentalEconomics({
      rentMonthly: 2900,
      mortgagePaymentMonthly: 0,
      fixedOperatingMonthly: 1000,
      includeManagementFee: false,
    })
    const on = computeRentalEconomics({
      rentMonthly: 2900,
      mortgagePaymentMonthly: 0,
      fixedOperatingMonthly: 1000,
      includeManagementFee: true,
    })
    expect(on.breakEvenAskingRent).toBeGreaterThan(off.breakEvenAskingRent)
    expect(on.breakEvenAskingRent).toBeCloseTo(1000 / (1 - 0.05 - 0.08), 6)
  })
})
