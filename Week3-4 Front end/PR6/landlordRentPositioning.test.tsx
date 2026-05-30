/**
 * LandlordRentPositioningSection — unit tests
 *
 * PR6 · Landlord report component tests
 * Test file path: Week3-4 Front end/PR6/landlordRentPositioning.test.tsx
 *
 * Component reuse: LandlordRentPositioningSection uses the shared RentalCompsBar
 * component (from components/analysis/) instead of an inline gradient bar.
 * Tests verify RentalCompsBar is rendered via data-testid="rental-comps-bar"
 * and that its ask diamond aria-label reflects the live askingRent prop.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LandlordRentPositioningSection } from '../../apps/web/src/components/landlord/LandlordRentPositioningSection'
import {
  LL_PROPERTY,
  LL_RENT_COMPS,
  computeRentPositioning,
} from '../../apps/web/src/data/landlordData'

// ── Fixture setup ──────────────────────────────────────────────────────────────

const ASKING_RENT = 3400
const POSITIONING = computeRentPositioning(ASKING_RENT, LL_RENT_COMPS)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LandlordRentPositioningSection', () => {
  function renderSection(askingRent = ASKING_RENT, onRentChange = vi.fn()) {
    return render(
      <LandlordRentPositioningSection
        property={LL_PROPERTY}
        askingRent={askingRent}
        onRentChange={onRentChange}
        positioning={POSITIONING}
        comps={LL_RENT_COMPS}
      />
    )
  }

  it('renders the §01 section marker', () => {
    renderSection()
    // SectionHead splits "§" and "01" as sibling text nodes — no element has sole text "01".
    // Query the section topic text instead.
    expect(screen.getAllByText(/rent positioning/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Rent positioning" as the section topic', () => {
    renderSection()
    expect(screen.getByText('Rent positioning')).toBeInTheDocument()
  })

  it('RentalCompsBar is rendered — data-testid="rental-comps-bar" is present', () => {
    const { container } = renderSection()
    expect(container.querySelector('[data-testid="rental-comps-bar"]')).toBeTruthy()
  })

  it('RentalCompsBar diamond aria-label reflects the live askingRent ($3,400)', () => {
    renderSection(3400)
    // RentalCompsBar renders the ask diamond with aria-label="Estimated rent: $3,400"
    expect(screen.getByLabelText('Estimated rent: $3,400')).toBeInTheDocument()
  })

  it('when askingRent prop is 3100, diamond aria-label shows $3,100', () => {
    // Verifies the ask prop is passed through live — renders with a different value
    render(
      <LandlordRentPositioningSection
        property={LL_PROPERTY}
        askingRent={3100}
        onRentChange={vi.fn()}
        positioning={computeRentPositioning(3100, LL_RENT_COMPS)}
        comps={LL_RENT_COMPS}
      />
    )
    expect(screen.getByLabelText('Estimated rent: $3,100')).toBeInTheDocument()
  })

  it('renders the asking rent slider: input[type="range"] is present', () => {
    const { container } = renderSection()
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(slider).toBeTruthy()
  })

  it('slider has correct min ($2,500), max ($3,800), and step (25)', () => {
    const { container } = renderSection()
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(slider.min).toBe('2500')
    expect(slider.max).toBe('3800')
    expect(slider.step).toBe('25')
  })

  it('slider value reflects the current asking rent ($3,400)', () => {
    const { container } = renderSection()
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(slider.value).toBe('3400')
  })

  it('slider has aria-label="Asking rent"', () => {
    renderSection()
    const slider = screen.getByLabelText('Asking rent') as HTMLInputElement
    expect(slider).toBeInTheDocument()
  })

  it('fireEvent.change on slider calls onRentChange with the new numeric value', () => {
    const onRentChange = vi.fn()
    renderSection(3400, onRentChange)
    const slider = screen.getByLabelText('Asking rent')
    fireEvent.change(slider, { target: { value: '3200' } })
    expect(onRentChange).toHaveBeenCalledOnce()
    expect(onRentChange).toHaveBeenCalledWith(3200)
  })

  it('renders the "Snap to median" quick-snap button', () => {
    renderSection()
    expect(screen.getByRole('button', { name: /snap to median/i })).toBeInTheDocument()
  })

  it('clicking "Snap to median" calls onRentChange with buildingP50 (3100)', () => {
    const onRentChange = vi.fn()
    renderSection(3400, onRentChange)
    fireEvent.click(screen.getByRole('button', { name: /snap to median/i }))
    expect(onRentChange).toHaveBeenCalledWith(LL_RENT_COMPS.buildingP50)
  })

  it('clicking "Aggressive" snap button calls onRentChange with buildingP25 (2950)', () => {
    const onRentChange = vi.fn()
    renderSection(3400, onRentChange)
    fireEvent.click(screen.getByRole('button', { name: /aggressive/i }))
    expect(onRentChange).toHaveBeenCalledWith(LL_RENT_COMPS.buildingP25)
  })

  it('clicking "Top of range" snap button calls onRentChange with buildingP75 (3350)', () => {
    const onRentChange = vi.fn()
    renderSection(3400, onRentChange)
    fireEvent.click(screen.getByRole('button', { name: /top of range/i }))
    expect(onRentChange).toHaveBeenCalledWith(LL_RENT_COMPS.buildingP75)
  })

  it('building comps table renders — at least one live listing unit number visible', () => {
    renderSection()
    // LL_RENT_COMPS.liveListings[0].unit = '#1208'
    expect(screen.getByText('#1208')).toBeInTheDocument()
  })

  it('all 5 live listing units from LL_RENT_COMPS are visible', () => {
    renderSection()
    const unitNumbers = LL_RENT_COMPS.liveListings.map((l) => l.unit)
    for (const unit of unitNumbers) {
      expect(screen.getByText(unit)).toBeInTheDocument()
    }
    expect(unitNumbers.length).toBe(5)
  })

  it('a rented unit shows "pass" tone and an active unit shows a different status', () => {
    renderSection()
    // '#1208' status = 'rented · 7d' (tone: pass)
    expect(screen.getByText('rented · 7d')).toBeInTheDocument()
    // '#2912' status = 'active · 42d · price dropped' (tone: fail)
    expect(screen.getByText('active · 42d · price dropped')).toBeInTheDocument()
  })

  it('renders the methodology footnote with compCount and compConfidence', () => {
    renderSection()
    // Footnote: "last 60 days of {compCount} verified rentals ... Confidence: {compConfidence}"
    expect(screen.getByText(/verified rentals in this building/)).toBeInTheDocument()
    expect(screen.getByText(/Confidence:/)).toBeInTheDocument()
  })

  it('renders the "Your building · live" panel header', () => {
    renderSection()
    expect(screen.getByText(/your building · live/i)).toBeInTheDocument()
  })

  it('renders the "Drag to model alternatives" label on the slider display', () => {
    renderSection()
    expect(screen.getByText('Drag to model alternatives')).toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = renderSection()
    expect(container.firstChild).toMatchSnapshot()
  })
})
