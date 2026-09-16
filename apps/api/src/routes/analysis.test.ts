/**
 * Functionality tests for the Fastify analysis route (orchestrator).
 *
 * Covers:
 *   - Valid token + mode → 200 with { token, analysis } containing metrics and narrative
 *   - Missing token → 400 MISSING_TOKEN
 *   - Invalid mode → 400 INVALID_MODE
 *   - getListingByToken returns null → 404 NOT_FOUND
 *   - Calc engine network error → 503 CALC_ENGINE_UNAVAILABLE, status marked failed
 *   - Calc engine non-200 → 500 CALC_ENGINE_ERROR, status marked failed
 *   - updateAnalysisStatus('processing') called before calc engine fetch
 *   - saveAnalysis called with correct token after successful pipeline
 *
 * All service calls are mocked — no real network calls or DB queries are made.
 */

import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import analysisRoutes from './analysis'
import type { Analysis, SchoolsResult } from '../types/analysis'
import type { Listing } from '../types/property'
import type { ApiError } from '../types/api'

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../services/supabaseService')
jest.mock('../services/anthropicService')
jest.mock('../services/mapboxService')
jest.mock('../services/walkScoreService')

import {
  getListingByToken,
  updateAnalysisStatus,
  updateAnalysisByToken,
  fetchRentalComps,
  fetchMarketDemand,
  getFlagOverrides,
  getNearbySchools,
  getSupabase,
  getUserById,
  getMonthlyAnalysisCount,
  claimAnalysisForUser,
  getAnalysisStatus,
  getAnalysisByToken,
  countGuestAnalyses,
  markAnalysisGuest,
  claimGuestAnalyses,
} from '../services/supabaseService'
import { extractListingFlags, generateNarrative } from '../services/anthropicService'
import { geocodeAddress } from '../services/mapboxService'
import { getWalkScore } from '../services/walkScoreService'
import { getVacancyRateByCity } from '../services/cmhcService'

const mockGetListingByToken = jest.mocked(getListingByToken)
const mockFetchMarketDemand = jest.mocked(fetchMarketDemand)
const mockUpdateAnalysisStatus = jest.mocked(updateAnalysisStatus)
const mockSaveAnalysis = jest.mocked(updateAnalysisByToken)
const mockFetchRentalComps = jest.mocked(fetchRentalComps)
const mockExtractListingFlags = jest.mocked(extractListingFlags)
const mockGenerateNarrative = jest.mocked(generateNarrative)
const mockGeocodeAddress = jest.mocked(geocodeAddress)
const mockGetWalkScore = jest.mocked(getWalkScore)
const mockGetFlagOverrides = jest.mocked(getFlagOverrides)
const mockGetNearbySchools = jest.mocked(getNearbySchools)
const mockGetSupabase = jest.mocked(getSupabase)
const mockGetUserById = jest.mocked(getUserById)
const mockMonthlyCount = jest.mocked(getMonthlyAnalysisCount)
const mockClaim = jest.mocked(claimAnalysisForUser)
const mockGetStatus = jest.mocked(getAnalysisStatus)
const mockGetAnalysisByToken = jest.mocked(getAnalysisByToken)

// ── Fixtures ──────────────────────────────────────────────────────────────────

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

