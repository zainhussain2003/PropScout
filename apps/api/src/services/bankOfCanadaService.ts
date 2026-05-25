/**
 * Bank of Canada mortgage rate service.
 *
 * Delegates to the Python calc engine's /rates/mortgage endpoint, which owns
 * the fetch-and-cache logic (7-day TTL, stale-cache fallback, hardcoded fallback).
 *
 * If the calc engine is unreachable this service returns the hardcoded fallback
 * so the Fastify API never crashes the frontend over a missing rate.
 */

export type RateSource = 'live' | 'cached' | 'fallback'

export interface MortgageRateInfo {
  /** Prime rate as a decimal (e.g. 0.052 = 5.20%). */
  rate: number
  /** Whether the value came from a live fetch, the stale cache, or the hardcoded default. */
  source: RateSource
  /** ISO 8601 timestamp of the last successful fetch, or null for the hardcoded fallback. */
  fetchedAt: string | null
  /**
   * User-facing warning text shown in the UI when the rate isn't live.
   * Matches the spec format: "Using cached rate from [date] — live rate unavailable."
   * Null when source is 'live'.
   */
  warning: string | null
}

const FALLBACK_RATE = 0.0479
const FALLBACK_RESPONSE: MortgageRateInfo = {
  rate: FALLBACK_RATE,
  source: 'fallback',
  fetchedAt: null,
  warning: 'Live rate unavailable — using default rate. Check your connection.',
}

/**
 * Fetch the current mortgage rate from the Python calc engine.
 *
 * The calc engine owns the 7-day cache and fallback chain. This function
 * simply proxies the result and normalises the field names to camelCase.
 *
 * Returns the hardcoded fallback if the calc engine is unreachable.
 */
export async function getMortgageRate(): Promise<MortgageRateInfo> {
  const calcEngineUrl = process.env.CALC_ENGINE_URL ?? 'http://localhost:8000'

  try {
    const res = await fetch(`${calcEngineUrl}/rates/mortgage`, {
      signal: AbortSignal.timeout(8_000), // 8 s — calc engine timeout
    })

    if (!res.ok) {
      return FALLBACK_RESPONSE
    }

    const data = (await res.json()) as {
      rate: number
      source: string
      fetched_at: string | null
      warning: string | null
    }

    return {
      rate: data.rate,
      source: (data.source as RateSource) ?? 'fallback',
      fetchedAt: data.fetched_at,
      warning: data.warning,
    }
  } catch {
    return FALLBACK_RESPONSE
  }
}
