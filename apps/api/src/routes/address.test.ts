/**
 * Tests for POST /address — the address-first entry point.
 *
 * Geocoding is mocked; these assert the decisions the route makes around it,
 * because that is where the risk is. A geocoder always returns *something*, and
 * accepting a weak match produces a complete, plausible report about a building
 * the user never typed.
 */

jest.mock('../services/mapboxService', () => ({
  geocodeAddress: jest.fn(),
}))

import Fastify, { type FastifyInstance } from 'fastify'

import addressRoutes, { splitUnitPrefix } from './address'
import { geocodeAddress } from '../services/mapboxService'

const mockGeocode = geocodeAddress as jest.Mock

let app: FastifyInstance

beforeEach(async () => {
  jest.clearAllMocks()
  app = Fastify()
  await app.register(addressRoutes)
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

function geo(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lat: 43.7588,
    lng: -79.422,
    formattedAddress: '701 Sheppard Avenue West, Toronto, Ontario M3H 0B2, Canada',
    relevance: 1,
    postalCode: 'M3H0B2',
    city: 'Toronto',
    ...over,
  }
}

async function post(address: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await app.inject({ method: 'POST', url: '/', payload: { address } })
  return { status: res.statusCode, body: res.json() as Record<string, unknown> }
}

// ── splitUnitPrefix ───────────────────────────────────────────────────────────

describe('splitUnitPrefix', () => {
  it('separates a leading unit number from the street address', () => {
    // Mapbox reads "229-701 Sheppard" as street number 229 and confidently
    // returns a different building. Stripping the unit first fixes it.
    expect(splitUnitPrefix('229-701 Sheppard Ave W')).toEqual({
      unit: '229',
      // The street number stays — only the unit designator comes off. Dropping
      // "701" would geocode the wrong building just as surely as keeping "229".
      street: '701 Sheppard Ave W',
    })
  })

  it('handles spaced and prefixed unit forms', () => {
    expect(splitUnitPrefix('Unit 4 - 12 King St').unit).toBe('4')
    expect(splitUnitPrefix('#802-5 Bay St').unit).toBe('802')
    expect(splitUnitPrefix('3705 — 28 Charles St E').unit).toBe('3705')
  })

  it('leaves a plain address untouched', () => {
    expect(splitUnitPrefix('701 Sheppard Ave W')).toEqual({
      unit: null,
      street: '701 Sheppard Ave W',
    })
  })

  it('does not treat a hyphenated street number as a unit', () => {
    // "12-14 Main St" is a range, not a unit; there is no way to tell it apart,
    // so this documents the accepted false positive rather than pretending.
    expect(splitUnitPrefix('12-14 Main St').unit).toBe('12')
  })
})

// ── happy path ────────────────────────────────────────────────────────────────

describe('POST /address', () => {
  it('returns coordinates and postal code for a real Ontario address', async () => {
    mockGeocode.mockResolvedValue(geo())
    const { status, body } = await post('701 Sheppard Ave W, Toronto')

    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.postalCode).toBe('M3H0B2')
    expect(body.city).toBe('Toronto')
    expect(body.coordinates).toEqual({ lat: 43.7588, lng: -79.422 })
  })

  it('geocodes without the unit and re-attaches it to the returned address', async () => {
    mockGeocode.mockResolvedValue(geo())
    const { body } = await post('229-701 Sheppard Ave W, Toronto')

    // The unit must not reach the geocoder…
    expect(mockGeocode.mock.calls[0][0]).not.toMatch(/229\s*-/)
    // …but must come back, because SunScout infers the floor from it.
    expect(body.unit).toBe('229')
    expect(body.address).toMatch(/^229 - /)
  })
})

// ── rejections ────────────────────────────────────────────────────────────────

describe('POST /address — inputs that must not produce a report', () => {
  it('rejects a low-confidence match rather than reporting on the wrong place', async () => {
    // "asdfghjkl" scores 0.66 and resolves to a real street in Ingleside. A
    // report built on that would look completely normal and be entirely wrong.
    mockGeocode.mockResolvedValue(
      geo({ relevance: 0.66, formattedAddress: 'Canada Street, Ingleside, Ontario' })
    )
    const { status, body } = await post('asdfghjkl')

    expect(status).toBe(422)
    expect(body.code).toBe('ADDRESS_NOT_FOUND')
  })

  it('rejects a match with no postal code as too imprecise to score', async () => {
    // A street or neighbourhood centroid, not a building.
    mockGeocode.mockResolvedValue(geo({ postalCode: null }))
    const { status, body } = await post('Sheppard Avenue West')

    expect(status).toBe(422)
    expect(body.code).toBe('POSTAL_CODE_NOT_FOUND')
  })

  it('rejects input too short to be an address without calling the geocoder', async () => {
    const { status, body } = await post('12')

    expect(status).toBe(422)
    expect(body.code).toBe('ADDRESS_TOO_SHORT')
    expect(mockGeocode).not.toHaveBeenCalled()
  })

  it('returns the province gate for an out-of-province address, not an error', async () => {
    // This has its own screen (the waitlist). Reporting it as "not found" would
    // tell a Vancouver user their address does not exist.
    mockGeocode.mockResolvedValue(
      geo({ postalCode: 'V6C0B9', city: 'Vancouver', formattedAddress: '1055 Canada Place' })
    )
    const { status, body } = await post('1055 Canada Place, Vancouver')

    expect(status).toBe(200)
    expect(body.ok).toBe(false)
    expect(body.error).toBe('PROVINCE_NOT_SUPPORTED')
    expect(body.province).toBe('BC')
  })

  it('reports a geocoder outage as temporary, not as a bad address', async () => {
    mockGeocode.mockRejectedValue(new Error('mapbox down'))
    const { status, body } = await post('701 Sheppard Ave W, Toronto')

    expect(status).toBe(503)
    expect(body.code).toBe('GEOCODER_UNAVAILABLE')
  })

  it('reports no match as not found', async () => {
    mockGeocode.mockResolvedValue(null)
    const { status, body } = await post('nowhere at all street')

    expect(status).toBe(422)
    expect(body.code).toBe('ADDRESS_NOT_FOUND')
  })
})
