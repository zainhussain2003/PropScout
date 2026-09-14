// Property and listing types

export type Province = 'ON' // MVP: Ontario only. BC and AB added in Phase 3.

export type PropertyType =
  | 'condo'
  | 'townhouse'
  | 'semi-detached'
  | 'detached'
  | 'multiplex'
  | 'commercial'
  /**
   * The source did not say (D-082). Used to default to 'condo' on the
   * address path and 'detached' on the row reader, so a house entered by
   * address was flagged for a missing condo fee and an unknown row read as
   * detached. Readers render this as "not provided" and nothing branches on it.
   */
  | 'unknown'

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
  /**
   * True when the source stated the bedroom count — so 0 means a studio, not
   * a gap (D-092). Absent on rows stored before this shipped and on the
   * address path (which asks for beds), where the D-072 rule applies alone.
   */
  bedsKnown?: boolean
  /** As bedsKnown, for bathrooms. */
  bathsKnown?: boolean
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
