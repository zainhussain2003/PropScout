/**
 * Functionality tests for the Fastify analysis route.
 *
 * Covers:
 *   - camelCase input returns fully camelCase response (round-trip)
 *   - camelCase input converted to snake_case before forwarding to calc engine
 *   - 503 when the calc engine is unreachable (ECONNREFUSED)
 *   - 422 when the calc engine rejects the input
 *   - 500 when the calc engine returns an unexpected server error
 *   - Nested component_maxes mapped to componentMaxes
 *   - has_sanity_warnings flag passed through correctly
 *   - 400 when the request body is not camelCase
 *   - 429 FREE_LIMIT_REACHED when authenticated free user exceeds 10 analyses/month
 *   - Haiku extraction skipped when no listingDescription provided
 *   - Haiku extraction fires and flags are merged when listingDescription provided
 *   - Pro user tier passed to narrative generator
 *
 * The global `fetch` is mocked in every test — no real network calls are made.
 * supabaseService and anthropicService are mocked to avoid needing API keys.
 */

// ── Mocks (must precede imports) ───────────────────────────────────────────────

jest.mock('../services/supabaseService', () => ({
  fetchRentalComps: jest.fn().mockResolvedValue(null),
  saveAnalysis: jest.fn().mockResolvedValue('test-token-abc123'),
  getAnalysisByToken: jest.fn().mockResolvedValue(null),
  logSanityFailure: jest.fn().mockResolvedValue(undefined),
  getSupabase: jest.fn().mockReturnValue({
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: { message: 'no token' } }),
    },
  }),
  getUserById: jest.fn().mockResolvedValue(null),
  getMonthlyAnalysisCount: jest.fn().mockResolvedValue(0),
}))

jest.mock('../services/anthropicService', () => ({
  generateNarrative: jest.fn().mockResolvedValue(null),
  extractListingFlags: jest.fn().mockResolvedValue(null),
}))

import Fastify, { type FastifyInstance } from 'fastify'
import analysisRoutes from './analysis'
import type { Analysis } from '../types/analysis'
import type { ApiError } from '../types/api'
import { getSupabase, getUserById, getMonthlyAnalysisCount } from '../services/supabaseService'
import { extractListingFlags, generateNarrative } from '../services/anthropicService'

const mockGetSupabase = getSupabase as jest.Mock
const mockGetUserById = getUserById as jest.Mock
const mockGetMonthlyCount = getMonthlyAnalysisCount as jest.Mock
const mockExtractListingFlags = extractListingFlags as jest.Mock
const mockGenerateNarrative = generateNarrative as jest.Mock

// ── Fixture ───────────────────────────────────────────────────────────────────

const CALC_ENGINE_RESPONSE = {
  metrics: {
    cash_flow_monthly: -2126.82,
    cash_flow_annual: -25521.83,
    cap_rate: 0.01973,
    cash_on_cash_return: -0.160059,
    dscr: 0.3607,
    grm: 20.97,
    noi: 14397.85,
    mortgage_payment_monthly: 3326.64,
    down_payment: 145980,
    mortgage_amount: 583920,
    amortization_years: 25,
    mortgage_rate: 0.0479,
    break_even_rent: 5138.76,
    closing_costs_total: 13473,
    ltt_provincial: 11073,
    ltt_municipal: 0,
    has_sanity_warnings: false,
  },
  deal_score: {
    total: 7,
    verdict: 'hard_pass',
    breakdown: {
      cap_rate: 0,
      cash_flow: 0,
      cash_on_cash: 0,
      dscr: 0,
      demand: 7,
      subtotal: 7,
      deduction: 0,
      component_maxes: {
        cap_rate: 25,
        cash_flow: 25,
        cash_on_cash: 20,
        dscr: 15,
        demand: 10,
      },
    },
  },
  risk_flags: [],
  has_sanity_warnings: false,
} as const

// Minimal valid camelCase request body used across error-path tests
const MINIMAL_CAMEL_BODY = {
  propertyData: {
    address: '5702 Buttermill Ave',
    price: 729900,
    annualTaxes: 3326,
    beds: 3,
    baths: 2,
  },
  financing: {
    downPaymentPct: 0.2,
    mortgageRate: 0.0479,
    amortizationYears: 25,
  },
  rental: {
    low: 2700,
    mid: 2900,
    high: 3200,
    compCount: 0,
    confidence: 'low' as const,
    postalCode: 'L4K',
  },
}

// ── Fetch mock helpers ────────────────────────────────────────────────────────

function mockCalcEngineOK(body: object): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  })
}

function mockCalcEngineError(status: number, body: object): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  })
}

