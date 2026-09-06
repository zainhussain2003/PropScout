/**
 * Unit tests for comparableSalesService.
 * fetch is mocked — no real Repliers calls except the tagged contract test.
 */

import { getComparableSales, toComparableSale, deriveFmvBand } from './comparableSalesService'
import type { ComparableSale } from '../types/analysis'

// Captured BEFORE the mock is installed — the live contract test below needs the
// real implementation, and reading global.fetch after this assignment would just
// hand it the mock back.
const realFetch = global.fetch

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

const ORIGINAL_KEY = process.env.REPLIERS_API_KEY
const NOW = new Date('2026-09-06T00:00:00Z')

beforeEach(() => {
  jest.clearAllMocks()
  process.env.REPLIERS_API_KEY = 'test-key'
})

afterEach(() => {
  process.env.REPLIERS_API_KEY = ORIGINAL_KEY
})

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response
}

/** A Repliers listing in the shape the live API actually returns. */
function listing(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    soldPrice: 705000,
    soldDate: '2026-03-18T00:00:00.000-00:00',
    address: {
      streetNumber: '12',
      streetName: 'Main',
      streetSuffix: 'St',
      city: 'Toronto',
    },
    details: { numBedrooms: 3, numBathrooms: 2, sqft: 1200 },
    ...over,
  }
}

// ── toComparableSale ──────────────────────────────────────────────────────────

describe('toComparableSale', () => {
  it('maps a full listing, formatting money, date and price per sqft', () => {
    const c = toComparableSale(listing(), NOW)
    expect(c).not.toBeNull()
    expect(c?.addr).toBe('12 Main St, Toronto')
    expect(c?.beds).toBe('3 bed · 2 bath')
    expect(c?.sold).toBe('$705,000')
    expect(c?.date).toBe('Mar 2026')
    expect(c?.soldPrice).toBe(705000)
    expect(c?.pricePerSqft).toBe(588) // 705000 / 1200
  })

  it('includes the unit number when present', () => {
    const c = toComparableSale(
      listing({
        address: {
          unitNumber: '204',
          streetNumber: '8',
          streetName: 'Manor',
          streetSuffix: 'Rd',
          city: 'Toronto',
        },
      }),
      NOW
    )
    expect(c?.addr).toBe('204 - 8 Manor Rd, Toronto')
  })

  it('drops a listing with no sale price rather than showing a blank', () => {
    // The report's rule: a number is either sourced or absent. A comp row with an
    // empty price is worse than one fewer comp.
    expect(toComparableSale(listing({ soldPrice: undefined }), NOW)).toBeNull()
    expect(toComparableSale(listing({ soldPrice: 0 }), NOW)).toBeNull()
  })

  it('drops a listing with no usable address', () => {
    expect(toComparableSale(listing({ address: {} }), NOW)).toBeNull()
    expect(toComparableSale(listing({ address: undefined }), NOW)).toBeNull()
  })

  it('drops a sale older than a year — a stale comp misleads', () => {
    expect(toComparableSale(listing({ soldDate: '2024-01-05T00:00:00Z' }), NOW)).toBeNull()
  })

  it('drops a sale dated in the future', () => {
    expect(toComparableSale(listing({ soldDate: '2027-01-05T00:00:00Z' }), NOW)).toBeNull()
  })

  it('keeps a comp with no sqft but reports pricePerSqft as null', () => {
    const c = toComparableSale(listing({ details: { numBedrooms: 2, sqft: undefined } }), NOW)
    expect(c).not.toBeNull()
    expect(c?.pricePerSqft).toBeNull()
    expect(c?.beds).toBe('2 bed')
  })

  it('shows an em dash when the feed omits beds and baths entirely', () => {
    const c = toComparableSale(listing({ details: {} }), NOW)
    expect(c?.beds).toBe('—')
  })

  it('coerces string numerics, which the live feed does return', () => {
    const c = toComparableSale(
      listing({
        soldPrice: '705000',
        details: { numBedrooms: '3', numBathrooms: '2', sqft: '1200' },
      }),
      NOW
    )
    expect(c?.soldPrice).toBe(705000)
    expect(c?.pricePerSqft).toBe(588)
  })
})

// ── getComparableSales ────────────────────────────────────────────────────────

