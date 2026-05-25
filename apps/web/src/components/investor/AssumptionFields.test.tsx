/**
 * Tests for AssumptionFields component and constants/assumptions.ts.
 *
 * Tests cover:
 *   - All 7 fields render with correct defaults
 *   - Each field has an accessible label and a tooltip
 *   - Changing a value fires onAssumptionsChange with the updated number
 *   - Values are clamped to their min/max bounds
 *   - constants/assumptions.ts has correct default values matching the calc engine
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AssumptionFields } from './AssumptionFields'
import { ASSUMPTION_FIELDS, DEFAULT_ASSUMPTIONS, ASSUMPTION_MAP } from '../../constants/assumptions'

// ── constants/assumptions.ts ───────────────────────────────────────────────────

describe('ASSUMPTION_FIELDS', () => {
  it('defines all 7 expected fields', () => {
    const keys = ASSUMPTION_FIELDS.map((f) => f.key)
    expect(keys).toContain('vacancyAllowance')
    expect(keys).toContain('insuranceRate')
    expect(keys).toContain('managementFee')
    expect(keys).toContain('maintenanceRate')
    expect(keys).toContain('appreciationRate')
    expect(keys).toContain('legalFees')
    expect(keys).toContain('mortgageRate')
    expect(ASSUMPTION_FIELDS).toHaveLength(7)
  })

  it('every field has a non-empty tooltip', () => {
    for (const field of ASSUMPTION_FIELDS) {
      expect(field.tooltip.length).toBeGreaterThan(20)
    }
  })

  it('every field has min < max', () => {
    for (const field of ASSUMPTION_FIELDS) {
      expect(field.min).toBeLessThan(field.max)
    }
  })

  it('every defaultValue is within [min, max]', () => {
    for (const field of ASSUMPTION_FIELDS) {
      expect(field.defaultValue).toBeGreaterThanOrEqual(field.min)
      expect(field.defaultValue).toBeLessThanOrEqual(field.max)
    }
  })
})

describe('DEFAULT_ASSUMPTIONS', () => {
  it('vacancy default is 5 (= 5%)', () => {
    expect(DEFAULT_ASSUMPTIONS.vacancyAllowance).toBe(5)
  })

  it('insurance default is 0.35 (= 0.35%)', () => {
    expect(DEFAULT_ASSUMPTIONS.insuranceRate).toBe(0.35)
  })

  it('management default is 8 (= 8%)', () => {
    expect(DEFAULT_ASSUMPTIONS.managementFee).toBe(8)
  })

  it('appreciation default is 3 (= 3%)', () => {
    expect(DEFAULT_ASSUMPTIONS.appreciationRate).toBe(3)
  })

  it('legal fees default is 1500', () => {
    expect(DEFAULT_ASSUMPTIONS.legalFees).toBe(1500)
  })

  it('mortgage rate default is 0 (= use live rate)', () => {
    expect(DEFAULT_ASSUMPTIONS.mortgageRate).toBe(0)
  })
})

describe('ASSUMPTION_MAP', () => {
  it('provides O(1) lookup by key', () => {
    expect(ASSUMPTION_MAP.vacancyAllowance).toBeDefined()
    expect(ASSUMPTION_MAP.vacancyAllowance.label).toBe('Vacancy allowance')
  })
})

// ── AssumptionFields component ─────────────────────────────────────────────────

describe('AssumptionFields', () => {
  const renderFields = (onChange = vi.fn()): ReturnType<typeof render> =>
    render(<AssumptionFields onAssumptionsChange={onChange} />)

  it('renders all 7 labelled inputs', () => {
    renderFields()
    for (const field of ASSUMPTION_FIELDS) {
      expect(screen.getByLabelText(field.label)).toBeInTheDocument()
    }
  })

  it('pre-fills inputs with default values', () => {
    renderFields()
    const vacancyInput = screen.getByLabelText('Vacancy allowance') as HTMLInputElement
    expect(parseFloat(vacancyInput.value)).toBe(5)
  })

  it('renders a tooltip trigger (?) for every field', () => {
    renderFields()
    // Each tooltip trigger renders '?' as its visible text
    const triggers = screen.getAllByRole('button', { name: '?' })
    expect(triggers.length).toBe(ASSUMPTION_FIELDS.length)
  })

  it('calls onAssumptionsChange when a value changes', () => {
    const onChange = vi.fn()
    renderFields(onChange)

    const input = screen.getByLabelText('Vacancy allowance') as HTMLInputElement
    // Use fireEvent.change for reliable number input simulation
    fireEvent.change(input, { target: { value: '3' } })

    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall.vacancyAllowance).toBe(3)
  })

  it('accepts initialValues overrides', () => {
    render(
      <AssumptionFields
        onAssumptionsChange={vi.fn()}
        initialValues={{ vacancyAllowance: 2, legalFees: 2000 }}
      />
    )
    const vacancy = screen.getByLabelText('Vacancy allowance') as HTMLInputElement
    const legal = screen.getByLabelText('Legal fees') as HTMLInputElement

    expect(parseFloat(vacancy.value)).toBe(2)
    expect(parseFloat(legal.value)).toBe(2000)
  })

  it('clamps values to field min on blur with an out-of-range input', async () => {
    const onChange = vi.fn()
    renderFields(onChange)

    const input = screen.getByLabelText('Vacancy allowance') as HTMLInputElement
    // Fire change directly with a value below min (0)
    fireEvent.change(input, { target: { value: '-5' } })

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall.vacancyAllowance).toBeGreaterThanOrEqual(0) // clamped to min
  })

  it('clamps values to field max on a too-high input', async () => {
    const onChange = vi.fn()
    renderFields(onChange)

    const input = screen.getByLabelText('Vacancy allowance') as HTMLInputElement
    fireEvent.change(input, { target: { value: '999' } })

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall.vacancyAllowance).toBeLessThanOrEqual(20) // max is 20
  })

  it('does not call onChange if the value is not a valid number', async () => {
    const onChange = vi.fn()
    renderFields(onChange)

    const input = screen.getByLabelText('Vacancy allowance') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc' } })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders in compact mode without error', () => {
    render(<AssumptionFields onAssumptionsChange={vi.fn()} compact />)
    expect(screen.getByLabelText('Vacancy allowance')).toBeInTheDocument()
  })

  // ── rateMetadata + RateBanner ────────────────────────────────────────────────

  it('shows no banner when rateMetadata is not provided', () => {
    renderFields()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows no banner when rateMetadata.source is live', () => {
    render(
      <AssumptionFields
        onAssumptionsChange={vi.fn()}
        rateMetadata={{ rate: 0.052, source: 'live', warning: null }}
      />
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the banner when source is cached', () => {
    render(
      <AssumptionFields
        onAssumptionsChange={vi.fn()}
        rateMetadata={{
          rate: 0.052,
          source: 'cached',
          warning: 'Using cached rate from May 17, 2026 — live rate unavailable.',
        }}
      />
    )
    const banner = screen.getByRole('alert')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveTextContent('May 17, 2026')
    expect(banner).toHaveTextContent('live rate unavailable')
  })

  it('shows the banner when source is fallback', () => {
    render(
      <AssumptionFields
        onAssumptionsChange={vi.fn()}
        rateMetadata={{
          rate: 0.0479,
          source: 'fallback',
          warning: 'Live rate unavailable — using default rate.',
        }}
      />
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('pre-fills mortgageRate from rateMetadata when not in initialValues', () => {
    render(
      <AssumptionFields
        onAssumptionsChange={vi.fn()}
        rateMetadata={{ rate: 0.052, source: 'live', warning: null }}
      />
    )
    const input = screen.getByLabelText('Mortgage rate') as HTMLInputElement
    expect(parseFloat(input.value)).toBeCloseTo(5.2, 1)
  })

  it('initialValues.mortgageRate takes precedence over rateMetadata', () => {
    render(
      <AssumptionFields
        onAssumptionsChange={vi.fn()}
        initialValues={{ mortgageRate: 4.25 }}
        rateMetadata={{ rate: 0.052, source: 'live', warning: null }}
      />
    )
    const input = screen.getByLabelText('Mortgage rate') as HTMLInputElement
    expect(parseFloat(input.value)).toBeCloseTo(4.25, 2)
  })
})
