import type { Listing } from '../types/property'

/** Visitor corrections to a partially scraped listing, scoped to one report. */
export type ManualListingFields = Partial<
  Pick<
    Listing,
    | 'price'
    | 'rentMonthly'
    | 'beds'
    | 'baths'
    | 'sqft'
    | 'annualTaxes'
    | 'yearBuilt'
    | 'condoFeeMonthly'
    | 'parkingSpots'
  >
>

/** Keep the shared source listing untouched; only the completed report gets these values. */
export function applyManualListingFields(
  listing: Listing,
  fields: ManualListingFields | undefined
): Listing {
  if (fields == null || Object.keys(fields).length === 0) return listing
  const enteredFields = [...new Set([...(listing.enteredFields ?? []), ...Object.keys(fields)])]
  return {
    ...listing,
    ...fields,
    bedsKnown: fields.beds !== undefined ? true : listing.bedsKnown,
    bathsKnown: fields.baths !== undefined ? true : listing.bathsKnown,
    condoFeeKnown: fields.condoFeeMonthly !== undefined ? true : listing.condoFeeKnown,
    enteredFields,
  }
}
