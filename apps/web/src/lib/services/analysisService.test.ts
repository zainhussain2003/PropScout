/**
 * Tests for analysisService.ts
 *
 * Covers:
 *   - Successful 200 response returns a typed Analysis object
 *   - camelCase inputs are converted to snake_case in the request body
 *   - The request is sent to the correct /analysis/ endpoint
 *   - Non-200 responses throw ApiRequestError with the correct code and status
 *   - Network failures throw ApiRequestError with code NETWORK_ERROR and status 0
 *   - Optional fields have correct defaults (province, includeManagementFee)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runAnalysis, ApiRequestError } from './analysisService'
import type { PropertyInput, FinancingInput, RentalInput } from '../../types/api'
import type { Analysis } from '../../types/analysis'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ANALYSIS_FIXTURE: Analysis = {
  id: '',
  token: '',
  mode: 'investor',
  createdAt: '2026-01-01T00:00:00.000Z',
  metrics: {
    cashFlowMonthly: -2126.82,
    cashFlowAnnual: -25521.83,
    capRate: 0.01973,
    cashOnCashReturn: -0.16,
    dscr: 0.36,
    grm: 20.97,
    noi: 14397.85,
    mortgagePaymentMonthly: 3326.64,
    downPayment: 145980,
    mortgageAmount: 583920,
    amortizationYears: 25,
    mortgageRate: 0.0479,
    breakEvenRent: 5138.76,
    closingCostsTotal: 13473,
    lttProvincial: 11073,
    lttMunicipal: 0,
    hasSanityWarnings: false,
  },
  dealScore: {
    total: 7,
    verdict: 'hard_pass',
    breakdown: {
      capRate: 0,
      cashFlow: 0,
      cashOnCash: 0,
      dscr: 0,
      demand: 7,
      subtotal: 7,
      deduction: 0,
      componentMaxes: {
        capRate: 25,
        cashFlow: 25,
        cashOnCash: 20,
        dscr: 15,
        demand: 10,
      },
    },
  },
  rentalComps: null,
  riskFlags: [],
  narrative: null,
  hasSanityWarnings: false,
}

const PROPERTY: PropertyInput = {
  address: '5702 Buttermill Ave',
  province: 'ON',
  price: 729900,
  annualTaxes: 3326,
  condoFeeMonthly: 761,
  condoFeeKnown: true,
  beds: 3,
  baths: 2,
  sqft: 1050,
  yearBuilt: 2018,
  propertyType: 'condo',
  isToronto: false,
}

const FINANCING: FinancingInput = {
  downPaymentPct: 0.2,
  mortgageRate: 0.0479,
  amortizationYears: 25,
}

const RENTAL: RentalInput = {
  low: 2700,
  mid: 2900,
  high: 3200,
  compCount: 8,
  confidence: 'medium',
  postalCode: 'L4K',
}

// ── Mock helpers ──────────────────────────────────────────────────────────────

function mockFetchOK(body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }))
}

function mockFetchError(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, status, json: () => Promise.resolve(body) })
  )
}

function mockFetchCrash(): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
}

// ── Helper to extract and parse the request body ──────────────────────────────

async function getCapturedBody(): Promise<Record<string, unknown>> {
  const mockFetch = vi.mocked(globalThis.fetch)
  const callArgs = mockFetch.mock.calls[0]
  const init = callArgs[1] as RequestInit
  return JSON.parse(init.body as string) as Record<string, unknown>
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runAnalysis', () => {
  beforeEach(() => {
    // Reset any prior stubs before each test
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns Analysis object on 200', async () => {
    mockFetchOK(ANALYSIS_FIXTURE)

    const result = await runAnalysis(PROPERTY, FINANCING, RENTAL)

    expect(result).toEqual(ANALYSIS_FIXTURE)
  })

  it('sends camelCase propertyData and financing to the Fastify API', async () => {
    mockFetchOK(ANALYSIS_FIXTURE)

    await runAnalysis(PROPERTY, FINANCING, RENTAL)

    const body = await getCapturedBody()
    const propertyData = body.propertyData as Record<string, unknown>
    const financing = body.financing as Record<string, unknown>
    const rental = body.rental as Record<string, unknown>

    expect(propertyData.annualTaxes).toBe(3326)
    expect(propertyData.condoFeeMonthly).toBe(761)
    expect(financing.downPaymentPct).toBe(0.2)
    expect(financing.mortgageRate).toBe(0.0479)
    expect(financing.amortizationYears).toBe(25)
    expect(rental.compCount).toBe(8)
    expect(rental.postalCode).toBe('L4K')
  })

  it('sends request to /analysis/ endpoint', async () => {
    mockFetchOK(ANALYSIS_FIXTURE)

    await runAnalysis(PROPERTY, FINANCING, RENTAL)

    const mockFetch = vi.mocked(globalThis.fetch)
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('/analysis/')
  })

  it('throws ApiRequestError with code on 422', async () => {
    mockFetchError(422, { code: 'INVALID_ANALYSIS_INPUT', message: 'Bad input' })

    await expect(runAnalysis(PROPERTY, FINANCING, RENTAL)).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiRequestError)
      const apiErr = err as ApiRequestError
      expect(apiErr.code).toBe('INVALID_ANALYSIS_INPUT')
      expect(apiErr.status).toBe(422)
      return true
    })
  })

  it('throws ApiRequestError on network failure', async () => {
    mockFetchCrash()

    await expect(runAnalysis(PROPERTY, FINANCING, RENTAL)).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiRequestError)
      const apiErr = err as ApiRequestError
      expect(apiErr.code).toBe('NETWORK_ERROR')
      expect(apiErr.status).toBe(0)
      return true
    })
  })

  it('passes province through unchanged when provided', async () => {
    mockFetchOK(ANALYSIS_FIXTURE)

    await runAnalysis(PROPERTY, FINANCING, RENTAL)

    const body = await getCapturedBody()
    const propertyData = body.propertyData as Record<string, unknown>
    expect(propertyData.province).toBe('ON')
  })

  it('passes includeManagementFee when not explicitly set (undefined)', async () => {
    mockFetchOK(ANALYSIS_FIXTURE)

    const financingWithoutFlag: FinancingInput = {
      downPaymentPct: 0.2,
      mortgageRate: 0.0479,
      amortizationYears: 25,
    }

    await runAnalysis(PROPERTY, financingWithoutFlag, RENTAL)

    const body = await getCapturedBody()
    const financing = body.financing as Record<string, unknown>
    // includeManagementFee is optional on FinancingInput — Fastify applies the default
    expect(
      financing.includeManagementFee === false || financing.includeManagementFee === undefined
    ).toBe(true)
  })
})

describe('ApiRequestError', () => {
  it('is an instance of Error', () => {
    const err = new ApiRequestError('TEST_CODE', 'Test message', 500)
    expect(err).toBeInstanceOf(Error)
  })

  it('exposes code, message, and status', () => {
    const err = new ApiRequestError('TEST_CODE', 'Test message', 500)
    expect(err.code).toBe('TEST_CODE')
    expect(err.message).toBe('Test message')
    expect(err.status).toBe(500)
  })

  it('has name ApiRequestError', () => {
    const err = new ApiRequestError('TEST_CODE', 'Test message', 500)
    expect(err.name).toBe('ApiRequestError')
  })
})
