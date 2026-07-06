/**
 * Functionality tests for POST /analysis/:token/sunscout — facade-direction
 * SunScout recalculation. Calc engine + Supabase are mocked.
 */

import Fastify, { type FastifyInstance } from 'fastify'
import sunscoutRoutes from './sunscout'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'
import type { ApiError } from '../types/api'

jest.mock('../services/supabaseService')

import { getAnalysisByToken, updateAnalysisByToken } from '../services/supabaseService'

const mockGetAnalysisByToken = jest.mocked(getAnalysisByToken)
const mockUpdateAnalysisByToken = jest.mocked(updateAnalysisByToken)

const LISTING = { id: 'listing-1' } as Listing

const ANALYSIS: Analysis = {
  id: 'analysis-1',
  token: 'test-token',
  mode: 'personal',
  createdAt: '2026-07-01T00:00:00.000Z',
  metrics: null,
  dealScore: null,
  rentalComps: null,
  riskFlags: [],
  narrative: null,
  walkScore: null,
  neighbourhood: null,
  hasSanityWarnings: false,
  sunScout: null,
  coordinates: { lat: 43.65, lng: -79.38 },
}

const PY_SUN_SCOUT = {
  annual_peak_sun_hours: 980,
  summer_daily_hours: 6.1,
  winter_daily_hours: 1.4,
  seasonal_grid: { Dec: 1.4, Mar: 3.2, Jun: 6.1, Sep: 4.0 },
  monthly_hours: [1.4, 2.1, 3.2, 4.1, 5.5, 6.1, 6.0, 5.2, 4.0, 2.9, 1.8, 1.3],
  sun_score: 44,
  verdict: 'average',
}

function makeCalcResponse(body: object, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

let app: FastifyInstance

beforeEach(async () => {
  jest.clearAllMocks()
  mockGetAnalysisByToken.mockResolvedValue({ analysis: ANALYSIS, listing: LISTING })
  mockUpdateAnalysisByToken.mockResolvedValue(undefined)
  global.fetch = jest.fn().mockResolvedValue(makeCalcResponse({ sun_scout: PY_SUN_SCOUT }))
  app = Fastify({ logger: false })
  await app.register(sunscoutRoutes)
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

describe('POST /:token/sunscout', () => {
  it('recalculates for the requested facade bearing and returns camelCase sunScout', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-token/sunscout',
      payload: { facadeBearing: 0 },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { sunScout: NonNullable<Analysis['sunScout']> }
    expect(body.sunScout.sunScore).toBe(44)
    expect(body.sunScout.verdict).toBe('average')
    expect(body.sunScout.monthlyHours).toHaveLength(12)

    // The calc engine received the analysis coordinates + the chosen bearing.
    const fetchMock = global.fetch as jest.Mock
    const sentBody = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string) as {
      lat: number
      lng: number
      azimuth_deg: number
    }
    expect(sentBody).toEqual({ lat: 43.65, lng: -79.38, azimuth_deg: 0 })
  })

  it('persists the recalculated sunScout so reloads keep the chosen orientation', async () => {
    await app.inject({
      method: 'POST',
      url: '/test-token/sunscout',
      payload: { facadeBearing: 90 },
    })

    expect(mockUpdateAnalysisByToken).toHaveBeenCalledTimes(1)
    const [token, saved] = mockUpdateAnalysisByToken.mock.calls[0]!
    expect(token).toBe('test-token')
    expect(saved.sunScout?.sunScore).toBe(44)
  })

  it('404s for an unknown token', async () => {
    mockGetAnalysisByToken.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/nope/sunscout',
      payload: { facadeBearing: 180 },
    })

    expect(res.statusCode).toBe(404)
  })

  it('422s when the analysis has no coordinates (geocoding failed)', async () => {
    mockGetAnalysisByToken.mockResolvedValue({
      analysis: { ...ANALYSIS, coordinates: null },
      listing: LISTING,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/test-token/sunscout',
      payload: { facadeBearing: 180 },
    })

    expect(res.statusCode).toBe(422)
    expect((res.json() as ApiError).code).toBe('NO_COORDINATES')
  })

  it('400s on an out-of-range bearing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-token/sunscout',
      payload: { facadeBearing: 400 },
    })

    expect(res.statusCode).toBe(400)
    expect((res.json() as ApiError).code).toBe('INVALID_BEARING')
  })
})
