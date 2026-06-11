/**
 * Mapbox geocoding service.
 * Docs: https://docs.mapbox.com/api/search/geocoding/
 *
 * Requires MAPBOX_TOKEN in environment. Returns null (never throws) when the
 * token is absent or the geocoding request fails — callers treat geocoding as
 * a non-fatal enhancement (SunScout is skipped when lat/lng is unavailable).
 */

export interface GeocodingResult {
  lat: number
  lng: number
  formattedAddress: string
}

// Mapbox Geocoding API v5
const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

interface MapboxFeature {
  center: [number, number] // [lng, lat]
  place_name: string
}

interface MapboxGeocodeResponse {
  features: MapboxFeature[]
}

/**
 * Geocode a property address to lat/lng coordinates using Mapbox.
 *
 * Returns null when:
 *   - MAPBOX_TOKEN is not set
 *   - The API request fails
 *   - No results are returned for the address
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const token = process.env.MAPBOX_TOKEN
  if (!token) {
    return null
  }

  const encoded = encodeURIComponent(address.trim())
  const params = new URLSearchParams({
    access_token: token,
    country: 'CA',
    types: 'address',
    limit: '1',
  })

  let response: Response
  try {
    response = await fetch(`${MAPBOX_GEOCODING_URL}/${encoded}.json?${params.toString()}`)
  } catch (err) {
    console.warn('[mapboxService] geocodeAddress fetch failed:', String(err))
    return null
  }

  if (!response.ok) {
    console.warn(
      `[mapboxService] geocodeAddress returned HTTP ${response.status} for address: ${address}`
    )
    return null
  }

  let data: MapboxGeocodeResponse
  try {
    data = (await response.json()) as MapboxGeocodeResponse
  } catch (err) {
    console.warn('[mapboxService] geocodeAddress could not parse JSON response:', String(err))
    return null
  }

  if (!Array.isArray(data.features) || data.features.length === 0) {
    return null
  }

  const feature = data.features[0]
  const [lng, lat] = feature.center

  return {
    lat,
    lng,
    formattedAddress: feature.place_name,
  }
}
