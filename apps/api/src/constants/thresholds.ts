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
