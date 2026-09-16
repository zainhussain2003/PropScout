/**
 * PBCashOutflowSection — unit tests (D-114: "Estimated monthly cash outflow")
 *
 * PR6 · Personal Buyer report component tests
 * Test file path: Week3-4 Front end/PR6/pbTrueCostSection.test.tsx
 *
 * Row structure (post-FIX-2):
 *   Mortgage · Property tax · Condo fee · Insurance
 *   Utilities (collapsed total)
 *     Hydro · Gas · Water · Internet  (indented sub-rows)
 *   Maintenance reserve
 *   ─── Total ───
 *
 * Burlington (condoFeeMonthly=0, semi-detached) has no Condo fee row.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PBCashOutflowSection } from '../../apps/web/src/components/personal/PBCashOutflowSection'
import { PB_PROPERTY, computeMonthlyCost } from '../../apps/web/src/data/personalBuyerData'
import { computeMonthlyPayment } from '../../apps/web/src/lib/investorCalc'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FINANCING = {
  downPct: PB_PROPERTY.defaultDownPct, // 0.20
  rate: PB_PROPERTY.defaultRate, // 0.0479
  amort: PB_PROPERTY.defaultAmort, // 25
}

const MONTHLY = computeMonthlyCost(PB_PROPERTY, FINANCING)

// Pre-compute expected mortgage for assertion (principal = 875000 * 0.80 = 700000)
const EXPECTED_MORTGAGE = computeMonthlyPayment(700000, 0.0479, 25)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PBCashOutflowSection', () => {
  it('renders the §01 section marker', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    // SectionHead splits "§" and "01" as sibling text nodes — no element has sole text "01".
    // Query the section topic text instead.
    expect(screen.getAllByText(/estimated monthly cash outflow/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Estimated monthly cash outflow" as the section topic, never "true monthly cost" (D-114)', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getAllByText(/estimated monthly cash outflow/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/true monthly cost/i)).not.toBeInTheDocument()
  })

  it('every row says where its figure came from, and the modelled share is computed from the rows', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getAllByText('Calculated').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Estimated').length).toBeGreaterThanOrEqual(5)
    // Burlington's tax is listed, so it is not modelled; insurance, utilities
    // and maintenance are.
    const modelled = MONTHLY.insurance + MONTHLY.utilities.total + MONTHLY.maintenance
    const share = Math.round((modelled / MONTHLY.total) * 100)
    expect(screen.getByTestId('modelled-share')).toHaveTextContent(
      `$${Math.round(modelled).toLocaleString('en-CA')} (${share}%) based on modelled assumptions`
    )
  })

  it('a city-rate tax estimate counts toward the modelled share; a listed one does not', () => {
    const { rerender } = render(
      <PBCashOutflowSection
        property={{ ...PB_PROPERTY, annualTaxesKnown: false }}
        monthly={MONTHLY}
      />
    )
    expect(screen.getByText(/from the municipal rate/)).toBeInTheDocument()
    const withTax = screen.getByTestId('modelled-share').textContent
    rerender(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText(/as listed/)).toBeInTheDocument()
    expect(screen.getByTestId('modelled-share').textContent).not.toBe(withTax)
  })

  it('an address-entered property labels its stated facts as yours', () => {
    render(
      <PBCashOutflowSection property={{ ...PB_PROPERTY, factsEntered: true }} monthly={MONTHLY} />
    )
    expect(screen.getByText('You entered')).toBeInTheDocument()
    expect(screen.getByText(/as you entered it/)).toBeInTheDocument()
  })

  it('renders "Mortgage" top-level line item', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Mortgage')).toBeInTheDocument()
  })

  it('renders "Property tax" top-level line item', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Property tax')).toBeInTheDocument()
  })

  it('omits the "Condo fee" row on a freehold house with no fee (Burlington semi)', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.queryByText('Condo fee')).not.toBeInTheDocument()
    expect(screen.queryByText('$0')).not.toBeInTheDocument()
  })

  it('keeps the "Condo fee" row for a condo whose fee the listing did not state, and says so', () => {
    render(
      <PBCashOutflowSection
        property={{ ...PB_PROPERTY, propertyType: 'Condo apartment' }}
        monthly={MONTHLY}
      />
    )
    expect(screen.getByText('Condo fee')).toBeInTheDocument()
    expect(screen.getByText(/not listed · confirm the fee/)).toBeInTheDocument()
  })

  it('shows the fee when one is known, whatever the property type', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={{ ...MONTHLY, condo: 412 }} />)
    expect(screen.getByText('Condo fee')).toBeInTheDocument()
    expect(screen.getByText('$412')).toBeInTheDocument()
  })

  it('renders "Insurance" top-level line item', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Insurance')).toBeInTheDocument()
  })

  it('renders "Utilities" as a single collapsed top-level row', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Utilities')).toBeInTheDocument()
  })

  it('renders "Hydro" as an indented utility sub-row', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Hydro')).toBeInTheDocument()
  })

  it('renders "Gas" as an indented utility sub-row', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Gas')).toBeInTheDocument()
  })

  it('renders "Water" as an indented utility sub-row', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Water')).toBeInTheDocument()
  })

  it('renders "Internet" as an indented utility sub-row', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Internet')).toBeInTheDocument()
  })

  it('renders "Maintenance reserve" bottom-level line item', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Maintenance reserve')).toBeInTheDocument()
  })

  it('Burlington total ≈ sum of all 9 cost items (condo=$0)', () => {
    const computedTotal = Math.round(
      MONTHLY.mortgage +
        MONTHLY.tax +
        MONTHLY.condo + // $0 for Burlington
        MONTHLY.insurance +
        MONTHLY.utilities.hydro +
        MONTHLY.utilities.gas +
        MONTHLY.utilities.water +
        MONTHLY.utilities.internet +
        MONTHLY.maintenance
    )
    expect(Math.abs(MONTHLY.total - computedTotal)).toBeLessThanOrEqual(1)
  })

  it('maintenance reserve note matches pre-1980 build (Burlington yearBuilt=1972 → 1.5%/yr)', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    // maintenanceNote(1972) → '1.5% of value / yr · pre-1980 build'
    expect(screen.getByText(/1\.5% of value \/ yr · pre-1980 build/)).toBeInTheDocument()
  })

  it('the highlighted total row is labelled "Estimated monthly cash outflow"', () => {
    render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getAllByText(/estimated monthly cash outflow/i).length).toBeGreaterThanOrEqual(2)
  })

  it('total monthly cost shown in the verdict is > $3,500 (Burlington semi-detached sanity)', () => {
    // 875k at 20% down, 4.79%, 25yr + taxes + maintenance — must exceed $3,500/mo
    expect(MONTHLY.total).toBeGreaterThan(3500)
  })

  it('mortgage value matches computeMonthlyPayment(700000, 0.0479, 25)', () => {
    expect(Math.abs(MONTHLY.mortgage - EXPECTED_MORTGAGE)).toBeLessThanOrEqual(1)
  })

  it('matches snapshot', () => {
    const { container } = render(<PBCashOutflowSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