const CALC_ENGINE_FIXTURE = {
  metrics: {
    cash_flow_monthly: -1833,
    cash_flow_annual: -21_996,
    cap_rate: 0.025,
    cash_on_cash_return: -0.125,
    dscr: 0.45,
    grm: 20.97,
    noi: 14_397,
    mortgage_payment_monthly: 3_326,
    down_payment: 145_980,
    mortgage_amount: 583_920,
    amortization_years: 25,
    mortgage_rate: 0.0479,
    break_even_rent: 4_585,
    closing_costs_total: 13_473,
    ltt_provincial: 11_073,
    ltt_municipal: 0,
    has_sanity_warnings: false,
  },
  deal_score: {
    total: 9,
    display_total: 9,
    verdict: 'hard_pass',
    breakdown: {
      cap_rate: 0,
      cash_flow: 0,
      cash_on_cash: 0,
      dscr: 0,
      demand: 9,
      subtotal: 9,
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
}

function makeCalcResponse(body: object, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

// ── App factory ───────────────────────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false })
  await fastify.register(cookie)
  await fastify.register(analysisRoutes)
  return fastify
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST / — analysis orchestrator', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Happy-path defaults
    mockGetListingByToken.mockResolvedValue(LISTING_FIXTURE)
    mockUpdateAnalysisStatus.mockResolvedValue(undefined)
    mockSaveAnalysis.mockResolvedValue(undefined)
    mockExtractListingFlags.mockResolvedValue({})
    mockGenerateNarrative.mockResolvedValue('Test narrative')
    mockGeocodeAddress.mockResolvedValue(null)
    mockGetWalkScore.mockResolvedValue(null)
    mockFetchRentalComps.mockResolvedValue(null)
    mockFetchMarketDemand.mockResolvedValue({
      daysOnMarket: null,
      domSample: 0,
      rentTrend: null,
      trendChangePct: null,
      recentSample: 0,
      priorSample: 0,
    })
    mockGetFlagOverrides.mockResolvedValue([])

    global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))
  })

  afterAll(async () => {
    await app.close()
  })

  // ── Test 1 ─────────────────────────────────────────────────────────────────

  it('valid token + mode → 200 with { token, analysis } containing metrics and narrative', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { token: string; analysis: Analysis }
    expect(body.token).toBe('test-token')
    expect(body.analysis.mode).toBe('investor')
    expect(body.analysis.narrative).toBe('Test narrative')
    expect(body.analysis.metrics).toBeDefined()
    const metrics = body.analysis.metrics as NonNullable<Analysis['metrics']>
    expect(metrics.cashFlowMonthly).toBe(-1833)
    expect(metrics.capRate).toBe(0.025)
    expect(body.analysis.dealScore?.verdict).toBe('hard_pass')
  })

  // ── Test 1b ────────────────────────────────────────────────────────────────

  it('stores an assumption ledger built from what the engine says it applied (D-088)', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      makeCalcResponse({
        ...CALC_ENGINE_FIXTURE,
        assumptions: {
          vacancy_allowance: 0.05,
          management_fee: 0.08,
          management_fee_included: false,
          insurance_rate: 0.0035,
          maintenance_rate: 0.005,
          maintenance_basis: 'post_2010',
          legal_fees: 1500,
          title_insurance: 300,
          home_inspection: 600,
          down_payment_pct: 0.2,
          mortgage_rate: 0.0479,
          amortization_years: 25,
          cmhc_vacancy_rate: 0.018,
          cmhc_vacancy_rate_supplied: true,
        },
      })
    )
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(res.statusCode).toBe(200)
    const ledger = (res.json() as { analysis: Analysis }).analysis.assumptions ?? []
    const keys = ledger.map((e) => e.key)
    expect(keys).toEqual(
      expect.arrayContaining(['rent', 'mortgage_rate', 'insurance', 'maintenance', 'legal_fees'])
    )
    const insurance = ledger.find((e) => e.key === 'insurance')
    expect(insurance?.basis).toBe('default')
    expect(insurance?.value).toBe('0.35% of value')
    // The ledger is persisted with the analysis, not recomputed on read.
    const saved = mockSaveAnalysis.mock.calls[0]?.[1] as Analysis
    expect(saved.assumptions?.length).toBe(ledger.length)
  })

  it('stores the scan outcome the engine reports, and null when it reports none', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeCalcResponse({ ...CALC_ENGINE_FIXTURE, extraction_status: 'partial' }))
    let res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect((res.json() as { analysis: Analysis }).analysis.extractionStatus).toBe('partial')

    global.fetch = jest
      .fn()
      .mockResolvedValue(makeCalcResponse({ ...CALC_ENGINE_FIXTURE, extraction_status: 'weird' }))
    res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect((res.json() as { analysis: Analysis }).analysis.extractionStatus).toBeNull()
  })

  it('carries the engine’s sanity warnings through in its words, and an empty list from an older engine (D-118)', async () => {
    const warning =
      'Cap rate -0.59% is outside the expected range (0%–20%). Check rent and purchase price inputs.'
    global.fetch = jest.fn().mockResolvedValue(
      makeCalcResponse({
        ...CALC_ENGINE_FIXTURE,
        has_sanity_warnings: true,
        sanity_warnings: [warning],
      })
    )
    let res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    let analysis = (res.json() as { analysis: Analysis }).analysis
    expect(analysis.hasSanityWarnings).toBe(true)
    expect(analysis.sanityWarnings).toEqual([warning])
    // Stored with the analysis, so GET /analysis/:token shows the same notice.
    const saved = mockSaveAnalysis.mock.calls.at(-1)?.[1] as Analysis
    expect(saved.sanityWarnings).toEqual([warning])

    global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))
    res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    analysis = (res.json() as { analysis: Analysis }).analysis
    expect(analysis.sanityWarnings).toEqual([])
  })

  it('an older engine without the echo still yields the non-engine ledger rows', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(res.statusCode).toBe(200)
    const ledger = (res.json() as { analysis: Analysis }).analysis.assumptions ?? []
    expect(ledger.map((e) => e.key)).toContain('rent')
    expect(ledger.map((e) => e.key)).not.toContain('insurance')
  })

  it('records the rent the engine scored with, and that it was a proxy when no comps and no listed rent (D-101)', async () => {
    // The default fixture: a sale listing, comps mocked to null → price × 0.5%.
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(res.statusCode).toBe(200)
    const m = (res.json() as { analysis: Analysis }).analysis.metrics!
    expect(m.rentIsProxy).toBe(true)
    expect(m.rentUsedMonthly).toBe(Math.round(LISTING_FIXTURE.price! * 0.005))
  })

  it('forwards the per-city CMHC vacancy rate to the calc engine payload', async () => {
    await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    const fetchMock = global.fetch as jest.Mock
    const calcCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/analysis/'))
    expect(calcCall).toBeDefined()

    const sentBody = JSON.parse((calcCall![1] as RequestInit).body as string) as {
      cmhc_vacancy_rate?: number
    }
    // LISTING_FIXTURE city is Vaughan — must match the real cmhcService value.
    expect(sentBody.cmhc_vacancy_rate).toBe(getVacancyRateByCity('Vaughan'))
  })

  it('forwards measured days-on-market and rent trend to the engine, null when unobserved (D-105)', async () => {
    const send = async (): Promise<{ rental_days_on_market: unknown; rent_trend: unknown }> => {
      await app.inject({
        method: 'POST',
        url: '/',
        payload: { token: 'test-token', mode: 'investor' },
      })
      const fetchMock = global.fetch as jest.Mock
      const calcCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/analysis/'))
      return JSON.parse((calcCall![1] as RequestInit).body as string)
    }
    // Default mock: nothing observed → the engine is told so, not given 21 / flat.
    const unobserved = await send()
    expect(unobserved.rental_days_on_market).toBeNull()
    expect(unobserved.rent_trend).toBeNull()

    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))
    mockFetchMarketDemand.mockResolvedValue({
      daysOnMarket: 12,
      domSample: 15,
      rentTrend: 'declining',
      trendChangePct: -0.041,
      recentSample: 10,
      priorSample: 18,
    })
    const observed = await send()
    expect(observed.rental_days_on_market).toBe(12)
    expect(observed.rent_trend).toBe('declining')
    expect(mockFetchMarketDemand).toHaveBeenCalledWith(
      LISTING_FIXTURE.postalCode,
      LISTING_FIXTURE.beds
    )
  })

  it('recognizes Toronto neighbourhood suffixes for MLTT and tax estimation', async () => {
    mockGetListingByToken.mockResolvedValue({
      ...LISTING_FIXTURE,
      city: 'Toronto (Yonge-Eglinton)',
      price: 1_995_000,
      // Protect saved rows created before zero-tax placeholders were rejected.
      annualTaxes: 0,
    })

    await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    const fetchMock = global.fetch as jest.Mock
    const calcCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/analysis/'))
    const sentBody = JSON.parse((calcCall![1] as RequestInit).body as string) as {
      property_data: { annual_taxes: number; is_toronto: boolean }
    }
    expect(sentBody.property_data.annual_taxes).toBe(14_264)
    expect(sentBody.property_data.is_toronto).toBe(true)
  })

  // ── Test 1c ────────────────────────────────────────────────────────────────

  it('forwards the user-dismissed flag IDs to the calc engine payload', async () => {
    mockGetFlagOverrides.mockResolvedValue(['tenanted', 'basement_unit'])

    await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(mockGetFlagOverrides).toHaveBeenCalledWith('test-token')

    const fetchMock = global.fetch as jest.Mock
    const calcCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/analysis/'))
    expect(calcCall).toBeDefined()

    const sentBody = JSON.parse((calcCall![1] as RequestInit).body as string) as {
      dismissed_flag_ids?: string[]
    }
    expect(sentBody.dismissed_flag_ids).toEqual(['tenanted', 'basement_unit'])
  })

  // ── Test 2 ─────────────────────────────────────────────────────────────────

  it('missing token → 400 MISSING_TOKEN', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { mode: 'investor' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json() as ApiError
    expect(body.code).toBe('MISSING_TOKEN')
  })

  // ── Test 3 ─────────────────────────────────────────────────────────────────

  it('invalid mode → 400 INVALID_MODE', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'landlord-invalid' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json() as ApiError
    expect(body.code).toBe('INVALID_MODE')
  })

  // ── Test 4 ─────────────────────────────────────────────────────────────────

  it('getListingByToken returns null → 404 NOT_FOUND', async () => {
    mockGetListingByToken.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'missing-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(404)
    const body = res.json() as ApiError
    expect(body.code).toBe('NOT_FOUND')
  })

  // ── Test 5 ─────────────────────────────────────────────────────────────────

  it('calc engine network error → 503 CALC_ENGINE_UNAVAILABLE, updateAnalysisStatus called with failed', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(503)
    const body = res.json() as ApiError
    expect(body.code).toBe('CALC_ENGINE_UNAVAILABLE')
    expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
      'test-token',
      'failed',
      'CALC_ENGINE_UNAVAILABLE'
    )
  })

  // ── Test 6 ─────────────────────────────────────────────────────────────────

  it('calc engine non-200 → 500 CALC_ENGINE_ERROR, updateAnalysisStatus called with failed', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeCalcResponse({ detail: 'validation error' }, 422))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(500)
    const body = res.json() as ApiError
    expect(body.code).toBe('CALC_ENGINE_ERROR')
    expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
      'test-token',
      'failed',
      'CALC_ENGINE_ERROR'
    )
  })

  // ── Test 7 ─────────────────────────────────────────────────────────────────

  it('updateAnalysisStatus called with processing before calc engine fetch', async () => {
    const callSequence: string[] = []

    mockUpdateAnalysisStatus.mockImplementation(async (_token, status) => {
      callSequence.push(`status:${status}`)
    })
    ;(global.fetch as jest.Mock).mockImplementation(async () => {
      callSequence.push('fetch')
      return makeCalcResponse(CALC_ENGINE_FIXTURE)
    })

    await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    const processingIdx = callSequence.indexOf('status:processing')
    const fetchIdx = callSequence.indexOf('fetch')
    expect(processingIdx).toBeGreaterThanOrEqual(0)
    expect(fetchIdx).toBeGreaterThan(processingIdx)
  })

  // ── Test 8 ─────────────────────────────────────────────────────────────────

  it('saveAnalysis called with correct token and mode after successful pipeline', async () => {
    await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(mockSaveAnalysis).toHaveBeenCalledTimes(1)
    const [tokenArg, analysisArg] = mockSaveAnalysis.mock.calls[0]
    expect(tokenArg).toBe('test-token')
    expect(analysisArg.mode).toBe('investor')
  })
})

