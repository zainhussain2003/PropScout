import Fastify, { type FastifyInstance } from 'fastify'
import scrapeRoutes from './scrape'
import { saveListing, createPendingAnalysis } from '../services/supabaseService'

jest.mock('../services/supabaseService', () => ({
  saveListing: jest.fn().mockResolvedValue('mock-listing-id'),
  createPendingAnalysis: jest.fn().mockResolvedValue(undefined),
}))

const mockSaveListing = jest.mocked(saveListing)
const mockCreatePendingAnalysis = jest.mocked(createPendingAnalysis)

// Minimal ScrapedListing fixture — Ontario address (M5V postal code)
const ONTARIO_FIXTURE = {
  url: 'https://www.realtor.ca/real-estate/12345/123-main-st-toronto',
  address: '123 Main St, Toronto, ON M5V 1A1',
  price: 650_000,
  beds: 2,
  baths: 1.0,
  sqft: 850,
  property_type: 'Condo',
  annual_taxes: 4200,
  taxes_known: true,
  condo_fee_monthly: 550,
  condo_fee_known: true,
  year_built: 2010,
  year_built_known: true,
  listing_type: 'for_sale',
  listing_description: 'Beautiful condo in downtown Toronto.',
  photo_urls: ['https://cdn.realtor.ca/photo1.jpg'],
  days_on_market: 7,
  raw: {},
}

// Non-Ontario fixture — BC address (V6B postal code)
const BC_FIXTURE = {
  ...ONTARIO_FIXTURE,
  address: '456 Oak Ave, Vancouver, BC V6B 1A1',
}

function makeFetchResponse(data: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  } as unknown as Response
}

const mockFetch = jest.fn()

let app: FastifyInstance

beforeEach(async () => {
  jest.clearAllMocks()
  global.fetch = mockFetch as unknown as typeof fetch
  app = Fastify({ logger: false })
  await app.register(scrapeRoutes)
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

describe('POST /scrape', () => {
  it('Ontario listing → saveListing called, createPendingAnalysis called, response contains token and listing', async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse(ONTARIO_FIXTURE, 200))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as Record<string, unknown>
    expect(typeof body.token).toBe('string')
    expect(body.listing).toBeDefined()
    expect((body.listing as Record<string, unknown>).province).toBe('ON')
    expect(body.scraperFailed).toBeUndefined()

    expect(mockSaveListing).toHaveBeenCalledTimes(1)
    expect(mockCreatePendingAnalysis).toHaveBeenCalledWith('mock-listing-id', expect.any(String))
  })

  it('Non-Ontario address → returns PROVINCE_NOT_SUPPORTED with province BC, saveListing never called', async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse(BC_FIXTURE, 200))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as Record<string, unknown>
    expect(body.error).toBe('PROVINCE_NOT_SUPPORTED')
    expect(body.province).toBe('BC')
    expect(mockSaveListing).not.toHaveBeenCalled()
  })

  it('Scraper returns 422 → returns 422 SCRAPER_FAILED, no Supabase calls', async () => {
    mockFetch.mockResolvedValueOnce(
      makeFetchResponse({ error: 'SCRAPER_FAILED', message: 'Could not read that listing' }, 422)
    )

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body) as Record<string, unknown>
    expect(body.code).toBe('SCRAPER_FAILED')
    expect(mockSaveListing).not.toHaveBeenCalled()
    expect(mockCreatePendingAnalysis).not.toHaveBeenCalled()
  })

  it('Scraper network error → returns 503 SCRAPER_UNAVAILABLE', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(503)
    const body = JSON.parse(res.body) as Record<string, unknown>
    expect(body.code).toBe('SCRAPER_UNAVAILABLE')
  })

  it('Missing sqft in scraper response → scraperFailed: true in response, sqft in missingFields', async () => {
    const fixture = { ...ONTARIO_FIXTURE, sqft: null }
    mockFetch.mockResolvedValueOnce(makeFetchResponse(fixture, 200))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as Record<string, unknown>
    expect(body.scraperFailed).toBe(true)
    expect(body.missingFields).toContain('sqft')
  })

  it('No postal code in address → returns 422 POSTAL_CODE_NOT_FOUND', async () => {
    const fixture = { ...ONTARIO_FIXTURE, address: '10 Downing Street, London, England' }
    mockFetch.mockResolvedValueOnce(makeFetchResponse(fixture, 200))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body) as Record<string, unknown>
    expect(body.code).toBe('POSTAL_CODE_NOT_FOUND')
  })
})

