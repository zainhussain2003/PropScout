/**
 * Functionality tests for supabaseService.ts
 *
 * All Supabase calls are mocked — no real DB connection required.
 * Tests cover: fetchRentalComps, saveAnalysis, getAnalysisByToken.
 */

// ── Mock @supabase/supabase-js before any imports ──────────────────────────────

// We expose mockFrom so individual tests can override .from() return values.
const mockFrom = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

// Mock crypto so token generation is deterministic in tests
jest.mock('crypto', () => ({
  ...jest.requireActual<typeof import('crypto')>('crypto'),
  randomBytes: jest.fn(() => Buffer.from('deadbeefdeadbeefdeadbeefdeadbeef', 'hex')),
}))

// ── Import after mocks are installed ──────────────────────────────────────────

import { fetchRentalComps, saveAnalysis, getAnalysisByToken } from './supabaseService'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'

// ── Chain builder ─────────────────────────────────────────────────────────────
//
// Supabase queries are fluent: .from('x').select(...).gte(...).ilike(...).eq(...)
// and then the resulting query object is awaited to get { data, error }.
// We model this by making every chainable method return `chain` itself,
// and attaching a `then` method so the chain is a Promise-like thenable.
// Individual tests set `chain.__resolve` to control the resolved value.

type ChainResolution = { data: unknown; error: unknown }

interface QueryChain {
  __resolve: ChainResolution
  select: jest.Mock
  insert: jest.Mock
  upsert: jest.Mock
  eq: jest.Mock
  gte: jest.Mock
  lte: jest.Mock
  ilike: jest.Mock
  single: jest.Mock
  then: (onFulfilled: (value: ChainResolution) => unknown) => Promise<unknown>
}

