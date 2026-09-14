/**
 * AssumptionLedgerSection — the report says where each number came from,
 * and calls a default a default (D-088).
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssumptionLedgerSection } from './AssumptionLedgerSection'
import type { AssumptionEntry } from '../../types/analysis'

const ENTRIES: AssumptionEntry[] = [
  {
    key: 'rent',
    label: 'Market rent',
    value: '$2,900/mo',
    basis: 'published',
    source: '60 asking rents from the PropScout nightly comps table',
    asOf: '2026-09-12T14:00:00.000Z',
    method: 'Median of asking rents within 2 km with outliers removed.',
  },
  {
    key: 'mortgage_rate',
    label: 'Mortgage rate',
    value: '5.20%',
    basis: 'published',
    source: 'Bank of Canada Valet — prime business rate',
    asOf: '2026-09-12T11:00:00.000Z',
    method: 'Prime rate at the time of analysis.',
  },
  {
    key: 'property_tax',
    label: 'Property tax',
    value: '$5,219/yr',
    basis: 'estimate',
    source: 'Ontario municipal tax-rate table (2025 budgets)',
    asOf: '2025',
    method: 'Asking price × the Toronto residential rate.',
  },
  {
    key: 'insurance',
    label: 'Insurance',
    value: '0.35% of value',
    basis: 'default',
    source: 'PropScout default — no external source',
    asOf: null,
    method: 'Annual premium modelled as a share of the property value.',
  },
  {
    key: 'legal_fees',
    label: 'Legal fees',
    value: '$1,500',
    basis: 'default',
    source: 'PropScout default — no external source',
    asOf: null,
    method: 'Flat estimate in cash to close.',
  },
]

describe('AssumptionLedgerSection', () => {
  it('lists every entry with its value, source and method', () => {
    render(<AssumptionLedgerSection entries={ENTRIES} />)
    expect(screen.getByText('Market rent')).toBeInTheDocument()
    expect(screen.getByText('$2,900/mo')).toBeInTheDocument()
    expect(screen.getByText(/60 asking rents/)).toBeInTheDocument()
    expect(screen.getByText(/Median of asking rents/)).toBeInTheDocument()
  })

  it('labels the basis of each number and counts the defaults in the verdict', () => {
    const { container } = render(<AssumptionLedgerSection entries={ENTRIES} />)
    const chips = Array.from(container.querySelectorAll('tbody td span')).map((n) => n.textContent)
    expect(chips.filter((c) => c === 'Published')).toHaveLength(2)
    expect(chips.filter((c) => c === 'Estimate')).toHaveLength(1)
    expect(chips.filter((c) => c === 'Default')).toHaveLength(2)
    expect(screen.getByText(/2 of 5 are defaults/i)).toBeInTheDocument()
  })

  it('shows a date only when there is one', () => {
    render(<AssumptionLedgerSection entries={ENTRIES} />)
    expect(screen.getAllByText(/as of/i).length).toBe(3)
    expect(screen.getByText(/as of 2025$/i)).toBeInTheDocument()
  })

  it('renders nothing for a report that predates the ledger', () => {
    const { container } = render(<AssumptionLedgerSection entries={null} />)
    expect(container.querySelector('[data-section]')).toBeNull()
  })

  it('takes its section number from the caller', () => {
    const { container } = render(<AssumptionLedgerSection entries={ENTRIES} sectionNumber="12" />)
    expect(container.querySelector('[data-section="12"]')).not.toBeNull()
  })
})
