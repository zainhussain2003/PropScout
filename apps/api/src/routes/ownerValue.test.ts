/**
 * Functionality tests for POST /analysis/:token/value — a landlord's stated
 * value re-runs the report on that number (D-107). Calc engine, Supabase and
 * every external service are mocked; the pipeline itself runs.
 */

import Fastify, { type FastifyInstance } from 'fastify'
import ownerValueRoutes from './ownerValue'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'
import type { ApiError } from '../types/api'

jest.mock('../services/supabaseService')
jest.mock('../services/anthropicService')
jest.mock('../services/mapboxService')
jest.mock('../services/walkScoreService')

import {
  getAnalysisByToken,
  getListingByToken,
  updateAnalysisStatus,
  updateAnalysisByToken,
  fetchRentalComps,
  fetchMarketDemand,
  getFlagOverrides,
} from '../services/supabaseService'
import { generateNarrative } from '../services/anthropicService'
import { geocodeAddress } from '../services/mapboxService'
import { getWalkScore } from '../services/walkScoreService'

const mockGetAnalysisByToken = jest.mocked(getAnalysisByToken)
const mockGetListingByToken = jest.mocked(getListingByToken)
const mockUpdateAnalysisStatus = jest.mocked(updateAnalysisStatus)
const mockUpdateAnalysisByToken = jest.mocked(updateAnalysisByToken)
const mockFetchRentalComps = jest.mocked(fetchRentalComps)
const mockFetchMarketDemand = jest.mocked(fetchMarketDemand)
const mockGetFlagOverrides = jest.mocked(getFlagOverrides)
const mockGenerateNarrative = jest.mocked(generateNarrative)
const mockGeocodeAddress = jest.mocked(geocodeAddress)
const mockGetWalkScore = jest.mocked(getWalkScore)

/** A for-rent condo: no price, a listed rent. */
const RENTAL_LISTING: Listing = {
  id: 'listing-rental-1',
  url: 'https://www.realtor.ca/real-estate/30277333/317-608-richmond-st-w-toronto',
  listingType: 'for-rent',
  address: '317-608 Richmond St W, Toronto, ON M5V 1Y9',
  city: 'Toronto',
  province: 'ON',
  postalCode: 'M5V1Y9',
  price: null,
  rentMonthly: 3400,
  beds: 2,
  baths: 2,
  sqft: 900,
  propertyType: 'condo',
  yearBuilt: 2012,
  parkingSpots: 1,
  condoFeeMonthly: null,
  condoFeeKnown: false,
  annualTaxes: null,
  description: 'Bright two-bedroom.',
  photos: [],
  scrapedAt: '2026-09-14T00:00:00.000Z',
}

function analysisFor(mode: Analysis['mode']): Analysis {
  return {
    id: 'analysis-1',
    token: 'test-token',
    mode,
    createdAt: '2026-09-14T00:00:00.000Z',
    metrics: null,
    dealScore: null,
    rentalComps: null,
    riskFlags: [],
    narrative: null,
    walkScore: null,
    neighbourhood: null,
    hasSanityWarnings: false,
    sunScout: null,
    coordinates: null,
  }
}

