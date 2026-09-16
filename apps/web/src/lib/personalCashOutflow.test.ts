/**
 * The maintenance-reserve note states a build era, so it must not state one we
 * do not know. Address-entered listings carry no year built.
 */

import { describe, it, expect } from 'vitest'

import { maintenanceNote } from './personalCashOutflow'

describe('maintenanceNote', () => {
  it('does not claim a build era when the year is unknown', () => {
    // Regression: 0 fell through to the final branch and printed "pre-1980
    // build" for a condo that may have been finished last year.
    expect(maintenanceNote(0)).toBe('1.5% of value / yr · build year unknown')
  })

  it('still applies the conservative rate when the year is unknown', () => {
    expect(maintenanceNote(0)).toContain('1.5%')
  })

  it('names the era when the year is known', () => {
    expect(maintenanceNote(2019)).toBe('0.5% of value / yr · 2010+ build')
    expect(maintenanceNote(1995)).toBe('1.0% of value / yr · 1980-era build')
    expect(maintenanceNote(1962)).toBe('1.5% of value / yr · pre-1980 build')
  })
})

import { buildCashOutflowLines, modelledShare } from './personalCashOutflow'
import { PB_PROPERTY, computeMonthlyCost } from '../data/personalBuyerData'

describe('buildCashOutflowLines / modelledShare (D-114)', () => {
  const monthly = computeMonthlyCost(PB_PROPERTY, {
    downPct: PB_PROPERTY.defaultDownPct,
    rate: PB_PROPERTY.defaultRate,
    amort: PB_PROPERTY.defaultAmort,
  })

  it('classifies each line: mortgage calculated, listed tax from the listing, the rest estimated', () => {
    const lines = buildCashOutflowLines(PB_PROPERTY, monthly)
    const basis = Object.fromEntries(lines.map((l) => [l.key, l.basis]))
    expect(basis.mortgage).toBe('calculated')
    expect(basis.tax).toBe('listing')
    expect(basis.insurance).toBe('estimated')
    expect(basis.utilities).toBe('estimated')
    expect(basis.maintenance).toBe('estimated')
  })

  it('counts the utilities once (the aggregate row is skipped) and the share is estimated ÷ total', () => {
    const lines = buildCashOutflowLines(PB_PROPERTY, monthly)
    const { amount, share } = modelledShare(lines)
    expect(amount).toBeCloseTo(monthly.insurance + monthly.utilities.total + monthly.maintenance, 6)
    expect(share).toBeCloseTo(amount / monthly.total, 6)
    expect(share).toBeGreaterThan(0.1)
    expect(share).toBeLessThan(0.5)
  })

  it('an estimated tax raises the share; an entered tax is the person’s, not a model', () => {
    const est = modelledShare(
      buildCashOutflowLines({ ...PB_PROPERTY, annualTaxesKnown: false }, monthly)
    )
    const listed = modelledShare(buildCashOutflowLines(PB_PROPERTY, monthly))
    expect(est.amount).toBeCloseTo(listed.amount + monthly.tax, 6)
    const entered = buildCashOutflowLines({ ...PB_PROPERTY, factsEntered: true }, monthly)
    expect(entered.find((l) => l.key === 'tax')?.basis).toBe('user_provided')
  })
})
