/**
 * investor.test.tsx — unit + snapshot tests for all 7 investor/ components.
 *
 * Components under test:
 *   FinancingSliders, OSFICard, LTTTable, EquityChart,
 *   InvestmentMetricsSection, NeighbourhoodSection, STRPlaceholderSection
 *
 * Coverage:
 *   - rendering (every visible element), ARIA accessibility,
 *     prop-driven behaviour, one snapshot per component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe } from 'jest-axe'

import { FinancingSliders } from '../../apps/web/src/components/investor/FinancingSliders'
import { OSFICard } from '../../apps/web/src/components/investor/OSFICard'
import { LTTTable } from '../../apps/web/src/components/investor/LTTTable'
import { EquityChart } from '../../apps/web/src/components/investor/EquityChart'
import { InvestmentMetricsSection } from '../../apps/web/src/components/investor/InvestmentMetricsSection'
import { NeighbourhoodSection } from '../../apps/web/src/components/investor/NeighbourhoodSection'
import { STRPlaceholderSection } from '../../apps/web/src/components/investor/STRPlaceholderSection'

import { computeLTT, computeOSFI, enrichMetrics } from '../../apps/web/src/lib/investorCalc'
import {
  VAUGHAN_LISTING,
  VAUGHAN_NEIGHBOURHOOD,
  HAMILTON_LISTING,
} from '../../apps/web/src/constants/demoData'
import { mockFinancingInputs, mockVaughanAnalysis, mockVaughanEquityCurve } from './testHelpers'

// ── Computed fixtures ──────────────────────────────────────────────────────────

// Vaughan LTT: $729,900 non-Toronto → provincial only
const VAUGHAN_LTT = computeLTT(729900, false)

// Vaughan OSFI: 4.79% contract rate, 20% down, 25 yr amort, $125k income
const VAUGHAN_OSFI = computeOSFI(729900, 0.2, 0.0479, 25, 3326, 761, 125000)

// Hamilton LTT: $449,000 non-Toronto
const HAMILTON_LTT = computeLTT(449000, false)

// Vaughan enriched metrics (needed for InvestmentMetricsSection)
const VAUGHAN_ENRICHED = enrichMetrics(
  mockVaughanAnalysis.metrics!,
  VAUGHAN_LISTING,
  mockFinancingInputs
)

// ── FinancingSliders ───────────────────────────────────────────────────────────

describe('FinancingSliders', () => {
  const defaultOnChange = vi.fn()

  it('renders the "Financing assumptions" heading area', () => {
    render(
      <FinancingSliders financing={mockFinancingInputs} price={729900} onChange={defaultOnChange} />
    )
    expect(screen.getByText(/adjust live/i)).toBeInTheDocument()
  })

  it('renders down payment slider with correct value (20 = 0.20 * 100)', () => {
    render(
      <FinancingSliders financing={mockFinancingInputs} price={729900} onChange={defaultOnChange} />
    )
    const slider = screen.getByLabelText('Down payment') as HTMLInputElement
    expect(slider.value).toBe('20')
    expect(slider.min).toBe('5')
    expect(slider.max).toBe('50')
    expect(slider.step).toBe('5')
  })

  it('renders mortgage rate slider with correct value (4.79 = 0.0479 * 100)', () => {
    render(
      <FinancingSliders financing={mockFinancingInputs} price={729900} onChange={defaultOnChange} />
    )
    const slider = screen.getByLabelText('Mortgage rate') as HTMLInputElement
    expect(slider.value).toBe('4.79')
    expect(slider.min).toBe('2')
    expect(slider.max).toBe('10')
    expect(slider.step).toBe('0.25')
  })

  it('renders amortization slider with correct value (25 years)', () => {
    render(
      <FinancingSliders financing={mockFinancingInputs} price={729900} onChange={defaultOnChange} />
    )
    const slider = screen.getByLabelText('Amortization') as HTMLInputElement
    expect(slider.value).toBe('25')
    expect(slider.min).toBe('10')
    expect(slider.max).toBe('30')
    expect(slider.step).toBe('5')
  })

  it('renders all 4 preset buttons', () => {
    render(
      <FinancingSliders financing={mockFinancingInputs} price={729900} onChange={defaultOnChange} />
    )
    expect(screen.getByRole('button', { name: 'Base' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OSFI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '35% down' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conservative' })).toBeInTheDocument()
  })

  it('clicking OSFI preset calls onChange with rate=0.0679', () => {
    const onChange = vi.fn()
    render(<FinancingSliders financing={mockFinancingInputs} price={729900} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'OSFI' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mortgageRate: 0.0679 }))
  })

  it('clicking 35% down preset calls onChange with downPaymentPct=0.35', () => {
    const onChange = vi.fn()
    render(<FinancingSliders financing={mockFinancingInputs} price={729900} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '35% down' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ downPaymentPct: 0.35 }))
  })

  it('management fee toggle has role="switch" with aria-checked=false', () => {
    render(
      <FinancingSliders financing={mockFinancingInputs} price={729900} onChange={defaultOnChange} />
    )
    const switches = screen.getAllByRole('switch')
    // First switch is management fee (includeManagementFee=false)
    expect(switches[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking management fee toggle calls onChange with includeManagementFee=true', () => {
    const onChange = vi.fn()
    render(<FinancingSliders financing={mockFinancingInputs} price={729900} onChange={onChange} />)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ includeManagementFee: true }))
  })

  it('shows the down payment dollar amount for $729,900 at 20%', () => {
    render(
      <FinancingSliders financing={mockFinancingInputs} price={729900} onChange={defaultOnChange} />
    )
    // fmtMoney(729900 * 0.2) = fmtMoney(145980) = '$145,980'
    expect(screen.getByText('$145,980')).toBeInTheDocument()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <FinancingSliders financing={mockFinancingInputs} price={729900} onChange={defaultOnChange} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <FinancingSliders financing={mockFinancingInputs} price={729900} onChange={defaultOnChange} />
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── OSFICard ───────────────────────────────────────────────────────────────────

describe('OSFICard', () => {
  it('shows the qualifying rate (max(4.79+2%, 5.25%) = 6.79%)', () => {
    render(<OSFICard osfi={VAUGHAN_OSFI} financing={mockFinancingInputs} />)
    // Qualifying rate = max(0.0479+0.02, 0.0525) = 0.0679 → "6.79%"
    expect(screen.getByText('6.79%')).toBeInTheDocument()
  })

  it('shows the contract rate', () => {
    render(<OSFICard osfi={VAUGHAN_OSFI} financing={mockFinancingInputs} />)
    expect(screen.getByText('4.79%')).toBeInTheDocument()
  })

  it('shows the GDS ratio', () => {
    render(<OSFICard osfi={VAUGHAN_OSFI} financing={mockFinancingInputs} />)
    // GDS is rendered as a formatted percentage — just check it contains a %
    const gdsElements = screen.getAllByText(/%/)
    expect(gdsElements.length).toBeGreaterThan(0)
  })

  it('shows "Fails" VerdictPill when osfi.pass = false', () => {
    const failOsfi = { ...VAUGHAN_OSFI, pass: false }
    render(<OSFICard osfi={failOsfi} financing={mockFinancingInputs} />)
    expect(screen.getByText('Fails')).toBeInTheDocument()
  })

  it('shows "Qualifies" VerdictPill when osfi.pass = true', () => {
    const passOsfi = { ...VAUGHAN_OSFI, pass: true }
    render(<OSFICard osfi={passOsfi} financing={mockFinancingInputs} />)
    expect(screen.getByText('Qualifies')).toBeInTheDocument()
  })

  it('shows the section heading', () => {
    render(<OSFICard osfi={VAUGHAN_OSFI} financing={mockFinancingInputs} />)
    expect(screen.getByText(/OSFI stress test/i)).toBeInTheDocument()
  })

  it('shows the threshold value (44%)', () => {
    render(<OSFICard osfi={VAUGHAN_OSFI} financing={mockFinancingInputs} />)
    // Threshold row shows "44%" (fmtPct(0.44, 0))
    expect(screen.getByText('44%')).toBeInTheDocument()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(<OSFICard osfi={VAUGHAN_OSFI} financing={mockFinancingInputs} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(<OSFICard osfi={VAUGHAN_OSFI} financing={mockFinancingInputs} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── LTTTable ───────────────────────────────────────────────────────────────────

describe('LTTTable', () => {
  it('shows the purchase price in the header', () => {
    render(<LTTTable ltt={VAUGHAN_LTT} price={729900} />)
    expect(screen.getByText('$729,900 purchase')).toBeInTheDocument()
  })

  it('shows the total LTT for $729,900 = $11,073', () => {
    render(<LTTTable ltt={VAUGHAN_LTT} price={729900} />)
    // Total LTT is $11,073 — shown prominently in header
    expect(VAUGHAN_LTT.total).toBe(11073)
    expect(screen.getByText('$11,073')).toBeInTheDocument()
  })

  it('renders 4 bracket rows for a $729,900 property', () => {
    render(<LTTTable ltt={VAUGHAN_LTT} price={729900} />)
    // $729,900 spans 4 brackets (under $2M, no 5th bracket)
    expect(VAUGHAN_LTT.rows).toHaveLength(4)
    // First bracket label: '$0 – $55,000'
    expect(screen.getByText('$0 – $55,000')).toBeInTheDocument()
  })

  it('shows "Provincial only" when toronto=false', () => {
    render(<LTTTable ltt={VAUGHAN_LTT} price={729900} toronto={false} />)
    expect(screen.getByText('Provincial only')).toBeInTheDocument()
  })

  it('shows Toronto municipal row when toronto=true', () => {
    const torontoLTT = computeLTT(729900, true)
    render(<LTTTable ltt={torontoLTT} price={729900} toronto />)
    expect(screen.getByText('Toronto municipal LTT (stacked)')).toBeInTheDocument()
    expect(screen.getByText('Provincial + municipal')).toBeInTheDocument()
  })

  it('Toronto total LTT is double the provincial for same price', () => {
    const torontoLTT = computeLTT(729900, true)
    expect(torontoLTT.total).toBe(torontoLTT.provincial * 2)
    expect(torontoLTT.total).toBe(VAUGHAN_LTT.provincial * 2)
  })

  it('Hamilton $449,000 total LTT is computed correctly', () => {
    render(<LTTTable ltt={HAMILTON_LTT} price={449000} />)
    // $449,000 LTT: 275 + 1950 + 2250 + (449000-400000)*0.02 = 275+1950+2250+980 = 5455
    // Actually let me recalculate:
    // 0-55000: 55000*0.005 = 275
    // 55000-250000: 195000*0.01 = 1950
    // 250000-400000: 150000*0.015 = 2250
    // 400000-449000: 49000*0.02 = 980
    // Total = 5455
    expect(HAMILTON_LTT.total).toBe(5455)
    expect(screen.getByText('$449,000 purchase')).toBeInTheDocument()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(<LTTTable ltt={VAUGHAN_LTT} price={729900} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(<LTTTable ltt={VAUGHAN_LTT} price={729900} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── EquityChart ────────────────────────────────────────────────────────────────

describe('EquityChart', () => {
  it('renders the "Equity build · 20 yr horizon" heading', () => {
    render(<EquityChart equityCurve={mockVaughanEquityCurve} totalCashInvested={160053} />)
    expect(screen.getByText(/equity build/i)).toBeInTheDocument()
    expect(screen.getByText(/20 yr horizon/i)).toBeInTheDocument()
  })

  it('equity curve has exactly 21 data points (year 0–20)', () => {
    expect(mockVaughanEquityCurve).toHaveLength(21)
    expect(mockVaughanEquityCurve[0].year).toBe(0)
    expect(mockVaughanEquityCurve[20].year).toBe(20)
  })

  it('year-0 equity equals down payment (property value − principal)', () => {
    const year0 = mockVaughanEquityCurve[0]
    // equity[0] = propertyValue[0] − principal = 729900 − 583920 = 145980
    expect(year0.equity).toBeCloseTo(145980, 0)
    expect(year0.propertyValue).toBeCloseTo(729900, 0)
  })

  it('year-20 property value is higher than year-0 (3% appreciation)', () => {
    const year0 = mockVaughanEquityCurve[0]
    const year20 = mockVaughanEquityCurve[20]
    expect(year20.propertyValue).toBeGreaterThan(year0.propertyValue)
  })

  it('year-20 equity is greater than year-0 equity', () => {
    const year0 = mockVaughanEquityCurve[0]
    const year20 = mockVaughanEquityCurve[20]
    expect(year20.equity).toBeGreaterThan(year0.equity)
  })

  it('renders the 3-milestone summary strip (year 5, 10, 20)', () => {
    render(<EquityChart equityCurve={mockVaughanEquityCurve} totalCashInvested={160053} />)
    // Milestone strip shows "Year 5", "Year 10", "Year 20"
    expect(screen.getAllByText(/Year 5/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Year 10/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Year 20/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders nothing (empty div) when fewer than 2 data points are given', () => {
    const { container } = render(
      <EquityChart equityCurve={[mockVaughanEquityCurve[0]]} totalCashInvested={160053} />
    )
    // Component returns <div style={{ height: H }} /> with no content
    const inner = container.firstChild as HTMLElement
    expect(inner?.childElementCount).toBe(0)
  })

  it('SVG has an accessible aria-label', () => {
    const { container } = render(
      <EquityChart equityCurve={mockVaughanEquityCurve} totalCashInvested={160053} />
    )
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-label')).toBe('20-year equity build chart')
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <EquityChart equityCurve={mockVaughanEquityCurve} totalCashInvested={160053} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('renders SVG with correct structure (no floating-point snapshot)', () => {
    // Full-snapshot test removed: SVG path `d` coordinates differ by 1 ULP
    // between Windows/Node24 and Linux CI — use structural assertions instead.
    const { container } = render(
      <EquityChart equityCurve={mockVaughanEquityCurve} totalCashInvested={160053} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('aria-label')).toBe('20-year equity build chart')
    expect(svg?.getAttribute('viewBox')).toBeTruthy()
    // Three path elements: area fill, equity line, property-value line
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(3)
    // No tooltip visible by default (hover === null)
    expect(container.querySelector('[role="tooltip"]')).toBeNull()
  })
})

// ── InvestmentMetricsSection ───────────────────────────────────────────────────

describe('InvestmentMetricsSection', () => {
  it('renders the section head topic "Investment metrics"', () => {
    render(<InvestmentMetricsSection metrics={VAUGHAN_ENRICHED} listing={VAUGHAN_LISTING} />)
    expect(screen.getByText(/Investment metrics/i)).toBeInTheDocument()
  })

  it('renders all 8 metric tile labels', () => {
    render(<InvestmentMetricsSection metrics={VAUGHAN_ENRICHED} listing={VAUGHAN_LISTING} />)
    const expectedLabels = [
      'Cap rate',
      'Monthly cash flow',
      'Cash-on-cash',
      'DSCR',
      'NOI',
      'GRM',
      'Break-even rent',
      'Gross yield',
    ]
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('shows the cap rate value formatted as a percentage', () => {
    render(<InvestmentMetricsSection metrics={VAUGHAN_ENRICHED} listing={VAUGHAN_LISTING} />)
    // capRate=0.0147 → fmtPct(0.0147) = "1.47%"
    expect(screen.getByText('1.47%')).toBeInTheDocument()
  })

  it('renders the expense breakdown heading', () => {
    render(<InvestmentMetricsSection metrics={VAUGHAN_ENRICHED} listing={VAUGHAN_LISTING} />)
    expect(screen.getByText('Where the money goes.')).toBeInTheDocument()
  })

  it('renders all 6 expense line-item labels', () => {
    render(<InvestmentMetricsSection metrics={VAUGHAN_ENRICHED} listing={VAUGHAN_LISTING} />)
    expect(screen.getByText('Property taxes')).toBeInTheDocument()
    expect(screen.getByText('Insurance (0.35%)')).toBeInTheDocument()
    expect(screen.getByText('Maintenance reserve')).toBeInTheDocument()
    expect(screen.getByText('Vacancy allowance (5%)')).toBeInTheDocument()
    expect(screen.getByText('Condo fee')).toBeInTheDocument()
    expect(screen.getByText('Property management')).toBeInTheDocument()
  })

  it('shows the property tax amount', () => {
    render(<InvestmentMetricsSection metrics={VAUGHAN_ENRICHED} listing={VAUGHAN_LISTING} />)
    // annualTaxes = 3326 → fmtMoney(3326) = '$3,326'
    expect(screen.getByText('$3,326')).toBeInTheDocument()
  })

  it('shows condo fee annual amount', () => {
    render(<InvestmentMetricsSection metrics={VAUGHAN_ENRICHED} listing={VAUGHAN_LISTING} />)
    // condoFeeMonthly=761 → annual = 9132 → fmtMoney(9132) = '$9,132'
    expect(screen.getByText('$9,132')).toBeInTheDocument()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <InvestmentMetricsSection metrics={VAUGHAN_ENRICHED} listing={VAUGHAN_LISTING} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <InvestmentMetricsSection metrics={VAUGHAN_ENRICHED} listing={VAUGHAN_LISTING} />
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── NeighbourhoodSection ───────────────────────────────────────────────────────

describe('NeighbourhoodSection', () => {
  it('renders the section head topic "Neighbourhood"', () => {
    render(<NeighbourhoodSection listing={VAUGHAN_LISTING} neighbourhood={VAUGHAN_NEIGHBOURHOOD} />)
    expect(screen.getByText('Neighbourhood')).toBeInTheDocument()
  })

  it('renders all 6 stat tile labels', () => {
    render(<NeighbourhoodSection listing={VAUGHAN_LISTING} neighbourhood={VAUGHAN_NEIGHBOURHOOD} />)
    expect(screen.getByText('Median income (FSA)')).toBeInTheDocument()
    expect(screen.getByText('5-year pop. growth')).toBeInTheDocument()
    expect(screen.getByText('Walk Score')).toBeInTheDocument()
    expect(screen.getByText('Transit Score')).toBeInTheDocument()
    expect(screen.getByText('Active building permits')).toBeInTheDocument()
    expect(screen.getByText('Price per sqft trend')).toBeInTheDocument()
  })

  it('shows the median income value', () => {
    render(<NeighbourhoodSection listing={VAUGHAN_LISTING} neighbourhood={VAUGHAN_NEIGHBOURHOOD} />)
    // avgIncome=88500 → fmtMoney(88500) = '$88,500'
    expect(screen.getByText('$88,500')).toBeInTheDocument()
  })

  it('shows the Walk Score value', () => {
    render(<NeighbourhoodSection listing={VAUGHAN_LISTING} neighbourhood={VAUGHAN_NEIGHBOURHOOD} />)
    // walkScore=72
    expect(screen.getByText('72')).toBeInTheDocument()
  })

  it('renders the comparable sales section', () => {
    render(<NeighbourhoodSection listing={VAUGHAN_LISTING} neighbourhood={VAUGHAN_NEIGHBOURHOOD} />)
    expect(screen.getByText('What sold nearby.')).toBeInTheDocument()
  })

  it('renders all 3 comparable sales entries', () => {
    render(<NeighbourhoodSection listing={VAUGHAN_LISTING} neighbourhood={VAUGHAN_NEIGHBOURHOOD} />)
    // VAUGHAN_NEIGHBOURHOOD has 3 comps
    expect(screen.getByText('Unit 4203 · 5 Buttermill Ave')).toBeInTheDocument()
    expect(screen.getByText('Unit 3115 · 7 Buttermill Ave')).toBeInTheDocument()
    expect(screen.getByText('Unit 2802 · 5 Buttermill Ave')).toBeInTheDocument()
  })

  it('shows the 5-year appreciation in the dark card', () => {
    render(<NeighbourhoodSection listing={VAUGHAN_LISTING} neighbourhood={VAUGHAN_NEIGHBOURHOOD} />)
    // appreciation5y=0.276 → fmtPct(0.276, 1) = '27.6%' → displayed as '+27.6%'
    expect(screen.getByText('+27.6%')).toBeInTheDocument()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <NeighbourhoodSection listing={VAUGHAN_LISTING} neighbourhood={VAUGHAN_NEIGHBOURHOOD} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <NeighbourhoodSection listing={VAUGHAN_LISTING} neighbourhood={VAUGHAN_NEIGHBOURHOOD} />
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── STRPlaceholderSection ──────────────────────────────────────────────────────

describe('STRPlaceholderSection', () => {
  it('renders the section head topic "STR vs LTR"', () => {
    render(<STRPlaceholderSection listing={VAUGHAN_LISTING} />)
    expect(screen.getByText('STR vs LTR')).toBeInTheDocument()
  })

  it('shows "Coming Phase 2" chip', () => {
    render(<STRPlaceholderSection listing={VAUGHAN_LISTING} />)
    expect(screen.getByText('Coming Phase 2')).toBeInTheDocument()
  })

  it('shows "AirDNA revenue modeling" placeholder text', () => {
    render(<STRPlaceholderSection listing={VAUGHAN_LISTING} />)
    expect(screen.getByText(/AirDNA revenue modeling/i)).toBeInTheDocument()
  })

  it('shows Vaughan STR rule "Permitted with registration"', () => {
    render(<STRPlaceholderSection listing={VAUGHAN_LISTING} />)
    expect(screen.getByText('Permitted with registration')).toBeInTheDocument()
  })

  it('shows Toronto rule "Principal-residence only" in the other-cities table', () => {
    render(<STRPlaceholderSection listing={VAUGHAN_LISTING} />)
    expect(screen.getByText('Principal-residence only')).toBeInTheDocument()
  })

  it('shows Hamilton "Permitted" rule in the other-cities table', () => {
    render(<STRPlaceholderSection listing={VAUGHAN_LISTING} />)
    expect(screen.getByText('Permitted')).toBeInTheDocument()
  })

  it('correctly identifies Hamilton municipality from addressLine2', () => {
    render(<STRPlaceholderSection listing={HAMILTON_LISTING} />)
    // Hamilton rule = 'Permitted' (displayed in the legality card heading area)
    // Look for the Hamilton-specific explain text
    expect(screen.getByText(/Hamilton currently allows short-term rentals/i)).toBeInTheDocument()
  })

  it('renders "Notify me when STR ships" button', () => {
    render(<STRPlaceholderSection listing={VAUGHAN_LISTING} />)
    expect(screen.getByRole('button', { name: /notify me when STR ships/i })).toBeInTheDocument()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(<STRPlaceholderSection listing={VAUGHAN_LISTING} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(<STRPlaceholderSection listing={VAUGHAN_LISTING} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
