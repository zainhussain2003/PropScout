/**
 * tenantScore.ts — a purpose-built tenant score (0–100).
 *
 * The tenant report used to reuse the *investment* deal score (cap rate / cash
 * flow / DSCR), which is meaningless to a renter — a perfectly good rental would
 * render "14 · Hard pass". This computes a score from tenant-relevant signals:
 *
 *   1. Rent fairness vs comps   (weight 50) — asking rent vs the comp median.
 *   2. Listing honesty          (weight 25) — deductions for red/amber flags.
 *   3. Livability               (weight 25) — Walk/Transit + SunScout light.
 *
 * Small samples (D-121): the rent-fairness signal is the asking rent against
 * a median, and a median of five ads moves $150 when one ad drops out — on
 * 2026-09-18 that alone took 25 Holly St from "Negotiate first" to "Overpriced
 * — push hard". Below RENT_SAMPLE.FULL comps the gap above the median is
 * counted at compCount / FULL: five comps count 62.5% of it, one comp 12.5%.
 * A rent at or below the median is never marked down for a thin sample. The
 * score reports the weight so the hero can say how much of the gap counted.
 *
 * IMPORTANT: the weights, the rent-fairness curve, the flag deductions, and the
 * verdict bands below are a STARTING CALIBRATION — tuned to feel right, not
 * researched against outcome data. They live here as named constants so they can
 * be adjusted in one place. See the NIGHT_NOTES entry (2026-07-08) flagging them
 * as provisional.
 *
 * Only used when comps exist. When comps are absent (compCount === 0) the tenant
 * report SUPPRESSES the score entirely — see shimToTenantListingData.
 */

import type { RentalEstimate, RiskFlag } from '../types/analysis'

/** Component weights — must sum to 100. */
export const TENANT_SCORE_WEIGHTS = {
  rentFairness: 50,
  listingHonesty: 25,
  livability: 25,
} as const

/**
 * Rent-fairness sub-score (0–100) as a function of how far the asking rent sits
 * ABOVE the comp median, in percent. At or below median → full marks; the score
 * falls steeply once above market because paying over the median is the single
 * worst outcome for a tenant. Anchors are interpolated linearly.
 */
export const RENT_FAIRNESS_ANCHORS: ReadonlyArray<{ pctAbove: number; score: number }> = [
  { pctAbove: 0, score: 100 },
  { pctAbove: 5, score: 40 },
  { pctAbove: 10, score: 30 },
  { pctAbove: 15, score: 20 },
  { pctAbove: 20, score: 10 },
]

/** Per-flag deductions from the listing-honesty sub-score (starts at 100). */
export const HONESTY_DEDUCTIONS = {
  red: 20,
  amber: 10,
} as const

/** Neutral livability sub-score when no location/light signal is available. */
export const LIVABILITY_NEUTRAL = 50

/**
 * How many comps it takes for the gap above the median to count in full (the
 * API's own "high confidence" threshold). Below it the gap is scaled by
 * compCount / FULL (D-121).
 */
export const RENT_SAMPLE = {
  FULL: 8,
} as const

/** Share of the gap above the median that a sample of `compCount` earns, in [0, 1]. */
export function rentSampleWeight(compCount: number): number {
  if (!Number.isFinite(compCount) || compCount <= 0) return 0
  return Math.min(1, compCount / RENT_SAMPLE.FULL)
}

/** Verdict bands — tuned to the existing VerdictPill tones (pass / caution / fail). */
export const TENANT_VERDICT_BANDS: ReadonlyArray<{
  min: number
  label: string
  tone: 'pass' | 'caution' | 'fail'
}> = [
  { min: 75, label: 'Fair rent', tone: 'pass' },
  { min: 55, label: 'Negotiate first', tone: 'caution' },
  { min: 35, label: 'Overpriced — push hard', tone: 'fail' },
  { min: 0, label: 'Walk away', tone: 'fail' },
]

export interface TenantScoreInput {
  /** Listing asking rent (monthly). 0/undefined → rent fairness is neutral. */
  askingRent: number | null | undefined
  /** Comp benchmark. Callers only pass this when compCount > 0. */
  comps: RentalEstimate
  /** Fired risk flags (red/amber). */
  flags: RiskFlag[]
  /** Walk Score (0–100) or null. */
  walk?: number | null
  /** Transit Score (0–100) or null. */
  transit?: number | null
  /** SunScout light score (0–100) or null. */
  light?: number | null
}

