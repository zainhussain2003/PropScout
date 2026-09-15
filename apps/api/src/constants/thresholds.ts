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

// A landlord's own property value (D-107): wide enough for any Ontario
// dwelling, tight enough to catch a rent typed into the value box.
export const OWNER_VALUE = {
  MIN: 50_000,
  MAX: 50_000_000,
} as const

/**
 * Lowest equity share the engine models for an owned property (its
 * FinancingInput floor). A balance above 95% of the stated value is clamped
 * here and the ledger says so (D-108).
 */
export const OWNER_EQUITY_MIN = 0.05

/** A contract mortgage rate the engine will accept (its FinancingInput band), as a decimal. */
export const MORTGAGE_RATE_BOUNDS = {
  MIN: 0.01,
  MAX: 0.25,
} as const

// Similarity weighting for rental comps (D-109, lib/compWeighting.ts). Each
// factor is 1 when the fact is unknown; only a known difference lowers it.
export const COMP_WEIGHTS = {
  /** km at which the distance factor halves: 1 / (1 + km / scale). */
  DISTANCE_KM_SCALE: 1,
  /** Days for the recency factor to fall to 1/e: exp(−days / RECENCY_DAYS). */
  RECENCY_DAYS: 90,
  /** Square feet of size difference for the size factor to fall to 1/e. */
  SIZE_SQFT_SCALE: 300,
  /** Factor for a comp one bedroom off the subject (the ±1 fallback path). */
  BEDS_ADJACENT: 0.6,
  /** Decimal places kept on a comp's published position (~110 m); D-109. */
  POSITION_DECIMALS: 3,
} as const

// Market demand measured from the nightly rental_listings table (D-105).
// Days-on-market = median (last seen − first seen) over listings in the FSA
// that dropped off in the window; rent trend = median rent of listings first
// seen in the recent window against those first seen in the rest of the
// window. Below MIN_SAMPLE the input is "not observed" and scores 0 — the
// engine never substitutes a default for either any more.
export const MARKET_DEMAND = {
  /** How far back listings count, in days. */
  WINDOW_DAYS: 90,
  /** The "recent" half of the trend comparison, in days. */
  RECENT_DAYS: 30,
  /** A listing not seen for this many days is treated as leased/withdrawn. */
  GONE_AFTER_DAYS: 2,
  /** Fewest listings a median may rest on before the input is reported. */
  MIN_SAMPLE: 8,
  /** |change| inside this band is "flat"; beyond it, rising or declining. */
  TREND_FLAT_BAND: 0.02,
} as const
