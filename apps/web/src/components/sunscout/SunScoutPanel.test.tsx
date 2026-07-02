/**
 * SunScoutPanel facade-direction input tests.
 *
 * The sun-path math assumes a south-facing primary facade; the selector turns
 * that assumption into a user input. Recalculation goes through
 * sunScoutService (API → calc engine) and updates the panel in place.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SunScoutPanel } from './SunScoutPanel'
import { recalculateSunScout } from '../../lib/services/sunScoutService'
import type { SunScoutResult } from '../../types/analysis'

vi.mock('../../lib/services/sunScoutService', () => ({
  recalculateSunScout: vi.fn(),
}))

const mockRecalculate = vi.mocked(recalculateSunScout)

const SOUTH: SunScoutResult = {
  annualPeakSunHours: 1400,
  summerDailyHours: 8.4,
  winterDailyHours: 3.1,
  seasonalGrid: { Dec: 3.1, Mar: 5.5, Jun: 8.4, Sep: 6.2 },
  monthlyHours: [3.1, 4.0, 5.5, 6.4, 7.6, 8.4, 8.2, 7.3, 6.2, 4.8, 3.6, 3.0],
  sunScore: 85,
  verdict: 'excellent',
}

const NORTH: SunScoutResult = {
  ...SOUTH,
  summerDailyHours: 4.2,
  winterDailyHours: 0.9,
  sunScore: 41,
  verdict: 'average',
}

describe('SunScoutPanel — facade direction input', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRecalculate.mockResolvedValue(NORTH)
  })

  it('shows the facade selector on live analyses (token present), defaulting to South', () => {
    render(<SunScoutPanel sunScout={SOUTH} token="test-token" />)

    const select = screen.getByLabelText(/facade faces/i)
    expect(select).toBeInTheDocument()
    expect((select as HTMLSelectElement).value).toBe('180')
  })

  it('hides the selector on demo pages (no token — nothing to recalculate against)', () => {
    render(<SunScoutPanel sunScout={SOUTH} />)

    expect(screen.queryByLabelText(/facade faces/i)).not.toBeInTheDocument()
  })

  it('recalculates via the service and updates the panel when the direction changes', async () => {
    render(<SunScoutPanel sunScout={SOUTH} token="test-token" />)

    fireEvent.change(screen.getByLabelText(/facade faces/i), { target: { value: '0' } })

    await waitFor(() => {
      expect(mockRecalculate).toHaveBeenCalledWith('test-token', 0)
    })
    // North-facing result replaces the south-facing one.
    expect(await screen.findByText(/Average · 41\/100/i)).toBeInTheDocument()
  })

  it('keeps the current data when recalculation fails (never blanks the section)', async () => {
    mockRecalculate.mockResolvedValue(null)
    render(<SunScoutPanel sunScout={SOUTH} token="test-token" />)

    fireEvent.change(screen.getByLabelText(/facade faces/i), { target: { value: '270' } })

    await waitFor(() => {
      expect(mockRecalculate).toHaveBeenCalled()
    })
    expect(screen.getByText(/Excellent · 85\/100/i)).toBeInTheDocument()
  })
})
