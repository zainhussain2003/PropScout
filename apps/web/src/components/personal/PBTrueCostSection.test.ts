/**
 * The maintenance-reserve note states a build era, so it must not state one we
 * do not know. Address-entered listings carry no year built.
 */

import { describe, it, expect } from 'vitest'

import { maintenanceNote } from './PBTrueCostSection'

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
