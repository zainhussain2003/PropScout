/**
 * Fallback valuation heuristics — used ONLY when real data is missing.
 *
 * These are deliberately crude proxies, not authoritative valuations. They keep
 * the analysis pipeline running (so the calc engine can still produce a score)
 * when a listing lacks rent data, sale price, or scraped rental comps. Any
 * analysis relying on them is surfaced to the user as low-confidence.
 *
 * The rent↔price proxies both encode the same ~6% gross-yield assumption, just
 * applied in opposite directions, so they are kept as exact reciprocals.
 */

/** Monthly rent as a fraction of sale price (~0.5%/mo ≈ 6%/yr gross yield). */
export const RENT_TO_PRICE_MONTHLY = 0.005

/**
 * Sale price as a multiple of monthly rent, for for-rent listings (tenant /
 * landlord modes) where listing.price is null. Exact inverse of
 * RENT_TO_PRICE_MONTHLY (1 / 0.005 = 200) so both directions agree.
 */
export const PRICE_TO_MONTHLY_RENT = 1 / RENT_TO_PRICE_MONTHLY

/** Half-width of the synthetic low/high band around a single fallback rent point. */
export const FALLBACK_RENT_BAND = 0.1 // ±10%

/** Monthly rent assumed when a for-rent listing somehow carries no rent value. */
export const DEFAULT_RENT_MONTHLY = 1500
