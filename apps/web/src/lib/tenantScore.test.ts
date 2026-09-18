/**
 * Unit tests for the purpose-built tenant score. Weights/bands are provisional
 * (see tenantScore.ts) so these assert the SHAPE of the model — at/below median
 * scores well, above-market falls, flags cut honesty, missing livability data is
 * neutral — rather than pinning exact magic numbers that will be re-tuned.
 */

import { describe, it, expect } from 'vitest'
import {
  computeTenantScore,
  rentFairnessScore,
  listingHonestyScore,
  livabilityScore,
  tenantVerdict,
  rentSampleWeight,
  rentSampleNote,
  LIVABILITY_NEUTRAL,
  RENT_SAMPLE,
} from './tenantScore'
import type { RentalEstimate, RiskFlag } from '../types/analysis'

const COMPS: RentalEstimate = {
  low: 2600,
  mid: 2900,
  high: 3200,
  compCount: 8,
  confidence: 'medium',
  postalCode: 'M4S1A1',
}

function flag(severity: 'red' | 'amber'): RiskFlag {
  return { id: `f-${severity}`, severity, label: 'x', evidence: null, confidence: 90 }
}

describe('rentFairnessScore', () => {
  it('gives full marks at or below the median', () => {
    expect(rentFairnessScore(2900, 2900)).toBe(100)
    expect(rentFairnessScore(2700, 2900)).toBe(100)
  })

  it('falls as asking climbs above the median', () => {
    const at5 = rentFairnessScore(2900 * 1.05, 2900)
    const at10 = rentFairnessScore(2900 * 1.1, 2900)
    const at20 = rentFairnessScore(2900 * 1.2, 2900)
    expect(at5).toBeGreaterThan(at10)
    expect(at10).toBeGreaterThan(at20)
    expect(at5).toBeCloseTo(40, 0)
    expect(at20).toBeCloseTo(10, 0)
  })

  it('floors for extreme overpricing and is neutral without a benchmark', () => {
    expect(rentFairnessScore(2900 * 1.5, 2900)).toBe(10)
    expect(rentFairnessScore(0, 2900)).toBe(LIVABILITY_NEUTRAL)
    expect(rentFairnessScore(2900, 0)).toBe(LIVABILITY_NEUTRAL)
  })
})

describe('small-sample damping (D-121)', () => {
  it('the gap above the median counts at compCount / FULL, capped at 1', () => {
    expect(rentSampleWeight(RENT_SAMPLE.FULL)).toBe(1)
    expect(rentSampleWeight(20)).toBe(1)
    expect(rentSampleWeight(5)).toBeCloseTo(5 / RENT_SAMPLE.FULL)
    expect(rentSampleWeight(1)).toBeCloseTo(1 / RENT_SAMPLE.FULL)
    expect(rentSampleWeight(0)).toBe(0)
  })

  it('a thin sample counts less of the gap; a full one counts all of it', () => {
    // 12% above the median: 8 comps → the curve at 12%; 5 comps → the curve at 7.5%.
    const full = rentFairnessScore(2900 * 1.12, 2900, rentSampleWeight(8))
    const thin = rentFairnessScore(2900 * 1.12, 2900, rentSampleWeight(5))
    expect(full).toBe(rentFairnessScore(2900 * 1.12, 2900))
    expect(thin).toBeGreaterThan(full)
    expect(thin).toBeCloseTo(rentFairnessScore(2900 * 1.075, 2900), 5)
  })

  it('a rent at or below the median is never marked down for a thin sample', () => {
    expect(rentFairnessScore(2850, 2900, rentSampleWeight(1))).toBe(100)
    expect(rentFairnessScore(2900, 2900, rentSampleWeight(2))).toBe(100)
  })

  it('25 Holly St, 2026-09-18: the verdict no longer flips a band when one comp drops out', () => {
    // Six comps at a $2,600 median, then five at $2,451 — the same $2,750 ask.
    const six = computeTenantScore({
      askingRent: 2750,
      comps: { ...COMPS, mid: 2600, compCount: 6 },
      flags: [],
      walk: 99,
      transit: 92,
      light: null,
    })
    const five = computeTenantScore({
      askingRent: 2750,
      comps: { ...COMPS, mid: 2451, compCount: 5 },
      flags: [],
      walk: 99,
      transit: 92,
      light: null,
    })
    expect(six.rentSampleWeight).toBeCloseTo(0.75)
    expect(five.rentSampleWeight).toBeCloseTo(0.625)
    expect(six.tone).toBe('caution')
    expect(five.tone).toBe('caution')
    expect(Math.abs(six.total - five.total)).toBeLessThan(10)
  })

  it('the score carries the weight and count, and the note says both only when something was damped', () => {
    const thin = computeTenantScore({
      askingRent: 2750,
      comps: { ...COMPS, mid: 2451, compCount: 5 },
      flags: [],
      walk: null,
      transit: null,
      light: null,
    })
    expect(thin.compCount).toBe(5)
    expect(rentSampleNote(thin, 2750, 2451)).toBe(
      'Thin sample: 5 comparables — 63% of the gap above the median is counted'
    )
    expect(rentSampleNote({ rentSampleWeight: 1 / 8, compCount: 1 }, 3000, 2451)).toMatch(
      /1 comparable — 13%/
    )
    // Nothing damped: a full sample, or a rent at or under the median.
    expect(rentSampleNote({ rentSampleWeight: 1, compCount: 12 }, 2750, 2451)).toBeNull()
    expect(rentSampleNote(thin, 2400, 2451)).toBeNull()
    expect(rentSampleNote(thin, null, 2451)).toBeNull()
  })
})

