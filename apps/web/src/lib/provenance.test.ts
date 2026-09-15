import { describe, it, expect } from 'vitest'
import { tileProvenance, listingProvenance, priceProvenance, TILE_INPUTS } from './provenance'
import type { AssumptionEntry, ListingData } from '../types/analysis'

const row = (key: string, basis: AssumptionEntry['basis'], label = key): AssumptionEntry => ({
  key,
  label,
  value: 'x',
  basis,
  source: 's',
  asOf: null,
  method: 'm',
})

describe('tileProvenance (D-111)', () => {
  const ledger = [
    row('rent', 'published', 'Market rent'),
    row('property_tax', 'estimate', 'Property tax'),
    row('maintenance', 'default', 'Maintenance reserve'),
    row('mortgage_rate', 'published', 'Mortgage rate'),
    row('walk_score', 'published', 'Walk Score'),
  ]

  it('is calculated and names the estimates and defaults among the tile inputs', () => {
    const p = tileProvenance('Cap rate', ledger)
    expect(p.kind).toBe('calculated')
    expect(p.assumed.map((e) => e.key)).toEqual(['property_tax', 'maintenance'])
    expect(p.detail).toBe('Calculated; assumes property tax, maintenance reserve. See §12.')
  })

  it('a tile with only observed and published inputs says so', () => {
    const p = tileProvenance('GRM', ledger)
    expect(p.assumed).toEqual([])
    expect(p.detail).toMatch(/observed and published/)
  })

  it('an unknown tile or an empty ledger still reads as calculated', () => {
    expect(tileProvenance('Nope', ledger).detail).toBe('Calculated by the engine.')
    expect(tileProvenance('Cap rate', null).assumed).toEqual([])
  })

  it('every headline tile is mapped', () => {
    for (const t of [
      'Cap rate',
      'Monthly cash flow',
      'Cash-on-cash',
      'DSCR',
      'Monthly payment',
      'NOI',
      'GRM',
      'Break-even rent',
      'Gross yield',
    ]) {
      expect(TILE_INPUTS[t]?.length).toBeGreaterThan(0)
    }
  })
})

describe('listingProvenance', () => {
  it('a scraped listing names its host and the scrape time', () => {
    expect(
      listingProvenance({
        url: 'https://www.realtor.ca/real-estate/1/x',
        scrapedAt: '2026-09-14T00:00:00Z',
      })
    ).toEqual({ kind: 'listing', source: 'realtor.ca', asOf: '2026-09-14T00:00:00Z' })
  })

  it('an address-entered listing is the person’s', () => {
    expect(listingProvenance({ url: '', scrapedAt: '2026-09-14T00:00:00Z' })).toEqual({
      kind: 'entered',
      source: 'details you entered',
      asOf: '2026-09-14T00:00:00Z',
    })
  })
})

describe('priceProvenance', () => {
  const base = { provenance: { kind: 'listing', source: 'realtor.ca', asOf: null } } as ListingData
  it('listing / entered / landlord value', () => {
    expect(priceProvenance(base).kind).toBe('listing')
    expect(priceProvenance(base).detail).toMatch(/realtor\.ca/)
    expect(
      priceProvenance({ ...base, provenance: { kind: 'entered', source: null, asOf: null } }).kind
    ).toBe('entered')
    expect(priceProvenance({ ...base, ownerValue: 800000 }).detail).toMatch(/value you entered/)
  })
})