export interface TenantScore {
  total: number // 0–100, rounded
  verdictLabel: string
  tone: 'pass' | 'caution' | 'fail'
  breakdown: {
    rentFairness: number
    listingHonesty: number
    livability: number
  }
  /** How much of the gap above the median counted, from the comp count (D-121). 1 = all of it. */
  rentSampleWeight: number
  /** The comps behind the rent-fairness signal. */
  compCount: number
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Rent-fairness sub-score for an asking rent vs the comp median.
 * Returns 0–100. At/below median → 100; interpolates down through the anchors.
 * With fewer than RENT_SAMPLE.FULL comps only `sampleWeight` of the gap above
 * the median counts (D-121); the default 1 is the old behaviour.
 */
export function rentFairnessScore(askingRent: number, median: number, sampleWeight = 1): number {
  if (median <= 0 || askingRent <= 0) return LIVABILITY_NEUTRAL // no usable benchmark → neutral
  const pctAbove = ((askingRent - median) / median) * 100 * sampleWeight
  if (pctAbove <= 0) return 100

  const anchors = RENT_FAIRNESS_ANCHORS
  const last = anchors[anchors.length - 1]!
  if (pctAbove >= last.pctAbove) return last.score

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]!
    const b = anchors[i + 1]!
    if (pctAbove >= a.pctAbove && pctAbove <= b.pctAbove) {
      const t = (pctAbove - a.pctAbove) / (b.pctAbove - a.pctAbove)
      return a.score + t * (b.score - a.score)
    }
  }
  return last.score
}

/** Listing-honesty sub-score: starts at 100, deducts per fired flag, floored at 0. */
export function listingHonestyScore(flags: RiskFlag[]): number {
  let score = 100
  for (const f of flags) {
    score -= f.severity === 'red' ? HONESTY_DEDUCTIONS.red : HONESTY_DEDUCTIONS.amber
  }
  return clamp(score, 0, 100)
}

/**
 * Livability sub-score: average of the available Walk/Transit/light signals.
 * When none are present we return a neutral 50 rather than rewarding or
 * punishing — we don't have the data, so we don't pretend to.
 */
export function livabilityScore(
  walk?: number | null,
  transit?: number | null,
  light?: number | null
): number {
  const parts: number[] = []
  if (walk != null) parts.push(clamp(walk, 0, 100))
  if (transit != null) parts.push(clamp(transit, 0, 100))
  if (light != null) parts.push(clamp(light, 0, 100))
  if (parts.length === 0) return LIVABILITY_NEUTRAL
  return parts.reduce((a, b) => a + b, 0) / parts.length
}

/** Map a 0–100 total to its verdict band. */
export function tenantVerdict(total: number): { label: string; tone: 'pass' | 'caution' | 'fail' } {
  const band =
    TENANT_VERDICT_BANDS.find((b) => total >= b.min) ??
    TENANT_VERDICT_BANDS[TENANT_VERDICT_BANDS.length - 1]!
  return { label: band.label, tone: band.tone }
}

/**
 * Compute the tenant score (0–100) from tenant-relevant signals.
 * NOTE: caller passes `comps` only when compCount > 0 (score suppressed otherwise).
 */
export function computeTenantScore(input: TenantScoreInput): TenantScore {
  const sampleWeight = rentSampleWeight(input.comps.compCount)
  const rentFairness = rentFairnessScore(input.askingRent ?? 0, input.comps.mid, sampleWeight)
  const listingHonesty = listingHonestyScore(input.flags)
  const livability = livabilityScore(input.walk, input.transit, input.light)

  const w = TENANT_SCORE_WEIGHTS
  const total = Math.round(
    (rentFairness * w.rentFairness +
      listingHonesty * w.listingHonesty +
      livability * w.livability) /
      100
  )
  const { label, tone } = tenantVerdict(total)

  return {
    total: clamp(total, 0, 100),
    verdictLabel: label,
    tone,
    breakdown: { rentFairness, listingHonesty, livability },
    rentSampleWeight: sampleWeight,
    compCount: input.comps.compCount,
  }
}

/**
 * One line for the hero when the sample is thin (D-121): how many comps, and
 * how much of the gap above the median counted. Null at a full sample or when
 * the rent is not above the median — there is nothing damped to explain.
 */
export function rentSampleNote(
  score: Pick<TenantScore, 'rentSampleWeight' | 'compCount'>,
  askingRent: number | null | undefined,
  median: number
): string | null {
  if (score.rentSampleWeight >= 1) return null
  if (askingRent == null || askingRent <= median) return null
  const pct = Math.round(score.rentSampleWeight * 100)
  const noun = score.compCount === 1 ? 'comparable' : 'comparables'
  return `Thin sample: ${score.compCount} ${noun} — ${pct}% of the gap above the median is counted`
}
