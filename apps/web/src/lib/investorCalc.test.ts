/**
 * Unit tests for investorCalc formatting helpers.
 *
 * Covers the non-finite guards: API-supplied metrics (e.g. breakEvenRent)
 * arrive as JSON, and a malformed or divide-by-zero value upstream must
 * render as "—" — never "$NaN" or "$∞".
 */

import { describe, it, expect } from 'vitest'
import { computeExpenses, computeMonthlyPayment, fmtMoney, fmtPct } from './investorCalc'

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
