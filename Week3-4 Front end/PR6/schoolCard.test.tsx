/**
 * SchoolCard — unit tests
 *
 * PR6 · Personal Buyer report component tests
 * Test file path: Week3-4 Front end/PR6/schoolCard.test.tsx
 *
 * EQAO bar: SchoolCard renders a horizontal bar whose fill width =
 * Math.round(eqao)% (eqao is a 0–100 composite). Tests assert on the inline style.width value
 * and on the fill background token (var(--pass) / var(--caution) / var(--fail)).
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SchoolCard } from '../../apps/web/src/components/personal/SchoolCard'
import type { PersonalSchool } from '../../apps/web/src/types/personal'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ELEMENTARY_IN_CATCHMENT: PersonalSchool = {
  name: 'Tom Thomson Public School',
  board: 'HDSB · public',
  distance: '0.6 km',
  driveTime: '2 min',
  eqao: 91,
  fraser: 88,
  inCatchment: true,
  grades: 'JK–8',
}

const ELEMENTARY_NOT_IN_CATCHMENT: PersonalSchool = {
  name: 'Lakeshore Public School',
  board: 'HDSB · public',
  distance: '1.2 km',
  driveTime: '4 min',
  eqao: 82,
  fraser: 71,
  inCatchment: false,
  grades: 'JK–8',
}

const HIGH_SCHOOL_WITH_GRAD_RATE: PersonalSchool = {
  name: 'Aldershot High School',
  board: 'HDSB · public',
  distance: '1.4 km',
  driveTime: '4 min',
  eqao: 84,
  fraser: 76,
  inCatchment: true,
  grades: '9–12',
  gradRate: 0.93,
}

const BELOW_AVERAGE_SCHOOL: PersonalSchool = {
  name: 'Poor School',
  board: 'Generic Board',
  distance: '3.0 km',
  driveTime: '8 min',
  eqao: 65,
  fraser: 30,
  inCatchment: false,
  grades: 'JK–8',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SchoolCard', () => {
  it('renders the school name', () => {
    render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    expect(screen.getByText('Tom Thomson Public School')).toBeInTheDocument()
  })

  it('renders the board and grades label (concatenated)', () => {
    render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    // Rendered as "{board} · {grades}" in a single element
    expect(screen.getByText('HDSB · public · JK–8')).toBeInTheDocument()
  })

  it('renders the distance and drive time', () => {
    render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    expect(screen.getByText('0.6 km · 2 min drive')).toBeInTheDocument()
  })

  it('renders the EQAO bar fill with correct width for eqao=91 (91%)', () => {
    const { container } = render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    // Fill bar element has style.width = "91%" (= Math.round(91))
    const elements = Array.from(container.querySelectorAll<HTMLElement>('[style]'))
    const barFill = elements.find((el) => el.style.width === '91%')
    expect(barFill).toBeTruthy()
  })

  it('EQAO bar fill background is var(--pass) for eqao >= 75', () => {
    const { container } = render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    // eqao=91 >= 75 → getEqaoTone returns 'pass' → background: var(--pass)
    const elements = Array.from(container.querySelectorAll<HTMLElement>('[style]'))
    const barFill = elements.find((el) => el.style.width === '91%')
    expect(barFill?.style.background).toBe('var(--pass)')
  })

  it('renders the EQAO numeric score "91.0" as visible text', () => {
    render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    expect(screen.getByText('91.0')).toBeInTheDocument()
  })

  it('renders the Fraser percentile', () => {
    render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    // fraser=88 → "88" displayed with "th %ile" suffix
    expect(screen.getByText('88')).toBeInTheDocument()
    expect(screen.getByText('th %ile')).toBeInTheDocument()
  })

  it('renders "In catchment" badge when inCatchment === true', () => {
    render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    expect(screen.getByText('In catchment')).toBeInTheDocument()
  })

  it('does NOT render "In catchment" badge when inCatchment === false', () => {
    render(<SchoolCard school={ELEMENTARY_NOT_IN_CATCHMENT} />)
    expect(screen.queryByText('In catchment')).not.toBeInTheDocument()
  })

  it('renders grad rate percentage for high schools (gradRate defined)', () => {
    render(<SchoolCard school={HIGH_SCHOOL_WITH_GRAD_RATE} />)
    // gradRate=0.93 → Math.round(0.93 * 100) = 93 → "93% grad rate"
    expect(screen.getByText('93% grad rate')).toBeInTheDocument()
  })

  it('renders a Fraser label instead of grad rate for non-high-schools', () => {
    render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    // eqao=91, fraser=88 → getFraserLabel(88) = 'Top 20%'
    expect(screen.getByText('Top 20%')).toBeInTheDocument()
  })

  it('renders "Above avg" label for a fraser score in 60–79 range', () => {
    render(<SchoolCard school={ELEMENTARY_NOT_IN_CATCHMENT} />)
    // fraser=71 → 'Above avg'
    expect(screen.getByText('Above avg')).toBeInTheDocument()
  })

  it('renders "Below avg" label for a fraser score below 40', () => {
    render(<SchoolCard school={BELOW_AVERAGE_SCHOOL} />)
    // fraser=30 → 'Below avg'
    expect(screen.getByText('Below avg')).toBeInTheDocument()
  })

  it('in-catchment badge is accessible via visible text (not hidden from screen readers)', () => {
    render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    // The badge is a visible <span> with text "In catchment" — accessible by default
    const badge = screen.getByText('In catchment')
    expect(badge).toBeVisible()
  })

  it('matches snapshot (in-catchment school)', () => {
    const { container } = render(<SchoolCard school={ELEMENTARY_IN_CATCHMENT} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
