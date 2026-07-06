/**
 * Unit tests for the fallback valuation constants.
 */

import { RENT_TO_PRICE_MONTHLY, FALLBACK_RENT_BAND, DEFAULT_RENT_MONTHLY } from './valuation'

describe('valuation constants', () => {
  it('encodes a ~6%/yr gross-yield assumption', () => {
    // 0.5%/mo × 12 = 6%/yr
    expect(RENT_TO_PRICE_MONTHLY * 12).toBeCloseTo(0.06, 10)
  })

  it('uses a sane fallback band and default rent', () => {
    expect(FALLBACK_RENT_BAND).toBeGreaterThan(0)
    expect(FALLBACK_RENT_BAND).toBeLessThan(1)
    expect(DEFAULT_RENT_MONTHLY).toBeGreaterThan(0)
  })
})
