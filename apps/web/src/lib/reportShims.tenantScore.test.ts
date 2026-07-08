/**
 * Unit tests for the tenant hero score suppression.
 *
 * The "Tenant score" is currently the investment deal score. When there are no
 * comparable rentals for the area, the for-rent valuation falls back to proxies
 * and the deal score craters to a misleading "Hard pass". shimToTenantListingData
 * must flag `scoreSuppressed` in that case so the hero hides the gauge and shows
 * an honest "can't assess rent" state instead — matching §01's no-comps state.
 */

import { describe, it, expect } from 'vitest'
import { shimToTenantListingData } from './reportShims'
import type { Analysis, DealScore, RentalEstimate } from '../types/analysis'
import type { Listing } from '../types/property'

const HARD_PASS_SCORE: DealScore = {
  total: 16,
  displayTotal: 16,
  verdict: 'hard_pass',
  breakdown: {
    capRate: 0,
    cashFlow: 0,
    cashOnCash: 0,
    dscr: 0,
    demand: 0,
    subtotal: 16,
    deduction: 0,
    componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
  },
}

const COMPS: RentalEstimate = {
  low: 2600,
  mid: 2900,
  high: 3200,
  compCount: 8,
  confidence: 'medium',
  postalCode: 'M4Y1L9',
}

const LISTING: Listing = {
  id: 'l1',
  url: 'https://realtor.ca/x',
  listingType: 'for-rent',
  address: '123 Test St, Vaughan',
  city: 'Vaughan',
  province: 'ON',
  postalCode: 'L4K0P8',
  price: null,
  rentMonthly: 2500,
  beds: 2,
  baths: 2,
  sqft: 800,
  propertyType: 'condo',
  yearBuilt: 2019,
  parkingSpots: 1,
  condoFeeMonthly: null,
  condoFeeKnown: false,
  annualTaxes: null,
  description: null,
  photos: [],
  scrapedAt: '2026-07-07T00:00:00Z',
}

function baseAnalysis(rentalComps: RentalEstimate | null): Analysis {
  return {
    id: 'a1',
    token: 't1',
    mode: 'tenant',
    createdAt: '2026-07-07T00:00:00Z',
    metrics: null,
    dealScore: HARD_PASS_SCORE,
    rentalComps,
    riskFlags: [],
    narrative: 'A perfectly fine apartment. Nothing alarming here.',
    walkScore: null,
    neighbourhood: null,
    hasSanityWarnings: false,
    sunScout: null,
  }
}

describe('shimToTenantListingData — score suppression', () => {
  it('suppresses the tenant score when there are no comps (proxy fallback craters the deal score)', () => {
    const data = shimToTenantListingData(LISTING, baseAnalysis(null))
    expect(data.scoreSuppressed).toBe(true)
  })

  it('suppresses when comps exist but the count is zero', () => {
    const data = shimToTenantListingData(LISTING, baseAnalysis({ ...COMPS, compCount: 0 }))
    expect(data.scoreSuppressed).toBe(true)
  })

  it('shows a purpose-built tenant score (not the investment deal score) when comps exist', () => {
    // LISTING asks 2500 vs comp median 2900 (below market), no flags, no
    // walk/light → the tenant score should be strong, NOT the deal score's
    // "16 · hard pass". This is the whole point of the redesign.
    const data = shimToTenantListingData(LISTING, baseAnalysis(COMPS))
    expect(data.scoreSuppressed).toBe(false)
    expect(data.scoreNumber).not.toBe(16) // no longer the investment deal score
    expect(data.scoreNumber).toBeGreaterThanOrEqual(75)
    expect(data.scoreTone).toBe('pass')
    expect(data.verdictLabel).toBe('Fair rent')
  })
})
