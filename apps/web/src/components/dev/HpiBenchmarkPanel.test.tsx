import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HpiBenchmarkPanel } from './HpiBenchmarkPanel'

describe('local benchmark display', () => {
  it('labels synthetic data and preserves missing values separately from zero', () => {
    render(
      <HpiBenchmarkPanel
        benchmark={{
          market: 'Synthetic Harbour',
          housing_type: 'Apartment',
          month: '2030-01',
          benchmark_price: 123456,
          hpi_index: null,
          change_1m: 0,
          change_6m: -2.5,
          change_1y: null,
          change_3y: null,
          change_5y: null,
          synthetic: 1,
          imported_at: '2030-02-01T00:00:00Z',
        }}
      />
    )
    expect(screen.getByText(/Synthetic test data/)).toBeTruthy()
    expect(screen.getByText('0.00%')).toBeTruthy()
    expect(screen.getByText('-2.50%')).toBeTruthy()
    expect(screen.getAllByText('Unavailable')).toHaveLength(4)
    expect(screen.getByText(/not an appraisal/)).toBeTruthy()
    expect(screen.getByText(/Canadian Real Estate Association/)).toBeTruthy()
  })
  it('labels exact-month HPI derivation and the series adjustment', () => {
    render(
      <HpiBenchmarkPanel
        benchmark={{
          market: 'Synthetic Harbour',
          housing_type: 'Composite',
          month: '2030-01',
          benchmark_price: null,
          hpi_index: null,
          change_1m: null,
          change_6m: null,
          change_1y: null,
          change_3y: null,
          change_5y: null,
          synthetic: 1,
          imported_at: '2030-02-01T00:00:00Z',
          change_basis: 'derived_hpi_exact_months',
        }}
      />
    )
    expect(screen.getByText(/Not seasonally adjusted/)).toBeTruthy()
    expect(screen.getByText(/Synthetic fixture/)).toBeTruthy()
  })
})
