import { describe, expect, it } from 'vitest'
import type { DealScoreBreakdown } from '../types/analysis'
import { scoreBreakdownBars } from './scoreBreakdown'

const breakdown: DealScoreBreakdown = {
  capRate: 25,
  cashFlow: 25,
  cashOnCash: 20,
  dscr: 15,
  demand: 10,
  subtotal: 95,
  deduction: 0,
  componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
}

describe('weighted score bars', () => {
  it('uses the same points scale for every track', () => {
    const bars = scoreBreakdownBars(breakdown)
    expect(bars.map((bar) => bar.trackPercent)).toEqual([100, 100, 80, 60, 40])
    expect(bars.map((bar) => bar.fillPercent)).toEqual([100, 100, 100, 100, 100])
  })

  it('preserves zero points without a decorative minimum fill', () => {
    const bars = scoreBreakdownBars({ ...breakdown, capRate: 0, demand: 3 })
    expect(bars[0].fillPercent).toBe(0)
    expect(bars[4].fillPercent).toBe(30)
  })

  it.each([-1, 26, NaN, Infinity])(
    'does not turn invalid points %s into earned points',
    (capRate) => {
      const bar = scoreBreakdownBars({ ...breakdown, capRate })[0]
      expect(bar.value).toBeNull()
      expect(bar.fillPercent).toBe(0)
    }
  )

  it('keeps all valid widths within 0–100%', () => {
    for (let value = 0; value <= 25; value++) {
      const bar = scoreBreakdownBars({ ...breakdown, capRate: value })[0]
      expect(bar.fillPercent).toBeGreaterThanOrEqual(0)
      expect(bar.fillPercent).toBeLessThanOrEqual(100)
    }
  })

  it('leaves the backend breakdown and its gated subtotal untouched', () => {
    const input = { ...breakdown, subtotal: 40 }
    const original = structuredClone(input)
    scoreBreakdownBars(input)
    expect(input).toEqual(original)
  })
})

describe('assumed demand points are labelled (audit S-02)', () => {
  it('says how many demand points rest on unobserved inputs', () => {
    const bars = scoreBreakdownBars(breakdown)
    const demand = bars.find((b) => b.label === 'Rental demand')
    expect(demand?.note).toMatch(/4 of these points assume/)
    expect(demand?.note).toMatch(/not measured/)
  })

  it('drops the note once the analysis measured its demand inputs (D-105)', () => {
    const bars = scoreBreakdownBars(breakdown, true)
    expect(bars.find((b) => b.label === 'Rental demand')?.note).toBeUndefined()
  })

  it('puts the note on no other component', () => {
    const bars = scoreBreakdownBars(breakdown)
    for (const b of bars) {
      if (b.label !== 'Rental demand') expect(b.note).toBeUndefined()
    }
  })

  it('does not caveat a demand score of zero — nothing was awarded', () => {
    const bars = scoreBreakdownBars({ ...breakdown, demand: 0 })
    expect(bars.find((b) => b.label === 'Rental demand')?.note).toBeUndefined()
  })
})
