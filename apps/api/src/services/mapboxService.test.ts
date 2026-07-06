/**
 * Unit tests for mapboxService.geocodeAddress.
 *
 * All network calls are intercepted via jest.spyOn(global, 'fetch') so no real
 * HTTP requests are made. MAPBOX_TOKEN is set/unset per test as needed.
 */

import { geocodeAddress } from './mapboxService'

const ORIGINAL_ENV = process.env

function mockFetchOk(body: unknown): void {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response)
}

function mockFetchError(status: number): void {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as Response)
}

function mockFetchNetworkError(): void {
  jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))
}

const TORONTO_FEATURE = {
  center: [-79.3871, 43.6426] as [number, number],
  place_name: '290 Bremner Blvd, Toronto, Ontario M5V 3L9, Canada',
}

const VALID_RESPONSE = { features: [TORONTO_FEATURE] }
const EMPTY_RESPONSE = { features: [] }

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, MAPBOX_TOKEN: 'test-token' }
  jest.spyOn(global, 'fetch').mockClear()
})

afterEach(() => {
  process.env = ORIGINAL_ENV
  jest.restoreAllMocks()
})

// ── Token absent ──────────────────────────────────────────────────────────────

describe('when MAPBOX_TOKEN is not set', () => {
  it('returns null without making a fetch call', async () => {
    delete process.env.MAPBOX_TOKEN
    const fetchSpy = jest.spyOn(global, 'fetch')

    const result = await geocodeAddress('290 Bremner Blvd, Toronto, ON')

    expect(result).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

// ── Successful geocoding ───────────────────────────────────────────────────────

describe('successful geocoding', () => {
  it('returns lat, lng and formattedAddress from the first feature', async () => {
    mockFetchOk(VALID_RESPONSE)

    const result = await geocodeAddress('290 Bremner Blvd, Toronto, ON')

    expect(result).not.toBeNull()
    expect(result?.lat).toBeCloseTo(43.6426, 3)
    expect(result?.lng).toBeCloseTo(-79.3871, 3)
    expect(result?.formattedAddress).toBe('290 Bremner Blvd, Toronto, Ontario M5V 3L9, Canada')
  })

  it('encodes the address in the URL and includes required query params', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(VALID_RESPONSE),
    } as Response)

    await geocodeAddress('123 Main St, Toronto, ON')

    const calledUrl = String(fetchSpy.mock.calls[0][0])
    expect(calledUrl).toContain('mapbox.places')
    expect(calledUrl).toContain('123%20Main%20St')
    expect(calledUrl).toContain('country=CA')
    expect(calledUrl).toContain('types=address')
    expect(calledUrl).toContain('limit=1')
    expect(calledUrl).toContain('access_token=test-token')
  })

  it('uses the token from MAPBOX_TOKEN env var', async () => {
    process.env.MAPBOX_TOKEN = 'my-secret-token'
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(VALID_RESPONSE),
    } as Response)

    await geocodeAddress('Some Address')

    const calledUrl = String(fetchSpy.mock.calls[0][0])
    expect(calledUrl).toContain('access_token=my-secret-token')
  })
})

// ── Empty features ────────────────────────────────────────────────────────────

describe('when features array is empty', () => {
  it('returns null', async () => {
    mockFetchOk(EMPTY_RESPONSE)

    const result = await geocodeAddress('Unknown Place Nowhere')

    expect(result).toBeNull()
  })
})

// ── HTTP errors ───────────────────────────────────────────────────────────────

describe('when the API returns a non-200 status', () => {
  it('returns null for 401 Unauthorized', async () => {
    mockFetchError(401)

    const result = await geocodeAddress('Some Address')

    expect(result).toBeNull()
  })

  it('returns null for 422 Unprocessable', async () => {
    mockFetchError(422)

    const result = await geocodeAddress('Some Address')

    expect(result).toBeNull()
  })

  it('returns null for 500 Internal Server Error', async () => {
    mockFetchError(500)

    const result = await geocodeAddress('Some Address')

    expect(result).toBeNull()
  })
})

// ── Network errors ────────────────────────────────────────────────────────────

describe('when the network request throws', () => {
  it('returns null instead of propagating the error', async () => {
    mockFetchNetworkError()

    const result = await geocodeAddress('Some Address')

    expect(result).toBeNull()
  })
})

// ── Malformed JSON ────────────────────────────────────────────────────────────

describe('when the API returns invalid JSON', () => {
  it('returns null instead of throwing', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    } as Response)

    const result = await geocodeAddress('Some Address')

    expect(result).toBeNull()
  })
})

// ── Address trimming ──────────────────────────────────────────────────────────

describe('address handling', () => {
  it('trims whitespace before encoding', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(VALID_RESPONSE),
    } as Response)

    await geocodeAddress('  123 Main St  ')

    const calledUrl = String(fetchSpy.mock.calls[0][0])
    // Should encode "123 Main St" (trimmed), not "  123 Main St  "
    expect(calledUrl).toContain('123%20Main%20St')
    expect(calledUrl).not.toContain('%20%20')
  })
})
