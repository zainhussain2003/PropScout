/**
 * shimToPersonalProperty — the cost table uses the financing the engine ran
 * with, not the demo defaults (production run, 2026-09-12; D-074's rule).
 */

import { describe, it, expect } from 'vitest'
import { shimToPersonalProperty, shimToPersonalNeighbourhood } from './reportShims'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'
import { computeMonthlyCost } from '../data/personalBuyerData'
import { personalOwnershipCost } from '../../../api/src/services/personalOwnershipCost'

const LISTING: Listing = {
  id: 'l1',
  url: 'https://www.realtor.ca/real-estate/1/12-prado-court-toronto',
  listingType: 'for-sale',
  address: '12 Prado Court, Toronto, ON M6B 4L2',
  city: 'Toronto',
  province: 'ON',
  postalCode: 'M6B4L2',
  price: 1_550_000,
  rentMonthly: null,
  beds: 3,
  baths: 2,
  sqft: 1_500,
  propertyType: 'detached',
  yearBuilt: null,
  parkingSpots: 2,
  condoFeeMonthly: null,
  condoFeeKnown: false,
  annualTaxes: 5_331,
  description: null,
  photos: [],
  scrapedAt: '2026-09-12T00:00:00Z',
}

const BASE: Analysis = {
  id: 'a1',
  token: 't1',
  mode: 'personal',
  createdAt: '2026-09-12T00:00:00Z',
  metrics: null,
  dealScore: null,
  rentalComps: null,
  riskFlags: [],
  narrative: null,
  walkScore: null,
  neighbourhood: null,
  hasSanityWarnings: false,
}

describe('shimToPersonalProperty — financing', () => {
  it.each([null, 1970, 1990, 2019])(
    'keeps narrative and displayed cost models aligned for build year %s',
    (yearBuilt) => {
      const listing = { ...LISTING, yearBuilt }
      const property = shimToPersonalProperty(listing, BASE)
      const monthly = computeMonthlyCost(property, {
        downPct: property.defaultDownPct,
        rate: property.defaultRate,
        amort: property.defaultAmort,
      })
      expect(
        personalOwnershipCost({
          price: property.price,
          mortgageMonthly: monthly.mortgage,
          annualTaxes: property.annualTaxes,
          condoFeeMonthly: property.condoFeeMonthly,
          sqft: listing.sqft,
          yearBuilt,
        })
      ).toBeCloseTo(monthly.total, 8)
    }
  )
  it('shows a visitor-confirmed zero parking count while retaining unknown legacy zero', () => {
    expect(
      shimToPersonalProperty({ ...LISTING, parkingSpots: 0, enteredFields: ['parkingSpots'] }, BASE)
        .parking
    ).toBe('0 spots')
    expect(shimToPersonalProperty({ ...LISTING, parkingSpots: 0 }, BASE).parking).toContain(
      'not provided'
    )
  })
  it('keeps missing mobility absent and preserves a measured zero', () => {
    expect(shimToPersonalNeighbourhood(BASE)).toMatchObject({
      walkScore: null,
      transitScore: null,
      bikeScore: null,
    })
    expect(
      shimToPersonalNeighbourhood({
        ...BASE,
        walkScore: { walk: 0, transit: null, bike: 65, description: '', fetchedAt: '' },
      })
    ).toMatchObject({ walkScore: 0, transitScore: null, bikeScore: 65 })
  })
  it('reports the rate, down payment and amortization the analysis used', () => {
    const analysis: Analysis = {
      ...BASE,
      metrics: {
        cashFlowMonthly: 0,
        cashFlowAnnual: 0,
        capRate: 0,
        cashOnCashReturn: 0,
        dscr: 0,
        grm: 0,
        noi: 0,
        mortgagePaymentMonthly: 7_064,
        downPayment: 310_000,
        mortgageAmount: 1_240_000,
        amortizationYears: 30,
        mortgageRate: 0.0445,
        breakEvenRent: 0,
        closingCostsTotal: 0,
        lttProvincial: 0,
        lttMunicipal: 0,
        hasSanityWarnings: false,
      },
    }
    const p = shimToPersonalProperty(LISTING, analysis)
    expect(p.defaultRate).toBeCloseTo(0.0445, 6)
    expect(p.defaultDownPct).toBeCloseTo(0.2, 6)
    expect(p.defaultAmort).toBe(30)
  })

  it('falls back to the documented defaults only when there are no metrics', () => {
    const p = shimToPersonalProperty(LISTING, BASE)
    expect(p.defaultRate).toBeCloseTo(0.0479, 6)
    expect(p.defaultDownPct).toBeCloseTo(0.2, 6)
    expect(p.defaultAmort).toBe(25)
  })
})