function makeQueryChain(resolution: ChainResolution): QueryChain {
  const chain: QueryChain = {
    __resolve: resolution,
    select: jest.fn(),
    insert: jest.fn(),
    upsert: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    ilike: jest.fn(),
    single: jest.fn(),
    then(onFulfilled) {
      return Promise.resolve(this.__resolve).then(onFulfilled)
    },
  }
  // Every chainable method returns the chain itself
  ;(
    ['select', 'insert', 'upsert', 'eq', 'gte', 'lte', 'ilike', 'single'] as Array<keyof QueryChain>
  ).forEach((method) => {
    ;(chain[method] as jest.Mock).mockReturnValue(chain)
  })
  return chain
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

function makeAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    id: '',
    token: '',
    mode: 'investor',
    createdAt: new Date().toISOString(),
    metrics: {
      cashFlowMonthly: -1800,
      cashFlowAnnual: -21600,
      capRate: 0.025,
      cashOnCashReturn: 0.01,
      dscr: 0.45,
      grm: 20,
      noi: 18000,
      mortgagePaymentMonthly: 3200,
      downPayment: 145980,
      mortgageAmount: 583920,
      amortizationYears: 25,
      mortgageRate: 0.0479,
      breakEvenRent: 4200,
      closingCostsTotal: 22000,
      lttProvincial: 10000,
      lttMunicipal: 4475,
      hasSanityWarnings: false,
    },
    dealScore: {
      total: 12,
      displayTotal: 13,
      verdict: 'hard_pass',
      breakdown: {
        capRate: 3,
        cashFlow: 0,
        cashOnCash: 1,
        dscr: 0,
        demand: 5,
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
    narrative: null,
    hasSanityWarnings: false,
    walkScore: null,
    neighbourhood: null,
    sunScout: null,
    ...overrides,
  }
}

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: '',
    url: 'https://www.realtor.ca/real-estate/12345/test',
    listingType: 'for-sale',
    address: '5702-5 Buttermill Ave, Vaughan, ON',
    city: 'Vaughan',
    province: 'ON',
    postalCode: 'L4K5W4',
    price: 729900,
    rentMonthly: null,
    beds: 3,
    baths: 2,
    sqft: 950,
    propertyType: 'condo',
    yearBuilt: 2018,
    parkingSpots: 1,
    condoFeeMonthly: 761,
    condoFeeKnown: true,
    annualTaxes: 3326,
    description: null,
    photos: [],
    scrapedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ── fetchRentalComps tests ────────────────────────────────────────────────────

describe('fetchRentalComps', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null when the query fails', async () => {
    const chain = makeQueryChain({ data: null, error: new Error('DB error') })
    mockFrom.mockReturnValue(chain)

    const result = await fetchRentalComps('L4K5W4', 3)
    expect(result).toBeNull()
  })

  it('returns null when 0 comps found after all fallbacks', async () => {
    // Always return empty data — triggers all fallback iterations
    const chain = makeQueryChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchRentalComps('L4K5W4', 3)
    expect(result).toBeNull()
  })

  it('matches on FSA prefix (first 3 chars) using ilike', async () => {
    const chain = makeQueryChain({
      data: [
        { rent_monthly: 2700 },
        { rent_monthly: 2900 },
        { rent_monthly: 3100 },
        { rent_monthly: 2800 },
        { rent_monthly: 3000 },
      ],
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    await fetchRentalComps('L4K5W4', 3)

    // ilike should have been called with 'postal_code' and 'L4K%'
    expect(chain.ilike).toHaveBeenCalledWith('postal_code', 'L4K%')
  })

  it('returns high confidence when 8+ comps present', async () => {
    const chain = makeQueryChain({
      data: Array.from({ length: 10 }, (_, i) => ({ rent_monthly: 2700 + i * 50 })),
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await fetchRentalComps('L4K5W4', 3)
    expect(result).not.toBeNull()
    expect(result!.confidence).toBe('high')
    expect(result!.compCount).toBeGreaterThanOrEqual(8)
  })

  it('returns medium confidence when 3-7 comps present', async () => {
    const chain = makeQueryChain({
      data: [
        { rent_monthly: 2700 },
        { rent_monthly: 2900 },
        { rent_monthly: 3100 },
        { rent_monthly: 3000 },
        { rent_monthly: 2800 },
      ],
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await fetchRentalComps('L4K5W4', 3)
    expect(result).not.toBeNull()
    expect(result!.confidence).toBe('medium')
  })

  it('calculates correct percentiles for known dataset', async () => {
    // Sorted: 2700, 2800, 2900, 3000, 3100
    // p25 = 2800, p50 = 2900, p75 = 3000
    const chain = makeQueryChain({
      data: [
        { rent_monthly: 2700 },
        { rent_monthly: 2800 },
        { rent_monthly: 2900 },
        { rent_monthly: 3000 },
        { rent_monthly: 3100 },
      ],
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await fetchRentalComps('L4K5W4', 3)
    expect(result).not.toBeNull()
    expect(result!.low).toBe(2800)
    expect(result!.mid).toBe(2900)
    expect(result!.high).toBe(3000)
  })

  it('removes outliers using 1.5x IQR rule', async () => {
    // Sorted: 100 (outlier), 2700, 2800, 2900, 3000, 3100, 50000 (outlier)
    // IQR ≈ 300; bounds ≈ 2250–3550 — 100 and 50000 are removed
    const chain = makeQueryChain({
      data: [
        { rent_monthly: 100 },
        { rent_monthly: 2700 },
        { rent_monthly: 2800 },
        { rent_monthly: 2900 },
        { rent_monthly: 3000 },
        { rent_monthly: 3100 },
        { rent_monthly: 50000 },
      ],
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await fetchRentalComps('L4K5W4', 3)
    expect(result).not.toBeNull()
    // After outlier removal the extreme values must be gone
    expect(result!.low).toBeGreaterThan(100)
    expect(result!.high).toBeLessThan(50000)
  })

  it('does not filter on beds column when beds is null', async () => {
    const chain = makeQueryChain({
      data: [
        { rent_monthly: 2700 },
        { rent_monthly: 2900 },
        { rent_monthly: 3100 },
        { rent_monthly: 2800 },
        { rent_monthly: 3000 },
      ],
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    await fetchRentalComps('L4K5W4', null)

    // eq('beds', ...) should NOT have been called
    const bedsEqCalls = (chain.eq as jest.Mock).mock.calls.filter(
      (args: unknown[]) => args[0] === 'beds'
    )
    expect(bedsEqCalls).toHaveLength(0)
  })
})

// ── saveAnalysis tests ────────────────────────────────────────────────────────

describe('saveAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns a token string on successful save', async () => {
    // listings upsert chain — must end with .single() resolving
    const listingChain = makeQueryChain({ data: { id: 'listing-uuid-123' }, error: null })
    // analyses insert chain — resolves directly (no .single())
    const analysisChain = makeQueryChain({ data: null, error: null })

    mockFrom
      .mockReturnValueOnce(listingChain) // listings
      .mockReturnValueOnce(analysisChain) // analyses

    const result = await saveAnalysis(makeAnalysis(), makeListing(), null)

    // crypto.randomBytes is mocked to return the 16-byte buffer from the hex string
    expect(result).toBe('deadbeefdeadbeefdeadbeefdeadbeef')
  })

  it('persists sunScout inside market_data', async () => {
    const listingChain = makeQueryChain({ data: { id: 'listing-uuid-123' }, error: null })
    const analysisChain = makeQueryChain({ data: null, error: null })
    mockFrom.mockReturnValueOnce(listingChain).mockReturnValueOnce(analysisChain)

    const sunScout = {
      annualPeakSunHours: 3619,
      summerDailyHours: 8,
      winterDailyHours: 9,
      seasonalGrid: { Dec: 5, Mar: 6.9, Jun: 6, Sep: 6.9 },
      monthlyHours: [310, 280, 372, 330, 279, 240, 248, 310, 360, 341, 270, 279],
      sunScore: 88.2,
      verdict: 'excellent' as const,
    }

    await saveAnalysis(makeAnalysis({ sunScout }), makeListing(), null)

    const insertPayload = (analysisChain.insert as jest.Mock).mock.calls[0][0] as {
      market_data: { sunScout: unknown }
    }
    expect(insertPayload.market_data.sunScout).toEqual(sunScout)
  })

  it('returns null (non-fatal) when listing upsert fails', async () => {
    const listingChain = makeQueryChain({ data: null, error: new Error('upsert failed') })
    mockFrom.mockReturnValue(listingChain)

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = await saveAnalysis(makeAnalysis(), makeListing(), null)

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('returns null (non-fatal) when analysis insert fails', async () => {
    const listingChain = makeQueryChain({ data: { id: 'listing-uuid-123' }, error: null })
    const analysisChain = makeQueryChain({ data: null, error: new Error('insert failed') })

    mockFrom.mockReturnValueOnce(listingChain).mockReturnValueOnce(analysisChain)

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = await saveAnalysis(makeAnalysis(), makeListing(), null)

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('does not throw on unexpected error — returns null', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('totally unexpected')
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = await saveAnalysis(makeAnalysis(), makeListing(), null)

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('sets share_expires_at when userId is null (guest)', async () => {
    let capturedInsertPayload: Record<string, unknown> | null = null

    const listingChain = makeQueryChain({ data: { id: 'listing-uuid-123' }, error: null })

    const analysisChain = makeQueryChain({ data: null, error: null })
    ;(analysisChain.insert as jest.Mock).mockImplementation((payload: Record<string, unknown>) => {
      capturedInsertPayload = payload
      return analysisChain
    })

    mockFrom.mockReturnValueOnce(listingChain).mockReturnValueOnce(analysisChain)

    await saveAnalysis(makeAnalysis(), makeListing(), null)

    expect(capturedInsertPayload).not.toBeNull()
    expect(capturedInsertPayload!['share_expires_at']).not.toBeNull()
    // Should be ~30 days in the future
    const expiry = new Date(capturedInsertPayload!['share_expires_at'] as string)
    const daysUntilExpiry = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    expect(daysUntilExpiry).toBeGreaterThan(29)
    expect(daysUntilExpiry).toBeLessThan(31)
  })

  it('sets share_expires_at to null for authenticated users', async () => {
    let capturedInsertPayload: Record<string, unknown> | null = null

    const listingChain = makeQueryChain({ data: { id: 'listing-uuid-123' }, error: null })

    const analysisChain = makeQueryChain({ data: null, error: null })
    ;(analysisChain.insert as jest.Mock).mockImplementation((payload: Record<string, unknown>) => {
      capturedInsertPayload = payload
      return analysisChain
    })

    mockFrom.mockReturnValueOnce(listingChain).mockReturnValueOnce(analysisChain)

    await saveAnalysis(makeAnalysis(), makeListing(), 'user-uuid-456')

    expect(capturedInsertPayload).not.toBeNull()
    expect(capturedInsertPayload!['share_expires_at']).toBeNull()
  })

  it('maps investor mode to investment in DB', async () => {
    let capturedInsertPayload: Record<string, unknown> | null = null

    const listingChain = makeQueryChain({ data: { id: 'listing-uuid-123' }, error: null })

    const analysisChain = makeQueryChain({ data: null, error: null })
    ;(analysisChain.insert as jest.Mock).mockImplementation((payload: Record<string, unknown>) => {
      capturedInsertPayload = payload
      return analysisChain
    })

    mockFrom.mockReturnValueOnce(listingChain).mockReturnValueOnce(analysisChain)

    await saveAnalysis(makeAnalysis({ mode: 'investor' }), makeListing(), null)

    expect(capturedInsertPayload).not.toBeNull()
    expect(capturedInsertPayload!['report_mode']).toBe('investment')
  })
})

// ── getAnalysisByToken tests ──────────────────────────────────────────────────

describe('getAnalysisByToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function makeValidListingRow(): Record<string, unknown> {
    return {
      id: 'listing-uuid',
      source_url: 'https://example.com/listing',
      source: 'manual',
      listing_type: 'for_sale',
      address: '5702-5 Buttermill Ave',
      postal_code: 'L4K5W4',
      province: 'ON',
      price: 729900,
      beds: 3,
      baths: 2,
      sqft: 950,
      property_type: 'condo',
      annual_taxes: 3326,
      taxes_known: true,
      condo_fee_monthly: 761,
      condo_fee_known: true,
      year_built: 2018,
      year_built_known: true,
      listing_description: null,
      photo_urls: null,
      days_on_market: null,
      scraped_at: new Date().toISOString(),
    }
  }

  it('returns null when token is not found in DB', async () => {
    const chain = makeQueryChain({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    })
    mockFrom.mockReturnValue(chain)

    const result = await getAnalysisByToken('nonexistent-token')
    expect(result).toBeNull()
  })

  it('returns null when the analysis has expired', async () => {
    const expiredAt = new Date(Date.now() - 60_000).toISOString() // 1 minute ago

    const chain = makeQueryChain({
      data: {
        id: 'analysis-uuid',
        user_id: null,
        listing_id: 'listing-uuid',
        report_mode: 'investment',
        financing_params: null,
        rental_estimate: null,
        market_data: null,
        calculated_metrics: null,
        deal_score: null,
        risk_flags: [],
        ai_narrative: null,
        pdf_url: null,
        share_token: 'abc123',
        share_expires_at: expiredAt,
        created_at: new Date().toISOString(),
        listings: makeValidListingRow(),
      },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getAnalysisByToken('abc123')
    expect(result).toBeNull()
  })

  it('returns analysis and listing when token is valid and not expired', async () => {
    const futureAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const chain = makeQueryChain({
      data: {
        id: 'analysis-uuid',
        user_id: null,
        listing_id: 'listing-uuid',
        report_mode: 'investment',
        financing_params: null,
        rental_estimate: null,
        market_data: null,
        calculated_metrics: null,
        deal_score: 12,
        risk_flags: [],
        ai_narrative: null,
        pdf_url: null,
        share_token: 'validtoken123',
        share_expires_at: futureAt,
        created_at: new Date().toISOString(),
        listings: makeValidListingRow(),
      },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getAnalysisByToken('validtoken123')

    expect(result).not.toBeNull()
    expect(result!.analysis.token).toBe('validtoken123')
    expect(result!.analysis.mode).toBe('investor') // DB 'investment' maps to 'investor'
    expect(result!.listing.address).toBe('5702-5 Buttermill Ave')
    expect(result!.listing.price).toBe(729900)
  })

  it('round-trips sunScout through market_data', async () => {
    const futureAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const sunScout = {
      annualPeakSunHours: 3619,
      summerDailyHours: 8,
      winterDailyHours: 9,
      seasonalGrid: { Dec: 5, Mar: 6.9, Jun: 6, Sep: 6.9 },
      monthlyHours: [310, 280, 372, 330, 279, 240, 248, 310, 360, 341, 270, 279],
      sunScore: 88.2,
      verdict: 'excellent' as const,
    }

    const chain = makeQueryChain({
      data: {
        id: 'analysis-uuid',
        user_id: null,
        listing_id: 'listing-uuid',
        report_mode: 'investment',
        financing_params: null,
        rental_estimate: null,
        market_data: { dealScore: null, sunScout },
        calculated_metrics: null,
        deal_score: null,
        risk_flags: [],
        ai_narrative: null,
        pdf_url: null,
        share_token: 'suntoken123',
        share_expires_at: futureAt,
        created_at: new Date().toISOString(),
        listings: makeValidListingRow(),
      },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getAnalysisByToken('suntoken123')

    expect(result).not.toBeNull()
    expect(result!.analysis.sunScout).toEqual(sunScout)
  })

  it('returns sunScout null when market_data has no sunScout (legacy rows)', async () => {
    const futureAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const chain = makeQueryChain({
      data: {
        id: 'analysis-uuid',
        user_id: null,
        listing_id: 'listing-uuid',
        report_mode: 'investment',
        financing_params: null,
        rental_estimate: null,
        market_data: { dealScore: null },
        calculated_metrics: null,
        deal_score: null,
        risk_flags: [],
        ai_narrative: null,
        pdf_url: null,
        share_token: 'legacytoken1',
        share_expires_at: futureAt,
        created_at: new Date().toISOString(),
        listings: makeValidListingRow(),
      },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getAnalysisByToken('legacytoken1')
    expect(result!.analysis.sunScout).toBeNull()
  })

  it('returns analysis with no expiry for authenticated user (share_expires_at null)', async () => {
    const chain = makeQueryChain({
      data: {
        id: 'analysis-uuid',
        user_id: 'user-uuid-abc',
        listing_id: 'listing-uuid',
        report_mode: 'personal',
        financing_params: null,
        rental_estimate: null,
        market_data: null,
        calculated_metrics: null,
        deal_score: null,
        risk_flags: [],
        ai_narrative: null,
        pdf_url: null,
        share_token: 'authusertoken',
        share_expires_at: null, // authenticated user — no expiry
        created_at: new Date().toISOString(),
        listings: {
          ...makeValidListingRow(),
          id: 'listing-uuid-2',
          source_url: 'https://example.com/listing2',
          address: '100 Main St, Toronto, ON',
        },
      },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getAnalysisByToken('authusertoken')

    expect(result).not.toBeNull()
    expect(result!.analysis.mode).toBe('personal')
  })

  it('returns null when listings join is null', async () => {
    const chain = makeQueryChain({
      data: {
        id: 'analysis-uuid',
        user_id: null,
        listing_id: null,
        report_mode: 'investment',
        financing_params: null,
        rental_estimate: null,
        market_data: null,
        calculated_metrics: null,
        deal_score: null,
        risk_flags: [],
        ai_narrative: null,
        pdf_url: null,
        share_token: 'tokennolist',
        share_expires_at: null,
        created_at: new Date().toISOString(),
        listings: null,
      },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getAnalysisByToken('tokennolist')
    expect(result).toBeNull()
  })

  it('returns null on unexpected DB error', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('connection reset')
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = await getAnalysisByToken('anytoken')

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })
})
