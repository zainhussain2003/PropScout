/**
 * WhatsIncludedSection — unit tests
 *
 * PR5 · Tenant Report component tests
 * Test file path: Week3-4 Front end/PR5/WhatsIncludedSection.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatsIncludedSection } from '../../apps/web/src/components/tenant/WhatsIncludedSection'
import type { TenantAmenity } from '../../apps/web/src/types/analysis'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MIXED_AMENITIES: TenantAmenity[] = [
  { label: 'Heat', status: 'incl' },
  { label: 'Hydro', status: 'extra', note: '~$80–110/mo' },
  { label: 'Parking', status: 'unclear', note: 'confirm with landlord' },
  { label: 'Water', status: 'incl' },
  { label: 'Central air', status: 'incl' },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WhatsIncludedSection', () => {
  it('renders ✓ glyph for an incl amenity', () => {
    render(<WhatsIncludedSection amenities={MIXED_AMENITIES} />)
    // Find the cell for "Heat" and check the glyph within it
    const heatCell = screen.getByText('Heat').closest('div')
    expect(heatCell?.textContent).toContain('✓')
  })

  it('renders $ glyph for an extra amenity', () => {
    render(<WhatsIncludedSection amenities={MIXED_AMENITIES} />)
    const hydroCell = screen.getByText('Hydro').closest('div')
    expect(hydroCell?.textContent).toContain('$')
  })

  it('renders ? glyph for an unclear amenity', () => {
    render(<WhatsIncludedSection amenities={MIXED_AMENITIES} />)
    const parkingCell = screen.getByText('Parking').closest('div')
    expect(parkingCell?.textContent).toContain('?')
  })

  it('renders the legend with "Included", "Extra", and "Unclear" labels', () => {
    render(<WhatsIncludedSection amenities={MIXED_AMENITIES} />)
    expect(screen.getByText('Included')).toBeInTheDocument()
    expect(screen.getByText('Extra')).toBeInTheDocument()
    expect(screen.getByText('Unclear')).toBeInTheDocument()
  })

  it('shows the amenity note when provided', () => {
    render(<WhatsIncludedSection amenities={MIXED_AMENITIES} />)
    expect(screen.getByText('~$80–110/mo')).toBeInTheDocument()
    expect(screen.getByText('confirm with landlord')).toBeInTheDocument()
  })

  it('renders all amenity labels in the grid', () => {
    render(<WhatsIncludedSection amenities={MIXED_AMENITIES} />)
    expect(screen.getByText('Heat')).toBeInTheDocument()
    expect(screen.getByText('Hydro')).toBeInTheDocument()
    expect(screen.getByText('Parking')).toBeInTheDocument()
    expect(screen.getByText('Water')).toBeInTheDocument()
    expect(screen.getByText('Central air')).toBeInTheDocument()
  })

  it('shows a confirmed count in the summary line', () => {
    render(<WhatsIncludedSection amenities={MIXED_AMENITIES} />)
    // 3 incl out of 5 total
    expect(screen.getByText(/3 of 5 items confirmed included/i)).toBeInTheDocument()
  })
})
