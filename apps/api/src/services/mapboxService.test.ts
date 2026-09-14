import { geocodeAddress, routeMinutes } from './mapboxService'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

function makeFetchResponse(data: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  } as unknown as Response
}

const VALID_RESPONSE = {
  features: [
    {
      center: [-79.3832, 43.6532], // [lng, lat] — Toronto
      place_name: '123 Main St, Toronto, Ontario M5V 1A1, Canada',
    },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.MAPBOX_TOKEN = 'test-token'
})

afterEach(() => {
  delete process.env.MAPBOX_TOKEN
})

describe('geocodeAddress', () => {
  it('valid address → returns correct lat, lng, formattedAddress (lng/lat not swapped)', async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse(VALID_RESPONSE, 200))

    const result = await geocodeAddress('123 Main St, Toronto, ON')

    expect(result).not.toBeNull()
    expect(result!.lat).toBe(43.6532) // center[1]
    expect(result!.lng).toBe(-79.3832) // center[0]
    expect(result!.formattedAddress).toBe('123 Main St, Toronto, Ontario M5V 1A1, Canada')
  })

  it('empty features array → returns null', async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse({ features: [] }, 200))

    const result = await geocodeAddress('123 Nowhere Ave')

    expect(result).toBeNull()
  })

  it('fetch throws network error → returns null', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const result = await geocodeAddress('123 Main St, Toronto, ON')

    expect(result).toBeNull()
  })

  it('non-200 response → returns null', async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse({ message: 'Unauthorized' }, 401))

    const result = await geocodeAddress('123 Main St, Toronto, ON')

    expect(result).toBeNull()
  })

  it('MAPBOX_TOKEN empty → returns null without calling fetch', async () => {
    process.env.MAPBOX_TOKEN = ''

    const result = await geocodeAddress('123 Main St, Toronto, ON')

    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('routeMinutes', () => {
  const A = { lat: 43.65, lng: -79.38 }
  const B = { lat: 43.66, lng: -79.39 }

  it('returns the first route duration in whole minutes', async () => {
    process.env.MAPBOX_TOKEN = 'pk.test'
    mockFetch.mockResolvedValueOnce(makeFetchResponse({ routes: [{ duration: 754 }] }, 200))
    expect(await routeMinutes('walking', A, B)).toBe(13)
    const url = String(mockFetch.mock.calls[0][0])
    expect(url).toContain('/directions/v5/mapbox/walking/-79.38,43.65;-79.39,43.66')
  })

  it('never reports zero minutes for a real route', async () => {
    process.env.MAPBOX_TOKEN = 'pk.test'
    mockFetch.mockResolvedValueOnce(makeFetchResponse({ routes: [{ duration: 12 }] }, 200))
    expect(await routeMinutes('driving', A, B)).toBe(1)
  })

  it('null without a token, on a non-200, on no routes, and on a network error', async () => {
    process.env.MAPBOX_TOKEN = ''
    expect(await routeMinutes('walking', A, B)).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()

    process.env.MAPBOX_TOKEN = 'pk.test'
    mockFetch.mockResolvedValueOnce(makeFetchResponse({ message: 'nope' }, 422))
    expect(await routeMinutes('walking', A, B)).toBeNull()
    mockFetch.mockResolvedValueOnce(makeFetchResponse({ routes: [] }, 200))
    expect(await routeMinutes('walking', A, B)).toBeNull()
    mockFetch.mockRejectedValueOnce(new Error('ECONNRESET'))
    expect(await routeMinutes('walking', A, B)).toBeNull()
  })
})
