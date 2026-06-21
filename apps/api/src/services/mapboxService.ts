/* eslint-disable no-console */
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
 * Returns null on any failure — the orchestrator degrades gracefully without coordinates.
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? ''

    if (!MAPBOX_TOKEN) {
      console.warn('geocodeAddress: MAPBOX_TOKEN is not set — skipping geocoding')
      return null
    }

    const encoded = encodeURIComponent(address)
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
      `?access_token=${MAPBOX_TOKEN}&country=ca&limit=1`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    let res: Response
    try {
      res = await fetch(url, { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      console.warn(`geocodeAddress: Mapbox returned ${res.status} for address "${address}"`)
      return null
    }

    const json = (await res.json()) as {
      features?: Array<{ center: [number, number]; place_name: string }>
    }

    if (!json.features || json.features.length === 0) {
      return null
    }

    const feature = json.features[0]
    // center is [longitude, latitude] — note the order
    const lng = feature.center[0]
    const lat = feature.center[1]

    return { lat, lng, formattedAddress: feature.place_name }
  } catch (err) {
    console.error(`geocodeAddress: error geocoding "${address}":`, err)
    return null
  }
}