// -- Rent plausibility bounds (decision 2026-07-01: $500-$10,000/mo) ----------

describe('POST / - rent plausibility bounds', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateAnalysisStatus.mockResolvedValue(undefined)
    mockSaveAnalysis.mockResolvedValue(undefined)
    mockExtractListingFlags.mockResolvedValue({})
    mockGenerateNarrative.mockResolvedValue('Test narrative')
    mockGeocodeAddress.mockResolvedValue(null)
    mockGetWalkScore.mockResolvedValue(null)
    mockFetchRentalComps.mockResolvedValue(null)
    mockGetFlagOverrides.mockResolvedValue([])
    global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))
  })

  afterAll(async () => {
    await app.close()
  })

  it('for-rent listing with no rent and no price -> 422 RENT_OUT_OF_BOUNDS, never reaches the calc engine', async () => {
    // Fallback rent computes to $0 - previously this proceeded to score garbage.
    mockGetListingByToken.mockResolvedValue({
      ...LISTING_FIXTURE,
      listingType: 'for-rent',
      price: null,
      rentMonthly: null,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'tenant' },
    })

    expect(res.statusCode).toBe(422)
    const body = res.json() as ApiError
    expect(body.code).toBe('RENT_OUT_OF_BOUNDS')
    expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
      'test-token',
      'failed',
      'RENT_OUT_OF_BOUNDS'
    )
    const fetchMock = global.fetch as jest.Mock
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a $3.5M for-sale listing with no comps analyses normally (price proxy exceeds the rent ceiling by design)', async () => {
    // Live bug 2026-07-02: 662 Byngmount ($3,499,000, no comps) proxies to
    // ~$17.5k/mo and hard-failed the analysis. The bounds gate only protects
    // against garbage OBSERVED rents, not our own for-sale price proxy.
    mockGetListingByToken.mockResolvedValue({
      ...LISTING_FIXTURE,
      listingType: 'for-sale',
      price: 3_499_000,
      rentMonthly: null,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    const fetchMock = global.fetch as jest.Mock
    expect(fetchMock).toHaveBeenCalled() // reached the calc engine
  })

  it('legacy listing row with implausible stored rent ($49/mo) -> 422 RENT_OUT_OF_BOUNDS', async () => {
    mockGetListingByToken.mockResolvedValue({
      ...LISTING_FIXTURE,
      listingType: 'for-rent',
      price: null,
      rentMonthly: 49,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'landlord' },
    })

    expect(res.statusCode).toBe(422)
    expect((res.json() as ApiError).code).toBe('RENT_OUT_OF_BOUNDS')
  })

  it('plausible comps-based rent still analyses normally (bounds do not over-reject)', async () => {
    mockGetListingByToken.mockResolvedValue({
      ...LISTING_FIXTURE,
      listingType: 'for-rent',
      price: null,
      rentMonthly: 2400,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'tenant' },
    })

    expect(res.statusCode).toBe(200)
  })
})

