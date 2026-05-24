/**
 * Google Places API service — used for school discovery.
 * Docs: https://developers.google.com/maps/documentation/places/web-service
 */

export interface School {
  name: string
  type: 'elementary' | 'middle' | 'high'
  board: 'public' | 'catholic' | 'french'
  distanceKm: number
  rating: number | null
}

/**
 * Find nearby schools for a given property location.
 */
export async function getNearbySchools(
  _lat: number,
  _lng: number
): Promise<School[]> {
  // TODO: implement — requires GOOGLE_PLACES_KEY
  throw new Error('getNearbySchools: not yet implemented')
}
