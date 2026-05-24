export const FREE_TIER = {
  MONTHLY_ANALYSIS_LIMIT: 10,
  NARRATIVE_MIN_WORDS: 60,
  NARRATIVE_MAX_WORDS: 120,
} as const

export const TIER_PRICES = {
  free: 0,
  pro: 10,
  professional: 59,
  team: 299,
} as const
