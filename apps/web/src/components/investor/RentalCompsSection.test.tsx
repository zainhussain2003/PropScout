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

  it('shows each comp’s match and maps the ones with a position when the subject has coordinates (D-109)', () => {
    const rows = [
      {
        rentMonthly: 2750,
        beds: 3,
        sqft: 950,
        fsa: 'L4K',
        source: 'rentals_ca',
        seenAt: '2026-09-12T06:00:00.000Z',
        distanceKm: 0.8,
        similarity: 0.82,
        approxLat: 43.795,
        approxLng: -79.53,
      },
      {
        rentMonthly: 3100,
        beds: 2,
        sqft: null,
        fsa: 'L4K',
        source: 'kijiji',
        seenAt: null,
        distanceKm: null,
        similarity: 0.6,
        approxLat: null,
        approxLng: null,
      },
    ]
    render(
      <RentalCompsSection
        askingRent={2900}
        comps={{ ...BAND, radiusKm: null, rows }}
        mapCenter={{ lat: 43.79, lng: -79.53 }}
      />
    )
    expect(screen.getByText('Match')).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText(/Match weighs distance/)).toBeInTheDocument()
    expect(screen.getByText(/1 of 2 comps mapped · same postal area/)).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Map showing rental comps near comparable rentals/)
    ).toBeInTheDocument()
  })

  it('renders no map without subject coordinates or without positioned comps', () => {
    const { rerender } = render(
      <RentalCompsSection
        askingRent={2900}
        comps={{
          ...BAND,
          rows: [
            {
              rentMonthly: 2750,
              beds: 3,
              sqft: null,
              fsa: 'L4K',
              source: 'kijiji',
              seenAt: null,
              distanceKm: null,
              similarity: 1,
              approxLat: 43.795,
              approxLng: -79.53,
            },
          ],
        }}
      />
    )
    expect(screen.queryByText(/comps mapped/)).not.toBeInTheDocument()
    rerender(
      <RentalCompsSection
        askingRent={2900}
        comps={{
          ...BAND,
          rows: [
            {
              rentMonthly: 2750,
              beds: 3,
              sqft: null,
              fsa: 'L4K',
              source: 'kijiji',
              seenAt: null,
              distanceKm: null,
            },
          ],
        }}
        mapCenter={{ lat: 43.79, lng: -79.53 }}
      />
    )
    expect(screen.queryByText(/comps mapped/)).not.toBeInTheDocument()
    // Rows without a similarity (older analyses) get a dash, and no weighting note.
    expect(screen.getAllByText('—', { selector: 'td' }).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Match weighs distance/)).not.toBeInTheDocument()
  })

  it('keeps §03 on the page with a finding when there are no comps, and names the proxy (D-101)', () => {
    const { container } = render(<RentalCompsSection askingRent={1745} comps={null} rentIsProxy />)
    expect(container.querySelector('section[data-section="03"]')).not.toBeNull()
    expect(screen.getByText(/No comparable rentals found/i)).toBeInTheDocument()
    expect(
      screen.getByText(/assumes \$1,745\/mo, which is 0\.5% of the asking price/i)
    ).toBeInTheDocument()
  })

  it('with no comps but a listed rent, says the rent is unverified rather than a proxy', () => {
    render(<RentalCompsSection askingRent={2400} comps={{ ...BAND, compCount: 0 }} />)
    expect(screen.getByText(/listing's own \$2,400\/mo/i)).toBeInTheDocument()
  })

  it('renders no table when the analysis carries no rows (demo, older reports)', () => {
    render(<RentalCompsSection askingRent={2900} comps={BAND} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
