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
 *
 * The global `fetch` is mocked in every test — no real network calls are made.
 * supabaseService is mocked to avoid needing SUPABASE_URL at import time.
 */

// ── Mock @supabase/supabase-js before any imports ──────────────────────────────
jest.mock('../services/supabaseService', () => ({
  fetchRentalComps: jest.fn().mockResolvedValue(null),
  saveAnalysis: jest.fn().mockResolvedValue('test-token-abc123'),
  getAnalysisByToken: jest.fn().mockResolvedValue(null),
  logSanityFailure: jest.fn().mockResolvedValue(undefined),
  getSupabase: jest.fn(),
}))

import Fastify, { type FastifyInstance } from 'fastify'
import analysisRoutes from './analysis'
import type { Analysis } from '../types/analysis'
import type { ApiError } from '../types/api'

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
})
