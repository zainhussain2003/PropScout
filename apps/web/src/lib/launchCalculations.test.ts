import { describe, expect, it } from 'vitest'
import { computeLTT, computeOSFI } from './investorCalc'

describe('Toronto residential MLTT effective April 2026', () => {
  // Independently calculated from the City schedule, before rebates and fees.
  it.each([
    [250000, 2225],
    [300000, 2975],
    [400000, 4475],
    [500000, 6475],
    [750000, 11475],
    [1000000, 16475],
    [2000000, 36475],
    [3000000, 61475],
    [3500000, 83475],
    [4000000, 105475],
    [5000000, 159975],
    [10000000, 484975],
    [20000000, 1239975],
    [21000000, 1325975],
  ])('charges the published municipal tax at $%i', (price, tax) => {
    expect(computeLTT(price, true).municipal).toBeCloseTo(tax, 2)
    expect(computeLTT(price, false).municipal).toBe(0)
  })
})

it('includes heat and distinguishes the GDS limit from the TDS limit', () => {
  const result = computeOSFI(589000, 0.2, 0.0445, 25, 3000, 500, 110000)
  const noHeat = computeOSFI(589000, 0.2, 0.0445, 25, 3000, 500, 110000, 0)
  expect(result.gds - noHeat.gds).toBeCloseTo(150 / (110000 / 12), 8)
  expect(result.threshold).toBe(0.39)
  expect(result.pass).toBe(false)
})
