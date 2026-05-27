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
