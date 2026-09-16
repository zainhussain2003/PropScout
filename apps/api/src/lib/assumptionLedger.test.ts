/**
 * assumptionLedger — every modelled number gets a source, a date and a
 * method, and a default is called a default (D-088).
 */

import {
  buildAssumptionLedger,
  withFacadeRow,
  type LedgerInput,
  type EngineAssumptions,
} from './assumptionLedger'
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
      postalCode: 'M5V 3L9',
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

  it('CMHC vacancy for a matched city is published, dated to the survey release (D-106)', () => {
    const e = entry(base(), 'vacancy_market')
    expect(e.basis).toBe('published')
    expect(e.value).toBe('1.8%')
    expect(e.source).toMatch(/CMHC Rental Market Survey, October 2025/)
    expect(e.asOf).toBe('2025-12-11')
    expect(e.method).toMatch(/Toronto/)
  })

  it('an unmatched city says the province-wide default was used', () => {
    const e = entry(base({ cmhcCityMatched: false }), 'vacancy_market')
    expect(e.basis).toBe('published')
    expect(e.method).toMatch(/Ontario-wide aggregate/i)
  })

  it('unobserved days-on-market and rent trend say they scored nothing, not a default (D-105)', () => {
    const input = base({
      demand: {
        daysOnMarket: null,
        domSample: 3,
        rentTrend: null,
        trendChangePct: null,
        recentSample: 5,
        priorSample: 2,
      },
    })
    const dom = entry(input, 'rental_dom')
    expect(dom.value).toBe('not observed · 0 of 3 points')
    expect(dom.basis).toBe('default')
    expect(dom.asOf).toBeNull()
    expect(dom.method).toMatch(/Fewer than 8 listings in M5V FSA/)
    expect(dom.method).toMatch(/\(3 did\)/)
    expect(dom.method).toMatch(/not scored rather than assumed/)
    const trend = entry(input, 'rent_trend')
    expect(trend.value).toBe('not observed · 0 of 3 points')
    expect(trend.method).toMatch(/\(5 and 2 in M5V FSA\)/)
  })

  it('measured days-on-market and rent trend are observed, dated, with their sample sizes', () => {
    const input = base({
      engine: { ...ENGINE, rental_days_on_market: 11, rent_trend: 'rising' },
      demand: {
        daysOnMarket: 11,
        domSample: 14,
        rentTrend: 'rising',
        trendChangePct: 0.034,
        recentSample: 9,
        priorSample: 21,
      },
    })
    const dom = entry(input, 'rental_dom')
    expect(dom.value).toBe('11 days')
    expect(dom.basis).toBe('observed')
    expect(dom.asOf).toBe('2026-09-13')
    expect(dom.source).toMatch(/nightly rental comps/)
    expect(dom.method).toMatch(/across 14 listings in M5V FSA/)
    const trend = entry(input, 'rent_trend')
    expect(trend.value).toBe('rising · +3.4%')
    expect(trend.basis).toBe('observed')
    expect(trend.method).toMatch(/the 9 listings first seen in the last 30 days against the 21/)
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

  it('a landlord’s own value is observed, dated, and replaces the modelled estimate (D-107)', () => {
    const input = base({
      priceEstimated: false,
      ownerValue: { value: 800000, enteredAt: '2026-09-15T14:00:00.000Z' },
      listing: { ...base().listing, price: null, rentMonthly: 3400 },
    })
    const e = entry(input, 'value_owner')
    expect(e.basis).toBe('observed')
    expect(e.value).toBe('$800,000')
    expect(e.source).toBe('You entered it')
    expect(e.asOf).toBe('2026-09-15')
    expect(e.method).toMatch(/change it in the hero/)
    expect(buildAssumptionLedger(input).find((x) => x.key === 'value_estimate')).toBeUndefined()
  })

  it('a landlord report with a value carries the financing rows; without one it does not (D-107)', () => {
    const noValue = buildAssumptionLedger(
      base({
        mode: 'landlord',
        priceEstimated: true,
        listing: { ...base().listing, price: null, rentMonthly: 3400 },
      })
    ).map((e) => e.key)
    expect(noValue).not.toContain('mortgage_rate')
    const withValue = buildAssumptionLedger(
      base({
        mode: 'landlord',
        priceEstimated: false,
        ownerValue: { value: 800000, enteredAt: '2026-09-15T14:00:00.000Z' },
        listing: { ...base().listing, price: null, rentMonthly: 3400 },
      })
    ).map((e) => e.key)
    expect(withValue).toEqual(
      expect.arrayContaining(['value_owner', 'mortgage_rate', 'down_payment'])
    )
  })

  it('an owned position replaces the purchase financing rows with the balance and contract rate (D-108)', () => {
    const rows = buildAssumptionLedger(
      base({
        mode: 'landlord',
        priceEstimated: false,
        engine: { ...ENGINE, down_payment_pct: 0.6, mortgage_rate: 0.0389, owned: true },
        ownerValue: {
          value: 800000,
          enteredAt: '2026-09-15T14:00:00.000Z',
          mortgageBalance: 320000,
          mortgageRate: 0.0389,
        },
        listing: { ...base().listing, price: null, rentMonthly: 3400 },
      })
    )
    const bal = rows.find((e) => e.key === 'mortgage_balance')
    expect(bal?.value).toBe('$320,000')
    expect(bal?.basis).toBe('observed')
    expect(bal?.method).toMatch(/Equity share = \(value − balance\) \/ value = 60%/)
    const rate = rows.find((e) => e.key === 'mortgage_rate')
    expect(rate?.basis).toBe('observed')
    expect(rate?.source).toBe('You entered it')
    expect(rows.find((e) => e.key === 'down_payment')).toBeUndefined()
  })

  it('owned outright: one row saying there is no mortgage, no rate or amortization rows', () => {
    const rows = buildAssumptionLedger(
      base({
        mode: 'landlord',
        priceEstimated: false,
        engine: { ...ENGINE, down_payment_pct: 1, owned: true },
        ownerValue: { value: 800000, enteredAt: '2026-09-15T14:00:00.000Z', mortgageBalance: 0 },
        listing: { ...base().listing, price: null, rentMonthly: 3400 },
      })
    )
    expect(rows.find((e) => e.key === 'mortgage_balance')?.value).toBe('none — owned outright')
    expect(rows.find((e) => e.key === 'mortgage_rate')).toBeUndefined()
    expect(rows.find((e) => e.key === 'amortization')).toBeUndefined()
  })

  it('rent control is an estimate from the build year with the Ontario source and both guideline years (D-113)', () => {
    const e = entry(
      base({
        rentControl: {
          status: 'likely_exempt',
          basis: 'listing_build_year',
          requiresVerification: true,
          yearBuilt: 2019,
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
        },
      }),
      'rent_control'
    )
    expect(e.value).toBe('likely exempt from the guideline · confirm')
    expect(e.basis).toBe('estimate')
    expect(e.source).toMatch(/ontario\.ca.*updated 2026-06-23/)
    expect(e.asOf).toBe('2026-09-16')
    expect(e.method).toMatch(/build year \(2019\)/)
    expect(e.method).toMatch(/2\.1% for 2026, 1\.9% for 2027/)
    expect(e.method).toMatch(/Not a score input/)
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

  it('travel times are published when routed and an estimate when the formula was used', () => {
    expect(entry(base({ travelTimesRouted: true }), 'travel_times')).toMatchObject({
      basis: 'published',
      value: 'routed',
    })
    expect(entry(base({ travelTimesRouted: false }), 'travel_times').basis).toBe('estimate')
    expect(buildAssumptionLedger(base()).find((x) => x.key === 'travel_times')).toBeUndefined()
  })

  it('the sun model\u2019s south assumption is a default until the user sets the facade', () => {
    expect(entry(base({ hasSunScout: true }), 'facade')).toMatchObject({
      basis: 'default',
      value: 'south (assumed)',
    })
    expect(buildAssumptionLedger(base()).find((x) => x.key === 'facade')).toBeUndefined()
    const rows = withFacadeRow(buildAssumptionLedger(base({ hasSunScout: true })), 270)
    const f = rows?.find((x) => x.key === 'facade')
    expect(f).toMatchObject({ basis: 'observed', value: 'west' })
    expect(rows?.filter((x) => x.key === 'facade').length).toBe(1)
    expect(withFacadeRow(null, 90)).toBeNull()
  })

  it('financing defaults are labelled as the starting case', () => {
    const dp = entry(base(), 'down_payment')
    expect(dp.value).toBe('20%')
    expect(dp.basis).toBe('default')
    expect(entry(base(), 'amortization').value).toBe('25 years')
  })
})
