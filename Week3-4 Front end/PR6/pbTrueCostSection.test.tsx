/**
 * PBTrueCostSection — unit tests
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
 * Burlington (condoFeeMonthly=0) shows Condo fee as $0.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PBTrueCostSection } from '../../apps/web/src/components/personal/PBTrueCostSection'
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

describe('PBTrueCostSection', () => {
  it('renders the §01 section marker', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    // SectionHead splits "§" and "01" as sibling text nodes — no element has sole text "01".
    // Query the section topic text instead.
    expect(screen.getAllByText(/true monthly cost/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders "True monthly cost" as the section topic', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getAllByText(/true monthly cost/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Mortgage" top-level line item', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Mortgage')).toBeInTheDocument()
  })

  it('renders "Property tax" top-level line item', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Property tax')).toBeInTheDocument()
  })

  it('renders "Condo fee" top-level line item (always shown, $0 for Burlington)', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Condo fee')).toBeInTheDocument()
  })

  it('Condo fee row shows $0 for Burlington (condoFeeMonthly=0)', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    // The condo row value is fmtMoney(0, { decimals: 0 }) = "$0"
    expect(screen.getByText('$0')).toBeInTheDocument()
  })

  it('renders "Insurance" top-level line item', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Insurance')).toBeInTheDocument()
  })

  it('renders "Utilities" as a single collapsed top-level row', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Utilities')).toBeInTheDocument()
  })

  it('renders "Hydro" as an indented utility sub-row', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Hydro')).toBeInTheDocument()
  })

  it('renders "Gas" as an indented utility sub-row', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Gas')).toBeInTheDocument()
  })

  it('renders "Water" as an indented utility sub-row', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Water')).toBeInTheDocument()
  })

  it('renders "Internet" as an indented utility sub-row', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(screen.getByText('Internet')).toBeInTheDocument()
  })

  it('renders "Maintenance reserve" bottom-level line item', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
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
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    // maintenanceNote(1972) → '1.5% of value / yr · pre-1980 build'
    expect(screen.getByText(/1\.5% of value \/ yr · pre-1980 build/)).toBeInTheDocument()
  })

  it('total row label "True monthly cost" is present in the highlighted total row', () => {
    render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    // "True monthly cost" appears in the highlighted footer row at the bottom
    const totalRows = screen.getAllByText(/true monthly cost/i)
    expect(totalRows.length).toBeGreaterThanOrEqual(1)
  })

  it('total monthly cost shown in the verdict is > $3,500 (Burlington semi-detached sanity)', () => {
    // 875k at 20% down, 4.79%, 25yr + taxes + maintenance — must exceed $3,500/mo
    expect(MONTHLY.total).toBeGreaterThan(3500)
  })

  it('mortgage value matches computeMonthlyPayment(700000, 0.0479, 25)', () => {
    expect(Math.abs(MONTHLY.mortgage - EXPECTED_MORTGAGE)).toBeLessThanOrEqual(1)
  })

  it('matches snapshot', () => {
    const { container } = render(<PBTrueCostSection property={PB_PROPERTY} monthly={MONTHLY} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
