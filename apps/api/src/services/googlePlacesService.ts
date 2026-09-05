/* eslint-disable no-console */
/**
 * Google Places API service — nearby amenity distances and school discovery.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/search-nearby
 *
 * Both lookups use **Places API (New)**. The legacy `maps.googleapis.com/.../
 * place/nearbysearch/json` endpoint this file used to call for schools is no
 * longer activatable on Google Cloud projects — it answers every request with
 * `REQUEST_DENIED: You're calling a legacy API, which is not enabled for your
 * project`, regardless of the key. Migrated 2026-09-05.
 *
 * Requires "Places API (New)" enabled (and billing attached) on the project
 * owning GOOGLE_PLACES_KEY. Without it every call returns HTTP 403
 * PERMISSION_DENIED and these functions degrade to [] as designed.
 *
 * Returns [] (never throws) when:
 *   - GOOGLE_PLACES_KEY is not set
 *   - The API request fails
 *   - No results
 *
 * NOTE: the report's school section is served by `supabaseService.getNearbySchools`
 * (the EQAO/Fraser `schools` table), not by this module. `getNearbySchools` here
 * is the Places-backed alternative and is currently not wired into any route.
 *
 * The Google API returns up to 20 places per page; for our use case (need
 * ~3 per type) we only consume the first page.
 *
 * Bucketing schools into elementary / middle / high uses keyword heuristics
 * since Google Places doesn't expose grade ranges. False positives are
 * acceptable — the UI dedupes by name anyway.
 */

const NEARBY_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchNearby'

/** Search radius for school discovery, in metres. */
const SCHOOL_SEARCH_RADIUS_M = 8000

/** Google Place types that denote a school. */
const SCHOOL_PLACE_TYPES = ['school', 'primary_school', 'secondary_school']

export interface School {
  name: string
  type: 'elementary' | 'middle' | 'high'
  board: 'public' | 'catholic' | 'french'
  distanceKm: number
  rating: number | null
}

/** A single place in a Places API (New) searchNearby response. */
interface PlaceResult {
  displayName?: { text?: string }
  rating?: number
  location?: { latitude?: number; longitude?: number }
}

interface NearbyResponse {
  places?: PlaceResult[]
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

  let res: Response
  try {
    res = await fetch(NEARBY_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.rating',
      },
      body: JSON.stringify({
        includedTypes: SCHOOL_PLACE_TYPES,
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: SCHOOL_SEARCH_RADIUS_M,
          },
        },
      }),
    })
  } catch (err) {
    console.error('getNearbySchools: fetch failed', err)
    return []
  }

  // Places API (New) signals every error through the HTTP status (403 when the
  // API is not enabled on the project), not through a body `status` field.
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

  const places = data.places ?? []
  const schools: School[] = []
  for (const p of places) {
    const name = p.displayName?.text?.trim()
    const loc = p.location
    if (!name || loc?.latitude == null || loc?.longitude == null) continue
    schools.push({
      name,
      type: classifyType(name),
      board: classifyBoard(name),
      distanceKm: Number(haversineKm(lat, lng, loc.latitude, loc.longitude).toFixed(2)),
      rating: typeof p.rating === 'number' ? p.rating : null,
    })
  }

  schools.sort((a, b) => a.distanceKm - b.distanceKm)
  return schools
}

// ── Nearby distances (transit / grocery / highway) ─────────────────────────────

export interface NearbyDistance {
  key: string // 'transit' | 'grocery' | 'highway' | 'pharmacy'
  label: string // display label, e.g. "Nearest transit"
  distanceKm: number
  /** Rough driving-time estimate from the straight-line distance (~30 km/h urban). */
  driveMin: number
}

// Places API (New) Text Search. Text Search + rankPreference DISTANCE + a
// location bias gives us the nearest match for a free-text query, and covers
// highway on-ramps (which have no place type — so searchNearby cannot find them).
// Needs "Places API (New)" enabled on the GOOGLE_PLACES_KEY project.
const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const SEARCH_RADIUS_M = 8000

// What we look up around the listing, as free-text queries.
const DISTANCE_TARGETS: Array<{ key: string; label: string; query: string }> = [
  { key: 'transit', label: 'Nearest transit', query: 'transit station' },
  { key: 'grocery', label: 'Grocery store', query: 'grocery store' },
  { key: 'highway', label: 'Highway on-ramp', query: 'highway on-ramp' },
  { key: 'pharmacy', label: 'Pharmacy', query: 'pharmacy' },
]

interface TextSearchResponse {
  places?: Array<{ location?: { latitude?: number; longitude?: number } }>
}

/** Nearest place matching a text query, as a straight-line distance in km, or null. */
async function nearestPlaceKm(
  lat: number,
  lng: number,
  key: string,
  target: { query: string }
): Promise<number | null> {
  try {
    const res = await fetch(TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.location',
      },
      body: JSON.stringify({
        textQuery: target.query,
        maxResultCount: 1,
        rankPreference: 'DISTANCE',
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius: SEARCH_RADIUS_M },
        },
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as TextSearchResponse
    const loc = (data.places ?? [])[0]?.location
    if (loc?.latitude == null || loc?.longitude == null) return null
    return Number(haversineKm(lat, lng, loc.latitude, loc.longitude).toFixed(2))
  } catch (err) {
    console.error(`nearestPlaceKm(${target.query}): failed`, err)
    return null
  }
}

/**
 * Distances from the listing to the nearest transit stop, grocery store, highway
 * on-ramp, and pharmacy — computed from the listing coordinates via Google Places.
 * Returns [] (never throws) when GOOGLE_PLACES_KEY is unset; individual targets
 * that return nothing are simply omitted (the UI shows "unavailable" then).
 */
export async function getNearbyDistances(lat: number, lng: number): Promise<NearbyDistance[]> {
  const key = process.env.GOOGLE_PLACES_KEY
  if (!key) {
    console.warn('getNearbyDistances: GOOGLE_PLACES_KEY is not set — returning []')
    return []
  }
  const out: NearbyDistance[] = []
  for (const target of DISTANCE_TARGETS) {
    const km = await nearestPlaceKm(lat, lng, key, target)
    if (km == null) continue
    out.push({
      key: target.key,
      label: target.label,
      distanceKm: km,
      driveMin: Math.max(1, Math.round((km / 30) * 60)),
    })
  }
  return out
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
