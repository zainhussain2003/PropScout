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
  LIVABILITY_NEUTRAL,
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
