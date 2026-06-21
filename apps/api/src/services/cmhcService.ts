/**
 * CMHC vacancy rate data service.
 *
 * CMHC publishes Rental Market Survey data annually (typically Q1). There's
 * no live API — the table in `constants/cmhcVacancy.ts` should be refreshed
 * each year against the latest CMHC publication.
 *
 * Used by the orchestrator to feed a city-accurate vacancy rate into the
 * narrative input (and eventually the calc engine, when wired).
 */

import { CMHC_VACANCY_RATES_BY_CITY, DEFAULT_VACANCY_RATE } from '../constants/cmhcVacancy'

/**
 * Look up the vacancy rate for a given city. Case-insensitive.
 * Falls back to DEFAULT_VACANCY_RATE when the city isn't in the table.
 */
export function getVacancyRateByCity(city: string | null | undefined): number {
  if (!city) return DEFAULT_VACANCY_RATE
  const normalized = city.trim().toLowerCase()
  return CMHC_VACANCY_RATES_BY_CITY[normalized] ?? DEFAULT_VACANCY_RATE
}

/**
 * @deprecated kept for backward compatibility with the original stub signature.
 * Prefer getVacancyRateByCity — postal code → city mapping is not in scope.
 */
export async function getVacancyRate(_postalCode: string): Promise<number> {
  return DEFAULT_VACANCY_RATE
}
