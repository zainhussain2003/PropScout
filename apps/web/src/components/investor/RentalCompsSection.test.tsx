/**
 * RentalCompsSection — the comps behind the band are shown, sanitised (D-099).
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RentalCompsSection } from './RentalCompsSection'

const BAND = { low: 2700, mid: 2900, high: 3200, compCount: 8, confidence: 'medium' as const }

describe('RentalCompsSection — comp rows', () => {
  it('lists each comp with rent, size, area, distance, source and date', () => {
    render(
      <RentalCompsSection
        askingRent={2900}
        comps={{
          ...BAND,
          radiusKm: 5,
          rows: [
            {
              rentMonthly: 2750,
              beds: 3,
              sqft: 950,
              fsa: 'L4K',
              source: 'rentals_ca',
              seenAt: '2026-09-12T06:00:00.000Z',
              distanceKm: 0.8,
            },
            {
              rentMonthly: 3100,
              beds: null,
              sqft: null,
              fsa: null,
              source: 'kijiji',
              seenAt: null,
              distanceKm: null,
            },
          ],
        }}
      />
    )
    expect(screen.getByText('$2,750')).toBeInTheDocument()
    expect(screen.getByText('Rentals.ca')).toBeInTheDocument()
    expect(screen.getByText('0.8 km')).toBeInTheDocument()
    expect(screen.getByText('Kijiji')).toBeInTheDocument()
    expect(screen.getByText(/Showing 2 of 8 comps/i)).toBeInTheDocument()
    expect(screen.getByText(/addresses are not republished/i)).toBeInTheDocument()
  })

  it('renders no table when the analysis carries no rows (demo, older reports)', () => {
    render(<RentalCompsSection askingRent={2900} comps={BAND} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
