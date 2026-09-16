/**
 * Rental economics — the client's one copy of the engine's identity (D-112).
 *
 * The engine (`calculations/investment.py::calculate_rental_economics`) is
 * the source of truth. The sliders need the same figures instantly, so this
 * module is the only place on the client that states the formula; every
 * live recompute goes through it, and `rentalEconomics.test.ts` pins it to
 * the engine's own numbers for the calibration property so the two cannot
 * drift silently.
 *
 *   break-even asking rent   = fixed costs / (1 − v − m)
 *   effective rental income  = rent × (1 − v)
 *   monthly cash flow        = rent × (1 − v − m) − fixed costs
 *   asking-rent gap          = break-even asking rent − rent
 *
 * where v is the vacancy allowance, m the management fee (0 when off), and
 * fixed costs are mortgage + tax + insurance + condo fee + maintenance per
 * month. The gap is how far the ASK is from break-even; the monthly
 * shortfall is −cash flow, which is the gap after vacancy.
 */

import { PROPERTY_COST_ESTIMATES } from '../constants/defaults'

export interface RentalEconomicsInput {
  /** Monthly rent at full occupancy. */
  rentMonthly: number
  mortgagePaymentMonthly: number
  /** Taxes + insurance + condo fee + maintenance reserve, per month. */
  fixedOperatingMonthly: number
  includeManagementFee: boolean
}

export interface RentalEconomics {
  breakEvenAskingRent: number
  effectiveRentalIncome: number
  monthlyCashFlow: number
  askingRentGap: number
}

export function computeRentalEconomics(input: RentalEconomicsInput): RentalEconomics {
  const v = PROPERTY_COST_ESTIMATES.VACANCY_ALLOWANCE
  const m = input.includeManagementFee ? PROPERTY_COST_ESTIMATES.MANAGEMENT_FEE : 0
  const netFactor = 1 - v - m
  const fixed = input.mortgagePaymentMonthly + input.fixedOperatingMonthly
  const breakEvenAskingRent = netFactor > 0 ? fixed / netFactor : Number.POSITIVE_INFINITY
  return {
    breakEvenAskingRent,
    effectiveRentalIncome: input.rentMonthly * (1 - v),
    monthlyCashFlow: input.rentMonthly * netFactor - fixed,
    askingRentGap: breakEvenAskingRent - input.rentMonthly,
  }
}
