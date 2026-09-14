/**
 * assumptionLedger — every modelled number gets a source, a date and a
 * method, and a default is called a default (D-088).
 */

import { buildAssumptionLedger, type LedgerInput, type EngineAssumptions } from './assumptionLedger'
import type { AssumptionEntry } from '../types/analysis'

const ENGINE: EngineAssumptions = {
  vacancy_allowance: 0.05,
  management_fee: 0.08,
  management_fee_included: false,
  insurance_rate: 0.0035,
  maintenance_rate: 0.005,
  maintenance_basis: 'post_2010',
  legal_fees: 1500,
  title_insurance: 300,
  home_inspection: 600,
  down_payment_pct: 0.2,
  mortgage_rate: 0.052,
  amortization_years: 25,
  cmhc_vacancy_rate: 0.018,
  cmhc_vacancy_rate_supplied: true,
}

function base(overrides: Partial<LedgerInput> = {}): LedgerInput {
  return {
    mode: 'investor',
    createdAt: '2026-09-13T12:00:00.000Z',
    listing: {
      city: 'Toronto',
      price: 729900,
      rentMonthly: null,
      annualTaxes: 3326,
      condoFeeMonthly: 761,
      condoFeeKnown: true,
      yearBuilt: 2018,
    },
    engine: { ...ENGINE },
    rate: { rate: 0.052, source: 'live', fetchedAt: '2026-09-13T11:00:00.000Z' },
    comps: { compCount: 60, radiusKm: 2, confidence: 'high' },
    rentMid: 2900,
    priceEstimated: false,
    annualTaxesUsed: 3326,
    annualTaxesEstimated: false,
    cmhcCityMatched: true,
    ...overrides,
  }
}

function entry(input: LedgerInput, key: string): AssumptionEntry {
  const e = buildAssumptionLedger(input).find((x) => x.key === key)
  if (!e) throw new Error(`no entry ${key}`)
  return e
}

