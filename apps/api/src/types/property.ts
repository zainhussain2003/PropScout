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
  /**
   * Counts a source may or may not provide (D-072 — one rule for every field
   * and every path):
   *
   *   null  → the source did not provide it. Rendered as "not provided",
   *           never as 0.
   *   n > 0 → the source said n.
   *   0     → treated as not provided by readers. Neither the Realtor.ca
   *           scraper (which writes 0 for a missing bedroom/bathroom count)
   *           nor rows stored before this rule can distinguish "zero" from
   *           "absent", and "— bed" is a floor where "0 bed" is a claim.
   *           The same reasoning D-060 applied to parking, applied uniformly.
   *
   * Nullable in the schema already; the API type used to collapse null to 0.
   */
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
  scrapedAt: string
}
