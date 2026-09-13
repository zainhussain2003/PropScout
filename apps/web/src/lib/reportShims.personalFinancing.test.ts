/**
 * shimToPersonalProperty — the cost table uses the financing the engine ran
 * with, not the demo defaults (production run, 2026-09-12; D-074's rule).
 */

import { describe, it, expect } from 'vitest'
import { shimToPersonalProperty } from './reportShims'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'

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
