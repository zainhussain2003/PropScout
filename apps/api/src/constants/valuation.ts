/**
 * Fallback valuation heuristics — used ONLY when real data is missing.
 *
 * These are deliberately crude proxies, not authoritative valuations. They keep
 * the analysis pipeline running (so the calc engine can still produce a score)
 * when a listing lacks rent data, sale price, or scraped rental comps. Any
 * analysis relying on them is surfaced to the user as low-confidence.
 *
 * NOTE: estimating value FROM rent (the for-rent case) now uses the per-city
 * cap-rate + residual-expense model in `marketCapRates.ts`. The remaining proxy
 * here is only the reverse — estimating a fallback RENT from a sale price.
 */

/** Monthly rent as a fraction of sale price (~0.5%/mo ≈ 6%/yr gross yield). */
export const RENT_TO_PRICE_MONTHLY = 0.005

/** Half-width of the synthetic low/high band around a single fallback rent point. */
export const FALLBACK_RENT_BAND = 0.1 // ±10%

/** Monthly rent assumed when a for-rent listing somehow carries no rent value. */
export const DEFAULT_RENT_MONTHLY = 1500