// -- Coordinates threading (real MiniMap + SunScout both need lat/lng) --------

describe('POST / - coordinates in the analysis payload', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetListingByToken.mockResolvedValue(LISTING_FIXTURE)
    mockUpdateAnalysisStatus.mockResolvedValue(undefined)
    mockSaveAnalysis.mockResolvedValue(undefined)
    mockExtractListingFlags.mockResolvedValue({})
    mockGenerateNarrative.mockResolvedValue('Test narrative')
    mockGetWalkScore.mockResolvedValue(null)
    mockFetchRentalComps.mockResolvedValue(null)
    mockGetFlagOverrides.mockResolvedValue([])
    global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))
  })

  afterAll(async () => {
    await app.close()
  })

  it('includes geocoded coordinates so the frontend can render a real map', async () => {
    mockGeocodeAddress.mockResolvedValue({
      lat: 43.7942,
      lng: -79.5268,
      formattedAddress: '5702 Buttermill Ave, Vaughan, ON',
      postalCode: 'L4K0J5',
      relevance: 1,
      city: 'Vaughan',
    })

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { analysis: Analysis }
    expect(body.analysis.coordinates).toEqual({ lat: 43.7942, lng: -79.5268 })
  })

  it('coordinates are null when geocoding fails - analysis still returns', async () => {
    mockGeocodeAddress.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { analysis: Analysis }
    expect(body.analysis.coordinates).toBeNull()
  })
})

// -- SunScout end-to-end: lat/lng to calc engine, sun_scout mapped back -------

describe('POST / - SunScout wiring', () => {
  let app: FastifyInstance

  const PY_SUN_SCOUT = {
    annual_peak_sun_hours: 1350,
    summer_daily_hours: 8.4,
    winter_daily_hours: 3.1,
    seasonal_grid: { Dec: 3.1, Mar: 5.5, Jun: 8.4, Sep: 6.2 },
    monthly_hours: [3.1, 4.0, 5.5, 6.4, 7.6, 8.4, 8.2, 7.3, 6.2, 4.8, 3.6, 3.0],
    sun_score: 72,
    verdict: 'good',
  }

  beforeAll(async () => {
    app = await buildApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetListingByToken.mockResolvedValue(LISTING_FIXTURE)
    mockUpdateAnalysisStatus.mockResolvedValue(undefined)
    mockSaveAnalysis.mockResolvedValue(undefined)
    mockExtractListingFlags.mockResolvedValue({})
    mockGenerateNarrative.mockResolvedValue('Test narrative')
    mockGetWalkScore.mockResolvedValue(null)
    mockFetchRentalComps.mockResolvedValue(null)
    mockGetFlagOverrides.mockResolvedValue([])
    mockGeocodeAddress.mockResolvedValue({
      lat: 43.7942,
      lng: -79.5268,
      formattedAddress: '5702 Buttermill Ave, Vaughan, ON',
      postalCode: 'L4K0J5',
      relevance: 1,
      city: 'Vaughan',
    })
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeCalcResponse({ ...CALC_ENGINE_FIXTURE, sun_scout: PY_SUN_SCOUT }))
  })

  afterAll(async () => {
    await app.close()
  })

  it('forwards geocoded lat/lng in property_data so the sun-path branch fires', async () => {
    await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    const fetchMock = global.fetch as jest.Mock
    const calcCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/analysis/'))
    expect(calcCall).toBeDefined()
    const sentBody = JSON.parse((calcCall![1] as RequestInit).body as string) as {
      property_data: { lat?: number | null; lng?: number | null }
    }
    expect(sentBody.property_data.lat).toBe(43.7942)
    expect(sentBody.property_data.lng).toBe(-79.5268)
  })

  it('maps the calc engine sun_scout into analysis.sunScout (camelCase)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { analysis: Analysis }
    expect(body.analysis.sunScout).toEqual({
      annualPeakSunHours: 1350,
      summerDailyHours: 8.4,
      winterDailyHours: 3.1,
      seasonalGrid: { Dec: 3.1, Mar: 5.5, Jun: 8.4, Sep: 6.2 },
      monthlyHours: [3.1, 4.0, 5.5, 6.4, 7.6, 8.4, 8.2, 7.3, 6.2, 4.8, 3.6, 3.0],
      sunScore: 72,
      verdict: 'good',
      // Obstruction (spec §17 Phase 2). The fixture is an older calc-engine
      // response with no obstruction fields, so the mapper must default them —
      // assessed:false, everything else null. That distinction matters: false
      // means "we checked and the sky is open", null means "not assessed".
      obstructionAssessed: false,
      obstructionOpenness: null,
      obstructionBuildingsUsed: null,
      obstructionBuildingsUnknown: null,
      hoursLostToBuildings: null,
    })
  })

  it('maps obstruction fields when the calc engine reports them', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      makeCalcResponse({
        ...CALC_ENGINE_FIXTURE,
        sun_scout: {
          ...PY_SUN_SCOUT,
          obstruction_assessed: true,
          obstruction_openness: 0.842,
          obstruction_buildings_used: 21,
          obstruction_buildings_unknown: 16,
          hours_lost_to_buildings: 667.0,
        },
      })
    )

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    const body = res.json() as { analysis: Analysis }
    expect(body.analysis.sunScout).toMatchObject({
      obstructionAssessed: true,
      obstructionOpenness: 0.842,
      obstructionBuildingsUsed: 21,
      obstructionBuildingsUnknown: 16,
      hoursLostToBuildings: 667.0,
    })
  })

  it('sunScout stays null when geocoding fails (calc engine gets no lat/lng)', async () => {
    mockGeocodeAddress.mockResolvedValue(null)
    global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    const body = res.json() as { analysis: Analysis }
    expect(body.analysis.sunScout).toBeNull()
    const fetchMock = global.fetch as jest.Mock
    const calcCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/analysis/'))
    const sentBody = JSON.parse((calcCall![1] as RequestInit).body as string) as {
      property_data: { lat?: number | null; lng?: number | null }
    }
    expect(sentBody.property_data.lat ?? null).toBeNull()
    expect(sentBody.property_data.lng ?? null).toBeNull()
  })
})

