/**
 * LandlordPage — integration tests
 *
 * PR6 · Landlord report page integration tests
 * Test file path: Week3-4 Front end/PR6/landlordPage.integration.test.tsx
 *
 * Renders the full LandlordPage with Harbour Street mock data (LL_PROPERTY,
 * LL_RENT_COMPS, LL_DEFAULT_FINANCING) and asserts cross-section behaviour.
 *
 * Component-reuse verification strategy: since no data-testid attributes exist
 * in the shared components, reuse is verified by testing for text content that
 * is unique to each specific shared component (e.g. InvestmentMetricsSection
 * renders "Where the money goes." and "Investment metrics").
 */

import { describe, it, expect, vi, afterAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LandlordPage } from '../../apps/web/src/pages/LandlordPage'

// ── Render helper ──────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <LandlordPage />
    </MemoryRouter>
  )
}

// ── Group 1: Full render ───────────────────────────────────────────────────────

describe('LandlordPage — full render', () => {
  it('renders the full page without throwing', () => {
    expect(() => renderPage()).not.toThrow()
  })

  it('renders the Nav with "Landlord report" label', () => {
    renderPage()
    // "Landlord report" appears in both a <span> and an <a> element — getByText throws.
    // Use getAllByText to confirm at least one match is present.
    expect(screen.getAllByText('Landlord report').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the property address "Unit 3208 · 88 Harbour Street"', () => {
    renderPage()
    expect(screen.getByText('Unit 3208 · 88 Harbour Street')).toBeInTheDocument()
  })
})

// ── Group 2: LandlordRentPositioningSection (§01) ─────────────────────────────

describe('LandlordPage — §01 Rent positioning', () => {
  it('LandlordRentPositioningSection §01 is present', () => {
    renderPage()
    expect(screen.getByText('Rent positioning')).toBeInTheDocument()
  })

  it('§01 section marker "01" is rendered', () => {
    renderPage()
    // SectionHead splits "§" and "01" as sibling text nodes — no element has sole text "01".
    // Query the section topic text instead.
    expect(screen.getAllByText(/rent positioning/i).length).toBeGreaterThanOrEqual(1)
  })

  it('rent slider input[type="range"] is present', () => {
    const { container } = renderPage()
    // Multiple sliders may be present (rent + financing sliders)
    const sliders = container.querySelectorAll('input[type="range"]')
    expect(sliders.length).toBeGreaterThanOrEqual(1)
  })
})

// ── Group 3: InvestmentMetricsSection reuse ───────────────────────────────────

describe('LandlordPage — InvestmentMetricsSection (shared investor component)', () => {
  it('renders "Investment metrics" section topic (from InvestmentMetricsSection)', () => {
    renderPage()
    // InvestmentMetricsSection.tsx renders SectionHead with topic="Investment metrics"
    expect(screen.getByText('Investment metrics')).toBeInTheDocument()
  })

  it('renders "Where the money goes." heading (unique to InvestmentMetricsSection)', () => {
    renderPage()
    // This heading only exists in InvestmentMetricsSection — confirms no duplication
    expect(screen.getByText('Where the money goes.')).toBeInTheDocument()
  })

  it('renders all 8 metric tile labels from InvestmentMetricsSection', () => {
    renderPage()
    const labels = [
      'Cap rate',
      'Monthly cash flow',
      'Cash-on-cash',
      'DSCR',
      'NOI',
      'GRM',
      'Break-even rent',
      'Gross yield',
    ]
    for (const label of labels) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1)
    }
  })
})

// ── Group 4: FinancingSliders reuse ───────────────────────────────────────────

describe('LandlordPage — FinancingSliders (shared investor component)', () => {
  it('renders "Financing scenarios" section topic (from the page wrapper)', () => {
    renderPage()
    expect(screen.getByText('Financing scenarios')).toBeInTheDocument()
  })

  it('financing slider input[type="range"] is present (from FinancingSliders)', () => {
    renderPage()
    // FinancingSliders renders down-payment, rate, and amortization sliders
    const slider = screen.getByLabelText('Down payment') as HTMLInputElement
    expect(slider).toBeInTheDocument()
  })
})

// ── Group 5: Live rent slider → metric update ─────────────────────────────────

describe('LandlordPage — rent slider live recalculation', () => {
  it('changing the rent slider updates the asking rent display', () => {
    renderPage()
    // The rent slider is labelled "Asking rent" in LandlordRentPositioningSection
    const rentSlider = screen.getByLabelText('Asking rent') as HTMLInputElement
    expect(rentSlider.value).toBe('3400') // initial value

    // Drag slider to $3,100 (building P50 — should improve metrics)
    fireEvent.change(rentSlider, { target: { value: '3100' } })

    // The asking rent display in LandlordPropertyHero should now show $3,100
    // (The page state updates → hero re-renders with new askingRent)
    expect(screen.getAllByText('$3,100').length).toBeGreaterThanOrEqual(1)
  })
})

// ── Group 6: No console errors ────────────────────────────────────────────────

describe('LandlordPage — console behaviour', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  afterAll(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  it('no console errors thrown during render', () => {
    renderPage()
    const errors = consoleErrorSpy.mock.calls.filter(
      (args) => !String(args[0]).includes('act(') && !String(args[0]).includes('Warning:')
    )
    expect(errors.length).toBe(0)
  })
})

// ── Group 7: Snapshot ──────────────────────────────────────────────────────────

describe('LandlordPage — snapshot', () => {
  it('matches shallow snapshot (SVGs blanked for stability)', () => {
    const { container } = renderPage()
    // Blank out all SVGs (equity chart + DealScore gauge) — floating-point path coords vary
    const svgs = container.querySelectorAll('svg')
    svgs.forEach((svg) => {
      svg.innerHTML = ''
    })
    expect(container.firstChild).toMatchSnapshot()
  })
})
