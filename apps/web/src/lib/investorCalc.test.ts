/**
 * Unit tests for investorCalc formatting helpers.
 *
 * Covers the non-finite guards: API-supplied metrics (e.g. breakEvenRent)
 * arrive as JSON, and a malformed or divide-by-zero value upstream must
 * render as "—" — never "$NaN" or "$∞".
 */

import { describe, it, expect } from 'vitest'
import {
  computeBreakEvenAppreciation,
  computeExpenses,
  computeMonthlyPayment,
  fmtMoney,
  fmtPct,
} from './investorCalc'
import type { HoldCaseRow } from '../types/analysis'

describe('unknown build year maintenance', () => {
  it('uses the backend middle bracket without assuming a recent build', () => {
    const unknown = computeExpenses(729900, 3326, 761, 29700, 0, false)
    const recent = computeExpenses(729900, 3326, 761, 29700, 2016, false)
    const older = computeExpenses(729900, 3326, 761, 29700, 1970, false)
    expect(unknown.maintenance).toBe(7299)
    expect(unknown.maintenance).toBeGreaterThan(recent.maintenance)
    expect(unknown.maintenance).toBeLessThan(older.maintenance)
  })
})

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

// ── Canadian mortgage convention parity with the calc engine ───────────────────

describe('computeMonthlyPayment — Canadian semi-annual compounding', () => {
  // The calc engine is authoritative. These are its values, produced by
  // services/calc-engine/calculations/mortgage.py and pinned in
  // services/calc-engine/tests/test_regression.py. If this drifts, the live
  // report and the API disagree about the same mortgage — the exact failure
  // D-054 and D-055 record.
  it('matches the calc engine on the Vaughan calibration mortgage', () => {
    // $729,900 at 20% down → $583,920 principal, 4.79%, 25 years.
    expect(computeMonthlyPayment(583_920, 0.0479, 25)).toBeCloseTo(3_326.64, 2)
  })

  it('matches the calc engine on the Hamilton calibration mortgage', () => {
    // $599,000 at 20% down → $479,200 principal, 4.79%, 25 years.
    expect(computeMonthlyPayment(479_200, 0.0479, 25)).toBeCloseTo(2_730.04, 2)
  })

  it('does not use the US annual/12 convention', () => {
    // Dividing by 12 would give $3,342.48 here. That overstates a Canadian
    // fixed-rate payment by $15.84/mo, so the wrong answer is asserted absent
    // rather than the right one merely asserted present.
    expect(computeMonthlyPayment(583_920, 0.0479, 25)).not.toBeCloseTo(3_342.48, 2)
  })

  it('handles a zero rate as straight-line principal', () => {
    expect(computeMonthlyPayment(120_000, 0, 10)).toBeCloseTo(1_000, 6)
  })

  it('returns zero for a non-positive principal', () => {
    expect(computeMonthlyPayment(0, 0.0479, 25)).toBe(0)
    expect(computeMonthlyPayment(-1, 0.0479, 25)).toBe(0)
  })
})

// ── Break-even appreciation parity with the calc engine ────────────────────────

describe('computeBreakEvenAppreciation', () => {
  // Vaughan calibration: $729,900, 20% down, 4.79%, 25yr, -$2,126.82/mo.
  // Cash invested ($159,453) is the engine's down payment + closing costs.
  const vaughan = (): HoldCaseRow[] =>
    computeBreakEvenAppreciation(729_900, 583_920, 0.0479, 25, -2_126.82, 159_453)

  it('matches the calc engine regression floors', () => {
    // Pinned against services/calc-engine/tests/test_regression.py
    // ::test_vaughan_break_even_appreciation. Two implementations of one
    // calculation is the drift D-054/D-055 record; this is the tripwire.
    const byYear = new Map(vaughan().map((r) => [r.year, r]))
    expect(byYear.get(5)!.breakEvenAnnualRate).toBeCloseTo(0.0191, 3)
    expect(byYear.get(10)!.breakEvenAnnualRate).toBeCloseTo(0.0145, 3)
    expect(byYear.get(20)!.breakEvenAnnualRate).toBeCloseTo(0.0075, 3)
  })

  it('excludes selling costs, so the sale price is cash in plus the balance', () => {
    for (const row of vaughan()) {
      expect(row.breakEvenSalePrice).toBeCloseTo(row.totalCashIn + row.mortgageBalance, 2)
    }
  })

  it('does not credit a surplus against the cost basis', () => {
    const flat = computeBreakEvenAppreciation(729_900, 583_920, 0.0479, 25, 0, 159_453)
    const surplus = computeBreakEvenAppreciation(729_900, 583_920, 0.0479, 25, 900, 159_453)
    expect(surplus.map((r) => r.cumulativeContribution)).toEqual([0, 0, 0])
    expect(surplus.map((r) => r.breakEvenAnnualRate)).toEqual(
      flat.map((r) => r.breakEvenAnnualRate)
    )
  })

  it('lowers the required rate as the hold lengthens', () => {
    const rates = vaughan().map((r) => r.breakEvenAnnualRate)
    expect(rates[0]).toBeGreaterThan(rates[1])
    expect(rates[1]).toBeGreaterThan(rates[2])
  })

  it('can return a negative rate when paydown carries the hold', () => {
    const rows = computeBreakEvenAppreciation(729_900, 364_950, 0.0479, 25, 1_500, 380_000)
    expect(rows[rows.length - 1].breakEvenAnnualRate).toBeLessThan(0)
  })

  it('owes nothing on a hold past the amortization', () => {
    const rows = computeBreakEvenAppreciation(729_900, 583_920, 0.0479, 15, -2_126.82, 159_453)
    expect(rows[rows.length - 1].mortgageBalance).toBe(0)
  })

  it('returns nothing for a non-positive price', () => {
    expect(computeBreakEvenAppreciation(0, 0, 0.0479, 25, -100, 1_000)).toEqual([])
  })
})
