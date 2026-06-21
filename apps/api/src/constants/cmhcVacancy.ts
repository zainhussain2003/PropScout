/**
 * CMHC vacancy rates by Census Metropolitan Area (CMA).
 *
 * Source: CMHC Rental Market Survey, published annually (typically Q1).
 * URL: https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables
 *
 * IMPORTANT — these are placeholder starting values keyed to indicative
 * ranges, not authoritative current data. Refresh against the latest CMHC
 * publication each year and commit. Falling back to the default 5% if a
 * city is missing is intentional — it's CLAUDE.md's stated default.
 */

/** Vacancy rate by lowercase city name. */
export const CMHC_VACANCY_RATES_BY_CITY: Record<string, number> = {
  // GTA — typically the tightest market in Canada
  toronto: 0.018,
  mississauga: 0.018,
  brampton: 0.02,
  vaughan: 0.018,
  markham: 0.018,
  oakville: 0.02,
  burlington: 0.02,
  'richmond hill': 0.018,

  // Other Ontario CMAs
  ottawa: 0.021,
  hamilton: 0.033,
  london: 0.018,
  kitchener: 0.021,
  waterloo: 0.021,
  cambridge: 0.021,
  windsor: 0.025,
  guelph: 0.018,
  barrie: 0.022,
  kingston: 0.021,
}

/** Used when a city isn't in the CMHC table — spec Section 6 default. */
export const DEFAULT_VACANCY_RATE = 0.05
