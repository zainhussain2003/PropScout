/**
 * LocationCommuteSection — unit tests
 *
 * PR5 · Tenant Report component tests
 * Test file path: Week3-4 Front end/PR5/LocationCommuteSection.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LocationCommuteSection } from '../../apps/web/src/components/tenant/LocationCommuteSection'
import {
  CHARLES_MOBILITY_SCORES,
  CHARLES_DISTANCES,
} from '../../apps/web/src/constants/tenantDemoData'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LocationCommuteSection', () => {
  it('renders the Walk Score value with correct aria-label', () => {
    render(
      <LocationCommuteSection
        mobilityScores={CHARLES_MOBILITY_SCORES}
        distances={CHARLES_DISTANCES}
      />
    )
    // Walk Score val is 72
    const walkEl = screen.getByLabelText(/Walk Score: 72 out of 100/i)
    expect(walkEl).toBeInTheDocument()
  })

  it('renders the Transit Score value with correct aria-label', () => {
    render(
      <LocationCommuteSection
        mobilityScores={CHARLES_MOBILITY_SCORES}
        distances={CHARLES_DISTANCES}
      />
    )
    // Transit Score val is 85
    const transitEl = screen.getByLabelText(/Transit Score: 85 out of 100/i)
    expect(transitEl).toBeInTheDocument()
  })

  it('renders the Bike Score value with correct aria-label', () => {
    render(
      <LocationCommuteSection
        mobilityScores={CHARLES_MOBILITY_SCORES}
        distances={CHARLES_DISTANCES}
      />
    )
    // Bike Score val is 58
    const bikeEl = screen.getByLabelText(/Bike Score: 58 out of 100/i)
    expect(bikeEl).toBeInTheDocument()
  })

  it('renders all distance row keys in the right-hand table', () => {
    render(
      <LocationCommuteSection
        mobilityScores={CHARLES_MOBILITY_SCORES}
        distances={CHARLES_DISTANCES}
      />
    )
    // Check a sample of distance rows
    expect(screen.getByText('VMC Subway (Line 1)')).toBeInTheDocument()
    expect(screen.getByText('Pearson Airport')).toBeInTheDocument()
    expect(screen.getByText('Nearest grocery')).toBeInTheDocument()
  })

  it('shows the "From this address" heading in the distances card', () => {
    render(
      <LocationCommuteSection
        mobilityScores={CHARLES_MOBILITY_SCORES}
        distances={CHARLES_DISTANCES}
      />
    )
    expect(screen.getByText(/From this address/i)).toBeInTheDocument()
  })

  it('renders the "Mobility scores" heading in the left card', () => {
    render(
      <LocationCommuteSection
        mobilityScores={CHARLES_MOBILITY_SCORES}
        distances={CHARLES_DISTANCES}
      />
    )
    expect(screen.getByText(/Mobility scores/i)).toBeInTheDocument()
  })

  it('renders the score sub-descriptions from the data', () => {
    render(
      <LocationCommuteSection
        mobilityScores={CHARLES_MOBILITY_SCORES}
        distances={CHARLES_DISTANCES}
      />
    )
    expect(screen.getByText(/Excellent — VMC subway 2-min walk/i)).toBeInTheDocument()
    expect(screen.getByText(/Bikeable for some trips/i)).toBeInTheDocument()
  })
})