function mockCalcEngineCrash(): void {
  global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))
}

// ── App factory ───────────────────────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false })
  await fastify.register(analysisRoutes)
  return fastify
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST / — analysis route', () => {
  let fastify: FastifyInstance

  beforeAll(async () => {
    fastify = await buildApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    // Default: unauthenticated (no valid token)
    mockGetSupabase.mockReturnValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: { message: 'no token' } }),
      },
    })
  })

  afterAll(async () => {
    await fastify.close()
  })

  // ── Test 1 ─────────────────────────────────────────────────────────────────

  it('returns 200 and fully camelCase response for valid camelCase input', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        propertyData: {
          address: '5702 Buttermill Ave',
          price: 729900,
          annualTaxes: 3326,
          condoFeeMonthly: 761,
          condoFeeKnown: true,
          beds: 3,
          baths: 2,
        },
        financing: {
          downPaymentPct: 0.2,
          mortgageRate: 0.0479,
          amortizationYears: 25,
        },
        rental: {
          low: 2700,
          mid: 2900,
          high: 3200,
          compCount: 8,
          confidence: 'medium' as const,
          postalCode: 'L4K',
        },
      },
    })

    expect(response.statusCode).toBe(200)

    const body = response.json() as Analysis
    const metrics = body.metrics as NonNullable<Analysis['metrics']>

    // camelCase keys present
    expect(metrics).toHaveProperty('cashFlowMonthly', -2126.82)
    expect(metrics).toHaveProperty('cashFlowAnnual', -25521.83)
    expect(metrics).toHaveProperty('capRate', 0.01973)
    expect(metrics).toHaveProperty('dscr', 0.3607)
    expect(metrics).toHaveProperty('mortgagePaymentMonthly', 3326.64)
    expect(metrics).toHaveProperty('downPayment', 145980)
    expect(metrics).toHaveProperty('mortgageAmount', 583920)
    expect(metrics).toHaveProperty('amortizationYears', 25)
    expect(metrics).toHaveProperty('mortgageRate', 0.0479)
    expect(metrics).toHaveProperty('breakEvenRent', 5138.76)
    expect(metrics).toHaveProperty('closingCostsTotal', 13473)
    expect(metrics).toHaveProperty('lttProvincial', 11073)
    expect(metrics).toHaveProperty('lttMunicipal', 0)
    expect(metrics).toHaveProperty('hasSanityWarnings', false)

    // dealScore nested key
    const dealScore = body.dealScore as NonNullable<Analysis['dealScore']>
    expect(dealScore.breakdown.componentMaxes.capRate).toBe(25)

    // no snake_case keys survive in metrics
    const metricKeys = Object.keys(metrics)
    const snakeCaseKeys = metricKeys.filter((k) => k.includes('_'))
    expect(snakeCaseKeys).toHaveLength(0)
  })

  // ── Test 2 ─────────────────────────────────────────────────────────────────

  it('converts camelCase input to snake_case before forwarding to calc engine', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)

    const camelBody = {
      propertyData: {
        address: '5702 Buttermill Ave',
        province: 'ON',
        price: 729900,
        annualTaxes: 3326,
        condoFeeMonthly: 761,
        condoFeeKnown: true,
        beds: 3,
        baths: 2,
        sqft: 1050,
        yearBuilt: 2005,
        propertyType: 'condo',
        isToronto: false,
      },
      financing: {
        downPaymentPct: 0.2,
        mortgageRate: 0.0479,
        amortizationYears: 25,
        includeManagementFee: false,
      },
      rental: {
        low: 2700,
        mid: 2900,
        high: 3200,
        compCount: 8,
        confidence: 'medium' as const,
        postalCode: 'L4K',
      },
    }

    await fastify.inject({
      method: 'POST',
      url: '/',
      payload: camelBody,
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)

    const [, calledOptions] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ]

    const forwarded = JSON.parse(calledOptions.body) as Record<string, unknown>

    // Input was converted from camelCase to snake_case
    expect(forwarded).toHaveProperty('property_data')
    expect(forwarded).not.toHaveProperty('propertyData')

    const propData = forwarded['property_data'] as Record<string, unknown>
    expect(propData).toHaveProperty('annual_taxes', 3326)
    expect(propData).toHaveProperty('condo_fee_monthly', 761)
    expect(propData).toHaveProperty('condo_fee_known', true)
    expect(propData).toHaveProperty('year_built', 2005)
    expect(propData).toHaveProperty('property_type', 'condo')
    expect(propData).toHaveProperty('is_toronto', false)
    expect(propData).not.toHaveProperty('annualTaxes')
    expect(propData).not.toHaveProperty('yearBuilt')

    const fin = forwarded['financing'] as Record<string, unknown>
    expect(fin).toHaveProperty('down_payment_pct', 0.2)
    expect(fin).toHaveProperty('mortgage_rate', 0.0479)
    expect(fin).toHaveProperty('amortization_years', 25)
    expect(fin).not.toHaveProperty('downPaymentPct')

    const rental = forwarded['rental'] as Record<string, unknown>
    expect(rental).toHaveProperty('comp_count', 8)
    expect(rental).toHaveProperty('postal_code', 'L4K')
    expect(rental).not.toHaveProperty('compCount')
  })

  // ── Test 3 ─────────────────────────────────────────────────────────────────

  it('returns 503 when calc engine is unreachable', async () => {
    mockCalcEngineCrash()

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: MINIMAL_CAMEL_BODY,
    })

    expect(response.statusCode).toBe(503)

    const body = response.json() as ApiError
    expect(body.error).toBe(true)
    expect(body.code).toBe('CALC_ENGINE_UNAVAILABLE')
  })

  // ── Test 4 ─────────────────────────────────────────────────────────────────

  it('returns 422 when calc engine returns 422', async () => {
    mockCalcEngineError(422, { detail: 'validation error' })

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: MINIMAL_CAMEL_BODY,
    })

    expect(response.statusCode).toBe(422)

    const body = response.json() as ApiError
    expect(body.code).toBe('INVALID_ANALYSIS_INPUT')
  })

  // ── Test 5 ─────────────────────────────────────────────────────────────────

  it('returns 500 when calc engine returns 500', async () => {
    mockCalcEngineError(500, { detail: 'internal error' })

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: MINIMAL_CAMEL_BODY,
    })

    expect(response.statusCode).toBe(500)

    const body = response.json() as ApiError
    expect(body.code).toBe('CALC_ENGINE_ERROR')
  })

  // ── Test 6 ─────────────────────────────────────────────────────────────────

  it('maps component_maxes to componentMaxes', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: MINIMAL_CAMEL_BODY,
    })

    expect(response.statusCode).toBe(200)

    const body = response.json() as Analysis
    const dealScore = body.dealScore as NonNullable<Analysis['dealScore']>

    expect(dealScore.breakdown.componentMaxes).toEqual({
      capRate: 25,
      cashFlow: 25,
      cashOnCash: 20,
      dscr: 15,
      demand: 10,
    })
  })

  // ── Test 7 ─────────────────────────────────────────────────────────────────

  it('passes has_sanity_warnings through', async () => {
    const responseWithWarnings = {
      ...CALC_ENGINE_RESPONSE,
      metrics: { ...CALC_ENGINE_RESPONSE.metrics, has_sanity_warnings: true },
      has_sanity_warnings: true,
    }

    mockCalcEngineOK(responseWithWarnings)

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: MINIMAL_CAMEL_BODY,
    })

    expect(response.statusCode).toBe(200)

    const body = response.json() as Analysis
    expect(body.hasSanityWarnings).toBe(true)
  })

  // ── Test 8 ─────────────────────────────────────────────────────────────────

  it('returns 400 when the request body is not camelCase', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { property_data: {}, financing: {}, rental: {} },
    })

    expect(response.statusCode).toBe(400)

    const body = response.json() as ApiError
    expect(body.code).toBe('INVALID_REQUEST')
  })

  // ── Server-side input validation (never trust frontend data) ───────────────

  it('returns 400 (not 500) when rental.postalCode is missing', async () => {
    const rentalWithoutPostal: Record<string, unknown> = { ...MINIMAL_CAMEL_BODY.rental }
    delete rentalWithoutPostal['postalCode']

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { ...MINIMAL_CAMEL_BODY, rental: rentalWithoutPostal },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json() as ApiError
    expect(body.code).toBe('INVALID_REQUEST')
  })

  it('returns 400 when financing is missing entirely', async () => {
    const withoutFinancing: Record<string, unknown> = { ...MINIMAL_CAMEL_BODY }
    delete withoutFinancing['financing']

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: withoutFinancing,
    })

    expect(response.statusCode).toBe(400)
    expect((response.json() as ApiError).code).toBe('INVALID_REQUEST')
  })

  it('returns 400 when propertyData.price is not a number', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        ...MINIMAL_CAMEL_BODY,
        propertyData: { ...MINIMAL_CAMEL_BODY.propertyData, price: 'not-a-number' },
      },
    })

    expect(response.statusCode).toBe(400)
    expect((response.json() as ApiError).code).toBe('INVALID_REQUEST')
  })

  // ── Description forwarding — red flags must deduct from the deal score ─────

  it('forwards listingDescription to the calc engine as description', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)

    await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        ...MINIMAL_CAMEL_BODY,
        listingDescription: 'Basement apartment with separate entrance. Sold as-is.',
      },
    })

    const [, calledOptions] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      { body: string },
    ]
    const forwarded = JSON.parse(calledOptions.body) as Record<string, unknown>
    expect(forwarded['description']).toBe('Basement apartment with separate entrance. Sold as-is.')
  })

  it('forwards description: null when no listingDescription is provided', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)

    await fastify.inject({ method: 'POST', url: '/', payload: MINIMAL_CAMEL_BODY })

    const [, calledOptions] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      { body: string },
    ]
    const forwarded = JSON.parse(calledOptions.body) as Record<string, unknown>
    expect(forwarded['description']).toBeNull()
  })

  it('maps calc-engine flag_id risk flags to id + human label', async () => {
    mockCalcEngineOK({
      ...CALC_ENGINE_RESPONSE,
      risk_flags: [
        {
          flag_id: 'as_is_where_is',
          severity: 'red',
          confidence: 95,
          evidence: 'Sold as-is.',
          source: 'regex',
        },
      ],
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: MINIMAL_CAMEL_BODY,
    })

    const body = response.json() as { riskFlags: Array<{ id: string; label: string }> }
    expect(body.riskFlags).toHaveLength(1)
    expect(body.riskFlags[0]!.id).toBe('as_is_where_is')
    expect(body.riskFlags[0]!.label).toBe('Sold as-is')
  })

  // ── Test 9 — Free tier limit ───────────────────────────────────────────────

  it('returns 429 FREE_LIMIT_REACHED when free user has hit their monthly limit', async () => {
    mockGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-free', email: 'free@example.com' } },
          error: null,
        }),
      },
    })
    mockGetUserById.mockResolvedValue({
      id: 'user-free',
      email: 'free@example.com',
      tier: 'free',
      stripe_customer_id: null,
      created_at: '',
    })
    mockGetMonthlyCount.mockResolvedValue(10)

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      headers: { authorization: 'Bearer valid-free-token' },
      payload: MINIMAL_CAMEL_BODY,
    })

    expect(response.statusCode).toBe(429)
    const body = response.json() as ApiError
    expect(body.code).toBe('FREE_LIMIT_REACHED')
    // Calc engine should not have been called
    expect(global.fetch).not.toHaveBeenCalled()
  })

  // ── Test 10 — Pro user bypasses limit ─────────────────────────────────────

  it('does not apply limit check for pro users', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)
    mockGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-pro', email: 'pro@example.com' } },
          error: null,
        }),
      },
    })
    mockGetUserById.mockResolvedValue({
      id: 'user-pro',
      email: 'pro@example.com',
      tier: 'pro',
      stripe_customer_id: 'cus_pro',
      created_at: '',
    })
    // Even if count is high, pro users are not blocked
    mockGetMonthlyCount.mockResolvedValue(999)

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      headers: { authorization: 'Bearer valid-pro-token' },
      payload: MINIMAL_CAMEL_BODY,
    })

    expect(response.statusCode).toBe(200)
  })

  // ── Test 11 — No extraction when no description ────────────────────────────

  it('skips Haiku extraction when no listingDescription is provided', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)

    await fastify.inject({
      method: 'POST',
      url: '/',
      payload: MINIMAL_CAMEL_BODY,
    })

    expect(mockExtractListingFlags).not.toHaveBeenCalled()
  })

  // ── Test 12 — Extraction fires and flags are merged ────────────────────────

  it('runs Haiku extraction and merges flags into riskFlags when description is provided', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)
    mockExtractListingFlags.mockResolvedValueOnce({
      flags: [
        { flagId: 'basement_suite', present: true, confidence: 90, evidence: 'finished basement' },
        { flagId: 'noise_concern', present: true, confidence: 70, evidence: 'near highway' },
        { flagId: 'short_term_rental', present: false, confidence: 20, evidence: '' },
      ],
      rawResponse: '[...]',
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        ...MINIMAL_CAMEL_BODY,
        listingDescription: 'Renovated unit with finished basement. Near a major highway.',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(mockExtractListingFlags).toHaveBeenCalledWith(
      'Renovated unit with finished basement. Near a major highway.'
    )

    const body = response.json() as Analysis

    // basement_suite has 90% confidence → red flag
    const basementFlag = body.riskFlags.find((f) => f.id === 'basement_suite')
    expect(basementFlag).toBeDefined()
    expect(basementFlag?.severity).toBe('red')
    expect(basementFlag?.label).toBe('Basement suite')
    expect(basementFlag?.evidence).toBe('finished basement')

    // noise_concern has 70% confidence → amber flag
    const noiseFlag = body.riskFlags.find((f) => f.id === 'noise_concern')
    expect(noiseFlag).toBeDefined()
    expect(noiseFlag?.severity).toBe('amber')

    // short_term_rental is not present → not included
    const strFlag = body.riskFlags.find((f) => f.id === 'short_term_rental')
    expect(strFlag).toBeUndefined()
  })

  // ── Test 13 — Flags below threshold excluded ───────────────────────────────

  it('excludes extracted flags below 60% confidence', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)
    mockExtractListingFlags.mockResolvedValueOnce({
      flags: [{ flagId: 'grow_op_history', present: true, confidence: 45, evidence: 'possible' }],
      rawResponse: '[...]',
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        ...MINIMAL_CAMEL_BODY,
        listingDescription: 'Possible history.',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json() as Analysis
    expect(body.riskFlags.find((f) => f.id === 'grow_op_history')).toBeUndefined()
  })

  // ── Test 14 — Province gate ────────────────────────────────────────────────

  it('returns 400 PROVINCE_NOT_SUPPORTED for non-Ontario postal codes', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        ...MINIMAL_CAMEL_BODY,
        rental: { ...MINIMAL_CAMEL_BODY.rental, postalCode: 'V5K' }, // BC postal code
      },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json() as ApiError
    expect(body.code).toBe('PROVINCE_NOT_SUPPORTED')
    // Calc engine should not have been called
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns 400 PROVINCE_NOT_SUPPORTED when province field is non-Ontario', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        ...MINIMAL_CAMEL_BODY,
        propertyData: { ...MINIMAL_CAMEL_BODY.propertyData, province: 'BC' },
        rental: { ...MINIMAL_CAMEL_BODY.rental, postalCode: '' },
      },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json() as ApiError
    expect(body.code).toBe('PROVINCE_NOT_SUPPORTED')
  })

  // ── Fix 8 — Extraction completes before narrative so flags reach Sonnet ───

  it('passes extracted flags to generateNarrative after extraction completes', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)
    mockExtractListingFlags.mockResolvedValueOnce({
      flags: [
        {
          flagId: 'power_of_sale',
          present: true,
          confidence: 95,
          evidence: 'power of sale listing',
        },
      ],
      rawResponse: '[...]',
    })

    await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        ...MINIMAL_CAMEL_BODY,
        listingDescription: 'Power of sale listing.',
      },
    })

    expect(mockGenerateNarrative).toHaveBeenCalledWith(
      expect.objectContaining({
        riskFlags: expect.arrayContaining([
          expect.objectContaining({ id: 'power_of_sale', severity: 'red' }),
        ]),
      })
    )
  })

  it('narrative still runs with calc-engine flags when extraction fails', async () => {
    mockCalcEngineOK({
      ...CALC_ENGINE_RESPONSE,
      risk_flags: [
        {
          flag_id: 'as_is_where_is',
          severity: 'red',
          confidence: 90,
          evidence: 'Sold as-is.',
        },
      ],
    })
    // Extraction throws — should not prevent narrative from running
    mockExtractListingFlags.mockRejectedValueOnce(new Error('Haiku timeout'))

    await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        ...MINIMAL_CAMEL_BODY,
        listingDescription: 'Sold as-is, no representations.',
      },
    })

    // Narrative called with calc-engine flag even though extraction failed
    expect(mockGenerateNarrative).toHaveBeenCalledWith(
      expect.objectContaining({
        riskFlags: expect.arrayContaining([expect.objectContaining({ id: 'as_is_where_is' })]),
      })
    )
  })

  // ── Test 17 — Pro tier used for narrative ──────────────────────────────────

  it('passes pro tier to generateNarrative when user is pro', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)
    mockGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-pro', email: 'pro@example.com' } },
          error: null,
        }),
      },
    })
    mockGetUserById.mockResolvedValue({
      id: 'user-pro',
      email: 'pro@example.com',
      tier: 'pro',
      stripe_customer_id: 'cus_pro',
      created_at: '',
    })
    mockGetMonthlyCount.mockResolvedValue(5)

    await fastify.inject({
      method: 'POST',
      url: '/',
      headers: { authorization: 'Bearer valid-pro-token' },
      payload: MINIMAL_CAMEL_BODY,
    })

    expect(mockGenerateNarrative).toHaveBeenCalledWith(expect.objectContaining({ tier: 'pro' }))
  })
})