describe('listingHonestyScore', () => {
  it('starts full and deducts per flag', () => {
    expect(listingHonestyScore([])).toBe(100)
    expect(listingHonestyScore([flag('red')])).toBe(80)
    expect(listingHonestyScore([flag('amber')])).toBe(90)
    expect(listingHonestyScore([flag('red'), flag('amber')])).toBe(70)
  })

  it('floors at 0', () => {
    expect(listingHonestyScore(Array.from({ length: 10 }, () => flag('red')))).toBe(0)
  })
})

describe('livabilityScore', () => {
  it('averages the present signals', () => {
    expect(livabilityScore(80, 60, null)).toBe(70)
    expect(livabilityScore(90, null, null)).toBe(90)
  })

  it('is neutral when no signal is available', () => {
    expect(livabilityScore(null, null, null)).toBe(LIVABILITY_NEUTRAL)
  })
})

describe('tenantVerdict', () => {
  it('maps totals to bands with the right tone', () => {
    expect(tenantVerdict(90)).toEqual({ label: 'Fair rent', tone: 'pass' })
    expect(tenantVerdict(60)).toEqual({ label: 'Negotiate first', tone: 'caution' })
    expect(tenantVerdict(45)).toEqual({ label: 'Overpriced — push hard', tone: 'fail' })
    expect(tenantVerdict(20)).toEqual({ label: 'Walk away', tone: 'fail' })
  })
})

describe('computeTenantScore', () => {
  it('a fairly-priced, clean, walkable rental scores well (pass)', () => {
    const s = computeTenantScore({
      askingRent: 2850, // below median
      comps: COMPS,
      flags: [],
      walk: 90,
      transit: 80,
      light: null,
    })
    expect(s.total).toBeGreaterThanOrEqual(75)
    expect(s.tone).toBe('pass')
    expect(s.verdictLabel).toBe('Fair rent')
  })

  it('an above-market rental lands mid — negotiate, not "hard pass"', () => {
    const s = computeTenantScore({
      askingRent: Math.round(2900 * 1.05), // ~5% above median
      comps: COMPS,
      flags: [flag('amber')],
      walk: 85,
      transit: 75,
      light: null,
    })
    expect(s.total).toBeGreaterThan(35)
    expect(s.total).toBeLessThan(75)
    expect(s.tone).toBe('caution')
    // never the investment "hard pass" — this is the whole point of the redesign
    expect(s.verdictLabel).not.toMatch(/pass/i)
  })

  it('missing livability data does not crater the score', () => {
    const s = computeTenantScore({
      askingRent: 2850,
      comps: COMPS,
      flags: [],
      walk: null,
      transit: null,
      light: null,
    })
    // rent 50 (full 50) + honesty 25 + livability neutral (0.25*50=12.5) ≈ 88
    expect(s.total).toBeGreaterThanOrEqual(75)
  })
})
