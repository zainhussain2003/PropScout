/**
 * rateBaseNote / rateLedgerRow (D-123) — the sentence under the mortgage-rate
 * slider, from the ledger row the API stored.
 */

import { describe, it, expect } from 'vitest'
import { rateBaseNote, rateLedgerRow } from './rateProvenance'
import type { AssumptionEntry } from '../types/analysis'

const row = (over: Partial<AssumptionEntry>): AssumptionEntry => ({
  key: 'mortgage_rate',
  label: 'Mortgage rate',
  value: '4.45%',
  basis: 'published',
  source: 'Bank of Canada Valet — prime business rate (series V80691311)',
  asOf: '2026-09-19T15:00:00.000Z',
  method: 'Prime rate at the time of analysis. A quoted mortgage rate will differ; use the slider.',
  ...over,
})

describe('rateLedgerRow', () => {
  it('finds the mortgage-rate row and nothing else', () => {
    expect(rateLedgerRow([row({}), row({ key: 'rent' })])?.key).toBe('mortgage_rate')
    expect(rateLedgerRow([row({ key: 'rent' })])).toBeNull()
    expect(rateLedgerRow(null)).toBeNull()
    expect(rateLedgerRow(undefined)).toBeNull()
  })
})

describe('rateBaseNote', () => {
  it('a live Bank of Canada rate names the source and the read date', () => {
    expect(rateBaseNote(row({}), '4.45%')).toBe(
      'Base 4.45% is the Bank of Canada prime rate, read Sep 19, 2026. A quoted mortgage rate will differ — set yours here.'
    )
  })

  it('a cached rate says it was the last successful fetch', () => {
    expect(
      rateBaseNote(
        row({
          method:
            'Prime rate from the last successful fetch (cached up to 7 days). A quoted rate will differ; use the slider.',
          asOf: '2026-09-12T06:00:00.000Z',
        }),
        '4.45%'
      )
    ).toBe(
      'Base 4.45% is the Bank of Canada prime rate from the last successful fetch, Sep 12, 2026. A quoted mortgage rate will differ — set yours here.'
    )
  })

  it('a default says the feed was unavailable', () => {
    expect(
      rateBaseNote(
        row({ basis: 'default', source: 'PropScout default — no external source', asOf: null }),
        '4.79%'
      )
    ).toBe(
      "Base 4.79% is PropScout's default — the Bank of Canada feed was unavailable. Set your quoted rate here."
    )
  })

  it('a landlord’s own contract rate is theirs (D-108)', () => {
    expect(
      rateBaseNote(row({ basis: 'observed', source: 'You entered it', asOf: null }), '4.10%')
    ).toBe('Base 4.10% is the contract rate you entered.')
  })

  it('claims nothing without a ledger row', () => {
    expect(rateBaseNote(null, '4.79%')).toBeNull()
  })
})
