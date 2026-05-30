/**
 * ScraperPartialInlineState — unit tests
 *
 * PR7 · State component tests
 * Test file path: Week3-4 Front end/PR7/scraperPartialInlineState.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScraperPartialInlineState } from '../../apps/web/src/components/states/ScraperPartialInlineState'

describe('ScraperPartialInlineState — 6 of 9, 3 missing', () => {
  const MISSING = ['Year built', 'Parking', 'Locker']

  it('renders "6 of 9" text', () => {
    render(<ScraperPartialInlineState scraped={6} total={9} missing={MISSING} />)
    // "6 of 9" appears in both the heading and the "Auto-filled" label
    expect(screen.getAllByText(/6 of 9/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders 3 input fields (one per missing field)', () => {
    render(<ScraperPartialInlineState scraped={6} total={9} missing={MISSING} />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(3)
  })

  it('renders "Year built" label', () => {
    render(<ScraperPartialInlineState scraped={6} total={9} missing={MISSING} />)
    expect(screen.getByText('Year built')).toBeInTheDocument()
  })

  it('renders "Parking" label', () => {
    render(<ScraperPartialInlineState scraped={6} total={9} missing={MISSING} />)
    expect(screen.getByText('Parking')).toBeInTheDocument()
  })

  it('renders "Locker" label', () => {
    render(<ScraperPartialInlineState scraped={6} total={9} missing={MISSING} />)
    expect(screen.getByText('Locker')).toBeInTheDocument()
  })
})

describe('ScraperPartialInlineState — empty missing array', () => {
  it('renders 0 text inputs', () => {
    render(<ScraperPartialInlineState scraped={9} total={9} missing={[]} />)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('renders without error when missing=[]', () => {
    expect(() =>
      render(<ScraperPartialInlineState scraped={9} total={9} missing={[]} />)
    ).not.toThrow()
  })
})
