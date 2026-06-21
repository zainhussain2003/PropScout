/**
 * Ontario municipal property tax rates by city (effective rate on assessed
 * value). Used when the scraper can't find the actual annual_taxes label on
 * a listing — we estimate from price × rate so cash flow / cap rate aren't
 * computed assuming $0 in taxes.
 *
 * Source: most recent municipal budgets (2024–2025 cycle). Refresh annually
 * — the difference between cities is significant (Toronto 0.61% vs Windsor
 * 1.78%) so getting the city right matters more than the exact decimal.
 *
 * The "assessed value" the municipality uses is typically lower than market
 * value (last MPAC reassessment was 2016), so applying these to market price
 * actually OVERSTATES the tax slightly — which is the conservative direction
 * for an investment decision.
 */

export const ONTARIO_PROPERTY_TAX_RATES: Record<string, number> = {
  // GTA
  toronto: 0.00715,
  mississauga: 0.00936,
  brampton: 0.01275,
  vaughan: 0.0067,
  markham: 0.0064,
  oakville: 0.00763,
  burlington: 0.0081,
  'richmond hill': 0.00684,
  pickering: 0.0117,
  ajax: 0.0123,
  whitby: 0.0125,
  oshawa: 0.0136,

  // Other Ontario CMAs
  ottawa: 0.0106,
  hamilton: 0.0135,
  london: 0.0142,
  kitchener: 0.0117,
  waterloo: 0.0118,
  cambridge: 0.012,
  windsor: 0.0178,
  guelph: 0.0123,
  barrie: 0.0117,
  kingston: 0.0122,
}

/**
 * Used when a city isn't in the table — Ontario CMA average ≈ 1.1%.
 * Conservative bias since the GTA cities are below 1% and have the most
 * listings; the average pulls higher because of cheaper inland cities.
 */
export const DEFAULT_PROPERTY_TAX_RATE = 0.011

/**
 * Estimate annual property tax from price + city, using the table above.
 * Returns 0 when price is null/zero (no basis to estimate).
 */
export function estimateAnnualTaxes(price: number | null, city: string | null | undefined): number {
  if (!price || price <= 0) return 0
  const rate = city
    ? (ONTARIO_PROPERTY_TAX_RATES[city.trim().toLowerCase()] ?? DEFAULT_PROPERTY_TAX_RATE)
    : DEFAULT_PROPERTY_TAX_RATE
  return Math.round(price * rate)
}
