/**
 * PR9 integration test — full scrape → analyze → fetch roundtrip.
 *
 * What's mocked:
 *   - The Python scraper service (fetch to SCRAPER_URL/scrape)
 *   - The Python calc engine (fetch to CALC_ENGINE_URL/analysis/)
 *   - Claude (extractListingFlags + generateNarrative)
 *   - Walk Score, Mapbox
 *   - supabaseService — in-memory store keyed by listing id and share_token
 *
 * Asserts:
 *   1. POST /scrape returns a token + listing
 *   2. The pending analyses row is created against the saved listing
 *   3. POST /analysis with that token + mode returns 200 with metrics + narrative
 *   4. The analyses row is updated with calculated_metrics + deal_score
 *   5. GET /analysis/:token returns status=complete with the persisted analysis
 */

import Fastify, { type FastifyInstance } from 'fastify'
import scrapeRoutes from './scrape'
import analysisRoutes from './analysis'
import analysisTokenRoutes from './analysisToken'
import type { Listing } from '../types/property'
import type { Analysis } from '../types/analysis'

// ── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../services/supabaseService')
jest.mock('../services/anthropicService')
jest.mock('../services/mapboxService')
jest.mock('../services/walkScoreService')

import {
  saveListing,
  createPendingAnalysis,
  getListingByToken,
  updateAnalysisStatus,
  updateAnalysisByToken,
  fetchRentalComps,
  getAnalysisStatus,
  getAnalysisByToken,
} from '../services/supabaseService'
import { extractListingFlags, generateNarrative } from '../services/anthropicService'
import { geocodeAddress } from '../services/mapboxService'
import { getWalkScore } from '../services/walkScoreService'

const mockSaveListing = jest.mocked(saveListing)
const mockCreatePendingAnalysis = jest.mocked(createPendingAnalysis)
const mockGetListingByToken = jest.mocked(getListingByToken)
const mockUpdateAnalysisStatus = jest.mocked(updateAnalysisStatus)
const mockUpdateAnalysisByToken = jest.mocked(updateAnalysisByToken)
const mockFetchRentalComps = jest.mocked(fetchRentalComps)
const mockGetAnalysisStatus = jest.mocked(getAnalysisStatus)
const mockGetAnalysisByToken = jest.mocked(getAnalysisByToken)
const mockExtractListingFlags = jest.mocked(extractListingFlags)
const mockGenerateNarrative = jest.mocked(generateNarrative)
const mockGeocodeAddress = jest.mocked(geocodeAddress)
const mockGetWalkScore = jest.mocked(getWalkScore)

// ── In-memory DB store ──────────────────────────────────────────────────────

interface Row {
  id: string
  listing: Omit<Listing, 'id'>
  analysis: Analysis | null
}

const db = new Map<string, Row>() // keyed by share_token
let nextListingId = 1

function resetDb(): void {
  db.clear()
  nextListingId = 1
}

// ── Scraper + calc engine fetch mocks ───────────────────────────────────────

const SCRAPED_LISTING = {
  url: 'https://www.realtor.ca/real-estate/integration-test/buttermill-ave',
  address: '5702 Buttermill Ave, Vaughan, ON L4K 0J2',
  price: 729900,
  beds: 3,
  baths: 2,
  sqft: 1200,
  property_type: 'Condo',
  annual_taxes: 3326,
  taxes_known: true,
  condo_fee_monthly: 761,
  condo_fee_known: true,
  year_built: 2015,
  year_built_known: true,
  listing_type: 'for_sale',
  listing_description: 'Beautiful 3-bed condo in Vaughan.',
  photo_urls: ['https://cdn.realtor.ca/photo1.jpg'],
  days_on_market: 14,
  raw: {},
}

