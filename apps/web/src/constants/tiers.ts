import type { Tier } from '../types/user'

export const TIER_NAMES: Record<Tier, string> = {
  free: 'Free',
  pro: 'Investor Pro',
  professional: 'Professional',
  team: 'Team',
} as const

export const TIER_PRICES: Record<Tier, number> = {
  free: 0,
  pro: 10,
  professional: 59,
  team: 299,
} as const

export const FREE_TIER = {
  MONTHLY_ANALYSIS_LIMIT: 10,
  NARRATIVE_MIN_WORDS: 60,
  NARRATIVE_MAX_WORDS: 120,
} as const

export const PRO_TIER = {
  NARRATIVE_MIN_WORDS: 150,
  NARRATIVE_MAX_WORDS: 320,
} as const
