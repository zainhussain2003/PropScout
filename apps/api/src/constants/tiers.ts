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

/**
 * The guest allowance (D-116, spec §5): one anonymous analysis, then sign in.
 * Tenant mode stays exempt (spec §4). Enforcement is behind
 * GUEST_ANALYSIS_LIMIT_ENABLED until auth email is reliable.
 */
export const GUEST = {
  FREE_ANALYSES: 1,
  /** One year — long enough that the allowance is per visitor, not per visit. */
  COOKIE_MAX_AGE_SECONDS: 365 * 24 * 60 * 60,
} as const

export const TIER_PRICES = {
  free: 0,
  pro: 10,
  professional: 59,
  team: 299,
} as const
