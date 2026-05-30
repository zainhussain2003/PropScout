/**
 * SchoolColumn — unit tests
 *
 * PR6 · Personal Buyer report component tests
 * Test file path: Week3-4 Front end/PR6/schoolColumn.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SchoolColumn } from '../../apps/web/src/components/personal/SchoolColumn'
import type { PersonalSchool } from '../../apps/web/src/types/personal'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCHOOL_A: PersonalSchool = {
  name: 'Tom Thomson Public School',
  board: 'HDSB · public',
  distance: '0.6 km',
  driveTime: '2 min',
  eqao: 9.1,
  fraser: 88,
  inCatchment: true,
  grades: 'JK–8',
}

const SCHOOL_B: PersonalSchool = {
  name: 'Lakeshore Public School',
  board: 'HDSB · public',
  distance: '1.2 km',
  driveTime: '4 min',
  eqao: 8.2,
  fraser: 71,
  inCatchment: false,
  grades: 'JK–8',
}

const HIGH_SCHOOL: PersonalSchool = {
  name: 'Aldershot High School',
  board: 'HDSB · public',
  distance: '1.4 km',
  driveTime: '4 min',
  eqao: 8.4,
  fraser: 76,
  inCatchment: true,
  grades: '9–12',
  gradRate: 0.93,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SchoolColumn', () => {
  it('renders the column header label', () => {
    render(<SchoolColumn label="Elementary" schools={[SCHOOL_A]} />)
    expect(screen.getByText('Elementary')).toBeInTheDocument()
  })

  it('renders a different header label when passed "High school"', () => {
    render(<SchoolColumn label="High school" schools={[HIGH_SCHOOL]} />)
    expect(screen.getByText('High school')).toBeInTheDocument()
  })

  it('renders a different header label when passed "Middle"', () => {
    render(<SchoolColumn label="Middle" schools={[SCHOOL_A]} />)
    expect(screen.getByText('Middle')).toBeInTheDocument()
  })

  it('renders one SchoolCard per item in the schools array (single item)', () => {
    render(<SchoolColumn label="Elementary" schools={[SCHOOL_A]} />)
    expect(screen.getByText('Tom Thomson Public School')).toBeInTheDocument()
  })

  it('renders zero cards and does not crash when schools array is empty', () => {
    const { container } = render(<SchoolColumn label="Elementary" schools={[]} />)
    // Header should still be there
    expect(screen.getByText('Elementary')).toBeInTheDocument()
    // No school name text in the DOM
    expect(screen.queryByText('Tom Thomson Public School')).not.toBeInTheDocument()
    // No crash — container should still be a valid element
    expect(container.firstChild).toBeTruthy()
  })

  it('renders two SchoolCards for a two-item array', () => {
    render(<SchoolColumn label="Elementary" schools={[SCHOOL_A, SCHOOL_B]} />)
    expect(screen.getByText('Tom Thomson Public School')).toBeInTheDocument()
    expect(screen.getByText('Lakeshore Public School')).toBeInTheDocument()
  })

  it('renders all school names when given three schools', () => {
    const third: PersonalSchool = {
      name: 'St. Patrick Catholic School',
      board: 'HCDSB · catholic',
      distance: '1.8 km',
      driveTime: '5 min',
      eqao: 8.7,
      fraser: 79,
      inCatchment: false,
      grades: 'JK–8',
    }
    render(<SchoolColumn label="Elementary" schools={[SCHOOL_A, SCHOOL_B, third]} />)
    expect(screen.getByText('Tom Thomson Public School')).toBeInTheDocument()
    expect(screen.getByText('Lakeshore Public School')).toBeInTheDocument()
    expect(screen.getByText('St. Patrick Catholic School')).toBeInTheDocument()
  })

  it('matches snapshot: elementary column with two schools', () => {
    const { container } = render(<SchoolColumn label="Elementary" schools={[SCHOOL_A, SCHOOL_B]} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
