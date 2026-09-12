/**
 * reportShims — counts a source did not provide render the same way on every
 * report (D-072).
 *
 * Before this the same unknown showed as "0 bath" on the investor hero,
 * "0 beds" in the mode modal, "Not listed" in the tenant spec table and "—"
 * on the personal report, and a zero in the database could not be told from
 * a gap. Every shim now goes through lib/listingFacts; these assert that no
 * report path still invents a zero.
 */

import { describe, it, expect } from 'vitest'
import {
  shimToListingData,
  shimToPersonalProperty,
  shimToLandlordProperty,
  shimToTenantListingData,
  shimToTenantSpecRows,
  shimToTenantAmenities,
  shimToTenantCostLines,
  shimToTenantChecklist,
} from './reportShims'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'

/** An address-entered listing: beds given, baths left blank, parking never asked. */
const MANUAL: Listing = {
  id: 'l1',
  url: '',
  listingType: 'for-sale',
  address: '701 Sheppard Ave W, Toronto',
  city: 'Toronto',
  province: 'ON',
  postalCode: 'M3H0B2',
  price: 650_000,
  rentMonthly: null,
  beds: 2,
  baths: null,
  sqft: null,
  propertyType: 'condo',
  yearBuilt: null,
  parkingSpots: null,
  condoFeeMonthly: null,
  condoFeeKnown: false,
  annualTaxes: null,
  description: null,
  photos: [],
  scrapedAt: '2026-09-12T00:00:00Z',
}

/** A row stored before the rule, where 0 meant "absent". */
const LEGACY_ZERO: Listing = { ...MANUAL, id: 'l2', baths: 0, parkingSpots: 0 }

const ANALYSIS: Analysis = {
  id: 'a1',
  token: 't1',
  mode: 'investor',
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

describe.each([
  ['null (address path)', MANUAL],
  ['zero (legacy row)', LEGACY_ZERO],
])('an unknown bathroom / parking count stored as %s', (_label, listing) => {
  it('investor listing data never claims 0 baths or 0 parking', () => {
    const data = shimToListingData(listing, { ...ANALYSIS, mode: 'investor' })
    expect(data.beds).toBe('2')
    expect(data.baths).toBe('—')
    expect(data.parking).toBe('— parking · not provided')
  })

  it('personal and landlord property views agree with it', () => {
    const personal = shimToPersonalProperty(listing, { ...ANALYSIS, mode: 'personal' })
    const landlord = shimToLandlordProperty(listing, { ...ANALYSIS, mode: 'landlord' })
    for (const view of [personal, landlord]) {
      expect(view.baths).toBe('—')
      expect(view.parking).toBe('— parking · not provided')
    }
  })

  it('tenant views say "not listed" rather than 0', () => {
    const tenant = { ...ANALYSIS, mode: 'tenant' as const }
    const rental: Listing = { ...listing, listingType: 'for-rent', price: null, rentMonthly: 2_400 }

    const rows = shimToTenantSpecRows(rental)
    const byLabel = new Map(rows.unitRows)
    expect(byLabel.get('Bedrooms')).toBe('2 bedrooms')
    expect(byLabel.get('Bathrooms')).toBe('Not listed')
    expect(byLabel.get('Parking')).toBe('Not listed')

    expect(shimToTenantListingData(rental, tenant).baths).toBe('—')
    expect(shimToTenantAmenities(rental)[0].note).toBe('not listed — confirm')
    const parkingLine = shimToTenantCostLines(rental, tenant).find((l) => l.k === 'Parking')
    expect(parkingLine?.note).toBe('not listed — confirm')
    const parkingItem = shimToTenantChecklist(rental, tenant).find((i) => /parking/i.test(i.label))
    expect(parkingItem?.label).toMatch(/Is parking available/)
  })

  it('leaves no "0 bath" or "0 space" anywhere in any view', () => {
    const rental: Listing = { ...listing, listingType: 'for-rent', price: null, rentMonthly: 2_400 }
    const everything = JSON.stringify([
      shimToListingData(listing, ANALYSIS),
      shimToPersonalProperty(listing, ANALYSIS),
      shimToLandlordProperty(listing, ANALYSIS),
      shimToTenantListingData(rental, ANALYSIS),
      shimToTenantSpecRows(rental),
      shimToTenantAmenities(rental),
      shimToTenantCostLines(rental, ANALYSIS),
      shimToTenantChecklist(rental, ANALYSIS),
    ])
    expect(everything).not.toMatch(/\b0 (bath|baths|bathroom|space|spaces|spot|spots|parking)\b/)
  })
})

describe('a provided count is still shown', () => {
  it('renders 1.5 baths and 2 parking spots as given', () => {
    const given: Listing = { ...MANUAL, baths: 1.5, parkingSpots: 2 }
    const data = shimToListingData(given, ANALYSIS)
    expect(data.baths).toBe('1.5')
    expect(data.parking).toBe('2 spots')
    expect(shimToTenantSpecRows(given).unitRows.find(([k]) => k === 'Parking')?.[1]).toBe(
      '2 spaces'
    )
  })
})
