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

// ── camelCase → snake_case request body ───────────────────────────────────────

interface SnakePropertyInput {
  address: string
  province: string
  price: number
  annual_taxes: number
  condo_fee_monthly: number | null
  condo_fee_known: boolean
  beds: number
  baths: number
  sqft: number | null
  year_built: number | null
  property_type: string
  is_toronto: boolean
}

interface SnakeFinancingInput {
  down_payment_pct: number
  mortgage_rate: number
  amortization_years: number
  include_management_fee: boolean
}

interface SnakeRentalInput {
  low: number
  mid: number
  high: number
  comp_count: number
  confidence: 'low' | 'medium' | 'high'
  postal_code: string
}

interface AnalysisRequestBody {
  property_data: SnakePropertyInput
  financing: SnakeFinancingInput
  rental: SnakeRentalInput
}

function toSnakeProperty(p: PropertyInput): SnakePropertyInput {
  return {
    address: p.address,
    province: p.province ?? 'ON',
    price: p.price,
    annual_taxes: p.annualTaxes,
    condo_fee_monthly: p.condoFeeMonthly ?? null,
    condo_fee_known: p.condoFeeKnown ?? false,
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft ?? null,
    year_built: p.yearBuilt ?? null,
    property_type: p.propertyType ?? 'condo',
    is_toronto: p.isToronto ?? false,
  }
}

function toSnakeFinancing(f: FinancingInput): SnakeFinancingInput {
  return {
    down_payment_pct: f.downPaymentPct,
    mortgage_rate: f.mortgageRate,
    amortization_years: f.amortizationYears,
    include_management_fee: f.includeManagementFee ?? false,
  }
}

function toSnakeRental(r: RentalInput): SnakeRentalInput {
  return {
    low: r.low,
    mid: r.mid,
    high: r.high,
    comp_count: r.compCount,
    confidence: r.confidence,
    postal_code: r.postalCode,
  }
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
  rental: RentalInput
): Promise<Analysis> {
  const body: AnalysisRequestBody = {
    property_data: toSnakeProperty(property),
    financing: toSnakeFinancing(financing),
    rental: toSnakeRental(rental),
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
