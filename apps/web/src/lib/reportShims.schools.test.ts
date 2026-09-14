/**
 * Unit tests for the school shims — API SchoolsResult → report display shapes.
 * Catchment is never claimed (boundaries not ingested); quality derives from
 * Fraser percentile first, EQAO second.
 */

import { describe, it, expect } from 'vitest'
import { shimToPersonalSchools, shimToTenantSchools } from './reportShims'
import type { SchoolsResult } from '../types/analysis'

const SCHOOLS: SchoolsResult = {
  elementary: [
    {
      name: 'Jesse Ketchum Jr & Sr PS',
      schoolType: 'elementary',
      board: 'TDSB',
      distanceKm: 0.6,
      eqaoScore: 82,
      fraserRankPct: 74,
      graduationRate: null,
    },
  ],
  middle: [
    {
      name: 'St. Michael’s Catholic School',
      schoolType: 'middle',
      board: 'Toronto Catholic DSB',
      distanceKm: 1.2,
      eqaoScore: 71,
      fraserRankPct: null,
      graduationRate: null,
    },
  ],
  high: [
    {
      name: 'Étienne-Brûlé Secondary',
      schoolType: 'high',
      board: 'CS Viamonde (French)',
      distanceKm: 3.4,
      eqaoScore: null,
      fraserRankPct: 28,
      graduationRate: 0.91,
    },
  ],
  catchmentNote: 'Nearest by distance — catchment not verified.',
}

describe('shimToPersonalSchools', () => {
  it('maps straight-line distance and scores without inventing drive time or catchment', () => {
    const result = shimToPersonalSchools(SCHOOLS)
    const elem = result.elementary[0]!
    expect(elem.name).toBe('Jesse Ketchum Jr & Sr PS')
    expect(elem.distance).toBe('0.6 km')
    expect(elem.driveTime).toBeUndefined()
    expect(elem.eqao).toBe(82)
    expect(elem.fraser).toBe(74)
    expect(elem.inCatchment).toBe(false)
    expect(result.high[0]!.gradRate).toBe(0.91)
  })
})

describe('shimToTenantSchools', () => {
  it('classifies boards and derives quality (Fraser first, EQAO fallback)', () => {
    const result = shimToTenantSchools(SCHOOLS)
    expect(result.elementary[0]!.board).toBe('public')
    expect(result.elementary[0]!.quality).toBe('above') // fraser 74 ≥ 67
    expect(result.middle[0]!.board).toBe('catholic')
    expect(result.middle[0]!.quality).toBe('avg') // no fraser, eqao 71 → ≥60 avg
    expect(result.high[0]!.board).toBe('french')
    expect(result.high[0]!.quality).toBe('below') // fraser 28 < 33
  })

  it('labels the walk time an estimate when nothing was routed, and never claims catchment', () => {
    const result = shimToTenantSchools(SCHOOLS)
    // 0.6 km × 12 min/km estimate — said to be one (D-100)
    expect(result.elementary[0]!.walk).toBe('~7 min walk, straight-line estimate')
    expect(result.high[0]!.distance).toBe('3.4 km')
    expect(result.elementary[0]!.inCatchment).toBe(false)
  })

  it('shows a routed walk time as a time (D-100)', () => {
    const routed = {
      ...SCHOOLS,
      elementary: [{ ...SCHOOLS.elementary[0]!, walkMin: 9 }],
    }
    expect(shimToTenantSchools(routed).elementary[0]!.walk).toBe('9 min walk')
    expect(shimToPersonalSchools(routed).elementary[0]!.driveTime).toBe('9 min walk')
    expect(shimToPersonalSchools(SCHOOLS).elementary[0]!.driveTime).toBeUndefined()
  })
})
