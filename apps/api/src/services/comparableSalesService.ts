/**
 * comparableSalesService — recent comparable sales near a property.
 *
 * Spec §7.3: "last 10 similar sales within 1km, same property type: address, sale
 * price, sqft, beds/baths, sale date, price per sqft."
 *
 * Provider: **Repliers** (https://repliers.com) — REST MLS aggregator.
 * Sold listings are `status=U` (unavailable) with `lastStatus=Sld`.
 *
 * ── Why a provider at all ────────────────────────────────────────────────────
 * Canadian sold prices are licensed data. Unlike the US there is no free or
 * public source for what a given address sold for; CREA and the local boards
 * control it, and every consumer site showing sold data is a licensee. Estimating
 * a sale price from asking prices would be a fabrication, so the report shows an
 * honest empty state whenever this returns nothing. See docs/DECISIONS.md D-014.
 *
 * ── Coverage caveat on the current key ───────────────────────────────────────
 * The free Repliers key returns **US sample data only** (WA, CO, TN, FL, …) with
 * zero Canadian listings. The record shape is identical to production, so the
 * whole integration is built and tested against it — but it cannot return comps
 * for a real Ontario address. Until the account is on a plan covering TRREB,
 * every real report falls through to the honest empty state. Swapping is a key
 * change, not a code change.
 *
 * Returns [] (never throws) when:
 *   - REPLIERS_API_KEY is not set
 *   - the request fails or times out
 *   - no sold listings match
 */

import type { ComparableSale } from '../types/analysis'

const REPLIERS_BASE_URL = 'https://api.repliers.io/listings'

/** Search radius in km — spec §7.3 says "within 1km". */
const SEARCH_RADIUS_KM = 1

/** Spec §7.3: "last 10 similar sales". */
const MAX_COMPS = 10

/**
 * How far back a sale still counts as comparable. Older sales say less about
 * today's market, and a stale comp is worse than one fewer comp.
 */
const MAX_SALE_AGE_DAYS = 365

const REQUEST_TIMEOUT_MS = 8_000

/**
 * Downtown Tacoma — inside the free key's US sample coverage and dense enough
 * that a 1km radius returns recent sales. Used ONLY when REPLIERS_SAMPLE_MODE is
 * explicitly enabled, so the comps section can be exercised before the account is
 * on a plan covering Ontario.
 */
const SAMPLE_MODE_COORDS: readonly [number, number] = [47.2529, -122.4443]

/** A single listing as Repliers returns it. Only the fields we consume. */
interface RepliersListing {
  soldPrice?: number | string
  soldDate?: string
  address?: {
    streetNumber?: string
    streetName?: string
    streetSuffix?: string
    unitNumber?: string
    city?: string
  }
  details?: {
    numBedrooms?: number | string
    numBathrooms?: number | string
    sqft?: number | string
  }
}

interface RepliersResponse {
  count?: number
  listings?: RepliersListing[]
}

/** Coerce Repliers' loosely-typed numerics; returns null when unusable. */
function num(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** "12 Main St W, Toronto" from Repliers' split address fields. */
function formatAddress(a: RepliersListing['address']): string | null {
  if (!a) return null
  const street = [a.streetNumber, a.streetName, a.streetSuffix]
    .map((p) => (p ?? '').toString().trim())
    .filter(Boolean)
    .join(' ')
  if (!street) return null
  const unit = (a.unitNumber ?? '').toString().trim()
  const head = unit ? `${unit} - ${street}` : street
  const city = (a.city ?? '').toString().trim()
  return city ? `${head}, ${city}` : head
}

/** "Mar 2026" — matches the format the report renders. */
function formatSaleDate(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.toLocaleString('en-CA', { month: 'short', timeZone: 'UTC' })} ${d.getUTCFullYear()}`
}

/** Whole dollars, no cents — sale prices are never meaningfully fractional. */
function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('en-CA')}`
}

/** True when the sale is recent enough to still be comparable. */
function isRecentEnough(iso: string | undefined, now: Date): boolean {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const ageDays = (now.getTime() - d.getTime()) / 86_400_000
  return ageDays >= 0 && ageDays <= MAX_SALE_AGE_DAYS
}

/**
 * Map one Repliers listing to a report comp, or null if it is unusable.
 *
 * A comp with no sale price, no address or no date is dropped rather than shown
 * with a blank or a guessed value — the report's rule is that a number is either
 * sourced or absent.
 */
