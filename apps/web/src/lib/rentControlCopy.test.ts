import { describe, it, expect } from 'vitest'
import { rentControlCopy } from './rentControlCopy'
import type { RentControlInfo } from '../types/analysis'

const base = (over: Partial<RentControlInfo> = {}): RentControlInfo => ({
  status: 'likely_controlled',
  basis: 'listing_build_year',
  requiresVerification: true,
  yearBuilt: 2005,
  exemptionFirstOccupancyAfter: '2018-11-15',
  noticeDays: 90,
  minMonthsBetweenIncreases: 12,
  guidelines: [
    { year: 2026, rate: 0.021 },
    { year: 2027, rate: 0.019 },
  ],
  source: 'https://www.ontario.ca/page/residential-rent-increases',
  sourceTitle: 'Ontario — Residential rent increases',
  sourceUpdatedAt: '2026-06-23',
  checkedAt: '2026-09-16',
  ...over,
})

describe('rentControlCopy (D-113)', () => {
  it('names every published guideline year rather than one percentage', () => {
    const c = rentControlCopy(base(), 'tenant')
    expect(c.increasesLine).toContain('2.1% for increases taking effect in 2026')
    expect(c.increasesLine).toContain('1.9% for increases taking effect in 2027')
  })

  it('never says "not rent controlled": exempt is "likely … confirm" and still carries the timing rules', () => {
    const c = rentControlCopy(base({ status: 'likely_exempt', yearBuilt: 2019 }), 'landlord')
    expect(c.statusLabel).toBe('Likely exempt from the guideline — confirm')
    expect(c.increasesLine).toMatch(/no guideline limit on the amount/)
    expect(c.timingLine).toMatch(/12 months/)
    expect(c.timingLine).toMatch(/90 days' written notice/)
    expect(c.basisLine).toMatch(/build year \(2019\)/)
    expect(c.basisLine).toMatch(/first occupied .* after Nov 15, 2018/)
  })

  it('2018 or no build year is unknown, with the right basis line', () => {
    expect(
      rentControlCopy(base({ status: 'unknown', yearBuilt: 2018 }), 'tenant').statusLabel
    ).toBe('Rent-control status unknown — confirm')
    const none = rentControlCopy(
      base({ status: 'unknown', basis: 'none', yearBuilt: null }),
      'tenant'
    )
    expect(none.basisLine).toMatch(/gives no build year/)
  })

  it('the starting rent is agreed on a new tenancy from both perspectives, and the guideline does not cap it', () => {
    expect(rentControlCopy(base(), 'landlord').startingRentLine).toMatch(/does not limit it/)
    expect(rentControlCopy(base(), 'tenant').startingRentLine).toMatch(/does not cap it/)
  })

  it('cites the page with its update date and the check date', () => {
    expect(rentControlCopy(base(), 'tenant').sourceLine).toBe(
      'Ontario — Residential rent increases, page updated Jun 23, 2026; checked Sep 16, 2026.'
    )
  })
})
