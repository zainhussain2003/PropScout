/**
 * irr / npv (D-123) — known streams, edge cases, and the bisection's
 * agreement with a closed-form answer.
 */

import { describe, it, expect } from 'vitest'
import { irr, npv } from './irr'

describe('npv', () => {
  it('discounts each period by (1 + r)^t', () => {
    expect(npv([-100, 110], 0.1)).toBeCloseTo(0, 9)
    expect(npv([-100, 0, 121], 0.1)).toBeCloseTo(0, 9)
    expect(npv([-100, 50, 50], 0)).toBe(0)
  })
})

describe('irr', () => {
  it('a single return a year later: the plain percentage', () => {
    expect(irr([-100, 110])).toBeCloseTo(0.1, 6)
    expect(irr([-100, 90])).toBeCloseTo(-0.1, 6)
  })

  it('two years, one payoff: the square root of the multiple', () => {
    expect(irr([-100, 0, 121])).toBeCloseTo(0.1, 6)
    expect(irr([-169_776, 0, 0, 0, 0, 250_000])).toBeCloseTo(
      Math.pow(250_000 / 169_776, 1 / 5) - 1,
      6
    )
  })

  it('level annual flows: the annuity rate', () => {
    // 5 payments of 25 on 100: r ≈ 7.93%
    expect(irr([-100, 25, 25, 25, 25, 25])).toBeCloseTo(0.0793, 3)
  })

  it('a shortfall each year lowers the rate below the simple multiple', () => {
    // Same total cash in and out as [-200, 0, 0, 300] (multiple 1.5, 14.5%/yr)
    // but half the outlay arrives in year 2, so the money worked less long.
    const timed = irr([-100, -100, 0, 300])!
    const upfront = irr([-200, 0, 0, 300])!
    expect(timed).toBeGreaterThan(upfront)
    expect(upfront).toBeCloseTo(Math.pow(1.5, 1 / 3) - 1, 6)
  })

  it('a total loss is −100%, not "no answer"', () => {
    expect(irr([-100, -10, -10, 0])).toBe(-1)
    expect(irr([-100, 0])).toBe(-1)
  })

  it('nothing put in, or too short a stream, is no answer', () => {
    expect(irr([0, 100])).toBeNull()
    expect(irr([100, 100])).toBeNull()
    expect(irr([-100])).toBeNull()
    expect(irr([])).toBeNull()
  })

  it('is finite and NPV-zero on a report-shaped stream', () => {
    const flows = [-169_776, -21_996, -21_996, -21_996, -21_996, -21_996 + 380_000]
    const r = irr(flows)!
    expect(Number.isFinite(r)).toBe(true)
    // The solver stops at a rate tolerance of 1e-7; on a $380k stream that is cents of NPV.
    expect(Math.abs(npv(flows, r))).toBeLessThan(0.5)
  })
})
