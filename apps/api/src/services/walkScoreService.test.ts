import { getWalkScore } from './walkScoreService'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

function makeFetchResponse(data: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  } as unknown as Response
}

const FULL_RESPONSE = {
  walkscore: 95,
  description: "Walker's Paradise",
  transit: { score: 80 },
  bike: { score: 72 },
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.WALKSCORE_API_KEY = 'test-key'
})

afterEach(() => {
  delete process.env.WALKSCORE_API_KEY
})

describe('getWalkScore', () => {
  it('full response → all three scores mapped correctly, description populated', async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse(FULL_RESPONSE, 200))

    const result = await getWalkScore('123 Main St, Toronto, ON', 43.6532, -79.3832)

    expect(result).not.toBeNull()
    expect(result!.walk).toBe(95)
    expect(result!.transit).toBe(80)
    expect(result!.bike).toBe(72)
    expect(result!.description).toBe("Walker's Paradise")
  })

  it('transit and bike absent → transit and bike are null, not 0', async () => {
    const response = { walkscore: 60, description: 'Bikeable' }
    mockFetch.mockResolvedValueOnce(makeFetchResponse(response, 200))

    const result = await getWalkScore('456 Oak Ave, Toronto, ON', 43.65, -79.38)

    expect(result).not.toBeNull()
    expect(result!.walk).toBe(60)
    expect(result!.transit).toBeNull()
    expect(result!.bike).toBeNull()
  })

  it('non-200 response → returns null', async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse({ message: 'Forbidden' }, 403))

    const result = await getWalkScore('123 Main St, Toronto, ON', 43.6532, -79.3832)

    expect(result).toBeNull()
  })

  it('network error → returns null', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const result = await getWalkScore('123 Main St, Toronto, ON', 43.6532, -79.3832)

    expect(result).toBeNull()
  })

  it('empty WALKSCORE_API_KEY → returns null without calling fetch', async () => {
    process.env.WALKSCORE_API_KEY = ''

    const result = await getWalkScore('123 Main St, Toronto, ON', 43.6532, -79.3832)

    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('walkscore field missing from response → returns null', async () => {
    const response = { description: 'Car-Dependent', transit: { score: 30 } }
    mockFetch.mockResolvedValueOnce(makeFetchResponse(response, 200))

    const result = await getWalkScore('789 Rural Rd, Toronto, ON', 43.6, -79.5)

    expect(result).toBeNull()
  })
})