// -- Schools read path: nearest schools attached + persisted -------------------

describe('POST / - schools wiring', () => {
  let app: FastifyInstance

  const SCHOOLS_FIXTURE = {
    elementary: [
      {
        name: 'Jesse Ketchum Jr & Sr PS',
        schoolType: 'elementary' as const,
        board: 'TDSB',
        distanceKm: 0.6,
        eqaoScore: 8.2,
        fraserRankPct: 74,
        graduationRate: null,
      },
    ],
    middle: [],
    high: [
      {
        name: 'Jarvis Collegiate Institute',
        schoolType: 'high' as const,
        board: 'TDSB',
        distanceKm: 0.8,
        eqaoScore: 7.4,
        fraserRankPct: 61,
        graduationRate: 0.89,
      },
    ],
    catchmentNote:
      'Nearest schools by straight-line distance - attendance boundaries are not verified.',
  }

  beforeAll(async () => {
    app = await buildApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetListingByToken.mockResolvedValue(LISTING_FIXTURE)
    mockUpdateAnalysisStatus.mockResolvedValue(undefined)
    mockSaveAnalysis.mockResolvedValue(undefined)
    mockExtractListingFlags.mockResolvedValue({})
    mockGenerateNarrative.mockResolvedValue('Test narrative')
    mockGetWalkScore.mockResolvedValue(null)
    mockFetchRentalComps.mockResolvedValue(null)
    mockGetFlagOverrides.mockResolvedValue([])
    mockGeocodeAddress.mockResolvedValue({
      lat: 43.7942,
      lng: -79.5268,
      formattedAddress: '5702 Buttermill Ave, Vaughan, ON',
      postalCode: 'L4K0J5',
      relevance: 1,
      city: 'Vaughan',
    })
    global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))
  })

  afterAll(async () => {
    await app.close()
  })

  it('attaches nearest schools to the analysis when the table has rows', async () => {
    mockGetNearbySchools.mockResolvedValue(SCHOOLS_FIXTURE)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'personal' },
    })

    expect(mockGetNearbySchools).toHaveBeenCalledWith(43.7942, -79.5268)
    const body = res.json() as { analysis: Analysis }
    // Walk times are routed on top (D-100); with no coordinates on the
    // fixture they are null, and the rest of the school is untouched.
    const strip = (r: SchoolsResult | null | undefined): unknown =>
      r && {
        ...r,
        elementary: r.elementary.map(({ walkMin: _w, ...x }) => x),
        middle: r.middle.map(({ walkMin: _w, ...x }) => x),
        high: r.high.map(({ walkMin: _w, ...x }) => x),
      }
    expect(strip(body.analysis.schools)).toEqual(SCHOOLS_FIXTURE)
    expect(body.analysis.schools?.elementary[0]?.walkMin).toBeNull()
    // Persisted with the analysis so /r/:token reads it back
    const saved = mockSaveAnalysis.mock.calls[0]![1]
    expect(strip(saved.schools)).toEqual(SCHOOLS_FIXTURE)
  })

  it('schools stays null when the table is empty (data pending, not an error)', async () => {
    mockGetNearbySchools.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'personal' },
    })

    expect(res.statusCode).toBe(200)
    expect((res.json() as { analysis: Analysis }).analysis.schools).toBeNull()
  })

  it('schools stays null when geocoding fails (no lookup attempted)', async () => {
    mockGeocodeAddress.mockResolvedValue(null)
    mockGetNearbySchools.mockResolvedValue(SCHOOLS_FIXTURE)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'personal' },
    })

    expect(mockGetNearbySchools).not.toHaveBeenCalled()
    expect((res.json() as { analysis: Analysis }).analysis.schools).toBeNull()
  })

  it('a schools lookup failure never fails the analysis (spec s8 isolation)', async () => {
    mockGetNearbySchools.mockRejectedValue(new Error('db down'))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'personal' },
    })

    expect(res.statusCode).toBe(200)
    expect((res.json() as { analysis: Analysis }).analysis.schools).toBeNull()
  })
})