const CALC_RESPONSE = {
  metrics: {
    cash_flow_monthly: -1833,
    cash_flow_annual: -21996,
    cap_rate: 0.025,
    cash_on_cash_return: -0.125,
    dscr: 0.45,
    grm: 20.97,
    noi: 14397,
    mortgage_payment_monthly: 3326,
    down_payment: 145980,
    mortgage_amount: 583920,
    amortization_years: 25,
    mortgage_rate: 0.0479,
    break_even_rent: 4585,
    closing_costs_total: 13473,
    ltt_provincial: 11073,
    ltt_municipal: 0,
    has_sanity_warnings: false,
  },
  deal_score: {
    total: 9,
    verdict: 'hard_pass',
    breakdown: {
      cap_rate: 0,
      cash_flow: 0,
      cash_on_cash: 0,
      dscr: 0,
      demand: 9,
      subtotal: 9,
      deduction: 0,
      component_maxes: { cap_rate: 25, cash_flow: 25, cash_on_cash: 20, dscr: 15, demand: 10 },
    },
  },
  risk_flags: [],
  has_sanity_warnings: false,
}

function makeJsonResponse(body: object, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

function routeFetch(url: string): Promise<Response> {
  if (url.includes('/scrape')) return Promise.resolve(makeJsonResponse(SCRAPED_LISTING))
  if (url.includes('/analysis/')) return Promise.resolve(makeJsonResponse(CALC_RESPONSE))
  return Promise.reject(new Error(`Unmocked URL: ${url}`))
}

// ── App ─────────────────────────────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const f = Fastify({ logger: false })
  await f.register(scrapeRoutes, { prefix: '/scrape' })
  await f.register(analysisRoutes, { prefix: '/analysis' })
  await f.register(analysisTokenRoutes, { prefix: '/analysis' })
  return f
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('PR9 integration — scrape → analyze → fetch roundtrip', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    resetDb()

    // Wire mocked supabaseService to the in-memory store
    mockSaveListing.mockImplementation(async () => `listing-${nextListingId++}`)
    mockCreatePendingAnalysis.mockImplementation(async (listingId, token) => {
      db.set(token, {
        id: listingId,
        listing: {
          url: SCRAPED_LISTING.url,
          listingType: 'for-sale',
          address: SCRAPED_LISTING.address,
          city: 'Vaughan',
          province: 'ON',
          postalCode: 'L4K0J2',
          price: SCRAPED_LISTING.price,
          rentMonthly: null,
          beds: SCRAPED_LISTING.beds,
          baths: SCRAPED_LISTING.baths,
          sqft: SCRAPED_LISTING.sqft,
          propertyType: 'condo',
          yearBuilt: SCRAPED_LISTING.year_built,
          parkingSpots: 0,
          condoFeeMonthly: SCRAPED_LISTING.condo_fee_monthly,
          condoFeeKnown: SCRAPED_LISTING.condo_fee_known,
          annualTaxes: SCRAPED_LISTING.annual_taxes,
          description: SCRAPED_LISTING.listing_description,
          photos: SCRAPED_LISTING.photo_urls,
          scrapedAt: new Date().toISOString(),
        },
        analysis: null,
      })
    })
    mockGetListingByToken.mockImplementation(async (token) => {
      const row = db.get(token)
      return row ? ({ id: row.id, ...row.listing } as Listing) : null
    })
    mockUpdateAnalysisStatus.mockResolvedValue(undefined)
    mockUpdateAnalysisByToken.mockImplementation(async (token, analysis) => {
      const row = db.get(token)
      if (row) row.analysis = analysis
    })
    mockFetchRentalComps.mockResolvedValue({
      low: 2700,
      mid: 2900,
      high: 3200,
      compCount: 8,
      confidence: 'medium',
    })
    mockGetAnalysisStatus.mockImplementation(async (token) => {
      const row = db.get(token)
      if (!row) return null
      return row.analysis ? 'complete' : 'pending'
    })
    mockGetAnalysisByToken.mockImplementation(async (token) => {
      const row = db.get(token)
      if (!row || !row.analysis) return null
      return { analysis: row.analysis, listing: { id: row.id, ...row.listing } as Listing }
    })

    // External APIs
    mockExtractListingFlags.mockResolvedValue({})
    mockGenerateNarrative.mockResolvedValue(
      'Test narrative — the deal does not pencil at this asking price.'
    )
    mockGeocodeAddress.mockResolvedValue({
      lat: 43.79,
      lng: -79.53,
      formattedAddress: '5702 Buttermill Ave, Vaughan, ON',
    })
    mockGetWalkScore.mockResolvedValue({
      walk: 65,
      transit: 55,
      bike: 60,
      description: 'Somewhat Walkable',
    })

    global.fetch = jest.fn().mockImplementation((url: string) => routeFetch(url))
  })

  it('full roundtrip: scrape → analyze → fetch', async () => {
    // Step 1 — POST /scrape
    const scrapeRes = await app.inject({
      method: 'POST',
      url: '/scrape/',
      payload: { url: SCRAPED_LISTING.url },
    })

    expect(scrapeRes.statusCode).toBe(200)
    const scrapeBody = scrapeRes.json() as {
      token: string
      listing: Listing
    }
    expect(scrapeBody.token).toBeDefined()
    expect(scrapeBody.listing.address).toBe(SCRAPED_LISTING.address)
    expect(scrapeBody.listing.postalCode).toBe('L4K0J2')

    const { token } = scrapeBody

    // Pending analysis row was created
    expect(mockCreatePendingAnalysis).toHaveBeenCalledWith(expect.any(String), token)
    expect(db.get(token)).toBeDefined()
    expect(db.get(token)?.analysis).toBeNull()

    // Step 2 — POST /analysis
    const analysisRes = await app.inject({
      method: 'POST',
      url: '/analysis/',
      payload: { token, mode: 'investor' },
    })

    expect(analysisRes.statusCode).toBe(200)
    const analysisBody = analysisRes.json() as {
      token: string
      analysis: Analysis
    }
    expect(analysisBody.token).toBe(token)
    expect(analysisBody.analysis.mode).toBe('investor')
    expect(analysisBody.analysis.narrative).toContain('does not pencil')
    expect(analysisBody.analysis.metrics?.capRate).toBe(0.025)
    expect(analysisBody.analysis.dealScore?.verdict).toBe('hard_pass')
    expect(analysisBody.analysis.walkScore?.walk).toBe(65)
    expect(analysisBody.analysis.rentalComps?.compCount).toBe(8)

    // Persisted
    expect(mockUpdateAnalysisByToken).toHaveBeenCalledTimes(1)
    expect(db.get(token)?.analysis).not.toBeNull()

    // Step 3 — GET /analysis/:token
    const getRes = await app.inject({
      method: 'GET',
      url: `/analysis/${token}`,
    })

    expect(getRes.statusCode).toBe(200)
    const getBody = getRes.json() as {
      status: string
      analysis?: Analysis
      listing?: Listing
    }
    expect(getBody.status).toBe('complete')
    expect(getBody.analysis?.dealScore?.verdict).toBe('hard_pass')
    expect(getBody.listing?.address).toBe(SCRAPED_LISTING.address)
  })

  it('province gate: non-Ontario postal code returns PROVINCE_NOT_SUPPORTED', async () => {
    const bcListing = { ...SCRAPED_LISTING, address: '456 Oak Ave, Vancouver, BC V6B 1A1' }
    global.fetch = jest.fn().mockResolvedValue(makeJsonResponse(bcListing))

    const res = await app.inject({
      method: 'POST',
      url: '/scrape/',
      payload: { url: bcListing.url },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { error: string; province: string }
    expect(body.error).toBe('PROVINCE_NOT_SUPPORTED')
    expect(body.province).toBe('BC')
    expect(mockSaveListing).not.toHaveBeenCalled()
    expect(mockCreatePendingAnalysis).not.toHaveBeenCalled()
  })

  it('GET /analysis/:token returns pending before POST /analysis runs', async () => {
    // Trigger only the scrape step
    const scrapeRes = await app.inject({
      method: 'POST',
      url: '/scrape/',
      payload: { url: SCRAPED_LISTING.url },
    })
    const { token } = scrapeRes.json() as { token: string }

    // GET before analysis pipeline runs
    const getRes = await app.inject({ method: 'GET', url: `/analysis/${token}` })
    expect(getRes.statusCode).toBe(200)
    expect((getRes.json() as { status: string }).status).toBe('pending')
  })
})
