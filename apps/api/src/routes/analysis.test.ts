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

import Fastify, { type FastifyInstance } from 'fastify'
import analysisRoutes from './analysis'
import type { Analysis } from '../types/analysis'
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
  getFlagOverrides,
  getNearbySchools,
} from '../services/supabaseService'
import { extractListingFlags, generateNarrative } from '../services/anthropicService'
import { geocodeAddress } from '../services/mapboxService'
import { getWalkScore } from '../services/walkScoreService'
import { getVacancyRateByCity } from '../services/cmhcService'

const mockGetListingByToken = jest.mocked(getListingByToken)
const mockUpdateAnalysisStatus = jest.mocked(updateAnalysisStatus)
const mockSaveAnalysis = jest.mocked(updateAnalysisByToken)
const mockFetchRentalComps = jest.mocked(fetchRentalComps)
const mockExtractListingFlags = jest.mocked(extractListingFlags)
const mockGenerateNarrative = jest.mocked(generateNarrative)
const mockGeocodeAddress = jest.mocked(geocodeAddress)
const mockGetWalkScore = jest.mocked(getWalkScore)
const mockGetFlagOverrides = jest.mocked(getFlagOverrides)
const mockGetNearbySchools = jest.mocked(getNearbySchools)

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
    expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith('test-token', 'failed')
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
    expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith('test-token', 'failed')
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
    expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith('test-token', 'failed')
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
    expect(body.analysis.schools).toEqual(SCHOOLS_FIXTURE)
    // Persisted with the analysis so /r/:token reads it back
    const saved = mockSaveAnalysis.mock.calls[0]![1]
    expect(saved.schools).toEqual(SCHOOLS_FIXTURE)
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
