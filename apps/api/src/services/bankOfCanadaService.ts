/**
 * Bank of Canada mortgage rate feed.
 * Used to populate the default mortgage rate in the financing sliders.
 */

/**
 * Fetch the current posted 5-year fixed mortgage rate from the Bank of Canada.
 * Returns a decimal (e.g. 0.0479 for 4.79%).
 */
export async function getCurrentMortgageRate(): Promise<number> {
  // TODO: implement Bank of Canada rate feed
  // Hardcoded fallback while not implemented
  const FALLBACK_RATE = 0.0479
  return FALLBACK_RATE
}
