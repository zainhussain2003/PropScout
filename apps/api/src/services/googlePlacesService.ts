/* eslint-disable no-console */
/**
 * Google Places API service — used for school discovery.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/search-nearby
 *
 * Uses the legacy Nearby Search endpoint (rankby=distance, type=school) which
 * remains the cheapest option for "schools within X km of a coordinate" today.
 *
 * Returns [] (never throws) when:
 *   - GOOGLE_PLACES_KEY is not set
 *   - The API request fails
 *   - No results
 *
 * The Google API returns up to 20 places per page; for our use case (need
 * ~3 per type) we only consume the first page.
 *
 * Bucketing schools into elementary / middle / high uses keyword heuristics
 * since Google Places doesn't expose grade ranges. False positives are
 * acceptable — the UI dedupes by name anyway.
 */

const NEARBY_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'

export interface School {
  name: string
  type: 'elementary' | 'middle' | 'high'
  board: 'public' | 'catholic' | 'french'
  distanceKm: number
  rating: number | null
}

interface PlaceResult {
  name?: string
  rating?: number
  geometry?: { location?: { lat: number; lng: number } }
}

interface NearbyResponse {
  status?: string
  results?: PlaceResult[]
  error_message?: string
}

/** Haversine distance between two lat/lng points, in km. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number): number => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Classify a school by name keywords. Public default. */
function classifyType(name: string): School['type'] {
  const n = name.toLowerCase()
  if (/(secondary|high school|collegiate|académie|composite)/i.test(n)) return 'high'
  if (/(middle|junior high|intermediate)/i.test(n)) return 'middle'
  return 'elementary'
}

/** Best-effort board detection from the school name. */
function classifyBoard(name: string): School['board'] {
  const n = name.toLowerCase()
  if (/(catholic|st\.|saint|sacred|holy|notre dame)/i.test(n)) return 'catholic'
  if (/(école|conseil scolaire|francophone|csv|csvio|cscm|cspg)/i.test(n)) return 'french'
  return 'public'
}

/**
 * Find nearby schools for a given property location.
 * Returns at most 20 schools (Google's per-page max), sorted by distance.
 */
export async function getNearbySchools(lat: number, lng: number): Promise<School[]> {
  const key = process.env.GOOGLE_PLACES_KEY
  if (!key) {
    console.warn('getNearbySchools: GOOGLE_PLACES_KEY is not set — returning []')
    return []
  }

  const url = `${NEARBY_SEARCH_URL}?location=${lat},${lng}&rankby=distance&type=school&key=${key}`

  let res: Response
  try {
    res = await fetch(url)
  } catch (err) {
    console.error('getNearbySchools: fetch failed', err)
    return []
  }

  if (!res.ok) {
    console.warn(`getNearbySchools: HTTP ${res.status}`)
    return []
  }

  let data: NearbyResponse
  try {
    data = (await res.json()) as NearbyResponse
  } catch (err) {
    console.error('getNearbySchools: JSON parse failed', err)
    return []
  }

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.warn(
      `getNearbySchools: API status=${data.status ?? 'unknown'} ${data.error_message ?? ''}`
    )
    return []
  }

  const places = data.results ?? []
  const schools: School[] = []
  for (const p of places) {
    const name = p.name?.trim()
    const loc = p.geometry?.location
    if (!name || !loc) continue
    schools.push({
      name,
      type: classifyType(name),
      board: classifyBoard(name),
      distanceKm: Number(haversineKm(lat, lng, loc.lat, loc.lng).toFixed(2)),
      rating: typeof p.rating === 'number' ? p.rating : null,
    })
  }

  schools.sort((a, b) => a.distanceKm - b.distanceKm)
  return schools
}

/**
 * Convenience: filter to nearest N per type for the report UI.
 */
export function pickNearestPerType(schools: School[], perType = 3): School[] {
  const buckets: Record<School['type'], School[]> = { elementary: [], middle: [], high: [] }
  for (const s of schools) {
    if (buckets[s.type].length < perType) {
      buckets[s.type].push(s)
    }
  }
  return [...buckets.elementary, ...buckets.middle, ...buckets.high]
}