// -- Rent plausibility bounds (decision 2026-07-01: $500-$10,000/mo) ----------

describe('POST /scrape - for-rent rent bounds', () => {
  const FOR_RENT_FIXTURE = {
    ...ONTARIO_FIXTURE,
    listing_type: 'for_rent',
    price: 2_400,
  }

  it('plausible rent is stored as rentMonthly with no partial-scrape flag for rent', async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse(FOR_RENT_FIXTURE, 200))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as {
      listing: { rentMonthly: number | null }
      missingFields?: string[]
    }
    expect(body.listing.rentMonthly).toBe(2_400)
    expect(body.missingFields ?? []).not.toContain('rent_monthly')
  })

  it('implausibly low rent ($29) is nulled and flagged as a missing field', async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse({ ...FOR_RENT_FIXTURE, price: 29 }, 200))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as {
      listing: { rentMonthly: number | null }
      scraperFailed?: boolean
      missingFields?: string[]
    }
    expect(body.listing.rentMonthly).toBeNull()
    expect(body.scraperFailed).toBe(true)
    expect(body.missingFields).toContain('rent_monthly')
  })

  it('implausibly high rent ($290,000 - a unit error) is nulled and flagged', async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse({ ...FOR_RENT_FIXTURE, price: 290_000 }, 200))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as {
      listing: { rentMonthly: number | null }
      scraperFailed?: boolean
      missingFields?: string[]
    }
    expect(body.listing.rentMonthly).toBeNull()
    expect(body.scraperFailed).toBe(true)
    expect(body.missingFields).toContain('rent_monthly')
  })
})

// ── Building-type discriminator + real parking (live bugs, 2026-07-02) ─────────

describe('POST / — buildingType + parking mapping', () => {
  it("maps a 'Single Family' + buildingType 'Apartment' listing to condo with real parking", async () => {
    // A live Whitehaus condo rental mapped to 'detached' with 0 parking:
    // Realtor's propertyType is 'Single Family' for condos AND houses.
    mockFetch.mockResolvedValueOnce(
      makeFetchResponse(
        {
          ...ONTARIO_FIXTURE,
          property_type: 'Single Family',
          building_type: 'Apartment',
          parking_spaces: 1,
        },
        200
      )
    )

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as {
      listing: { propertyType: string; parkingSpots: number }
    }
    expect(body.listing.propertyType).toBe('condo')
    expect(body.listing.parkingSpots).toBe(1)
  })

  it("keeps 'Single Family' + buildingType 'House' as detached, parking defaults to 0", async () => {
    mockFetch.mockResolvedValueOnce(
      makeFetchResponse(
        { ...ONTARIO_FIXTURE, property_type: 'Single Family', building_type: 'House' },
        200
      )
    )

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    const body = JSON.parse(res.body) as {
      listing: { propertyType: string; parkingSpots: number }
    }
    expect(body.listing.propertyType).toBe('detached')
    expect(body.listing.parkingSpots).toBe(0)
  })
})

// ── Timeout + body-read handling (prod incident 2026-07-06) ───────────────────

describe('POST /scrape — timeout and body-read degrade to SCRAPER_FAILED', () => {
  it('a scrape timeout (AbortSignal.timeout) returns 422 SCRAPER_FAILED, not 500/503', async () => {
    const timeout = Object.assign(new Error('The operation was aborted due to timeout'), {
      name: 'TimeoutError',
    })
    mockFetch.mockRejectedValueOnce(timeout)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body) as Record<string, unknown>
    expect(body.code).toBe('SCRAPER_FAILED')
    expect(mockSaveListing).not.toHaveBeenCalled()
  })

  it('a non-timeout fetch error still returns 503 SCRAPER_UNAVAILABLE', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(503)
    expect((JSON.parse(res.body) as Record<string, unknown>).code).toBe('SCRAPER_UNAVAILABLE')
  })

  it('a stalled/unreadable response body returns 422 SCRAPER_FAILED, not a 500', async () => {
    // 200 headers arrive, then the body read throws (edge cut the stream).
    const badBody = {
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new Error('terminated')),
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response
    mockFetch.mockResolvedValueOnce(badBody)

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: { url: 'https://www.realtor.ca/real-estate/12345/test' },
    })

    expect(res.statusCode).toBe(422)
    expect((JSON.parse(res.body) as Record<string, unknown>).code).toBe('SCRAPER_FAILED')
    expect(mockSaveListing).not.toHaveBeenCalled()
  })
})
