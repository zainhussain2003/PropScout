/**
 * Unit tests for compUnitType (D-117): reading a comp's dwelling type back
 * out of what the scrapers stored, the subject's type from its listing, and
 * the factor for each pair.
 */

import {
  classifyCompUnitType,
  subjectUnitType,
  unitTypeFactor,
  UNIT_TYPE_LABEL,
} from './compUnitType'
import { COMP_WEIGHTS } from '../constants/thresholds'

describe('classifyCompUnitType — rentals.ca listingType', () => {
  it.each([
    ['residential:apartment:apartment', 'apartment'],
    ['residential:apartment:studio', 'apartment'],
    ['residential:condo:condo', 'apartment'],
    ['residential:condo:condo-community', 'apartment'],
    ['residential:house:house', 'house'],
    ['residential:house:single-family-home', 'house'],
    ['residential:house:semi-house', 'house'],
    ['residential:house:duplex', 'house'],
    ['residential:house:town-house', 'townhouse'],
    ['residential:house:town-house-community', 'townhouse'],
    ['residential:house:basement', 'basement'],
    ['residential:house:main-floor', 'house-unit'],
    ['residential:room:private-room', 'room'],
    ['residential:room:shared-room', 'room'],
  ])('%s → %s', (listingType, expected) => {
    expect(
      classifyCompUnitType({
        source: 'rentals_ca',
        source_url: 'https://rentals.ca/toronto/x',
        address: '6020 Bathurst Street, Toronto, ON M2R 1Z8',
        raw_json: { id: 'abc', listingType },
      })
    ).toBe(expected)
  })

  it('reads the structured field before the title', () => {
    // A house whose address happens to mention a condo tower nearby.
    expect(
      classifyCompUnitType({
        source: 'rentals_ca',
        address: '12 Condo Lane, Toronto',
        raw_json: { listingType: 'residential:house:house' },
      })
    ).toBe('house')
  })
})

describe('classifyCompUnitType — kijiji title then category', () => {
  const KIJIJI = 'https://www.kijiji.ca/v-apartments-condos/city-of-toronto/x/1742842491'

  it.each([
    ['Private room for rent, Glenfield-Jane Heights, City of Toronto', 'room'],
    ['Furnished Studio In 10 ft Deep Basement of A House Near Subway, Willowdale East', 'basement'],
    ['1BED+1BTH BASEMENT AT BRENTCLIFF - EGLINTON EAST YORK, Leaside-Bennington', 'basement'],
    ['One bdrm apt in a house, ground level (not a basement) Etobicoke', 'house-unit'],
    ['Main floor of house, 2 bed, Scarborough', 'house-unit'],
    ['Bright upper unit, 3 bed, Danforth', 'house-unit'],
    ['Whole house for rent 4 bed 3 bath detached, Vaughan', 'house'],
    ['Renovated bungalow, Etobicoke', 'house'],
    ['3 bed townhouse with garage, Mississauga', 'townhouse'],
    ['Stacked townhome 2+1, Liberty Village', 'townhouse'],
    [
      'DOWNTOWN TORONTO, QUEEN & BATHURST, 3 BED, 1 BATH APT FOR RENT, Trinity-Bellwoods',
      'apartment',
    ],
    ['Luxury 2 bed condo at Plaza Midtown, Mount Pleasant West', 'apartment'],
  ])('%s → %s', (address, expected) => {
    expect(classifyCompUnitType({ source: 'kijiji', source_url: KIJIJI, address })).toBe(expected)
  })

  it('falls back to the URL category when the title says nothing', () => {
    expect(
      classifyCompUnitType({
        source: 'kijiji',
        source_url: KIJIJI,
        address:
          '414 - 51 EAST LIBERTY STREET Toronto (Niagara), Ontario, Fort York-Liberty Village',
      })
    ).toBe('apartment')
    expect(
      classifyCompUnitType({
        source: 'kijiji',
        source_url: 'https://www.kijiji.ca/v-house-rental/city-of-toronto/x/1',
        address: '12 Maple Ave, Toronto',
      })
    ).toBe('house')
    expect(
      classifyCompUnitType({
        source: 'kijiji',
        source_url: 'https://www.kijiji.ca/v-room-rental-roommate/city-of-toronto/x/1',
        address: '12 Maple Ave, Toronto',
      })
    ).toBe('room')
  })

  it('does not read "bathroom" as a room, "semi-furnished" as a house, or "townhouse" as a house', () => {
    expect(
      classifyCompUnitType({
        source: 'kijiji',
        source_url: KIJIJI,
        address: '2 bathroom condo, Toronto',
      })
    ).toBe('apartment')
    expect(
      classifyCompUnitType({
        source: 'kijiji',
        source_url: KIJIJI,
        address: 'Semi-furnished 1 bed, North York',
      })
    ).toBe('apartment')
    expect(
      classifyCompUnitType({
        source: 'kijiji',
        source_url: KIJIJI,
        address: 'End-unit townhouse, Markham',
      })
    ).toBe('townhouse')
  })
})

