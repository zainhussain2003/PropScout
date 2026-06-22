/**
 * Unit tests for the fallback valuation constants.
 *
 * The rent↔price proxies must stay exact reciprocals so a for-sale fallback
 * rent and a for-rent fallback price agree on the same gross-yield assumption.
 */

import {
  RENT_TO_PRICE_MONTHLY,
  PRICE_TO_MONTHLY_RENT,
  FALLBACK_RENT_BAND,
  DEFAULT_RENT_MONTHLY,
} from './valuation'

describe('valuation constants', () => {
  it('rent↔price proxies are exact reciprocals', () => {
    expect(PRICE_TO_MONTHLY_RENT).toBeCloseTo(1 / RENT_TO_PRICE_MONTHLY, 10)
  })

  it('encodes a ~6%/yr gross-yield assumption', () => {
    // 0.5%/mo × 12 = 6%/yr
    expect(RENT_TO_PRICE_MONTHLY * 12).toBeCloseTo(0.06, 10)
  })

  it('round-trips a price through rent and back within rounding', () => {
    const price = 600_000
    const rent = price * RENT_TO_PRICE_MONTHLY
    expect(rent * PRICE_TO_MONTHLY_RENT).toBeCloseTo(price, 6)
  })

  it('uses a sane fallback band and default rent', () => {
    expect(FALLBACK_RENT_BAND).toBeGreaterThan(0)
    expect(FALLBACK_RENT_BAND).toBeLessThan(1)
    expect(DEFAULT_RENT_MONTHLY).toBeGreaterThan(0)
  })
})