// ── Free-tier quota + attribution (D-071) ─────────────────────────────────────
//
// Before this, no analysis was ever attributed to a user: createPendingAnalysis
// wrote no user_id and this route read no session. So every row had user_id
// null, the monthly count was always 0, FREE_TIER.MONTHLY_ANALYSIS_LIMIT was
// referenced nowhere in the request path, and the owner-only override policy
// (D-065) had no owner to match.

describe('POST / — free-tier quota and attribution', () => {
  let app: FastifyInstance
  const USER_ID = 'user-free'
  const AUTH = { authorization: 'Bearer session-jwt' }

  /** Make auth.getUser resolve to `userId`, or reject the token when null. */
  function signedInAs(userId: string | null): void {
    mockGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: userId == null ? null : { id: userId, email: 'u@example.com' } },
          error: userId == null ? { message: 'Invalid JWT' } : null,
        }),
      },
    } as unknown as ReturnType<typeof getSupabase>)
  }

  function userOnTier(tier: string): void {
    mockGetUserById.mockResolvedValue({
      id: USER_ID,
      email: 'u@example.com',
      tier,
      stripe_customer_id: null,
    } as unknown as Awaited<ReturnType<typeof getUserById>>)
  }

  function calcEngineCalls(): number {
    const fetchMock = global.fetch as jest.Mock
    return fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/analysis/')).length
  }

  beforeAll(async () => {
    app = await buildApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetListingByToken.mockResolvedValue(LISTING_FIXTURE)
    mockUpdateAnalysisStatus.mockResolvedValue(undefined)
    mockSaveAnalysis.mockResolvedValue(undefined)
    mockExtractListingFlags.mockResolvedValue({})
    mockGenerateNarrative.mockResolvedValue('Test narrative')
    mockGeocodeAddress.mockResolvedValue(null)
    mockGetWalkScore.mockResolvedValue(null)
    mockFetchRentalComps.mockResolvedValue(null)
    mockGetFlagOverrides.mockResolvedValue([])
    mockClaim.mockResolvedValue(undefined)
    global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))
  })

  afterAll(async () => {
    await app.close()
  })

  it('attributes the analysis to the signed-in user before running it', async () => {
    signedInAs(USER_ID)
    userOnTier('free')
    mockMonthlyCount.mockResolvedValue(0)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: AUTH,
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockClaim).toHaveBeenCalledWith('test-token', USER_ID, 'investor')
    // Claim precedes the pipeline: a run that dies mid-way is still counted.
    const claimOrder = mockClaim.mock.invocationCallOrder[0]
    const calcOrder = (global.fetch as jest.Mock).mock.invocationCallOrder[0]
    expect(claimOrder).toBeLessThan(calcOrder)
  })

  it('refuses the 11th analysis on the free tier with 402 and does not run the pipeline', async () => {
    signedInAs(USER_ID)
    userOnTier('free')
    mockMonthlyCount.mockResolvedValue(10)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: AUTH,
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(402)
    const body = res.json() as ApiError & { used: number; limit: number; resetsAt: string }
    expect(body.code).toBe('FREE_LIMIT_REACHED')
    expect(body.used).toBe(10)
    expect(body.limit).toBe(10)
    expect(new Date(body.resetsAt).getUTCDate()).toBe(1)
    expect(new Date(body.resetsAt).getTime()).toBeGreaterThan(Date.now())
    // The load-bearing assertions: nothing was claimed and nothing was run.
    expect(mockClaim).not.toHaveBeenCalled()
    expect(calcEngineCalls()).toBe(0)
    expect(mockSaveAnalysis).not.toHaveBeenCalled()
  })

  it('allows the 10th analysis (the limit is inclusive of the count, not the index)', async () => {
    signedInAs(USER_ID)
    userOnTier('free')
    mockMonthlyCount.mockResolvedValue(9)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: AUTH,
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockClaim).toHaveBeenCalled()
  })

  it('never limits tenant mode, which is unlimited on every tier', async () => {
    signedInAs(USER_ID)
    userOnTier('free')
    mockMonthlyCount.mockResolvedValue(10)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: AUTH,
      payload: { token: 'test-token', mode: 'tenant' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockMonthlyCount).not.toHaveBeenCalled()
    // Still attributed — the tenant can own it (overrides, account page).
    expect(mockClaim).toHaveBeenCalledWith('test-token', USER_ID, 'tenant')
  })

  it.each(['pro', 'professional', 'team'])('never limits the %s tier', async (tier) => {
    signedInAs(USER_ID)
    userOnTier(tier)
    mockMonthlyCount.mockResolvedValue(500)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: AUTH,
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockMonthlyCount).not.toHaveBeenCalled()
    expect(mockClaim).toHaveBeenCalled()
  })

  it('runs a guest analysis unattributed and uncounted', async () => {
    // Known limit, recorded in D-071: the limit is per account. A guest has no
    // account to count against; the IP rate limit is the only bound on them.
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockClaim).not.toHaveBeenCalled()
    expect(mockMonthlyCount).not.toHaveBeenCalled()
  })

  it('refuses an invalid session rather than downgrading it to a guest', async () => {
    signedInAs(null)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: AUTH,
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(401)
    expect(calcEngineCalls()).toBe(0)
  })

  it('treats a user with no profile row as free tier', async () => {
    signedInAs(USER_ID)
    mockGetUserById.mockResolvedValue(null)
    mockMonthlyCount.mockResolvedValue(10)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: AUTH,
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(402)
  })
})

