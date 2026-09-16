/**
 * Rent-control status and the applicable guideline for a listing (D-113).
 *
 * The law turns on the date a unit was FIRST OCCUPIED for residential
 * purposes, which no listing states. The build year is a hint toward it,
 * so the answer is a tri-state with its basis and a verification flag —
 * never a boolean, and never a score input while inferred.
 *
 *   likely_controlled  built before the exemption year
 *   unknown            built in the exemption year (Jan and Dec 2018 differ),
 *                      or no build year at all
 *   likely_exempt      built after the exemption year — the first-occupancy
 *                      date still decides, so "confirm" travels with it
 *
 * Pure: takes the listing fact and the clock.
 */

import { ONTARIO_RENT_RULES } from '../constants/ontarioRentRules'
import type { RentControlInfo, RentControlStatus } from '../types/analysis'

const EXEMPTION_YEAR = Number(ONTARIO_RENT_RULES.exemptionFirstOccupancyAfter.slice(0, 4))

export function rentControlStatus(yearBuilt: number | null | undefined): {
  status: RentControlStatus
  basis: 'listing_build_year' | 'none'
  requiresVerification: true
} {
  if (yearBuilt == null || !Number.isFinite(yearBuilt) || yearBuilt <= 0) {
    return { status: 'unknown', basis: 'none', requiresVerification: true }
  }
  if (yearBuilt < EXEMPTION_YEAR) {
    return { status: 'likely_controlled', basis: 'listing_build_year', requiresVerification: true }
  }
  if (yearBuilt === EXEMPTION_YEAR) {
    return { status: 'unknown', basis: 'listing_build_year', requiresVerification: true }
  }
  return { status: 'likely_exempt', basis: 'listing_build_year', requiresVerification: true }
}

/** The guideline for an increase taking effect on `effectiveDate`, if published. */
export function guidelineFor(effectiveDate: Date): { year: number; rate: number } | null {
  const year = effectiveDate.getUTCFullYear()
  const rate = ONTARIO_RENT_RULES.guidelinesByYear[year]
  return rate == null ? null : { year, rate }
}

/** The published guidelines from the current year on, for copy that cannot know the increase date. */
export function guidelinesFrom(now: Date): Array<{ year: number; rate: number }> {
  const from = now.getUTCFullYear()
  return Object.entries(ONTARIO_RENT_RULES.guidelinesByYear)
    .map(([y, r]) => ({ year: Number(y), rate: r }))
    .filter((g) => g.year >= from)
    .sort((a, b) => a.year - b.year)
}

/** Everything the report needs to say what applies — stored with the analysis. */
export function buildRentControl(yearBuilt: number | null | undefined, now: Date): RentControlInfo {
  const s = rentControlStatus(yearBuilt)
  return {
    ...s,
    yearBuilt: yearBuilt ?? null,
    exemptionFirstOccupancyAfter: ONTARIO_RENT_RULES.exemptionFirstOccupancyAfter,
    noticeDays: ONTARIO_RENT_RULES.noticeDays,
    minMonthsBetweenIncreases: ONTARIO_RENT_RULES.minMonthsBetweenIncreases,
    guidelines: guidelinesFrom(now),
    source: ONTARIO_RENT_RULES.source,
    sourceTitle: ONTARIO_RENT_RULES.sourceTitle,
    sourceUpdatedAt: ONTARIO_RENT_RULES.sourceUpdatedAt,
    checkedAt: ONTARIO_RENT_RULES.checkedAt,
  }
}
