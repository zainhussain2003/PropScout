export type Province = 'ON'

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
  price: number | null
  rentMonthly: number | null
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
  scrapedAt: string
}
