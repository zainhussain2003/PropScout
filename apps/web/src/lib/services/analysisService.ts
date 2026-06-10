/**
 * Analysis service — calls the Fastify API's POST /analysis endpoint.
 *
 * Responsibilities:
 *   - Convert camelCase frontend types → snake_case request body
 *   - POST to the Fastify API (never to the Python calc engine directly)
 *   - Return a fully typed Analysis object on success
 *   - Throw ApiRequestError with a user-facing message on failure
 */

import type { PropertyInput, FinancingInput, RentalInput } from '../../types/api'
import type { Analysis } from '../../types/analysis'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

// ── Fastify request body (camelCase — Fastify converts to snake_case for calc engine) ──

interface AnalysisRequestBody {
  propertyData: PropertyInput & { sourceUrl?: string; listingType?: string }
  financing: FinancingInput
  rental: RentalInput
  mode?: string
}

// ── Scrape types ──────────────────────────────────────────────────────────────

export interface ScrapedListing {
  sourceUrl: string
  listingId: string
  address: string
  city: string
  province: string
  postalCode: string | null
  price: number | null
  rentMonthly: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  sqftKnown: boolean
  yearBuilt: number | null
  yearBuiltKnown: boolean
  propertyType: string
  parkingSpots: number
  parkingKnown: boolean
  condoFeeMonthly: number | null
  condoFeeKnown: boolean
  annualTaxes: number | null
  annualTaxesKnown: boolean
  isToronto: boolean
  description: string | null
  listingType: 'for-sale' | 'for-rent'
}

export interface ScrapeResult {
  success: boolean
  listing: ScrapedListing | null
  error: string | null
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  } catch {
    return { success: false, listing: null, error: 'NETWORK_ERROR' }
  }

  if (!response.ok) {
    let error = 'SCRAPE_FAILED'
    try {
      const json = (await response.json()) as { error?: string }
      if (json.error) error = json.error
    } catch {
      // use default
    }
    return { success: false, listing: null, error }
  }

  const data = (await response.json()) as {
    success: boolean
    listing: Record<string, unknown> | null
    error: string | null
  }
  if (!data.success || data.listing == null) {
    return { success: false, listing: null, error: data.error ?? 'SCRAPE_FAILED' }
  }

  const r = data.listing
  const listing: ScrapedListing = {
    sourceUrl: String(r.source_url ?? url),
    listingId: String(r.listing_id ?? ''),
    address: String(r.address ?? ''),
    city: String(r.city ?? ''),
    province: String(r.province ?? 'ON'),
    postalCode: r.postal_code != null ? String(r.postal_code) : null,
    price: r.price != null ? Number(r.price) : null,
    rentMonthly: r.rent_monthly != null ? Number(r.rent_monthly) : null,
    beds: r.beds != null ? Number(r.beds) : null,
    baths: r.baths != null ? Number(r.baths) : null,
    sqft: r.sqft != null ? Number(r.sqft) : null,
    sqftKnown: Boolean(r.sqft_known),
    yearBuilt: r.year_built != null ? Number(r.year_built) : null,
    yearBuiltKnown: Boolean(r.year_built_known),
    propertyType: String(r.property_type ?? 'condo'),
    parkingSpots: Number(r.parking_spots ?? 0),
    parkingKnown: Boolean(r.parking_known),
    condoFeeMonthly: r.condo_fee_monthly != null ? Number(r.condo_fee_monthly) : null,
    condoFeeKnown: Boolean(r.condo_fee_known),
    annualTaxes: r.annual_taxes != null ? Number(r.annual_taxes) : null,
    annualTaxesKnown: Boolean(r.annual_taxes_known),
    isToronto: Boolean(r.is_toronto),
    description: r.description != null ? String(r.description) : null,
    listingType: (r.listing_type as 'for-sale' | 'for-rent') ?? 'for-sale',
  }
  return { success: true, listing, error: null }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run a full investment analysis for a property.
 *
 * Sends property, financing, and rental inputs to the Fastify API, which
 * proxies the request to the Python calc engine and returns a camelCase
 * Analysis object.
 *
 * @throws ApiRequestError on any non-200 response
 */
export async function runAnalysis(
  property: PropertyInput,
  financing: FinancingInput,
  rental: RentalInput,
  mode?: string
): Promise<Analysis> {
  const body: AnalysisRequestBody = {
    propertyData: property,
    financing,
    rental,
    ...(mode != null ? { mode } : {}),
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/analysis/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new ApiRequestError(
      'NETWORK_ERROR',
      'Could not reach the analysis service — check your connection and try again.',
      0
    )
  }

  if (!response.ok) {
    let code = 'ANALYSIS_FAILED'
    let message = 'Analysis failed — please try again.'
    try {
      const json = (await response.json()) as { code?: string; message?: string }
      if (json.code) code = json.code
      if (json.message) message = json.message
    } catch {
      // ignore parse errors — use defaults above
    }
    throw new ApiRequestError(code, message, response.status)
  }

  return response.json() as Promise<Analysis>
}

// ── Get saved analysis by share token ─────────────────────────────────────────

export interface GetAnalysisResult {
  analysis: Analysis
  listing: import('../../types/property').Listing
}

/**
 * Fetch a saved analysis by its share token.
 * Returns null if not found or expired.
 */
export async function getAnalysisByToken(token: string): Promise<GetAnalysisResult | null> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/analysis/${encodeURIComponent(token)}`)
  } catch {
    return null
  }

  if (response.status === 404) return null
  if (!response.ok) return null

  return response.json() as Promise<GetAnalysisResult>
}
