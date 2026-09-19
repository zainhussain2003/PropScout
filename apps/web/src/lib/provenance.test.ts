import { describe, it, expect } from 'vitest'
import {
  tileProvenance,
  listingProvenance,
  priceProvenance,
  askingProvenance,
  rentTargetProvenance,
  cashOutflowProvenance,
  TILE_INPUTS,
} from './provenance'
import type { CashOutflowLine } from './personalCashOutflow'
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

describe('tenant and personal tiles (D-122)', () => {
  it('the asking rent or price is the listing’s or the person’s', () => {
    const scraped = { kind: 'listing' as const, source: 'realtor.ca', asOf: null }
    expect(askingProvenance(scraped, 'rent')).toEqual({
      kind: 'listing',
      detail: 'Asking rent as stated on realtor.ca.',
      assumed: [],
    })
    expect(askingProvenance({ kind: 'entered', source: null, asOf: null }, 'price')).toEqual({
      kind: 'entered',
      detail: 'The asking price you entered with the address.',
      assumed: [],
    })
    expect(askingProvenance(null, 'price').detail).toBe('Asking price as stated on the listing.')
  })

  it('the negotiation target names the comps behind it, where from, and how sure', () => {
    expect(
      rentTargetProvenance({ compCount: 5, confidence: 'medium', radiusKm: null }).detail
    ).toBe(
      '25th to 50th percentile of 5 asking rents in the same postal area, medium confidence. Asking rents, not signed leases.'
    )
    const wide = rentTargetProvenance({ compCount: 1, confidence: 'low', radiusKm: 10 })
    expect(wide.kind).toBe('calculated')
    expect(wide.detail).toMatch(/of 1 asking rent within 10 km, low confidence/)
    expect(rentTargetProvenance(null).detail).toBe('No comparable rentals were found.')
    expect(rentTargetProvenance({ compCount: 0, confidence: 'low', radiusKm: null }).detail).toBe(
      'No comparable rentals were found.'
    )
  })

  it('the cash outflow is calculated and counts the estimated rows once', () => {
    const line = (
      key: string,
      basis: CashOutflowLine['basis'],
      extra: Partial<CashOutflowLine> = {}
    ): CashOutflowLine => ({ key, label: key, value: 100, basis, note: '', ...extra })
    const lines = [
      line('Mortgage', 'calculated'),
      line('Property tax', 'listing'),
      line('Insurance', 'estimated'),
      line('Utilities', 'estimated', { aggregate: true }),
      line('Hydro', 'estimated', { indent: true }),
      line('Gas', 'estimated', { indent: true }),
      line('Maintenance reserve', 'estimated'),
    ]
    const p = cashOutflowProvenance(lines)
    expect(p.kind).toBe('calculated')
    // Insurance, utilities, maintenance; the utilities children are a breakdown
    // of one row, not further rows — the same rule as §01's modelled share.
    expect(p.assumed.map((a) => a.key)).toEqual(['Insurance', 'Utilities', 'Maintenance reserve'])
    expect(p.detail).toBe(
      'Sum of the rows in §01; estimates insurance, utilities, maintenance reserve.'
    )
    expect(cashOutflowProvenance([line('Mortgage', 'calculated')]).detail).toBe(
      'Sum of the listed and calculated rows in §01.'
    )
  })
})
