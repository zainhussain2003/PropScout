/**
 * CMHC vacancy rate data service.
 *
 * CMHC publishes Rental Market Survey data annually (December, for the
 * October survey). There's no live API — the table in
 * `constants/cmhcVacancy.ts` is refreshed each year against the publication
 * and carries the survey date the ledger cites (D-106).
 *
 * Used by the orchestrator to feed a city-accurate vacancy rate into the
 * calc engine's demand score and the narrative input.
 */

import {
  CMHC_VACANCY_RATES_BY_CITY,
  CMHC_VACANCY_SURVEY,
  DEFAULT_VACANCY_RATE,
} from '../constants/cmhcVacancy'

/**
 * The table key for a listing's city: lowercase, trimmed, with a scraped
 * neighbourhood suffix such as "Toronto (Yonge-Eglinton)" removed — the same
 * rule the property-tax table applies.
 */
function municipalityKey(city: string | null | undefined): string | null {
  if (!city) return null
  const key = city
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
  return key.length > 0 ? key : null
}

/** Whether the city has its own row in the CMHC table (else the Ontario aggregate applies). */
export function hasVacancyRateForCity(city: string | null | undefined): boolean {
  const key = municipalityKey(city)
  return key != null && CMHC_VACANCY_RATES_BY_CITY[key] != null
}

/**
 * Look up the vacancy rate for a given city. Case-insensitive.
 * Falls back to the published Ontario aggregate when the city isn't in the table.
 */
export function getVacancyRateByCity(city: string | null | undefined): number {
  const key = municipalityKey(city)
  return (key != null ? CMHC_VACANCY_RATES_BY_CITY[key] : undefined) ?? DEFAULT_VACANCY_RATE
}

/** The survey every rate comes from — for the report's Sources ledger. */
export function getVacancySurvey(): typeof CMHC_VACANCY_SURVEY {
  return CMHC_VACANCY_SURVEY
}

/**
 * @deprecated kept for backward compatibility with the original stub signature.
 * Prefer getVacancyRateByCity — postal code → city mapping is not in scope.
 */
export async function getVacancyRate(_postalCode: string): Promise<number> {
  return DEFAULT_VACANCY_RATE
}
