/**
 * Tests for the comparable-sales mapper.
 *
 * The risk this guards against is a fabricated fact, not a crash: the live feed
 * carries no days-on-market and no distance, and a zero in either column reads
 * as a real, precise figure — "sold the same day", "next door" — rather than as
 * missing information.
 */

import { describe, it, expect } from 'vitest'

import { toPersonalComps, medianOf } from './comparableSales'

type AnalysisComp = Parameters<typeof toPersonalComps>[0][number]

function comp(over: Partial<AnalysisComp> = {}): AnalysisComp {
  return {
    addr: '406 - 525 Broadway, Tacoma',
    beds: '2 bed · 1 bath',
    sqft: 1334,
    sold: '$365,000',
    soldPrice: 365_000,
    date: 'Oct 2025',
    pricePerSqft: 274,
    ...over,
  }
}

describe('toPersonalComps', () => {
  it('carries the numeric sold price through, not the formatted string', () => {
    // The table formats the money itself; passing "$365,000" would render as
    // "$$365,000" or NaN depending on the formatter.
    const [row] = toPersonalComps([comp()])
    expect(row!.sold).toBe(365_000)
  })

  it('leaves days on market and distance null rather than zero', () => {
    const [row] = toPersonalComps([comp()])
    expect(row!.dom).toBeNull()
    expect(row!.distance).toBeNull()
  })

  it('preserves a missing price per square foot as null', () => {
    const [row] = toPersonalComps([comp({ pricePerSqft: null })])
    expect(row!.ppsqft).toBeNull()
  })

  it('keeps the combined beds string whole and leaves baths empty', () => {
    // The feed gives one string; parsing baths back out of prose would invent
    // precision the source never had.
    const [row] = toPersonalComps([comp({ beds: '3 bed · 2 bath' })])
    expect(row!.beds).toBe('3 bed · 2 bath')
    expect(row!.baths).toBe('')
  })

  it('passes through the feed’s em dash when beds are unknown', () => {
    const [row] = toPersonalComps([comp({ beds: '—' })])
    expect(row!.beds).toBe('—')
  })

  it('returns an empty array for no comps', () => {
    expect(toPersonalComps([])).toEqual([])
  })
})

describe('medianOf', () => {
  it('returns the median of known values', () => {
    expect(medianOf([10, 30, 20])).toBe(20)
  })

  it('ignores nulls rather than counting them as zero', () => {
    // Counting nulls as 0 would drag every median toward zero and understate
    // both $/sqft and DOM on a partially populated feed.
    expect(medianOf([null, 30, 20, null])).toBe(30)
  })

  it('returns null when nothing is known', () => {
    expect(medianOf([null, null])).toBeNull()
    expect(medianOf([])).toBeNull()
  })
})
