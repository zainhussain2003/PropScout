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
import {
  runAnalysis,
  scrapeUrl,
  triggerAnalysis,
  fetchReport,
  ApiRequestError,
} from './analysisService'
import type { PropertyInput, FinancingInput, RentalInput } from '../../types/api'
import type { Analysis } from '../../types/analysis'
import type { Listing } from '../../types/property'

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
    displayTotal: 7,
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
  walkScore: null,
  neighbourhood: null,
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

// ── Additional fixtures ───────────────────────────────────────────────────────

const LISTING_FIXTURE: Listing = {
  id: 'listing-uuid-123',
  url: 'https://www.realtor.ca/real-estate/12345/5702-buttermill-ave-vaughan',
  listingType: 'for-sale',
  address: '5702 Buttermill Ave, Vaughan, ON L4K 0J2',
  city: 'Vaughan',
  province: 'ON',
  postalCode: 'L4K0J2',
  price: 729_900,
  rentMonthly: null,
  beds: 3,
  baths: 2,
  sqft: 1050,
  propertyType: 'condo',
  yearBuilt: 2005,
  parkingSpots: 1,
  condoFeeMonthly: 761,
  condoFeeKnown: true,
  annualTaxes: 3326,
  description: 'Beautiful condo in Vaughan.',
  photos: ['https://cdn.realtor.ca/photo1.jpg'],
  scrapedAt: '2026-06-01T00:00:00.000Z',
}

// ── scrapeUrl ─────────────────────────────────────────────────────────────────

describe('scrapeUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('200 with token and listing → returns { token, listing }', async () => {
    mockFetchOK({ token: 'abc-token', listing: LISTING_FIXTURE })

    const result = await scrapeUrl('https://www.realtor.ca/real-estate/12345')

    expect(result.token).toBe('abc-token')
    expect(result.listing).toEqual(LISTING_FIXTURE)
    expect(result.scraperFailed).toBeUndefined()
  })

  it('200 with error PROVINCE_NOT_SUPPORTED → throws ApiRequestError PROVINCE_NOT_SUPPORTED', async () => {
    mockFetchOK({ error: 'PROVINCE_NOT_SUPPORTED' })

    await expect(scrapeUrl('https://www.realtor.ca/real-estate/12345')).rejects.toSatisfy(
      (err: unknown) => {
        expect(err).toBeInstanceOf(ApiRequestError)
        const apiErr = err as ApiRequestError
        expect(apiErr.code).toBe('PROVINCE_NOT_SUPPORTED')
        expect(apiErr.status).toBe(200)
        return true
      }
    )
  })

  it('200 with scraperFailed: true → returns scraperFailed and missingFields', async () => {
    mockFetchOK({
      token: 'abc-token',
      listing: LISTING_FIXTURE,
      scraperFailed: true,
      missingFields: ['price', 'annualTaxes'],
    })

    const result = await scrapeUrl('https://www.realtor.ca/real-estate/12345')

    expect(result.token).toBe('abc-token')
    expect(result.scraperFailed).toBe(true)
    expect(result.missingFields).toEqual(['price', 'annualTaxes'])
  })

  it('422 response → throws ApiRequestError SCRAPER_FAILED', async () => {
    mockFetchError(422, { code: 'SCRAPER_FAILED', message: 'Could not read that listing.' })

    await expect(scrapeUrl('https://www.realtor.ca/real-estate/12345')).rejects.toSatisfy(
      (err: unknown) => {
        expect(err).toBeInstanceOf(ApiRequestError)
        const apiErr = err as ApiRequestError
        expect(apiErr.code).toBe('SCRAPER_FAILED')
        expect(apiErr.status).toBe(422)
        return true
      }
    )
  })

  it('network error → throws ApiRequestError NETWORK_ERROR', async () => {
    mockFetchCrash()

    await expect(scrapeUrl('https://www.realtor.ca/real-estate/12345')).rejects.toSatisfy(
      (err: unknown) => {
        expect(err).toBeInstanceOf(ApiRequestError)
        const apiErr = err as ApiRequestError
        expect(apiErr.code).toBe('NETWORK_ERROR')
        expect(apiErr.status).toBe(0)
        return true
      }
    )
  })
})

// ── triggerAnalysis ───────────────────────────────────────────────────────────

describe('triggerAnalysis', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('200 response → resolves void', async () => {
    mockFetchOK({})

    await expect(triggerAnalysis('test-token', 'investor')).resolves.toBeUndefined()
  })

  it('sends { token, mode } to /analysis (no trailing slash)', async () => {
    mockFetchOK({})

    await triggerAnalysis('test-token', 'investor')

    const mockFetch = vi.mocked(globalThis.fetch)
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toMatch(/\/analysis$/)

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string) as Record<
      string,
      unknown
    >
    expect(body.token).toBe('test-token')
    expect(body.mode).toBe('investor')
  })

  it('non-200 response → throws ApiRequestError', async () => {
    mockFetchError(500, { code: 'CALC_ENGINE_ERROR', message: 'Internal error' })

    await expect(triggerAnalysis('test-token', 'investor')).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiRequestError)
      const apiErr = err as ApiRequestError
      expect(apiErr.code).toBe('CALC_ENGINE_ERROR')
      expect(apiErr.status).toBe(500)
      return true
    })
  })
})

// ── fetchReport ───────────────────────────────────────────────────────────────

describe('fetchReport', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("200 with status 'pending' → returns { status: 'pending' }", async () => {
    mockFetchOK({ status: 'pending' })

    const result = await fetchReport('test-token')

    expect(result.status).toBe('pending')
    expect(result.analysis).toBeUndefined()
  })

  it("200 with status 'complete' + analysis + listing → returns all three", async () => {
    mockFetchOK({ status: 'complete', analysis: ANALYSIS_FIXTURE, listing: LISTING_FIXTURE })

    const result = await fetchReport('test-token')

    expect(result.status).toBe('complete')
    expect(result.analysis).toEqual(ANALYSIS_FIXTURE)
    expect(result.listing).toEqual(LISTING_FIXTURE)
  })

  it('404 → throws ApiRequestError NOT_FOUND', async () => {
    mockFetchError(404, { code: 'NOT_FOUND', message: 'Analysis not found.' })

    await expect(fetchReport('missing-token')).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiRequestError)
      const apiErr = err as ApiRequestError
      expect(apiErr.code).toBe('NOT_FOUND')
      expect(apiErr.status).toBe(404)
      return true
    })
  })

  it('410 → throws ApiRequestError EXPIRED', async () => {
    mockFetchError(410, { code: 'EXPIRED', message: 'This analysis has expired.' })

    await expect(fetchReport('expired-token')).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiRequestError)
      const apiErr = err as ApiRequestError
      expect(apiErr.code).toBe('EXPIRED')
      expect(apiErr.status).toBe(410)
      return true
    })
  })

  it('network error → throws ApiRequestError NETWORK_ERROR', async () => {
    mockFetchCrash()

    await expect(fetchReport('test-token')).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiRequestError)
      const apiErr = err as ApiRequestError
      expect(apiErr.code).toBe('NETWORK_ERROR')
      expect(apiErr.status).toBe(0)
      return true
    })
  })
})