describe('getComparableSales', () => {
  it('returns [] without calling out when no API key is set', async () => {
    delete process.env.REPLIERS_API_KEY
    const result = await getComparableSales(43.65, -79.38)
    expect(result).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('queries a 1km radius for sold listings, key in the header', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ listings: [] }))

    await getComparableSales(43.65, -79.38)

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('lat=43.65')
    expect(url).toContain('long=-79.38')
    expect(url).toContain('radius=1') // spec §7.3: within 1km
    expect(url).toContain('status=U')
    expect(url).toContain('lastStatus=Sld')
    expect(url).not.toContain('test-key') // key must never ride in the URL
    expect(init.headers['REPLIERS-API-KEY']).toBe('test-key')
  })

  it('returns at most 10 comps', async () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      listing({
        soldPrice: 500000 + i * 1000,
        address: {
          streetNumber: String(i),
          streetName: 'Main',
          streetSuffix: 'St',
          city: 'Toronto',
        },
      })
    )
    mockFetch.mockResolvedValueOnce(makeResponse({ listings: many }))

    const result = await getComparableSales(43.65, -79.38)
    expect(result).toHaveLength(10)
  })

  it('returns [] on a non-OK response', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    mockFetch.mockResolvedValueOnce(makeResponse({ error: 'nope' }, 403))
    expect(await getComparableSales(43.65, -79.38)).toEqual([])
  })

  it('returns [] on a network error rather than throwing', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    expect(await getComparableSales(43.65, -79.38)).toEqual([])
  })

  it('silently skips unusable rows instead of failing the whole section', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ listings: [listing(), { soldPrice: null }, listing({ address: {} })] })
    )
    const result = await getComparableSales(43.65, -79.38)
    expect(result).toHaveLength(1)
  })
})

// ── deriveFmvBand ─────────────────────────────────────────────────────────────

describe('deriveFmvBand', () => {
  function comp(pricePerSqft: number | null): ComparableSale {
    return {
      addr: 'x',
      beds: '2 bed',
      sqft: 1000,
      sold: '$1',
      soldPrice: 1,
      date: 'Mar 2026',
      pricePerSqft,
    }
  }

  it('derives a band from price per sqft, scaled to the subject size', () => {
    const band = deriveFmvBand([comp(500), comp(600), comp(700), comp(800)], 1000)
    expect(band).not.toBeNull()
    expect(band!.low).toBeLessThan(band!.mid)
    expect(band!.mid).toBeLessThan(band!.high)
    expect(band!.basedOn).toBe(4)
  })

  it('returns null with fewer than three usable comps', () => {
    // Two points is not a distribution; a band drawn from them would look
    // authoritative while meaning nothing.
    expect(deriveFmvBand([comp(500), comp(600)], 1000)).toBeNull()
  })

  it('ignores comps with no price per sqft when counting', () => {
    expect(deriveFmvBand([comp(500), comp(600), comp(null), comp(null)], 1000)).toBeNull()
  })

  it('returns null when the subject has no square footage', () => {
    expect(deriveFmvBand([comp(500), comp(600), comp(700)], 0)).toBeNull()
  })
})

// ── Live contract test ────────────────────────────────────────────────────────
//
// Mocked tests above pass regardless of what the real Repliers API returns, which
// is how a changed field name or a revoked key would go unnoticed. This calls the
// real endpoint and asserts the response still carries the fields we map.
//
// Skipped when REPLIERS_API_KEY is absent (CI without the secret) — being
// unconfigured is not the same as the contract being broken.

const describeLive = process.env.REPLIERS_API_KEY ? describe : describe.skip

describeLive('Repliers live contract', () => {
  beforeAll(() => {
    global.fetch = realFetch
  })

  afterAll(() => {
    global.fetch = mockFetch as unknown as typeof fetch
  })

  it('still returns sold listings carrying soldPrice, soldDate and details', async () => {
    // Coordinates in the sample dataset's coverage (Tacoma WA). The free key
    // carries US sample data only — see the service docstring.
    const res = await fetch(
      'https://api.repliers.io/listings?lat=47.2&long=-122.5&radius=5&status=U&lastStatus=Sld&resultsPerPage=3',
      // ORIGINAL_KEY, not process.env: the global beforeEach replaces the real
      // key with 'test-key' for the mocked suites, which would 401 here.
      { headers: { 'REPLIERS-API-KEY': ORIGINAL_KEY as string } }
    )
    expect(res.status).toBe(200)

    const body = (await res.json()) as { listings?: Array<Record<string, unknown>> }
    expect(Array.isArray(body.listings)).toBe(true)
    expect(body.listings!.length).toBeGreaterThan(0)

    const first = body.listings![0]
    expect(first).toHaveProperty('soldPrice')
    expect(first).toHaveProperty('soldDate')
    expect(first).toHaveProperty('address')
    expect(first).toHaveProperty('details')
  }, 30_000)

  it('getComparableSales maps live listings into usable comps', async () => {
    // Exercises the real code path against the real API, so a mapping bug cannot
    // hide behind mocks. Coordinates are downtown Tacoma — inside the sample
    // dataset's coverage AND dense enough that a 1km radius has recent sales. The
    // free key holds no Canadian data, so a Toronto lat/long would legitimately
    // return [] and prove nothing.
    process.env.REPLIERS_API_KEY = ORIGINAL_KEY
    const comps = await getComparableSales(47.2529, -122.4443)

    expect(comps.length).toBeGreaterThan(0)
    expect(comps.length).toBeLessThanOrEqual(10)

    for (const c of comps) {
      expect(c.addr).toBeTruthy()
      expect(c.soldPrice).toBeGreaterThan(0)
      expect(c.sold).toMatch(/^\$[\d,]+$/)
      expect(c.date).toMatch(/^[A-Z][a-z]{2} \d{4}$/)
      if (c.pricePerSqft !== null) expect(c.pricePerSqft).toBeGreaterThan(0)
    }
  }, 30_000)
})
