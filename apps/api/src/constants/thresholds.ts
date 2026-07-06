export const CONFIDENCE = {
  RED_FLAG_MIN: 85,
  AMBER_FLAG_MIN: 60,
} as const

export const DEAL_SCORE = {
  STRONG: 80,
  GOOD: 65,
  CAUTION: 50,
  MARGINAL: 35,
  DO_NOT_BUY: 20,
} as const

// Monthly rent plausibility bounds (decision 2026-07-01). Wide enough for
// Ontario (bachelor basement to luxury detached), tight enough to catch unit
// errors like $29 or $290,000. Values outside these are rejected/flagged at
// the API boundary; the calc engine's sanity checks remain the backstop.
export const RENT_BOUNDS = {
  MIN_MONTHLY: 500,
  MAX_MONTHLY: 10_000,
} as const

// Timeouts for the API → calc-engine (Python) fetch calls. The scrape path is
// the slow one: ScraperAPI premium takes ~25s and retries up to 4×, so the API
// must wait comfortably longer or it abandons a scrape that actually succeeds
// (prod incident 2026-07-06: the API aborted at ~20s — the Railway public-edge
// timeout — while the calc-engine returned 200 at ~25s). These are the app-level
// safety net; the real fix is private networking, which removes the edge timeout.
// Without an explicit signal, undici would let the request hang far longer than
// the edge, and a body-read stall surfaces as a generic 500 instead of a
// graceful "enter details manually".
export const CALC_ENGINE_TIMEOUT_MS = {
  SCRAPE: 90_000,
  ANALYSIS: 60_000,
  SUNSCOUT: 30_000,
} as const