describe('classifyCompUnitType — padmapper and unknowns', () => {
  it('reads a padmapper /buildings/ row as an apartment', () => {
    expect(
      classifyCompUnitType({
        source: 'padmapper',
        source_url: 'https://www.padmapper.com/buildings/p1632980/apartments-at-135-wellington',
        address: '135 Wellington St N, Kitchener, ON N2H 5J9',
      })
    ).toBe('apartment')
  })

  it('is unknown when nothing stored says', () => {
    expect(
      classifyCompUnitType({ source: 'padmapper', source_url: null, address: '1 Main St' })
    ).toBe('unknown')
    expect(classifyCompUnitType({})).toBe('unknown')
    expect(
      classifyCompUnitType({ source: 'rentals_ca', raw_json: { listingType: 'commercial:x' } })
    ).toBe('unknown')
  })
})

describe('subjectUnitType', () => {
  it.each([
    ['condo', 'apartment'],
    ['detached', 'house'],
    ['semi-detached', 'house'],
    ['townhouse', 'townhouse'],
    ['multiplex', null],
    ['commercial', null],
    ['unknown', null],
    [null, null],
    [undefined, null],
  ] as const)('%s → %s', (propertyType, expected) => {
    expect(subjectUnitType(propertyType)).toBe(expected)
  })
})

describe('unitTypeFactor', () => {
  it('is 1 for the same type and 0 for the other rental market', () => {
    expect(unitTypeFactor('house', 'house')).toBe(1)
    expect(unitTypeFactor('apartment', 'apartment')).toBe(1)
    expect(unitTypeFactor('townhouse', 'townhouse')).toBe(1)
    expect(unitTypeFactor('house', 'apartment')).toBe(0)
    expect(unitTypeFactor('apartment', 'house')).toBe(0)
  })

  it('never counts a room, and counts a basement only when the subject stated no type', () => {
    expect(unitTypeFactor('house', 'room')).toBe(0)
    expect(unitTypeFactor(null, 'room')).toBe(0)
    expect(unitTypeFactor('apartment', 'basement')).toBe(0)
    expect(unitTypeFactor('house', 'basement')).toBe(0)
    expect(unitTypeFactor(null, 'basement')).toBe(1)
  })

  it('treats a townhouse as near an apartment and a house, and a floor of a house as near an apartment', () => {
    expect(unitTypeFactor('house', 'townhouse')).toBe(COMP_WEIGHTS.UNIT_TYPE_NEAR)
    expect(unitTypeFactor('apartment', 'townhouse')).toBe(COMP_WEIGHTS.UNIT_TYPE_NEAR)
    expect(unitTypeFactor('townhouse', 'house')).toBe(COMP_WEIGHTS.UNIT_TYPE_NEAR)
    expect(unitTypeFactor('townhouse', 'apartment')).toBe(COMP_WEIGHTS.UNIT_TYPE_NEAR)
    expect(unitTypeFactor('apartment', 'house-unit')).toBe(COMP_WEIGHTS.UNIT_TYPE_NEAR)
    expect(unitTypeFactor('townhouse', 'house-unit')).toBe(COMP_WEIGHTS.UNIT_TYPE_NEAR)
    expect(unitTypeFactor('house', 'house-unit')).toBe(0)
  })

  it('reduces, never excludes, a comp whose type could not be read', () => {
    expect(unitTypeFactor('house', 'unknown')).toBe(COMP_WEIGHTS.UNIT_TYPE_UNKNOWN)
    expect(unitTypeFactor('apartment', 'unknown')).toBe(COMP_WEIGHTS.UNIT_TYPE_UNKNOWN)
    expect(unitTypeFactor(null, 'unknown')).toBe(1)
  })

  it('every type has a label', () => {
    for (const t of [
      'apartment',
      'house',
      'townhouse',
      'house-unit',
      'basement',
      'room',
      'unknown',
    ] as const) {
      expect(UNIT_TYPE_LABEL[t]).toBeTruthy()
    }
  })
})
