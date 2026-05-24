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
  price: number | null            // null for rental listings
  rentMonthly: number | null      // null for sale listings
  beds: number
  baths: number
  sqft: number | null
  propertyType: PropertyType
  yearBuilt: number | null
  parkingSpots: number
  condoFeeMonthly: number | null
  condoFeeKnown: boolean
  annualTaxes: number | null
  description: string | null
  photos: string[]
  scrapedAt: string               // ISO 8601
}
