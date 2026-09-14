import { withSchoolWalkTimes } from './schoolWalkTimes'
import { routeMinutes } from '../services/mapboxService'
import type { SchoolsResult } from '../types/analysis'

jest.mock('../services/mapboxService', () => ({ routeMinutes: jest.fn() }))
const mockRoute = jest.mocked(routeMinutes)

const SCHOOL = {
  name: 'X',
  schoolType: 'elementary' as const,
  board: 'TDSB',
  distanceKm: 0.9,
  eqaoScore: 7,
  fraserRankPct: null,
  graduationRate: null,
}

function schools(): SchoolsResult {
  return {
    elementary: [{ ...SCHOOL, lat: 43.66, lng: -79.38 }],
    middle: [],
    high: [{ ...SCHOOL, schoolType: 'high', lat: null, lng: null }],
    catchmentNote: 'n',
  }
}

describe('withSchoolWalkTimes', () => {
  beforeEach(() => mockRoute.mockReset())

  it('routes each school that has coordinates and leaves the rest null', async () => {
    mockRoute.mockResolvedValue(11)
    const out = await withSchoolWalkTimes(schools(), { lat: 43.65, lng: -79.38 })
    expect(out.elementary[0]?.walkMin).toBe(11)
    expect(out.high[0]?.walkMin).toBeNull()
    expect(mockRoute).toHaveBeenCalledTimes(1)
    expect(mockRoute).toHaveBeenCalledWith(
      'walking',
      { lat: 43.65, lng: -79.38 },
      { lat: 43.66, lng: -79.38 }
    )
  })

  it('a silent router leaves walkMin null without dropping the school', async () => {
    mockRoute.mockResolvedValue(null)
    const out = await withSchoolWalkTimes(schools(), { lat: 43.65, lng: -79.38 })
    expect(out.elementary.length).toBe(1)
    expect(out.elementary[0]?.walkMin).toBeNull()
  })
})
