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
import type { Analysis, ReportMode } from '../../types/analysis'
import type { Listing } from '../../types/property'

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
  listingDescription?: string
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
  mode?: string,
  options?: { accessToken?: string; listingDescription?: string }
): Promise<Analysis> {
  const body: AnalysisRequestBody = {
    propertyData: property,
    financing,
    rental,
    ...(mode != null ? { mode } : {}),
    ...(options?.listingDescription ? { listingDescription: options.listingDescription } : {}),
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options?.accessToken) {
    headers['Authorization'] = `Bearer ${options.accessToken}`
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/analysis/`, {
      method: 'POST',
      headers,
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

// ── Polling / scrape API ──────────────────────────────────────────────────────

export interface FetchReportResult {
  status: 'pending' | 'processing' | 'failed' | 'complete'
  analysis?: Analysis
  listing?: Listing
}

/**
 * POST /scrape — initiates scraping for a URL.
 * The route always returns 200, including for PROVINCE_NOT_SUPPORTED; the body
 * is inspected before returning.
 *
 * @throws ApiRequestError on province gate, scraper failure, or network error
 */
export async function scrapeUrl(
  url: string
): Promise<{ token: string; listing: Listing; scraperFailed?: boolean; missingFields?: string[] }> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  } catch (err) {
    throw new ApiRequestError(
      'NETWORK_ERROR',
      'Could not reach the analysis service — check your connection and try again.',
      0
    )
  }

  if (response.ok) {
    const body = (await response.json()) as {
      error?: string
      token?: string
      listing?: Listing
      scraperFailed?: boolean
      missingFields?: string[]
    }

    if (body.error === 'PROVINCE_NOT_SUPPORTED') {
      throw new ApiRequestError(
        'PROVINCE_NOT_SUPPORTED',
        "This property is outside Ontario — we'll notify you when we expand.",
        200
      )
    }

    const result: {
      token: string
      listing: Listing
      scraperFailed?: boolean
      missingFields?: string[]
    } = {
      token: body.token!,
      listing: body.listing!,
    }

    if (body.scraperFailed) {
      result.scraperFailed = true
      result.missingFields = body.missingFields
    }

    return result
  }

  if (response.status === 422) {
    throw new ApiRequestError(
      'SCRAPER_FAILED',
      'Could not read that listing — enter details manually.',
      422
    )
  }

  if (response.status === 503) {
    throw new ApiRequestError(
      'SCRAPER_UNAVAILABLE',
      'Analysis service temporarily unavailable — try again in a moment.',
      503
    )
  }

  let code = 'SCRAPE_FAILED'
  let message = 'Scraping failed — please try again.'
  try {
    const json = (await response.json()) as { code?: string; message?: string }
    if (json.code) code = json.code
    if (json.message) message = json.message
  } catch {
    // ignore parse errors — use defaults above
  }
  throw new ApiRequestError(code, message, response.status)
}

/**
 * POST /analysis — triggers the analysis pipeline for a scraped token.
 * No trailing slash — different call shape from runAnalysis.
 * Returns void; use fetchReport to poll for results.
 *
 * @throws ApiRequestError on non-200 or network error
 */
export async function triggerAnalysis(token: string, mode: ReportMode): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, mode }),
    })
  } catch (err) {
    throw new ApiRequestError(
      'NETWORK_ERROR',
      'Could not reach the analysis service — check your connection and try again.',
      0
    )
  }

  if (!response.ok) {
    let code = 'TRIGGER_FAILED'
    let message = 'Could not start analysis — please try again.'
    try {
      const json = (await response.json()) as { code?: string; message?: string }
      if (json.code) code = json.code
      if (json.message) message = json.message
    } catch {
      // ignore parse errors
    }
    throw new ApiRequestError(code, message, response.status)
  }
}

/**
 * GET /analysis/:token — polls for analysis status and, when complete,
 * returns the full analysis and listing.
 *
 * @throws ApiRequestError on 404 (not found), 410 (expired), or network error
 */
export async function fetchReport(token: string): Promise<FetchReportResult> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/analysis/${token}`)
  } catch (err) {
    throw new ApiRequestError(
      'NETWORK_ERROR',
      'Could not reach the analysis service — check your connection and try again.',
      0
    )
  }

  if (response.status === 404) {
    throw new ApiRequestError('NOT_FOUND', 'Analysis not found.', 404)
  }

  if (response.status === 410) {
    throw new ApiRequestError('EXPIRED', 'This analysis link has expired.', 410)
  }

  if (!response.ok) {
    let code = 'FETCH_FAILED'
    let message = 'Could not fetch report — please try again.'
    try {
      const json = (await response.json()) as { code?: string; message?: string }
      if (json.code) code = json.code
      if (json.message) message = json.message
    } catch {
      // ignore parse errors
    }
    throw new ApiRequestError(code, message, response.status)
  }

  return response.json() as Promise<FetchReportResult>
}

// ── Province waitlist ─────────────────────────────────────────────────────────

/**
 * Submit an email to the province waitlist. Non-fatal — failure is silently
 * swallowed so the ProvinceGate still shows the confirmation screen.
 */
export async function postWaitlist(email: string, province: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, province }),
    })
  } catch {
    // Non-fatal — user sees confirmation screen regardless
  }
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
