/** Small-beta address lookup: one API instance, no autocomplete or bulk import. */
import type { GeocodingResult } from './mapboxService'

interface Match {
  lat?: string
  lon?: string
  display_name?: string
  address?: {
    house_number?: string
    road?: string
    postcode?: string
    country_code?: string
    city?: string
    town?: string
    village?: string
  }
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '')

function queryParts(address: string): {
  street: string
  house: string | undefined
  road: string
  city: string
  postal: string | null
} {
  const parts = address.replace(/^\s*[a-z]*\d+[a-z]*\s*-\s*(?=\d)/i, '').split(',')
  const street = parts[0].trim()
  const house = street.match(/^(\d+[a-z]?)\s+/i)?.[1]
  const road = street.replace(/^\d+[a-z]?\s+/i, '')
  const city = (parts[1] ?? '').replace(/\([^)]*\)/g, '').trim()
  const postal = address.match(/\b([A-Z]\d[A-Z])\s*(\d[A-Z]\d)\b/i)
  return { street, house, road, city, postal: postal ? postal[1] + postal[2] : null }
}

const roadKey = (road: string): string =>
  normalize(
    road
      .replace(/\b(street|st)\b/gi, 'st')
      .replace(/\b(avenue|ave)\b/gi, 'ave')
      .replace(/\b(road|rd)\b/gi, 'rd')
      .replace(/\b(drive|dr)\b/gi, 'dr')
      .replace(/\b(boulevard|blvd)\b/gi, 'blvd')
  )

/** Never accept a nearby street, wrong house, city or postal district as a match. */
export function selectNominatimMatch(address: string, matches: Match[]): GeocodingResult | null {
  const query = queryParts(address)
  if (!query.house || !query.road || (!query.city && !query.postal)) return null
  const accepted = matches.filter((match) => {
    const fields = match.address
    const city = fields?.city ?? fields?.town ?? fields?.village
    return (
      fields?.country_code === 'ca' &&
      normalize(fields.house_number ?? '') === normalize(query.house!) &&
      roadKey(fields.road ?? '') === roadKey(query.road) &&
      (!query.city || normalize(city ?? '') === normalize(query.city)) &&
      (!query.postal ||
        normalize(fields.postcode ?? '').slice(0, 3) === normalize(query.postal).slice(0, 3)) &&
      typeof match.lat === 'string' &&
      match.lat.trim() !== '' &&
      typeof match.lon === 'string' &&
      match.lon.trim() !== '' &&
      Number.isFinite(Number(match.lat)) &&
      Number.isFinite(Number(match.lon)) &&
      Math.abs(Number(match.lat)) <= 90 &&
      Math.abs(Number(match.lon)) <= 180
    )
  })
  // Ambiguous addresses need a better input, rather than a plausible-looking guess.
  if (accepted.length !== 1) return null
  const match = accepted[0]
  const fields = match.address!
  return {
    lat: Number(match.lat),
    lng: Number(match.lon),
    formattedAddress: match.display_name ?? address,
    // This is our strict identity gate, NOT an OSM confidence measurement.
    relevance: 1,
    postalCode: fields.postcode?.replace(/\s+/g, '').toUpperCase() ?? null,
    city: fields.city ?? fields.town ?? fields.village ?? null,
  }
}

const cache = new Map<string, { result: GeocodingResult | null; expires: number }>()
let queued = 0
let tail: Promise<unknown> = Promise.resolve()
let lastStarted = 0

export async function geocodeNominatim(address: string): Promise<GeocodingResult | null> {
  const contact = process.env.NOMINATIM_CONTACT_EMAIL?.trim()
  if (!contact || address.length > 250 || queued >= 5) return null
  const query = queryParts(address)
  if (!query.house || (!query.city && !query.postal)) return null
  const key = normalize(address)
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.result
  queued++
  const operation = tail.then(async () => {
    // Recheck after queued callers: identical concurrent inputs use one request.
    const existing = cache.get(key)
    if (existing && existing.expires > Date.now()) return existing.result
    const pause = Math.max(0, lastStarted + 1100 - Date.now())
    if (pause) await new Promise((resolve) => setTimeout(resolve, pause))
    lastStarted = Date.now()
    const params = new URLSearchParams({
      street: query.street,
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'ca',
      limit: '3',
    })
    if (query.city) params.set('city', query.city)
    if (query.postal) params.set('postalcode', query.postal)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': `PropScoutBeta/1.0 (${contact})` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return null
    const data: unknown = await response.json()
    const result = Array.isArray(data) ? selectNominatimMatch(address, data) : null
    if (cache.size >= 1000) cache.delete(cache.keys().next().value!)
    cache.set(key, { result, expires: Date.now() + (result ? 7 * 86400000 : 60000) })
    return result
  })
  tail = operation.catch(() => null)
  try {
    return await operation
  } catch {
    return null
  } finally {
    queued--
  }
}
