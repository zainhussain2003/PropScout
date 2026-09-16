/**
 * Similarity weighting for rental comps (D-109).
 *
 * The rent band used to be plain percentiles over every comp that survived
 * outlier removal — a 90-day-old three-bedroom 4 km away counted the same as
 * last night's listing in the next building. Each comp now carries a weight
 * in (0, 1] from four factors, and the band is the weighted 25th / 50th /
 * 75th percentile:
 *
 *   distance   1 / (1 + km)                 — unknown distance: 1
 *   recency    exp(−days since seen / 90)   — unknown date: 1
 *   size       exp(−|Δ sqft| / 300)         — either sqft unknown: 1
 *   bedrooms   1 exact, 0.6 for ±1          — unknown: 1
 *   dwelling   1 same type, 0.5 near, 0.7 unreadable — subject type unknown: 1 (D-117)
 *
 * Missing information is neutral, never a penalty: a comp is only pulled
 * down for a known difference. With every factor unknown the weights are
 * equal and the band is the ordinary weighted percentile of the same rents —
 * within a few dollars of the old plain percentile, the median exact.
 *
 * Pure: no database, no clock — the caller passes `now`.
 */

import { COMP_WEIGHTS } from '../constants/thresholds'
import { unitTypeFactor, type CompUnitType, type SubjectUnitType } from './compUnitType'

/** What the subject offers for comparison; any field may be unknown. */
export interface CompSubject {
  beds: number | null
  sqft: number | null
  coords: { lat: number; lng: number } | null
  /** Apartment / house / townhouse from the listing's propertyType; null when it did not say (D-117). */
  unitType?: SubjectUnitType | null
}

/** The comp facts the weighting reads (a subset of the rental_listings row). */
export interface WeightableComp {
  rent_monthly: number
  beds?: number | null
  sqft?: number | null
  scraped_at?: string | null
  lat?: number | null
  lng?: number | null
  /** Read from the stored row by compUnitType (D-117); absent rows are unknown. */
  unit_type?: CompUnitType
}

export interface WeightedComp<T extends WeightableComp = WeightableComp> {
  row: T
  /** Straight-line km from the subject, when both sides have coordinates. */
  distanceKm: number | null
  /** Product of the five factors, in [0, 1]; 0 only for a comp of the wrong dwelling type. */
  weight: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Great-circle distance in km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number): number => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Weight one comp against the subject. */
export function weightComp<T extends WeightableComp>(
  row: T,
  subject: CompSubject,
  now: Date
): WeightedComp<T> {
  const distanceKm =
    subject.coords != null && row.lat != null && row.lng != null
      ? haversineKm(subject.coords.lat, subject.coords.lng, row.lat, row.lng)
      : null
  const distance = distanceKm != null ? 1 / (1 + distanceKm / COMP_WEIGHTS.DISTANCE_KM_SCALE) : 1

  const seen = row.scraped_at ? Date.parse(row.scraped_at) : Number.NaN
  const days = Number.isFinite(seen) ? Math.max(0, (now.getTime() - seen) / DAY_MS) : null
  const recency = days != null ? Math.exp(-days / COMP_WEIGHTS.RECENCY_DAYS) : 1

  const size =
    subject.sqft != null && subject.sqft > 0 && row.sqft != null && row.sqft > 0
      ? Math.exp(-Math.abs(row.sqft - subject.sqft) / COMP_WEIGHTS.SIZE_SQFT_SCALE)
      : 1

  const beds =
    subject.beds != null && row.beds != null
      ? row.beds === subject.beds
        ? 1
        : COMP_WEIGHTS.BEDS_ADJACENT
      : 1

  const unitType = unitTypeFactor(subject.unitType ?? null, row.unit_type ?? 'unknown')

  return { row, distanceKm, weight: distance * recency * size * beds * unitType }
}

/**
 * Weighted percentile over comps: each comp sits at the midpoint of its
 * share of the total weight and the value is interpolated between
 * neighbours (the usual weighted-percentile definition). A comp with three
 * times the weight of another pulls the median three times as hard; with
 * equal weights it is within a few dollars of the plain percentile, and the
 * median of an odd count is exact.
 */
export function weightedPercentile(comps: ReadonlyArray<WeightedComp>, p: number): number {
  if (comps.length === 0) return 0
  const sorted = [...comps].sort((a, b) => a.row.rent_monthly - b.row.rent_monthly)
  if (sorted.length === 1) return sorted[0]!.row.rent_monthly
  const total = sorted.reduce((s, c) => s + c.weight, 0)
  if (!(total > 0)) return sorted[Math.floor((p / 100) * (sorted.length - 1))]!.row.rent_monthly
  const q = p / 100
  let cumulative = 0
  const mids = sorted.map((c) => {
    const mid = (cumulative + c.weight / 2) / total
    cumulative += c.weight
    return mid
  })
  if (q <= mids[0]!) return sorted[0]!.row.rent_monthly
  const lastIdx = sorted.length - 1
  if (q >= mids[lastIdx]!) return sorted[lastIdx]!.row.rent_monthly
  for (let k = 0; k < lastIdx; k += 1) {
    const m0 = mids[k]!
    const m1 = mids[k + 1]!
    if (q >= m0 && q <= m1) {
      const fraction = m1 > m0 ? (q - m0) / (m1 - m0) : 0
      const v0 = sorted[k]!.row.rent_monthly
      const v1 = sorted[k + 1]!.row.rent_monthly
      return v0 + fraction * (v1 - v0)
    }
  }
  return sorted[lastIdx]!.row.rent_monthly
}

/**
 * The rows whose rents survived outlier removal — `keptRents` is a multiset
 * of values, so each surviving value claims one row.
 */
export function keepRowsForRents<T extends WeightableComp>(rows: T[], keptRents: number[]): T[] {
  const budget = new Map<number, number>()
  for (const r of keptRents) budget.set(r, (budget.get(r) ?? 0) + 1)
  const out: T[] = []
  for (const r of rows) {
    const left = budget.get(r.rent_monthly) ?? 0
    if (left <= 0) continue
    budget.set(r.rent_monthly, left - 1)
    out.push(r)
  }
  return out
}