const CALC_ENGINE_FIXTURE = {
  metrics: {
    cash_flow_monthly: -420,
    cash_flow_annual: -5040,
    cap_rate: 0.041,
    cash_on_cash_return: -0.03,
    dscr: 0.92,
    grm: 19.6,
    noi: 32_800,
    mortgage_payment_monthly: 3_200,
    down_payment: 160_000,
    mortgage_amount: 640_000,
    amortization_years: 25,
    mortgage_rate: 0.0479,
    break_even_rent: 3_820,
    closing_costs_total: 24_000,
    ltt_provincial: 12_475,
    ltt_municipal: 12_475,
    has_sanity_warnings: false,
  },
  deal_score: {
    total: 38,
    display_total: 38,
    verdict: 'marginal',
    breakdown: {
      cap_rate: 10,
      cash_flow: 10,
      cash_on_cash: 8,
      dscr: 3,
      demand: 7,
      subtotal: 38,
      deduction: 0,
      component_maxes: { cap_rate: 25, cash_flow: 25, cash_on_cash: 20, dscr: 15, demand: 10 },
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

function sentCalcBody(): { property_data: { price: number } } {
  const fetchMock = global.fetch as jest.Mock
  const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/analysis/'))
  if (!call) throw new Error('calc engine was not called')
  return JSON.parse((call[1] as RequestInit).body as string)
}

let app: FastifyInstance

beforeEach(async () => {
  jest.clearAllMocks()
  mockGetAnalysisByToken.mockResolvedValue({
    analysis: analysisFor('landlord'),
    listing: RENTAL_LISTING,
  })
  mockGetListingByToken.mockResolvedValue(RENTAL_LISTING)
  mockUpdateAnalysisStatus.mockResolvedValue(undefined)
  mockUpdateAnalysisByToken.mockResolvedValue(undefined)
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
  mockGenerateNarrative.mockResolvedValue('Narrative.')
  mockGeocodeAddress.mockResolvedValue(null)
  mockGetWalkScore.mockResolvedValue(null)
  global.fetch = jest.fn().mockResolvedValue(makeCalcResponse(CALC_ENGINE_FIXTURE))
  app = Fastify({ logger: false })
  await app.register(ownerValueRoutes)
})

afterEach(async () => {
  await app.close()
})

describe('POST /:token/value', () => {
  it('re-runs the engine on the stated value, persists it, and returns the new analysis', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-token/value',
      payload: { value: 800_000 },
    })
    expect(res.statusCode).toBe(200)

    // The engine scored the landlord's number, not the rent-derived estimate.
    expect(sentCalcBody().property_data.price).toBe(800_000)

    const body = res.json() as { token: string; analysis: Analysis }
    expect(body.analysis.ownerInputs?.value).toBe(800_000)
    expect(body.analysis.ownerInputs?.enteredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(body.analysis.dealScore?.total).toBe(38)

    // Sources ledger: the value is observed, from the landlord, dated.
    const row = body.analysis.assumptions?.find((e) => e.key === 'value_owner')
    expect(row?.basis).toBe('observed')
    expect(row?.value).toBe('$800,000')
    expect(row?.source).toBe('You entered it')
    expect(body.analysis.assumptions?.find((e) => e.key === 'value_estimate')).toBeUndefined()

    // Saved with the listing snapshot, and the row marked complete again.
    expect(mockUpdateAnalysisByToken).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ ownerInputs: expect.objectContaining({ value: 800_000 }) }),
      RENTAL_LISTING
    )
    expect(mockUpdateAnalysisStatus).toHaveBeenLastCalledWith('test-token', 'complete')
  })

  it('rounds the value to whole dollars', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-token/value',
      payload: { value: 799_999.6 },
    })
    expect(res.statusCode).toBe(200)
    expect(sentCalcBody().property_data.price).toBe(800_000)
  })

  it.each([[49_999], [50_000_001], [-1], [0]])(
    'rejects an implausible value (%s) without running anything',
    async (value) => {
      const res = await app.inject({ method: 'POST', url: '/test-token/value', payload: { value } })
      expect(res.statusCode).toBe(400)
      expect((res.json() as ApiError).code).toBe('INVALID_VALUE')
      expect(global.fetch).not.toHaveBeenCalled()
    }
  )

  it('rejects a missing or non-numeric value at the schema', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-token/value',
      payload: { value: 'lots' },
    })
    expect(res.statusCode).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('only a landlord report takes a value', async () => {
    mockGetAnalysisByToken.mockResolvedValue({
      analysis: analysisFor('investor'),
      listing: RENTAL_LISTING,
    })
    const res = await app.inject({
      method: 'POST',
      url: '/test-token/value',
      payload: { value: 800_000 },
    })
    expect(res.statusCode).toBe(409)
    expect((res.json() as ApiError).code).toBe('VALUE_NOT_APPLICABLE')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('404s an unknown token', async () => {
    mockGetAnalysisByToken.mockResolvedValue(null)
    const res = await app.inject({
      method: 'POST',
      url: '/nope/value',
      payload: { value: 800_000 },
    })
    expect(res.statusCode).toBe(404)
  })

  it('surfaces an engine outage as 503 and marks the run failed', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const res = await app.inject({
      method: 'POST',
      url: '/test-token/value',
      payload: { value: 800_000 },
    })
    expect(res.statusCode).toBe(503)
    expect((res.json() as ApiError).code).toBe('CALC_ENGINE_UNAVAILABLE')
    expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
      'test-token',
      'failed',
      'CALC_ENGINE_UNAVAILABLE'
    )
  })
})
