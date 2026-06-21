/**
 * Functionality tests for GET /analysis/:token (polling endpoint).
 *
 * Covers:
 *   - status 'pending'    → 200 { status: 'pending' }
 *   - status 'processing' → 200 { status: 'processing' }
 *   - status 'failed'     → 200 { status: 'failed' }
 *   - status 'complete', getAnalysisByToken returns data → 200 { status, analysis, listing }
 *   - getAnalysisStatus returns null → 404 NOT_FOUND
 *   - status 'complete', getAnalysisByToken returns null (race/expiry) → 410 EXPIRED
 *   - getAnalysisStatus throws → 500 INTERNAL_ERROR
 */

import Fastify, { type FastifyInstance } from 'fastify'
import getAnalysisTokenRoutes from './analysisToken'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'
import type { ApiError } from '../types/api'

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../services/supabaseService')

import { getAnalysisStatus, getAnalysisByToken } from '../services/supabaseService'

const mockGetAnalysisStatus = jest.mocked(getAnalysisStatus)
const mockGetAnalysisByToken = jest.mocked(getAnalysisByToken)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PENDING_TOKEN = 'pending-token'
const COMPLETE_TOKEN = 'complete-token'

const ANALYSIS_FIXTURE: Analysis = {
  id: COMPLETE_TOKEN,
  token: COMPLETE_TOKEN,
  mode: 'investor',
  createdAt: '2026-06-01T00:00:00.000Z',
  metrics: {
    cashFlowMonthly: -1833,
    cashFlowAnnual: -21_996,
    capRate: 0.025,
    cashOnCashReturn: -0.125,
    dscr: 0.45,
    grm: 20.97,
    noi: 14_397,
    mortgagePaymentMonthly: 3_326,
    downPayment: 145_980,
    mortgageAmount: 583_920,
    amortizationYears: 25,
    mortgageRate: 0.0479,
    breakEvenRent: 4_585,
    closingCostsTotal: 13_473,
    lttProvincial: 11_073,
    lttMunicipal: 0,
    hasSanityWarnings: false,
  },
  dealScore: {
    total: 9,
    verdict: 'hard_pass',
    breakdown: {
      capRate: 0,
      cashFlow: 0,
      cashOnCash: 0,
      dscr: 0,
      demand: 9,
      subtotal: 9,
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
  narrative: 'Test narrative.',
  walkScore: null,
  neighbourhood: null,
  sunScout: null,
  hasSanityWarnings: false,
}

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

// ── App factory ───────────────────────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false })
  await fastify.register(getAnalysisTokenRoutes)
  return fastify
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /:token — analysis polling', () => {
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

  // ── Test 1 ─────────────────────────────────────────────────────────────────

  it("getAnalysisStatus returns 'pending' → 200 { status: 'pending' }", async () => {
    mockGetAnalysisStatus.mockResolvedValue('pending')

    const res = await app.inject({ method: 'GET', url: `/${PENDING_TOKEN}` })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { status: string }
    expect(body.status).toBe('pending')
    expect(mockGetAnalysisByToken).not.toHaveBeenCalled()
  })

  // ── Test 2 ─────────────────────────────────────────────────────────────────

  it("getAnalysisStatus returns 'processing' → 200 { status: 'processing' }", async () => {
    mockGetAnalysisStatus.mockResolvedValue('processing')

    const res = await app.inject({ method: 'GET', url: `/${PENDING_TOKEN}` })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { status: string }
    expect(body.status).toBe('processing')
    expect(mockGetAnalysisByToken).not.toHaveBeenCalled()
  })

  // ── Test 3 ─────────────────────────────────────────────────────────────────

  it("getAnalysisStatus returns 'failed' → 200 { status: 'failed' }", async () => {
    mockGetAnalysisStatus.mockResolvedValue('failed')

    const res = await app.inject({ method: 'GET', url: `/${PENDING_TOKEN}` })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { status: string }
    expect(body.status).toBe('failed')
    expect(mockGetAnalysisByToken).not.toHaveBeenCalled()
  })

  // ── Test 4 ─────────────────────────────────────────────────────────────────

  it("getAnalysisStatus returns 'complete', getAnalysisByToken returns data → 200 with full payload", async () => {
    mockGetAnalysisStatus.mockResolvedValue('complete')
    mockGetAnalysisByToken.mockResolvedValue({
      analysis: ANALYSIS_FIXTURE,
      listing: LISTING_FIXTURE,
    })

    const res = await app.inject({ method: 'GET', url: `/${COMPLETE_TOKEN}` })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { status: string; analysis: Analysis; listing: Listing }
    expect(body.status).toBe('complete')
    expect(body.analysis.token).toBe(COMPLETE_TOKEN)
    expect(body.analysis.dealScore?.verdict).toBe('hard_pass')
    expect(body.listing.address).toBe(LISTING_FIXTURE.address)
    expect(mockGetAnalysisByToken).toHaveBeenCalledWith(COMPLETE_TOKEN)
  })

  // ── Test 5 ─────────────────────────────────────────────────────────────────

  it('getAnalysisStatus returns null → 404 NOT_FOUND', async () => {
    mockGetAnalysisStatus.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: '/no-such-token' })

    expect(res.statusCode).toBe(404)
    const body = res.json() as ApiError
    expect(body.code).toBe('NOT_FOUND')
    expect(mockGetAnalysisByToken).not.toHaveBeenCalled()
  })

  // ── Test 6 ─────────────────────────────────────────────────────────────────

  it("getAnalysisStatus returns 'complete', getAnalysisByToken returns null → 410 EXPIRED", async () => {
    mockGetAnalysisStatus.mockResolvedValue('complete')
    mockGetAnalysisByToken.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: `/${COMPLETE_TOKEN}` })

    expect(res.statusCode).toBe(410)
    const body = res.json() as ApiError
    expect(body.code).toBe('EXPIRED')
  })

  // ── Test 7 ─────────────────────────────────────────────────────────────────

  it('getAnalysisStatus throws → 500 INTERNAL_ERROR', async () => {
    mockGetAnalysisStatus.mockRejectedValue(new Error('DB connection lost'))

    const res = await app.inject({ method: 'GET', url: '/error-token' })

    expect(res.statusCode).toBe(500)
    const body = res.json() as ApiError
    expect(body.code).toBe('INTERNAL_ERROR')
  })
})