// ── Idempotent by token (audit J-11) ──────────────────────────────────────────
//
// Reloading /analyzing re-POSTs the same token. Job status is not persisted
// (D-068), so the route keeps an in-process set of running tokens and treats a
// finished analysis as an answer, not a request.

describe('POST / — guest allowance (D-116)', () => {
  let app: FastifyInstance
  const GUEST_ID = '123e4567-e89b-12d3-a456-426614174000'
  const mockCountGuest = jest.mocked(countGuestAnalyses)
  const mockMarkGuest = jest.mocked(markAnalysisGuest)
  const mockClaimGuest = jest.mocked(claimGuestAnalyses)

  /** No session: the request carries nothing the API can attribute. */
  function anonymous(): void {
    mockGetSupabase.mockReturnValue({
      auth: { getUser: jest.fn() },
    } as unknown as ReturnType<typeof getSupabase>)
  }

  beforeAll(async () => {
    app = await buildApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.GUEST_ANALYSIS_LIMIT_ENABLED
    anonymous()
    mockGetListingByToken.mockResolvedValue(LISTING_FIXTURE)
    mockUpdateAnalysisStatus.mockResolvedValue(undefined)
    mockSaveAnalysis.mockResolvedValue(undefined)
    mockExtractListingFlags.mockResolvedValue({})
    mockGenerateNarrative.mockResolvedValue('Test narrative')
    mockGeocodeAddress.mockResolvedValue(null)
    mockGetWalkScore.mockResolvedValue(null)
    mockFetchRentalComps.mockResolvedValue(null)
    mockFetchMarketDemand.mockResolvedValue({
      daysOnMarket: null,
      domSample: 0,
      rentTrend: null,
      trendChangePct: null,
      recentSample: 0,
      priorSample: 0,
    })
    mockGetFlagOverrides.mockResolvedValue([])
    mockCountGuest.mockResolvedValue(0)
    mockMarkGuest.mockResolvedValue(undefined)
    mockClaimGuest.mockResolvedValue(0)
    global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))
  })

  afterAll(async () => {
    await app.close()
    delete process.env.GUEST_ANALYSIS_LIMIT_ENABLED
  })

  it('issues a visitor cookie on a first guest run and records the guest on the analysis', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(res.statusCode).toBe(200)
    const setCookie = String(res.headers['set-cookie'] ?? '')
    expect(setCookie).toMatch(
      /^ps_guest=[0-9a-f-]{36}; Max-Age=31536000; Path=\/; HttpOnly; SameSite=Lax/
    )
    const issued = /ps_guest=([0-9a-f-]{36})/.exec(setCookie)?.[1]
    expect(mockMarkGuest).toHaveBeenCalledWith('test-token', issued)
  })

  it('reuses an existing cookie and does not reissue it', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: { cookie: `ps_guest=${GUEST_ID}` },
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['set-cookie']).toBeUndefined()
    expect(mockMarkGuest).toHaveBeenCalledWith('test-token', GUEST_ID)
  })

  it('with the wall off, a second guest analysis runs (only a nudge is shown)', async () => {
    mockCountGuest.mockResolvedValue(3)
    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: { cookie: `ps_guest=${GUEST_ID}` },
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(res.statusCode).toBe(200)
    expect(mockCountGuest).not.toHaveBeenCalled()
  })

  it('with the wall on, the second analysis is refused with GUEST_LIMIT_REACHED and nothing runs', async () => {
    process.env.GUEST_ANALYSIS_LIMIT_ENABLED = 'true'
    mockCountGuest.mockResolvedValue(1)
    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: { cookie: `ps_guest=${GUEST_ID}` },
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(res.statusCode).toBe(402)
    const body = res.json() as ApiError & { used: number; limit: number }
    expect(body.code).toBe('GUEST_LIMIT_REACHED')
    expect(body.used).toBe(1)
    expect(body.limit).toBe(1)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockMarkGuest).not.toHaveBeenCalled()
  })

  it('with the wall on, the first analysis runs and tenant mode is always exempt', async () => {
    process.env.GUEST_ANALYSIS_LIMIT_ENABLED = 'true'
    mockCountGuest.mockResolvedValue(0)
    const first = await app.inject({
      method: 'POST',
      url: '/',
      headers: { cookie: `ps_guest=${GUEST_ID}` },
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(first.statusCode).toBe(200)
    mockCountGuest.mockResolvedValue(5)
    const tenant = await app.inject({
      method: 'POST',
      url: '/',
      headers: { cookie: `ps_guest=${GUEST_ID}` },
      payload: { token: 'test-token', mode: 'tenant' },
    })
    expect(tenant.statusCode).toBe(200)
  })

  it('with the wall on but the column not applied (count unknown), the analysis runs', async () => {
    process.env.GUEST_ANALYSIS_LIMIT_ENABLED = 'true'
    mockCountGuest.mockResolvedValue(null)
    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: { cookie: `ps_guest=${GUEST_ID}` },
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('a signed-in run with a guest cookie claims that guest’s earlier reports', async () => {
    mockGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@example.com' } },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getSupabase>)
    mockGetUserById.mockResolvedValue({
      id: 'user-1',
      email: 'u@example.com',
      tier: 'pro',
      stripe_customer_id: null,
    } as unknown as Awaited<ReturnType<typeof getUserById>>)
    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: { authorization: 'Bearer jwt', cookie: `ps_guest=${GUEST_ID}` },
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(res.statusCode).toBe(200)
    expect(mockClaimGuest).toHaveBeenCalledWith(GUEST_ID, 'user-1')
    expect(mockMarkGuest).not.toHaveBeenCalled()
  })
})

describe('POST / — idempotent by token', () => {
  let app: FastifyInstance

  function calcEngineCalls(): number {
    const fetchMock = global.fetch as jest.Mock
    return fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/analysis/')).length
  }

  beforeAll(async () => {
    app = await buildApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetListingByToken.mockResolvedValue(LISTING_FIXTURE)
    mockUpdateAnalysisStatus.mockResolvedValue(undefined)
    mockSaveAnalysis.mockResolvedValue(undefined)
    mockExtractListingFlags.mockResolvedValue({})
    mockGenerateNarrative.mockResolvedValue('Test narrative')
    mockGeocodeAddress.mockResolvedValue(null)
    mockGetWalkScore.mockResolvedValue(null)
    mockFetchRentalComps.mockResolvedValue(null)
    mockGetFlagOverrides.mockResolvedValue([])
    mockClaim.mockResolvedValue(undefined)
    mockGetStatus.mockResolvedValue('pending')
    global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns a finished analysis as stored, without running anything', async () => {
    mockGetStatus.mockResolvedValue('complete')
    const stored = { id: 'a1', token: 'test-token', mode: 'investor', narrative: 'Stored' }
    mockGetAnalysisByToken.mockResolvedValue({
      analysis: stored as never,
      listing: LISTING_FIXTURE,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { analysis: { narrative: string }; cached: boolean }
    expect(body.analysis.narrative).toBe('Stored')
    expect(body.cached).toBe(true)
    expect(calcEngineCalls()).toBe(0)
    expect(mockSaveAnalysis).not.toHaveBeenCalled()
  })

  it('does not count or re-claim a finished analysis — the owner at the limit still gets it', async () => {
    mockGetStatus.mockResolvedValue('complete')
    mockGetAnalysisByToken.mockResolvedValue({
      analysis: { id: 'a1', token: 'test-token', mode: 'investor' } as never,
      listing: LISTING_FIXTURE,
    })
    mockGetSupabase.mockReturnValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'u1', email: 'u@x' } }, error: null }),
      },
    } as unknown as ReturnType<typeof getSupabase>)
    mockGetUserById.mockResolvedValue({ id: 'u1', tier: 'free' } as never)
    mockMonthlyCount.mockResolvedValue(10)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: { authorization: 'Bearer jwt' },
      payload: { token: 'test-token', mode: 'investor' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockMonthlyCount).not.toHaveBeenCalled()
    expect(mockClaim).not.toHaveBeenCalled()
  })

  it('answers 202 to a second trigger while the first is still running, and runs the pipeline once', async () => {
    // Hold the calc-engine call open so the first request stays in flight.
    let release: (() => void) | null = null
    const gate = new Promise<void>((r) => {
      release = r
    })
    ;(global.fetch as jest.Mock).mockImplementation(async () => {
      await gate
      return makeCalcResponse(CALC_ENGINE_FIXTURE)
    })

    const first = app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    // Let the first request reach the calc-engine await.
    await new Promise((r) => setTimeout(r, 20))

    const second = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(second.statusCode).toBe(202)
    expect((second.json() as { status: string }).status).toBe('processing')

    // The 202 must not have released the running request's mark.
    const third = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(third.statusCode).toBe(202)

    release!()
    const done = await first
    expect(done.statusCode).toBe(200)
    expect(calcEngineCalls()).toBe(1)

    // And once finished, the mark is released: a new trigger runs again.
    const after = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(after.statusCode).toBe(200)
    expect(calcEngineCalls()).toBe(2)
  })

  it('releases the mark when the pipeline fails, so a retry can run', async () => {
    // Fail the calc-engine call only (other fetches — the rate feed — are
    // non-fatal and would just fall back).
    let failedOnce = false
    ;(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (String(url).endsWith('/analysis/') && !failedOnce) {
        failedOnce = true
        throw new Error('engine down')
      }
      return makeCalcResponse(CALC_ENGINE_FIXTURE)
    })
    const failed = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(failed.statusCode).toBeGreaterThanOrEqual(500)

    const retry = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'investor' },
    })
    expect(retry.statusCode).toBe(200)
  })

  it('keeps different tokens independent', async () => {
    let release: (() => void) | null = null
    const gate = new Promise<void>((r) => {
      release = r
    })
    ;(global.fetch as jest.Mock).mockImplementation(async () => {
      await gate
      return makeCalcResponse(CALC_ENGINE_FIXTURE)
    })
    const a = app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'tok-a', mode: 'investor' },
    })
    await new Promise((r) => setTimeout(r, 20))
    const b = app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'tok-b', mode: 'investor' },
    })
    await new Promise((r) => setTimeout(r, 20))
    release!()
    const [ra, rb] = await Promise.all([a, b])
    expect(ra.statusCode).toBe(200)
    expect(rb.statusCode).toBe(200)
    expect(calcEngineCalls()).toBe(2)
  })
})

// ── Request shape (audit API-04) ──────────────────────────────────────────────

describe('POST / — request shape', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp()
  })
  beforeEach(() => {
    jest.clearAllMocks()
  })
  afterAll(async () => {
    await app.close()
  })

  it('rejects a token that is not a share token, before any lookup', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'x'.repeat(5000), mode: 'investor' },
    })
    expect(res.statusCode).toBe(400)
    const body = res.json() as ApiError
    expect(body.code).toBe('INVALID_REQUEST')
    expect(mockGetListingByToken).not.toHaveBeenCalled()
  })

  it('rejects a non-string token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: { $ne: null }, mode: 'investor' },
    })
    expect(res.statusCode).toBe(400)
    expect((res.json() as ApiError).code).toBe('INVALID_REQUEST')
  })

  it("keeps the handler's own codes for meaning, not shape", async () => {
    // A well-formed body with a mode we do not serve is the handler's call.
    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { token: 'test-token', mode: 'wholesaler' },
    })
    expect(res.statusCode).toBe(400)
    expect((res.json() as ApiError).code).toBe('INVALID_MODE')
  })
})
