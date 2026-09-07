/**
 * Unit tests for investorCalc formatting helpers.
 *
 * Covers the non-finite guards: API-supplied metrics (e.g. breakEvenRent)
 * arrive as JSON, and a malformed or divide-by-zero value upstream must
 * render as "—" — never "$NaN" or "$∞".
 */

import { describe, it, expect } from 'vitest'
import { computeExpenses, fmtMoney, fmtPct } from './investorCalc'

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
