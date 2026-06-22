/**
 * Unit tests for investorCalc formatting helpers.
 *
 * Covers the non-finite guards: API-supplied metrics (e.g. breakEvenRent)
 * arrive as JSON, and a malformed or divide-by-zero value upstream must
 * render as "—" — never "$NaN" or "$∞".
 */

import { describe, it, expect } from 'vitest'
import { fmtMoney, fmtPct, verdictFromScore, adjustDealScoreForOverrides } from './investorCalc'
import type { DealScoreData } from '../types/analysis'

/** Build a minimal DealScoreData with a given subtotal and applied deduction. */
function makeScore(subtotal: number, deduction: number): DealScoreData {
  return {
    total: Math.max(0, subtotal - deduction),
    verdict: 'caution',
    label: 'Caution',
    tagline: 'x',
    tone: 'caution',
    deductions: deduction,
    breakdown: {
      capRate: 0,
      cashFlow: 0,
      cashOnCash: 0,
      dscr: 0,
      demand: 0,
      subtotal,
      deduction,
      componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
    },
  }
}

describe('fmtMoney', () => {
  it('formats a positive amount', () => {
    expect(fmtMoney(729900)).toBe('$729,900')
  })

  it('formats a negative amount with a minus sign', () => {
    expect(fmtMoney(-1833)).toBe('−$1,833')
  })

  it('formats zero', () => {
    expect(fmtMoney(0)).toBe('$0')
  })

  it('respects the decimals option', () => {
    expect(fmtMoney(5138.76, { decimals: 2 })).toBe('$5,138.76')
  })

  it('returns "—" for Infinity', () => {
    expect(fmtMoney(Infinity)).toBe('—')
  })

  it('returns "—" for -Infinity', () => {
    expect(fmtMoney(-Infinity)).toBe('—')
  })

  it('returns "—" for NaN', () => {
    expect(fmtMoney(NaN)).toBe('—')
  })
})

describe('fmtPct', () => {
  it('formats a decimal as a percentage', () => {
    expect(fmtPct(0.045)).toBe('4.50%')
  })

  it('respects the decimals argument', () => {
    expect(fmtPct(0.44, 0)).toBe('44%')
  })

  it('formats negative percentages', () => {
    expect(fmtPct(-0.16)).toBe('-16.00%')
  })

  it('returns "—" for Infinity', () => {
    expect(fmtPct(Infinity)).toBe('—')
  })

  it('returns "—" for NaN', () => {
    expect(fmtPct(NaN)).toBe('—')
  })
})

describe('verdictFromScore', () => {
  it('maps each bracket to the matching verdict', () => {
    expect(verdictFromScore(80)).toBe('strong_buy')
    expect(verdictFromScore(79)).toBe('good_deal')
    expect(verdictFromScore(65)).toBe('good_deal')
    expect(verdictFromScore(64)).toBe('caution')
    expect(verdictFromScore(50)).toBe('caution')
    expect(verdictFromScore(49)).toBe('marginal')
    expect(verdictFromScore(35)).toBe('marginal')
    expect(verdictFromScore(34)).toBe('do_not_buy')
    expect(verdictFromScore(20)).toBe('do_not_buy')
    expect(verdictFromScore(19)).toBe('hard_pass')
    expect(verdictFromScore(0)).toBe('hard_pass')
  })
})

describe('adjustDealScoreForOverrides', () => {
  it('returns the base score unchanged when nothing is dismissed', () => {
    const base = makeScore(60, 5)
    expect(adjustDealScoreForOverrides(base, [{ id: 'a', deduct: 5 }], new Set())).toBe(base)
  })

  it('restores a dismissed flag deduction and recomputes the verdict', () => {
    // subtotal 68, one 5-pt red flag applied → stored total 63 (caution).
    const base = makeScore(68, 5)
    const result = adjustDealScoreForOverrides(base, [{ id: 'a', deduct: 5 }], new Set(['a']))
    expect(result.total).toBe(68)
    expect(result.deductions).toBe(0)
    expect(result.breakdown.deduction).toBe(0)
    expect(result.verdict).toBe('good_deal') // 68 ≥ 65 → crosses the bracket
    expect(result.label).toBe('Good deal')
  })

  it('does not lift the score until dismissals fall below the 15-pt cap', () => {
    // 4 red flags = 20 raw, capped to 15 applied → stored total 70-15 = 55.
    const flags = [
      { id: 'a', deduct: 5 },
      { id: 'b', deduct: 5 },
      { id: 'c', deduct: 5 },
      { id: 'd', deduct: 5 },
    ]
    const base = makeScore(70, 15)

    // Dismissing one still leaves 15 raw → still capped at 15 → no change.
    const one = adjustDealScoreForOverrides(base, flags, new Set(['a']))
    expect(one).toBe(base)

    // Dismissing two leaves 10 raw → applied drops to 10 → total rises to 60.
    const two = adjustDealScoreForOverrides(base, flags, new Set(['a', 'b']))
    expect(two.total).toBe(60)
    expect(two.deductions).toBe(10)
  })

  it('ignores dismissed amber flags (zero deduction) — score is unchanged', () => {
    const base = makeScore(60, 5)
    const flags = [
      { id: 'red', deduct: 5 },
      { id: 'amber', deduct: 0 },
    ]
    expect(adjustDealScoreForOverrides(base, flags, new Set(['amber']))).toBe(base)
  })
})