describe('buildAssumptionLedger', () => {
  it('a live Bank of Canada rate is published, with its fetch date', () => {
    const e = entry(base(), 'mortgage_rate')
    expect(e.basis).toBe('published')
    expect(e.value).toBe('5.20%')
    expect(e.source).toMatch(/Bank of Canada/)
    expect(e.asOf).toBe('2026-09-13T11:00:00.000Z')
  })

  it('a fallback rate is a default and says the feed was unavailable', () => {
    const e = entry(
      base({
        rate: { rate: 0.0479, source: 'fallback', fetchedAt: null },
        engine: { ...ENGINE, mortgage_rate: 0.0479 },
      }),
      'mortgage_rate'
    )
    expect(e.basis).toBe('default')
    expect(e.asOf).toBeNull()
    expect(e.method).toMatch(/unavailable/i)
  })

  it('a cached rate keeps its fetch date and says it is cached', () => {
    const e = entry(
      base({ rate: { rate: 0.052, source: 'cached', fetchedAt: '2026-09-08T00:00:00.000Z' } }),
      'mortgage_rate'
    )
    expect(e.basis).toBe('published')
    expect(e.asOf).toBe('2026-09-08T00:00:00.000Z')
    expect(e.method).toMatch(/cached/i)
  })

  it('rent from comps names the count, radius and the nightly table', () => {
    const e = entry(base(), 'rent')
    expect(e.basis).toBe('published')
    expect(e.value).toBe('$2,900/mo')
    expect(e.source).toMatch(/60 asking rents/)
    expect(e.method).toMatch(/2 km/)
    expect(e.asOf).toBe('2026-09-13T12:00:00.000Z')
  })

  it('rent proxied from the asking price is an estimate with the yield stated', () => {
    const e = entry(base({ comps: null, rentMid: 3650 }), 'rent')
    expect(e.basis).toBe('estimate')
    expect(e.method).toMatch(/0\.5% of the asking price/)
  })

  it('the listing\u2019s own rent is observed', () => {
    const e = entry(
      base({
        mode: 'tenant',
        comps: null,
        rentMid: 2400,
        listing: { ...base().listing, price: null, rentMonthly: 2400 },
        priceEstimated: true,
      }),
      'rent'
    )
    expect(e.basis).toBe('observed')
  })

  it('a scraped tax is observed; an estimated one names the rate table', () => {
    expect(entry(base(), 'property_tax').basis).toBe('observed')
    const est = entry(base({ annualTaxesEstimated: true, annualTaxesUsed: 5219 }), 'property_tax')
    expect(est.basis).toBe('estimate')
    expect(est.value).toBe('$5,219/yr')
    expect(est.source).toMatch(/municipal/i)
    expect(est.asOf).toBe('2025')
  })

  it('insurance, legal fees, title, inspection are defaults with no source claimed', () => {
    for (const k of ['insurance', 'legal_fees', 'title_insurance', 'home_inspection']) {
      const e = entry(base(), k)
      expect(e.basis).toBe('default')
      expect(e.source).toMatch(/PropScout default/)
      expect(e.asOf).toBeNull()
    }
    expect(entry(base(), 'insurance').value).toBe('0.35% of value')
    expect(entry(base(), 'legal_fees').value).toBe('$1,500')
  })

  it('maintenance names the build-year band it came from', () => {
    expect(entry(base(), 'maintenance').method).toMatch(/built 2010 or later/)
    const unknown = entry(
      base({ engine: { ...ENGINE, maintenance_rate: 0.01, maintenance_basis: 'year_unknown' } }),
      'maintenance'
    )
    expect(unknown.value).toBe('1.0% of value')
    expect(unknown.method).toMatch(/build year unknown/i)
  })

  it('management fee says whether it is in the numbers', () => {
    expect(entry(base(), 'management_fee').method).toMatch(/not included/i)
    const on = entry(
      base({ engine: { ...ENGINE, management_fee_included: true } }),
      'management_fee'
    )
    expect(on.method).toMatch(/included/i)
    expect(on.method).not.toMatch(/not included/i)
  })

  it('CMHC vacancy for a matched city is a default until the table is refreshed from the survey', () => {
    // The city table is documented as placeholder values, so it is not "published".
    const e = entry(base(), 'vacancy_market')
    expect(e.basis).toBe('default')
    expect(e.value).toBe('1.8%')
    expect(e.source).toMatch(/CMHC/)
    expect(e.method).toMatch(/Toronto/)
  })

  it('an unmatched city says the province-wide default was used', () => {
    const e = entry(base({ cmhcCityMatched: false }), 'vacancy_market')
    expect(e.method).toMatch(/no CMHC figure on file/i)
  })

  it('a for-rent listing gets a value estimate entry; a sale does not', () => {
    expect(buildAssumptionLedger(base()).find((x) => x.key === 'value_estimate')).toBeUndefined()
    const e = entry(
      base({
        mode: 'landlord',
        priceEstimated: true,
        listing: { ...base().listing, price: null, rentMonthly: 2400 },
      }),
      'value_estimate'
    )
    expect(e.basis).toBe('estimate')
    expect(e.method).toMatch(/cap rate/i)
  })

  it('tenant mode carries only what a tenant report uses', () => {
    const keys = buildAssumptionLedger(
      base({
        mode: 'tenant',
        priceEstimated: true,
        listing: { ...base().listing, price: null, rentMonthly: 2400 },
      })
    ).map((e) => e.key)
    expect(keys).toEqual(expect.arrayContaining(['rent', 'vacancy_market', 'value_estimate']))
    expect(keys).not.toContain('mortgage_rate')
    expect(keys).not.toContain('legal_fees')
  })

  it('walk and transit scores are published with their fetch time', () => {
    const e = entry(
      base({ walkScore: { walk: 72, transit: 85, fetchedAt: '2026-09-13T11:30:00.000Z' } }),
      'walk_score'
    )
    expect(e.basis).toBe('published')
    expect(e.value).toBe('72 / 85')
    expect(e.asOf).toBe('2026-09-13T11:30:00.000Z')
    expect(buildAssumptionLedger(base()).find((x) => x.key === 'walk_score')).toBeUndefined()
  })

  it('financing defaults are labelled as the starting case', () => {
    const dp = entry(base(), 'down_payment')
    expect(dp.value).toBe('20%')
    expect(dp.basis).toBe('default')
    expect(entry(base(), 'amortization').value).toBe('25 years')
  })
})
