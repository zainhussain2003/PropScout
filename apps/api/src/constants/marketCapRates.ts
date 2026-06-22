/**
 * Market cap rates + residual expense ratios for estimating a property's value
 * from its rent when a for-rent listing has no sale price.
 *
 * Locked formula (see NIGHT_NOTES product-design pass):
 *
 *   residual expenses = annualGrossRent × residualExpenseRatio
 *       where residualExpenseRatio covers ONLY vacancy + management +
 *       maintenance + insurance — it explicitly EXCLUDES property tax and
 *       condo fee, which are subtracted from ACTUAL figures when present so
 *       they are never double-counted.
 *
 *   NOI = annualGrossRent − residualExpenses − actualAnnualTax − actualCondoFee×12
 *   estimatedValue = NOI / marketCapRate
 *
 * IMPORTANT — every number here is an UNSOURCED placeholder (see NIGHT_NOTES
 * "Unsourced / assumed values"). Cap rates trend lower in tight, expensive
 * markets (Toronto) and higher in cheaper ones (Windsor); residual ratios are
 * lower for condos (building maintenance sits in the condo fee, handled as an
 * actual) and higher for freehold. Validate against a published Ontario
 * cap-rate survey and a documented residential OER benchmark before trusting.
 */

import type { PropertyType } from '../types/property'

/** Gross cap rate by lowercase city name. Lower = tighter/pricier market. */
export const MARKET_CAP_RATES_BY_CITY: Record<string, number> = {
  // GTA — lowest cap rates (highest prices relative to rent)
  toronto: 0.038,
  mississauga: 0.04,
  vaughan: 0.04,
  markham: 0.04,
  'richmond hill': 0.04,
  brampton: 0.042,
  oakville: 0.04,
  burlington: 0.042,

  // Other Ontario markets — higher cap rates
  ottawa: 0.045,
  hamilton: 0.05,
  london: 0.052,
  kitchener: 0.048,
  waterloo: 0.048,
  cambridge: 0.05,
  guelph: 0.048,
  barrie: 0.05,
  kingston: 0.05,
  windsor: 0.058,
}

/** Used when a city isn't in the table — a mid-market Ontario assumption. */
export const DEFAULT_CAP_RATE = 0.05

/**
 * Residual operating-expense ratio as a fraction of gross rent, by property
 * type. Covers vacancy + management + maintenance + insurance ONLY — NOT tax,
 * NOT condo fee (those are always taken from actuals). Condos are lowest
 * because building maintenance lives in the (separately-subtracted) fee.
 */
export const RESIDUAL_EXPENSE_RATIO_BY_TYPE: Record<PropertyType, number> = {
  condo: 0.18,
  townhouse: 0.22,
  'semi-detached': 0.24,
  detached: 0.25,
  multiplex: 0.28,
  commercial: 0.3,
}

/** Used when the property type is unknown. */
export const DEFAULT_RESIDUAL_EXPENSE_RATIO = 0.24

/** Cap rate for a city, falling back to the mid-market default. */
export function getCapRateByCity(city: string | null | undefined): number {
  if (!city) return DEFAULT_CAP_RATE
  return MARKET_CAP_RATES_BY_CITY[city.trim().toLowerCase()] ?? DEFAULT_CAP_RATE
}

interface ValueFromRentInput {
  rentMonthly: number
  city: string | null | undefined
  propertyType: PropertyType
  /** Actual annual property tax from the listing, or null when not stated. */
  annualTaxes: number | null
  /** Actual monthly condo fee from the listing, or null when not stated. */
  condoFeeMonthly: number | null
}

/**
 * Estimate a property's value from its monthly rent, for for-rent listings that
 * carry no sale price. Uses the locked residual-ratio formula so actual tax and
 * condo fee (when present) are never double-counted against the residual ratio.
 *
 * Known limitation: when a for-rent listing has no stated tax, that line is
 * simply absent (the residual ratio excludes it), which slightly overvalues —
 * accepted and tracked, not hidden.
 *
 * @returns Estimated value in dollars, floored at 0.
 */
export function estimateValueFromRent(input: ValueFromRentInput): number {
  const capRate = getCapRateByCity(input.city)
  const residualRatio =
    RESIDUAL_EXPENSE_RATIO_BY_TYPE[input.propertyType] ?? DEFAULT_RESIDUAL_EXPENSE_RATIO

  const annualGrossRent = input.rentMonthly * 12
  const residualExpenses = annualGrossRent * residualRatio
  const actualAnnualTax = input.annualTaxes ?? 0
  const actualAnnualCondoFee = (input.condoFeeMonthly ?? 0) * 12

  const noi = annualGrossRent - residualExpenses - actualAnnualTax - actualAnnualCondoFee
  return Math.max(0, Math.round(noi / capRate))
}
