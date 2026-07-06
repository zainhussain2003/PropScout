/**
 * Unit tests for the cap-rate-based for-rent valuation.
 *
 * The load-bearing test is the double-count guard: actual tax + condo fee must
 * be subtracted exactly once (from actuals), never also folded into the residual
 * ratio — otherwise the value is understated.
 */

import {
  getCapRateByCity,
  estimateValueFromRent,
  MARKET_CAP_RATES_BY_CITY,
  DEFAULT_CAP_RATE,
  RESIDUAL_EXPENSE_RATIO_BY_TYPE,
} from './marketCapRates'

describe('getCapRateByCity', () => {
  it('returns the city rate (case/space-insensitive)', () => {
    expect(getCapRateByCity('Toronto')).toBe(MARKET_CAP_RATES_BY_CITY.toronto)
    expect(getCapRateByCity('  hamilton ')).toBe(MARKET_CAP_RATES_BY_CITY.hamilton)
  })

  it('falls back to the default for unknown or null cities', () => {
    expect(getCapRateByCity('Nowhereville')).toBe(DEFAULT_CAP_RATE)
    expect(getCapRateByCity(null)).toBe(DEFAULT_CAP_RATE)
    expect(getCapRateByCity(undefined)).toBe(DEFAULT_CAP_RATE)
  })

  it('keeps GTA cap rates below cheaper-market rates', () => {
    expect(MARKET_CAP_RATES_BY_CITY.toronto).toBeLessThan(MARKET_CAP_RATES_BY_CITY.windsor)
  })
})

describe('estimateValueFromRent', () => {
  it('computes NOI/capRate with the residual ratio only (no actual tax/fee)', () => {
    // rent 3000/mo → 36,000/yr; detached residual 0.25 → NOI 27,000; cap 0.05 → 540,000
    const value = estimateValueFromRent({
      rentMonthly: 3000,
      city: 'Hamilton', // 0.05
      propertyType: 'detached', // residual 0.25
      annualTaxes: null,
      condoFeeMonthly: null,
    })
    expect(value).toBe(540_000)
  })

  it('subtracts actual condo fee + tax once — never double-counts (the caught bug)', () => {
    // Condo, rent 2500/mo → 30,000/yr. residual 0.18 → 5,400.
    // actual tax 3,000 + actual fee 600/mo×12 = 7,200. NOI = 30,000−5,400−3,000−7,200 = 14,400.
    // Toronto cap 0.038 → 378,947.
    const withActuals = estimateValueFromRent({
      rentMonthly: 2500,
      city: 'Toronto',
      propertyType: 'condo',
      annualTaxes: 3000,
      condoFeeMonthly: 600,
    })
    expect(withActuals).toBe(Math.round((30_000 - 5_400 - 3_000 - 7_200) / 0.038))

    // The residual ratio must NOT also include tax/fee: a known fee LOWERS the
    // value (more expense), it does not vanish into the ratio.
    const withoutFee = estimateValueFromRent({
      rentMonthly: 2500,
      city: 'Toronto',
      propertyType: 'condo',
      annualTaxes: 3000,
      condoFeeMonthly: null,
    })
    expect(withActuals).toBeLessThan(withoutFee)
  })

  it('floors at 0 when expenses exceed rent', () => {
    const value = estimateValueFromRent({
      rentMonthly: 800,
      city: 'Toronto',
      propertyType: 'condo',
      annualTaxes: 6000,
      condoFeeMonthly: 1200,
    })
    expect(value).toBe(0)
  })

  it('covers every property type with a residual ratio', () => {
    const types = Object.keys(RESIDUAL_EXPENSE_RATIO_BY_TYPE)
    expect(types).toEqual(
      expect.arrayContaining(['condo', 'townhouse', 'semi-detached', 'detached', 'multiplex'])
    )
  })
})
