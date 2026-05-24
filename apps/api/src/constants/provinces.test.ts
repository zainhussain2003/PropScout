import { isOntarioPostalCode, ONTARIO_FSA_PREFIXES, ONTARIO_LTT_BRACKETS } from './provinces'

describe('isOntarioPostalCode', () => {
  it('identifies Ontario postal codes', () => {
    expect(isOntarioPostalCode('L4J 7K1')).toBe(true)
    expect(isOntarioPostalCode('M5V 2T6')).toBe(true)
    expect(isOntarioPostalCode('K1A 0A9')).toBe(true)
    expect(isOntarioPostalCode('N2L 3G1')).toBe(true)
    expect(isOntarioPostalCode('P3A 5K9')).toBe(true)
  })

  it('rejects non-Ontario postal codes', () => {
    expect(isOntarioPostalCode('V6B 1A1')).toBe(false) // BC
    expect(isOntarioPostalCode('T2P 1J9')).toBe(false) // AB
    expect(isOntarioPostalCode('H3A 1A1')).toBe(false) // QC
    expect(isOntarioPostalCode('B3H 4R2')).toBe(false) // NS
  })

  it('is case-insensitive', () => {
    expect(isOntarioPostalCode('m5v 2t6')).toBe(true)
    expect(isOntarioPostalCode('v6b 1a1')).toBe(false)
  })

  it('handles leading whitespace', () => {
    expect(isOntarioPostalCode('  M5V 2T6')).toBe(true)
  })
})

describe('ONTARIO_FSA_PREFIXES', () => {
  it('contains exactly the five Ontario FSA prefixes', () => {
    expect(ONTARIO_FSA_PREFIXES).toEqual(['K', 'L', 'M', 'N', 'P'])
    expect(ONTARIO_FSA_PREFIXES).toHaveLength(5)
  })
})

describe('ONTARIO_LTT_BRACKETS', () => {
  it('has brackets in ascending order', () => {
    for (let i = 1; i < ONTARIO_LTT_BRACKETS.length - 1; i++) {
      expect(ONTARIO_LTT_BRACKETS[i].upTo).toBeGreaterThan(ONTARIO_LTT_BRACKETS[i - 1].upTo)
    }
  })

  it('last bracket covers Infinity', () => {
    expect(ONTARIO_LTT_BRACKETS[ONTARIO_LTT_BRACKETS.length - 1].upTo).toBe(Infinity)
  })
})
