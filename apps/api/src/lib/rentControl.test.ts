import { rentControlStatus, guidelineFor, guidelinesFrom, buildRentControl } from './rentControl'
import { ONTARIO_RENT_RULES } from '../constants/ontarioRentRules'

describe('rentControlStatus (D-113)', () => {
  it('before the exemption year is likely controlled, after it likely exempt, the year itself unknown', () => {
    expect(rentControlStatus(2005).status).toBe('likely_controlled')
    expect(rentControlStatus(2017).status).toBe('likely_controlled')
    expect(rentControlStatus(2018).status).toBe('unknown')
    expect(rentControlStatus(2019).status).toBe('likely_exempt')
    expect(rentControlStatus(2024).status).toBe('likely_exempt')
  })

  it('no build year is unknown with no basis; every answer requires verification', () => {
    expect(rentControlStatus(null)).toEqual({
      status: 'unknown',
      basis: 'none',
      requiresVerification: true,
    })
    expect(rentControlStatus(0).basis).toBe('none')
    expect(rentControlStatus(2019).basis).toBe('listing_build_year')
    expect(rentControlStatus(2019).requiresVerification).toBe(true)
  })
})

describe('guidelines', () => {
  it('picks the guideline by the year the increase takes effect', () => {
    expect(guidelineFor(new Date('2026-06-01T00:00:00Z'))).toEqual({ year: 2026, rate: 0.021 })
    // A tenancy from June 2026 gets its first increase in June 2027 under 2027's figure.
    expect(guidelineFor(new Date('2027-06-01T00:00:00Z'))).toEqual({ year: 2027, rate: 0.019 })
    expect(guidelineFor(new Date('2031-01-01T00:00:00Z'))).toBeNull()
  })

  it('lists the published guidelines from the current year on, in order', () => {
    expect(guidelinesFrom(new Date('2026-09-16T00:00:00Z'))).toEqual([
      { year: 2026, rate: 0.021 },
      { year: 2027, rate: 0.019 },
    ])
    expect(guidelinesFrom(new Date('2027-03-01T00:00:00Z'))).toEqual([{ year: 2027, rate: 0.019 }])
  })

  it('the constants carry their source and dates, and the 2026/2027 figures Ontario published', () => {
    expect(ONTARIO_RENT_RULES.guidelinesByYear[2026]).toBe(0.021)
    expect(ONTARIO_RENT_RULES.guidelinesByYear[2027]).toBe(0.019)
    expect(ONTARIO_RENT_RULES.source).toMatch(/ontario\.ca/)
    expect(ONTARIO_RENT_RULES.sourceUpdatedAt).toBe('2026-06-23')
    expect(ONTARIO_RENT_RULES.exemptionFirstOccupancyAfter).toBe('2018-11-15')
    expect(ONTARIO_RENT_RULES.noticeDays).toBe(90)
    expect(ONTARIO_RENT_RULES.minMonthsBetweenIncreases).toBe(12)
  })
})

describe('buildRentControl', () => {
  it('bundles the status with the rules and provenance for the report', () => {
    const rc = buildRentControl(2019, new Date('2026-09-16T00:00:00Z'))
    expect(rc.status).toBe('likely_exempt')
    expect(rc.yearBuilt).toBe(2019)
    expect(rc.guidelines.map((g) => g.year)).toEqual([2026, 2027])
    expect(rc.source).toBe(ONTARIO_RENT_RULES.source)
    expect(rc.checkedAt).toBe(ONTARIO_RENT_RULES.checkedAt)
    expect(rc.requiresVerification).toBe(true)
  })
})
