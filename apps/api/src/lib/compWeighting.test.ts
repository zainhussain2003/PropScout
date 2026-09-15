import {
  weightComp,
  weightedPercentile,
  keepRowsForRents,
  haversineKm,
  type WeightedComp,
} from './compWeighting'
import { COMP_WEIGHTS } from '../constants/thresholds'

const NOW = new Date('2026-09-15T12:00:00Z')
const SUBJECT = { beds: 2, sqft: 800, coords: { lat: 43.65, lng: -79.38 } }

describe('weightComp (D-109)', () => {
  it('is 1 when nothing is known against the comp', () => {
    const w = weightComp({ rent_monthly: 2000 }, { beds: null, sqft: null, coords: null }, NOW)
    expect(w.weight).toBe(1)
    expect(w.distanceKm).toBeNull()
  })

  it('unknown facts are neutral even when the subject knows its own', () => {
    const w = weightComp({ rent_monthly: 2000, beds: null, sqft: null, lat: null }, SUBJECT, NOW)
    expect(w.weight).toBe(1)
  })

  it('halves at the distance scale, decays with age and size difference, 0.6 for ±1 bed', () => {
    const km = weightComp(
      { rent_monthly: 2000, lat: 43.65 + 1 / 111.2, lng: -79.38 },
      { beds: null, sqft: null, coords: SUBJECT.coords },
      NOW
    )
    expect(km.distanceKm).toBeCloseTo(1, 1)
    expect(km.weight).toBeCloseTo(0.5, 1)

    const old = weightComp(
      { rent_monthly: 2000, scraped_at: '2026-06-17T12:00:00Z' },
      { beds: null, sqft: null, coords: null },
      NOW
    )
    expect(old.weight).toBeCloseTo(Math.exp(-90 / COMP_WEIGHTS.RECENCY_DAYS), 3)

    const big = weightComp({ rent_monthly: 2000, sqft: 1100 }, SUBJECT, NOW)
    expect(big.weight).toBeCloseTo(Math.exp(-300 / COMP_WEIGHTS.SIZE_SQFT_SCALE), 3)

    const oneBed = weightComp({ rent_monthly: 2000, beds: 1 }, SUBJECT, NOW)
    expect(oneBed.weight).toBe(COMP_WEIGHTS.BEDS_ADJACENT)
  })

  it('a future-dated row is treated as seen today, not weighted above 1', () => {
    const w = weightComp(
      { rent_monthly: 2000, scraped_at: '2027-01-01T00:00:00Z' },
      { beds: null, sqft: null, coords: null },
      NOW
    )
    expect(w.weight).toBe(1)
  })
})

describe('weightedPercentile', () => {
  const comps = (rents: number[], weights?: number[]): WeightedComp[] =>
    rents.map((r, i) => ({ row: { rent_monthly: r }, distanceKm: null, weight: weights?.[i] ?? 1 }))

  it('with equal weights the median is exact and the quartiles sit at the cumulative midpoints', () => {
    const c = comps([2700, 2800, 2900, 3000, 3100])
    // Midpoints 0.1 / 0.3 / 0.5 / 0.7 / 0.9: p25 is 3/4 of the way from 2700 to 2800.
    expect(weightedPercentile(c, 25)).toBe(2775)
    expect(weightedPercentile(c, 50)).toBe(2900)
    expect(weightedPercentile(c, 75)).toBe(3025)
    expect(weightedPercentile(comps([2700, 2800, 2900, 3000]), 50)).toBe(2850)
  })

  it('pulls toward the heavier comps', () => {
    const c = comps([2000, 3000], [3, 1])
    expect(weightedPercentile(c, 50)).toBeLessThan(2500)
    const d = comps([2000, 3000], [1, 3])
    expect(weightedPercentile(d, 50)).toBeGreaterThan(2500)
  })

  it('handles the empty and single cases', () => {
    expect(weightedPercentile([], 50)).toBe(0)
    expect(weightedPercentile(comps([2400]), 75)).toBe(2400)
  })

  it('is order-independent', () => {
    const a = comps([3000, 2000, 2500], [1, 2, 1])
    const b = comps([2000, 2500, 3000], [2, 1, 1])
    expect(weightedPercentile(a, 50)).toBe(weightedPercentile(b, 50))
  })
})

describe('keepRowsForRents', () => {
  it('keeps one row per surviving rent value, duplicates included', () => {
    const rows = [{ rent_monthly: 2000 }, { rent_monthly: 2000 }, { rent_monthly: 9000 }]
    expect(keepRowsForRents(rows, [2000, 2000])).toHaveLength(2)
    expect(keepRowsForRents(rows, [2000])).toHaveLength(1)
  })
})

describe('haversineKm', () => {
  it('one degree of latitude is ~111 km', () => {
    expect(haversineKm(43, -79, 44, -79)).toBeCloseTo(111.2, 0)
  })
})
