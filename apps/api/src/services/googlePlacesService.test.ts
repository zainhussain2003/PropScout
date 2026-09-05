/**
 * Unit tests for googlePlacesService.
 * fetch is mocked — no real Google Places API calls.
 *
 * These exercise the **Places API (New)** contract (POST places:searchNearby,
 * displayName/location/rating field mask). The legacy `nearbysearch` shape
 * (`results[].geometry.location`, body `status`) is gone — Google no longer
 * activates that endpoint on any project.
 */

import { getNearbySchools, pickNearestPerType, type School } from './googlePlacesService'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

beforeEach(() => {
  jest.clearAllMocks()
})

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('getNearbySchools', () => {
  const ORIGINAL_KEY = process.env.GOOGLE_PLACES_KEY

  afterEach(() => {
    process.env.GOOGLE_PLACES_KEY = ORIGINAL_KEY
  })

  it('returns [] when GOOGLE_PLACES_KEY is unset', async () => {
    delete process.env.GOOGLE_PLACES_KEY
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)

    const result = await getNearbySchools(43.65, -79.38)

    expect(result).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('parses results and computes distance', async () => {
    process.env.GOOGLE_PLACES_KEY = 'test-key'
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        places: [
          {
            displayName: { text: 'Lakeview Elementary' },
            location: { latitude: 43.66, longitude: -79.39 },
            rating: 4.2,
          },
          {
            displayName: { text: 'St. Mary Catholic High School' },
            location: { latitude: 43.7, longitude: -79.4 },
            rating: 3.8,
          },
        ],
      })
    )

    const result = await getNearbySchools(43.65, -79.38)

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Lakeview Elementary')
    expect(result[0].type).toBe('elementary')
    expect(result[0].board).toBe('public')
    expect(result[0].rating).toBe(4.2)
    expect(result[0].distanceKm).toBeGreaterThan(0)
    expect(result[1].type).toBe('high')
    expect(result[1].board).toBe('catholic')
  })

  it('returns [] on HTTP 403 when Places API (New) is not enabled', async () => {
    process.env.GOOGLE_PLACES_KEY = 'test-key'
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    mockFetch.mockResolvedValueOnce(
      makeResponse({ error: { code: 403, status: 'PERMISSION_DENIED' } }, 403)
    )

    const result = await getNearbySchools(43.65, -79.38)
    expect(result).toEqual([])
  })

  it('returns [] on network error', async () => {
    process.env.GOOGLE_PLACES_KEY = 'test-key'
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const result = await getNearbySchools(43.65, -79.38)
    expect(result).toEqual([])
  })

  it('POSTs to Places API (New) with the key in the header, not the query string', async () => {
    process.env.GOOGLE_PLACES_KEY = 'test-key'
    mockFetch.mockResolvedValueOnce(makeResponse({ places: [] }))

    await getNearbySchools(43.65, -79.38)

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://places.googleapis.com/v1/places:searchNearby')
    expect(url).not.toContain('maps.googleapis.com')
    expect(url).not.toContain('test-key') // key must never ride in the URL
    expect(init.method).toBe('POST')
    expect(init.headers['X-Goog-Api-Key']).toBe('test-key')
    expect(init.headers['X-Goog-FieldMask']).toContain('places.displayName')

    const body = JSON.parse(init.body)
    expect(body.includedTypes).toContain('school')
    expect(body.rankPreference).toBe('DISTANCE')
    expect(body.locationRestriction.circle.center).toEqual({
      latitude: 43.65,
      longitude: -79.38,
    })
  })

  it('skips places missing a name or coordinates', async () => {
    process.env.GOOGLE_PLACES_KEY = 'test-key'
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        places: [
          { location: { latitude: 43.66, longitude: -79.39 } }, // no displayName
          { displayName: { text: 'No Coords School' } }, // no location
          {
            displayName: { text: 'Good School' },
            location: { latitude: 43.66, longitude: -79.39 },
          },
        ],
      })
    )

    const result = await getNearbySchools(43.65, -79.38)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Good School')
    expect(result[0].rating).toBeNull()
  })

  it('sorts results by distance ascending', async () => {
    process.env.GOOGLE_PLACES_KEY = 'test-key'
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        places: [
          { displayName: { text: 'Far School' }, location: { latitude: 43.8, longitude: -79.5 } },
          {
            displayName: { text: 'Near School' },
            location: { latitude: 43.66, longitude: -79.39 },
          },
        ],
      })
    )

    const result = await getNearbySchools(43.65, -79.38)
    expect(result[0].name).toBe('Near School')
    expect(result[1].name).toBe('Far School')
  })
})

describe('pickNearestPerType', () => {
  it('returns at most N per type, preserving distance order', () => {
    const schools: School[] = [
      { name: 'E1', type: 'elementary', board: 'public', distanceKm: 0.5, rating: null },
      { name: 'E2', type: 'elementary', board: 'public', distanceKm: 0.8, rating: null },
      { name: 'E3', type: 'elementary', board: 'public', distanceKm: 1.2, rating: null },
      { name: 'E4', type: 'elementary', board: 'public', distanceKm: 1.5, rating: null },
      { name: 'M1', type: 'middle', board: 'public', distanceKm: 0.9, rating: null },
      { name: 'H1', type: 'high', board: 'public', distanceKm: 1.0, rating: null },
      { name: 'H2', type: 'high', board: 'public', distanceKm: 2.5, rating: null },
    ]

    const picked = pickNearestPerType(schools, 3)
    expect(picked.map((s) => s.name)).toEqual(['E1', 'E2', 'E3', 'M1', 'H1', 'H2'])
  })
})
