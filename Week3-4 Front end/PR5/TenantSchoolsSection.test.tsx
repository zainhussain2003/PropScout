/**
 * TenantSchoolsSection — unit tests
 *
 * PR5 · Tenant Report component tests
 * Test file path: Week3-4 Front end/PR5/TenantSchoolsSection.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TenantSchoolsSection } from '../../apps/web/src/components/tenant/TenantSchoolsSection'
import { CHARLES_SCHOOLS } from '../../apps/web/src/constants/tenantDemoData'
import type { TenantSchools } from '../../apps/web/src/types/analysis'

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Minimal data set with only one level (elementary) to test column hiding. */
const ELEMENTARY_ONLY: TenantSchools = {
  elementary: [
    {
      board: 'public',
      boardLabel: 'Public · TDSB',
      name: 'Jesse Ketchum Jr & Sr PS',
      grades: 'JK–8',
      distance: '0.6 km',
      walk: '8 min',
      quality: 'above',
      inCatchment: true,
    },
  ],
  middle: [],
  high: [],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TenantSchoolsSection', () => {
  it('renders the three column headers: Elementary, Middle, and High school', () => {
    render(<TenantSchoolsSection schools={CHARLES_SCHOOLS} />)
    expect(screen.getByText('Elementary')).toBeInTheDocument()
    expect(screen.getByText('Middle')).toBeInTheDocument()
    expect(screen.getByText('High school')).toBeInTheDocument()
  })

  it('renders the "In catchment" badge only on schools with inCatchment=true', () => {
    render(<TenantSchoolsSection schools={CHARLES_SCHOOLS} />)
    const badges = screen.getAllByText(/In catchment/i)
    // CHARLES_SCHOOLS has 3 in-catchment schools (Jesse Ketchum, Lord Dufferin, Jarvis)
    expect(badges).toHaveLength(3)
  })

  it('shows "Above avg" quality label for quality="above" schools', () => {
    render(<TenantSchoolsSection schools={CHARLES_SCHOOLS} />)
    const aboveLabels = screen.getAllByText('Above avg')
    // Jesse Ketchum (above) + Lord Lansdowne (above) + Jarvis (above) + St Michael's Choir (above)
    expect(aboveLabels.length).toBeGreaterThanOrEqual(4)
  })

  it('shows "Average" quality label for quality="avg" schools', () => {
    render(<TenantSchoolsSection schools={CHARLES_SCHOOLS} />)
    const avgLabels = screen.getAllByText('Average')
    // St. Michael's Catholic + Lord Dufferin + St. Paul Catholic + Étienne-Brûlé = 4
    expect(avgLabels.length).toBeGreaterThanOrEqual(4)
  })

  it('omits a column entirely when no schools exist for that level', () => {
    render(<TenantSchoolsSection schools={ELEMENTARY_ONLY} />)
    // Elementary column shown; Middle and High should NOT render
    expect(screen.getByText('Elementary')).toBeInTheDocument()
    expect(screen.queryByText('Middle')).not.toBeInTheDocument()
    expect(screen.queryByText('High school')).not.toBeInTheDocument()
  })

  it('renders all school names from CHARLES_SCHOOLS', () => {
    render(<TenantSchoolsSection schools={CHARLES_SCHOOLS} />)
    expect(screen.getByText('Jesse Ketchum Jr & Sr PS')).toBeInTheDocument()
    expect(screen.getByText('Jarvis Collegiate Institute')).toBeInTheDocument()
    expect(screen.getByText('Étienne-Brûlé Secondary')).toBeInTheDocument()
  })

  it('renders the board glyph letters P, C, F for the three board types', () => {
    render(<TenantSchoolsSection schools={CHARLES_SCHOOLS} />)
    // Public → P, Catholic → C, French → F (multiple instances due to three levels)
    const pGlyphs = screen.getAllByText('P')
    const cGlyphs = screen.getAllByText('C')
    const fGlyphs = screen.getAllByText('F')
    expect(pGlyphs.length).toBeGreaterThanOrEqual(1)
    expect(cGlyphs.length).toBeGreaterThanOrEqual(1)
    expect(fGlyphs.length).toBeGreaterThanOrEqual(1)
  })

  it('renders distance and walk time on each school card', () => {
    render(<TenantSchoolsSection schools={CHARLES_SCHOOLS} />)
    // Jesse Ketchum: '0.6 km · 8 min'
    expect(screen.getByText(/0\.6 km/)).toBeInTheDocument()
    expect(screen.getByText(/8 min/)).toBeInTheDocument()
  })
})
