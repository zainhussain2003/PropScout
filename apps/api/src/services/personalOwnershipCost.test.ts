import { personalOwnershipCost } from './personalOwnershipCost'

describe('personal ownership cash outflow', () => {
  const base = {
    price: 650000,
    mortgageMonthly: 2800,
    annualTaxes: 3200,
    condoFeeMonthly: 600,
    sqft: 1100,
    yearBuilt: null,
  }
  it('includes all displayed cost lines, using the conservative reserve for an unknown build year', () => {
    expect(personalOwnershipCost(base)).toBeCloseTo(4948.1666667, 6)
  })
  it('uses the known build era and fallback floor area', () => {
    expect(personalOwnershipCost({ ...base, yearBuilt: 2019, sqft: null })).toBeCloseTo(4364.5, 6)
  })
})
