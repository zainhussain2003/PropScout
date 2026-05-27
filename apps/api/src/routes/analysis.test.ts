/**
 * Functionality tests for the Fastify analysis route.
 *
 * Covers:
 *   - snake_case → camelCase transformation of calc engine responses
 *   - Request body forwarded to calc engine unchanged
 *   - 503 when the calc engine is unreachable (ECONNREFUSED)
 *   - 422 when the calc engine rejects the input
 *   - 500 when the calc engine returns an unexpected server error
 *   - Nested component_maxes mapped to componentMaxes
 *   - has_sanity_warnings flag passed through correctly
 *
 * The global `fetch` is mocked in every test — no real network calls are made.
 */

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

  it('transforms snake_case to camelCase', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        property_data: { address: '5702 Buttermill Ave', price: 729900 },
        financing: { down_payment_pct: 0.2, mortgage_rate: 0.0479, amortization_years: 25 },
        rental: { rent_mid: 2900 },
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

  it('forwards body to calc engine unchanged', async () => {
    mockCalcEngineOK(CALC_ENGINE_RESPONSE)

    const requestBody = {
      property_data: { address: 'test', price: 500000 },
      financing: {},
      rental: {},
    }

    await fastify.inject({
      method: 'POST',
      url: '/',
      payload: requestBody,
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)

    const [calledUrl, calledOptions] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ]

    expect(calledUrl).toContain('/analysis/')
    expect(calledOptions.body).toBe(JSON.stringify(requestBody))
  })

  // ── Test 3 ─────────────────────────────────────────────────────────────────

  it('returns 503 when calc engine is unreachable', async () => {
    mockCalcEngineCrash()

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { property_data: {}, financing: {}, rental: {} },
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
      payload: { property_data: {}, financing: {}, rental: {} },
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
      payload: { property_data: {}, financing: {}, rental: {} },
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
      payload: { property_data: {}, financing: {}, rental: {} },
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
      payload: { property_data: {}, financing: {}, rental: {} },
    })

    expect(response.statusCode).toBe(200)

    const body = response.json() as Analysis
    expect(body.hasSanityWarnings).toBe(true)
  })
})
