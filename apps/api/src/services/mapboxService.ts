/**
 * Mapbox geocoding service.
 * Docs: https://docs.mapbox.com/api/search/geocoding/
 */

export interface GeocodingResult {
  lat: number
  lng: number
  formattedAddress: string
}

/**
 * Geocode a property address to lat/lng coordinates.
 */
export async function geocodeAddress(
  _address: string
): Promise<GeocodingResult | null> {
  // TODO: implement — requires MAPBOX_TOKEN
  throw new Error('geocodeAddress: not yet implemented')
}
