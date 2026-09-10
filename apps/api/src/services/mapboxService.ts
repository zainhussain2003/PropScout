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
  /**
   * Mapbox's 0–1 confidence in the match. Anything low is a fuzzy guess: the
   * string "asdfghjkl" scores 0.66 and resolves to a real street in Ingleside.
   */
  relevance: number
  /**
   * Postal code from the match, when Mapbox returned one. Null for a street or
   * neighbourhood centroid. The province gate depends on it, so a null here
   * means the match was not precise enough to analyse.
   */
  postalCode: string | null
  /** Municipality from the match, or null. */
  city: string | null
}

/**
 * Geocode a property address to lat/lng coordinates using Mapbox.
 * Returns null on any failure — the orchestrator degrades gracefully without coordinates.
 *
 * Returns null when:
 *   - MAPBOX_TOKEN is not set
 *   - The API request fails or times out
 *   - No results are returned for the address
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? ''

    if (!MAPBOX_TOKEN) {
      console.warn('geocodeAddress: MAPBOX_TOKEN is not set — skipping geocoding')
      return null
    }

    const encoded = encodeURIComponent(address.trim())
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
      `?access_token=${MAPBOX_TOKEN}&country=CA&types=address&limit=1`

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
      features?: Array<{
        center: [number, number]
        place_name: string
        relevance?: number
        // Mapbox returns the postal code either as its own context entry or, for
        // an exact address match, on the feature itself.
        properties?: { postcode?: string }
        context?: Array<{ id: string; text: string }>
      }>
    }

    if (!Array.isArray(json.features) || json.features.length === 0) {
      return null
    }

    const feature = json.features[0]
    // center is [longitude, latitude] — note the order
    const [lng, lat] = feature.center

    const context = feature.context ?? []
    const findContext = (prefix: string): string | null =>
      context.find((c) => c.id?.startsWith(prefix))?.text ?? null

    const postalCode = feature.properties?.postcode ?? findContext('postcode')
    const city = findContext('place') ?? findContext('locality')

    return {
      lat,
      lng,
      formattedAddress: feature.place_name,
      relevance: typeof feature.relevance === 'number' ? feature.relevance : 0,
      postalCode: postalCode ? postalCode.replace(/\s+/g, '').toUpperCase() : null,
      city,
    }
  } catch (err) {
    console.error(`geocodeAddress: error geocoding "${address}":`, err)
    return null
  }
}
