/** Default personal-report cash outflow, matching its itemised cost model.
 * Investment operating expenses use a different model and cannot stand in for this total.
 */
export function personalMaintenanceRate(yearBuilt: number | null): number {
  return yearBuilt != null && yearBuilt >= 2010
    ? 0.005
    : yearBuilt != null && yearBuilt >= 1980
      ? 0.01
      : 0.015
}

export function personalOwnershipCost(input: {
  price: number
  mortgageMonthly: number
  annualTaxes: number
  condoFeeMonthly: number
  sqft: number | null
  yearBuilt: number | null
}): number {
  const sqft = input.sqft != null && input.sqft > 0 ? input.sqft : 800
  const maintenanceRate = personalMaintenanceRate(input.yearBuilt)
  return (
    input.mortgageMonthly +
    input.annualTaxes / 12 +
    input.condoFeeMonthly +
    Math.round((input.price * 0.0035) / 12) +
    Math.round(sqft * 0.08) +
    Math.round(sqft * 0.06) +
    60 +
    65 +
    (input.price * maintenanceRate) / 12
  )
}
