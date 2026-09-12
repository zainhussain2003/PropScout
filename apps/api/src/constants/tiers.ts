export const FREE_TIER = {
  MONTHLY_ANALYSIS_LIMIT: 10,
  NARRATIVE_MIN_WORDS: 60,
  NARRATIVE_MAX_WORDS: 120,
  /**
   * Report modes that never consume the monthly quota. Spec §4: tenant
   * evaluation is "unlimited, no login" on every tier. The count that backs
   * the limit excludes these modes for the same reason (D-071).
   */
  QUOTA_EXEMPT_MODES: ['tenant'],
} as const

export const TIER_PRICES = {
  free: 0,
  pro: 10,
  professional: 59,
  team: 299,
} as const
