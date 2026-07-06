import { flagLabel, humanizeFlagId, FLAG_LABELS } from './flagLabels'

describe('flagLabel', () => {
  it('returns the human label for known flag ids', () => {
    expect(flagLabel('condo_fee_unknown')).toBe('Condo fee not disclosed')
    expect(flagLabel('basement_suite')).toBe('Basement suite')
    expect(flagLabel('power_of_sale')).toBe('Power of sale')
  })

  it('falls back to Title Case for unknown flag ids', () => {
    expect(flagLabel('water_damage')).toBe('Water Damage')
    expect(flagLabel('mold_remediation_required')).toBe('Mold Remediation Required')
  })

  it('returns empty string for an empty id', () => {
    expect(flagLabel('')).toBe('')
  })
})

describe('humanizeFlagId', () => {
  it('Title-Cases snake_case', () => {
    expect(humanizeFlagId('foo_bar_baz')).toBe('Foo Bar Baz')
  })

  it('handles single word', () => {
    expect(humanizeFlagId('foo')).toBe('Foo')
  })

  it('handles empty', () => {
    expect(humanizeFlagId('')).toBe('')
  })
})

describe('FLAG_LABELS map', () => {
  it('covers every extraction-pipeline flag id from spec Section 19', () => {
    // If a new flag id is added to the pipeline, add a label here so the UI
    // doesn't render snake_case in production.
    const expected = [
      'basement_suite',
      'short_term_rental',
      'shared_laundry',
      'coin_laundry',
      'street_parking_only',
      'first_floor_unit',
      'condo_fee_includes_utilities',
      'tenant_occupied',
      'power_of_sale',
      'as_is_where_is',
      'no_representation',
      'grow_op_history',
      'remediation_done',
      'flooding_history',
      'noise_concern',
      'condo_fee_unknown',
    ]
    for (const id of expected) {
      expect(FLAG_LABELS[id]).toBeDefined()
    }
  })
})
