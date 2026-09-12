// Property and listing types

export type Province = 'ON' // MVP: Ontario only. BC and AB added in Phase 3.

export type PropertyType =
  | 'condo'
  | 'townhouse'
  | 'semi-detached'
  | 'detached'
  | 'multiplex'
  | 'commercial'

export type ListingType = 'for-sale' | 'for-rent'

export interface Listing {
  id: string
  url: string
  listingType: ListingType
  address: string
  city: string
  province: Province
  postalCode: string
  price: number | null // null for rental listings
  rentMonthly: number | null // null for sale listings
  // Counts a source may not provide. null = not provided; readers also treat
  // 0 as not provided — see lib/listingFacts.ts (D-072). Never render these
  // directly; go through listingFacts so every report says the same thing.
  beds: number | null
  baths: number | null
  sqft: number | null
  propertyType: PropertyType
  yearBuilt: number | null
  parkingSpots: number | null
  condoFeeMonthly: number | null
  condoFeeKnown: boolean
  annualTaxes: number | null
  description: string | null
  photos: string[]
  scrapedAt: string // ISO 8601
}
