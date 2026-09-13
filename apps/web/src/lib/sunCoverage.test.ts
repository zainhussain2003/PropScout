import { describe, it, expect } from 'vitest'
import { obstructionCoverage } from './sunCoverage'
import { SUN_OBSTRUCTION_COVERAGE } from '../constants/thresholds'

describe('obstructionCoverage', () => {
  it('is "checked" when every nearby building had a height', () => {
    expect(obstructionCoverage(17, 0)).toMatchObject({ ratio: 1, level: 'checked' })
  })

  it('is "checked" at the threshold', () => {
    // 1 of 2 = 0.5, the default threshold.
    const c = obstructionCoverage(1, 1)
    expect(c.ratio).toBeCloseTo(0.5)
    expect(c.level).toBe(SUN_OBSTRUCTION_COVERAGE.INDICATIVE <= 0.5 ? 'checked' : 'indicative')
  })

  it('is "indicative" when most buildings had no height on record', () => {
    expect(obstructionCoverage(2, 28)).toMatchObject({ level: 'indicative' })
    expect(obstructionCoverage(2, 28).ratio).toBeCloseTo(2 / 30)
  })

  it('is "none" when nothing was nearby at all', () => {
    expect(obstructionCoverage(0, 0)).toMatchObject({ ratio: null, level: 'none' })
    expect(obstructionCoverage(null, undefined).level).toBe('none')
  })

  it('never lets a negative count through', () => {
    expect(obstructionCoverage(-3, 4).used).toBe(0)
  })
})
