/**
 * CMHC vacancy rate data service.
 * Used to adjust rental income estimates based on local market vacancy rates.
 */

/**
 * Get the current vacancy rate for a given postal code area.
 * Falls back to the default 5% assumption if CMHC data is unavailable.
 */
export async function getVacancyRate(_postalCode: string): Promise<number> {
  // TODO: implement CMHC data fetch
  // Fall back to default if unavailable
  const DEFAULT_VACANCY_RATE = 0.05
  return DEFAULT_VACANCY_RATE
}