export function toComparableSale(
  listing: RepliersListing,
  now: Date = new Date()
): ComparableSale | null {
  const soldPrice = num(listing.soldPrice)
  const addr = formatAddress(listing.address)
  const date = formatSaleDate(listing.soldDate)
  if (soldPrice === null || addr === null || date === null) return null
  if (!isRecentEnough(listing.soldDate, now)) return null

  const beds = num(listing.details?.numBedrooms)
  const sqft = num(listing.details?.sqft)

  return {
    addr,
    // Just the count — the report renders "{beds} bed · {sqft} sqft", so including
    // the word here produced "1 bed · 1 bath bed". Baths are dropped rather than
    // squeezed in: the row has no slot for them.
    beds: beds === null ? '—' : String(beds),
    sqft: sqft ?? 0,
    sold: formatMoney(soldPrice),
    soldPrice,
    date,
    pricePerSqft: sqft !== null ? Math.round(soldPrice / sqft) : null,
  }
}

/**
 * Recent comparable sales within 1km of a property.
 *
 * @param lat - property latitude
 * @param lng - property longitude
 * @returns up to 10 sales, newest first; [] when unavailable for any reason
 */
export async function getComparableSales(lat: number, lng: number): Promise<ComparableSale[]> {
  const key = process.env.REPLIERS_API_KEY
  if (!key) {
    // Not an error: the provider is optional and the report degrades honestly.
    return []
  }

  const sampleMode = process.env.REPLIERS_SAMPLE_MODE === 'true'
  // In sample mode, query a location the sample dataset actually covers so the
  // rendering path can be exercised end to end. The addresses stay REAL and
  // unmodified — they are simply somewhere else, which is why the payload flags
  // them and the report labels them. See getComparableSalesWithProvenance.
  const [qLat, qLng] = sampleMode ? SAMPLE_MODE_COORDS : [lat, lng]

  const url =
    `${REPLIERS_BASE_URL}?lat=${qLat}&long=${qLng}&radius=${SEARCH_RADIUS_KM}` +
    `&status=U&lastStatus=Sld&resultsPerPage=${MAX_COMPS * 3}&pageNum=1`

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'REPLIERS-API-KEY': key },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    console.error('[comparableSalesService] request failed', err)
    return []
  }

  if (!res.ok) {
    console.warn(`[comparableSalesService] HTTP ${res.status}`)
    return []
  }

  let data: RepliersResponse
  try {
    data = (await res.json()) as RepliersResponse
  } catch (err) {
    console.error('[comparableSalesService] JSON parse failed', err)
    return []
  }

  const now = new Date()
  // Over-fetch then filter: the API cannot express "has a sold price AND a usable
  // address AND is recent", so some rows are always discarded.
  const comps = (data.listings ?? [])
    .map((l) => toComparableSale(l, now))
    .filter((c): c is ComparableSale => c !== null)

  comps.sort((a, b) => b.soldPrice - a.soldPrice)
  return comps.slice(0, MAX_COMPS)
}

/**
 * Fair-market-value band from the comps' price per square foot.
 *
 * Uses price/sqft rather than raw sale price so a 600 sqft condo is not compared
 * against a 2,000 sqft house on the same street. Returns null when fewer than
 * three comps carry a usable sqft — two points is not a distribution, and a band
 * drawn from them would look authoritative while meaning nothing.
 *
 * @param comps - comparable sales from getComparableSales
 * @param subjectSqft - the subject property's square footage
 * @returns low/mid/high value band, or null when there is not enough to say
 */
export function deriveFmvBand(
  comps: ComparableSale[],
  subjectSqft: number
): { low: number; mid: number; high: number; basedOn: number } | null {
  if (subjectSqft <= 0) return null
  const psf = comps
    .map((c) => c.pricePerSqft)
    .filter((p): p is number => p !== null && p > 0)
    .sort((a, b) => a - b)
  if (psf.length < 3) return null

  const at = (q: number): number => psf[Math.min(psf.length - 1, Math.floor(q * psf.length))]
  return {
    low: Math.round(at(0.25) * subjectSqft),
    mid: Math.round(at(0.5) * subjectSqft),
    high: Math.round(at(0.75) * subjectSqft),
    basedOn: psf.length,
  }
}

/**
 * Comparable sales plus whether they describe this property's actual neighbourhood.
 *
 * `isSample` is true when REPLIERS_SAMPLE_MODE returned comps from the sample
 * dataset's coverage area instead of the subject's. The addresses and prices are
 * real MLS records — they are simply somewhere else — so the report MUST label
 * them rather than present them as local comparables.
 *
 * Rewriting those addresses to plausible GTA ones was considered and rejected: it
 * would produce a report stating that a specific Toronto address sold for a
 * specific price, which is not true of any real transaction. That is the same
 * fabrication removed in D-004, and it is far more dangerous here because sale
 * prices are the number a buyer would act on.
 *
 * @param lat - property latitude
 * @param lng - property longitude
 */
export async function getComparableSalesWithProvenance(
  lat: number,
  lng: number
): Promise<{ comps: ComparableSale[]; isSample: boolean }> {
  const comps = await getComparableSales(lat, lng)
  const isSample = process.env.REPLIERS_SAMPLE_MODE === 'true' && comps.length > 0
  return { comps, isSample }
}
