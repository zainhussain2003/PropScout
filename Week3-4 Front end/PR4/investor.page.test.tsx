/**
 * investor.page.test.tsx — integration tests for the InvestorReport page.
 *
 * Mocks useInvestorReport to control render state (loading / error / loaded).
 * Tests that all 11 sections appear when metrics are available, that the
 * loading and error states render the correct UI, and that user interactions
 * (dark mode toggle, due-diligence checkboxes) work correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { InvestorReport } from '../../apps/web/src/pages/InvestorReport'
import type {
  ComputedInvestorMetrics,
  DealScoreData,
  FinancingInputs,
} from '../../apps/web/src/types/analysis'
import { enrichMetrics, toDealScoreData } from '../../apps/web/src/lib/investorCalc'
import { VAUGHAN_LISTING } from '../../apps/web/src/constants/demoData'
import { mockVaughanAnalysis, mockFinancingInputs } from './testHelpers'

// ── Mock useInvestorReport ─────────────────────────────────────────────────────

vi.mock('../../apps/web/src/hooks/useInvestorReport', () => ({
  useInvestorReport: vi.fn(),
}))

// Import the mocked hook so we can configure it per-test
import { useInvestorReport } from '../../apps/web/src/hooks/useInvestorReport'

const mockedUseInvestorReport = vi.mocked(useInvestorReport)

// ── Precomputed loaded state ───────────────────────────────────────────────────

const loadedMetrics: ComputedInvestorMetrics = enrichMetrics(
  mockVaughanAnalysis.metrics!,
  VAUGHAN_LISTING,
  mockFinancingInputs
)

const loadedDealScore: DealScoreData = toDealScoreData(mockVaughanAnalysis.dealScore!)

const loadedFinancing: FinancingInputs = { ...mockFinancingInputs }

const mockUpdateFinancing = vi.fn()

function makeLoadedState() {
  return {
    loading: false,
    error: null,
    financing: loadedFinancing,
    metrics: loadedMetrics,
    dealScore: loadedDealScore,
    updateFinancing: mockUpdateFinancing,
  }
}

// ── Render helper ─────────────────────────────────────────────────────────────

function renderInvestorReport() {
  return render(
    <MemoryRouter>
      <InvestorReport />
    </MemoryRouter>
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('InvestorReport page — loading state', () => {
  beforeEach(() => {
    mockedUseInvestorReport.mockReturnValue({
      loading: true,
      error: null,
      financing: loadedFinancing,
      metrics: null,
      dealScore: null,
      updateFinancing: mockUpdateFinancing,
    })
  })

  it('renders "Running analysis" loading label', () => {
    renderInvestorReport()
    expect(screen.getByText(/running analysis/i)).toBeInTheDocument()
  })

  it('renders "Calculating investment metrics" sub text', () => {
    renderInvestorReport()
    expect(screen.getByText(/calculating investment metrics/i)).toBeInTheDocument()
  })

  it('does NOT render the PropertyHero section while loading', () => {
    renderInvestorReport()
    expect(screen.queryByText('Unit 5702 · 5 Buttermill Avenue')).not.toBeInTheDocument()
  })

  it('does NOT render section §01 while loading', () => {
    renderInvestorReport()
    // Use exact case-sensitive match to target only the §01 SectionHead topic span.
    // The regex /investment metrics/i was too broad — it also matched the loading state
    // paragraph "Calculating investment metrics…", causing a false failure.
    expect(screen.queryByText('Investment metrics')).not.toBeInTheDocument()
  })
})

describe('InvestorReport page — error state', () => {
  const errorMessage = 'Analysis failed — please try again.'

  beforeEach(() => {
    mockedUseInvestorReport.mockReturnValue({
      loading: false,
      error: errorMessage,
      financing: loadedFinancing,
      metrics: null,
      dealScore: null,
      updateFinancing: mockUpdateFinancing,
    })
  })

  it('renders the error heading', () => {
    renderInvestorReport()
    expect(screen.getByText('Analysis failed')).toBeInTheDocument()
  })

  it('renders the error message text', () => {
    renderInvestorReport()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('renders a "Try again" button', () => {
    renderInvestorReport()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('does NOT render section §01 in error state', () => {
    renderInvestorReport()
    expect(screen.queryByText(/investment metrics/i)).not.toBeInTheDocument()
  })
})

describe('InvestorReport page — loaded state (Vaughan / hard pass)', () => {
  beforeEach(() => {
    mockedUseInvestorReport.mockReturnValue(makeLoadedState())
    // Reset mock call count between tests
    mockUpdateFinancing.mockReset()
  })

  it('renders the Nav with report variant (contains wordmark)', () => {
    renderInvestorReport()
    // Nav contains the "Investor report" label
    expect(screen.getByText(/investor report/i)).toBeInTheDocument()
  })

  it('renders the property address in the hero section', () => {
    renderInvestorReport()
    expect(screen.getByText('Unit 5702 · 5 Buttermill Avenue')).toBeInTheDocument()
  })

  it('renders the deal score gauge with score 8', () => {
    renderInvestorReport()
    expect(screen.getByLabelText('Deal score: 8 out of 95')).toBeInTheDocument()
  })

  it('renders the "Hard pass" verdict label', () => {
    renderInvestorReport()
    // Multiple occurrences expected (hero card + AI verdict area)
    const elements = screen.getAllByText('Hard pass')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('renders §01 Investment metrics section', () => {
    renderInvestorReport()
    expect(screen.getByText('Investment metrics')).toBeInTheDocument()
    expect(screen.getByText(/does the deal/i)).toBeInTheDocument()
  })

  it('renders §02 Financing scenarios section', () => {
    renderInvestorReport()
    expect(screen.getByText('Financing scenarios')).toBeInTheDocument()
  })

  it('renders §03 Rental comps section', () => {
    renderInvestorReport()
    expect(screen.getByText('Rental comps')).toBeInTheDocument()
  })

  it('renders §04 Cash to close section', () => {
    renderInvestorReport()
    expect(screen.getByText('Cash to close')).toBeInTheDocument()
  })

  it('renders §05 OSFI stress test section', () => {
    renderInvestorReport()
    // "OSFI stress test" appears in 3 places: SectionHead topic, OSFICard header
    // label, and the Footer link. getAllByText is correct here — multiple occurrences
    // are expected by design (section label + card header + footer nav).
    expect(screen.getAllByText('OSFI stress test').length).toBeGreaterThanOrEqual(1)
  })

  it('renders §06 Risk flags section', () => {
    renderInvestorReport()
    expect(screen.getByText('Risk flags')).toBeInTheDocument()
  })

  it('renders §07 Equity build section', () => {
    renderInvestorReport()
    expect(screen.getByText('Equity build')).toBeInTheDocument()
  })

  it('renders §08 Neighbourhood section', () => {
    renderInvestorReport()
    expect(screen.getByText('Neighbourhood')).toBeInTheDocument()
  })

  it('renders §09 SunScout placeholder section', () => {
    renderInvestorReport()
    // "SunScout" appears in both the SectionHead topic span and the Footer product
    // link. getAllByText is required — multiple occurrences are expected by design.
    expect(screen.getAllByText('SunScout').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/solar path analysis/i)).toBeInTheDocument()
  })

  it('renders §10 STR analysis placeholder section', () => {
    renderInvestorReport()
    expect(screen.getByText('STR vs LTR')).toBeInTheDocument()
  })

  it('renders §11 Due diligence checklist section', () => {
    renderInvestorReport()
    expect(screen.getByText('Due diligence')).toBeInTheDocument()
  })

  it('shows the cap rate value in §01', () => {
    renderInvestorReport()
    // capRate=0.0147 → fmtPct(0.0147, 2) = '1.47%'
    // "1.47%" appears in two places: the §01 InvestmentMetricsSection tile AND the
    // PropertyHero sticky card key metrics row. getAllByText is required.
    expect(screen.getAllByText('1.47%').length).toBeGreaterThanOrEqual(1)
  })

  it('shows the LTT total $11,073 in §04', () => {
    renderInvestorReport()
    const lttElements = screen.getAllByText('$11,073')
    expect(lttElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows the AI verdict block with eyebrow "Scout AI · investor verdict"', () => {
    renderInvestorReport()
    expect(screen.getByText(/Scout AI · investor verdict/i)).toBeInTheDocument()
  })

  it('shows the AIVerdictBlock model tag', () => {
    renderInvestorReport()
    expect(screen.getByText('claude · sonnet 4.6')).toBeInTheDocument()
  })

  it('risk flags for Vaughan (condo fee + cash flow) appear in §06', () => {
    renderInvestorReport()
    // Risk flags come from VAUGHAN_LISTING.riskFlags
    expect(screen.getByText('Condo-fee burden')).toBeInTheDocument()
    expect(screen.getByText('Deeply negative cash flow')).toBeInTheDocument()
  })
})

describe('InvestorReport page — due diligence checklist', () => {
  beforeEach(() => {
    mockedUseInvestorReport.mockReturnValue(makeLoadedState())
  })

  it('renders "0 / 16 complete" initially', () => {
    renderInvestorReport()
    // 4 groups × 4 items = 16 total
    expect(screen.getByText(/0 \/ 16 complete/i)).toBeInTheDocument()
  })

  it('checking an item updates the completion count', () => {
    renderInvestorReport()
    // Find the first checkbox in the due diligence section
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(screen.getByText(/1 \/ 16 complete/i)).toBeInTheDocument()
  })

  it('renders the 4 category headers', () => {
    renderInvestorReport()
    expect(screen.getByText('Title & legal')).toBeInTheDocument()
    expect(screen.getByText('Physical inspection')).toBeInTheDocument()
    expect(screen.getByText('Tenancy & income')).toBeInTheDocument()
    expect(screen.getByText('Financing & insurance')).toBeInTheDocument()
  })
})

describe('InvestorReport page — dark mode toggle', () => {
  beforeEach(() => {
    mockedUseInvestorReport.mockReturnValue(makeLoadedState())
  })

  it('toggles data-theme on <html> when dark mode button is clicked', () => {
    renderInvestorReport()
    // Dark mode toggle is the moon/sun icon button in the Nav
    const toggleBtn = screen.getByRole('button', { name: /dark mode|toggle theme|moon|sun/i })
    expect(toggleBtn).toBeInTheDocument()
    fireEvent.click(toggleBtn)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})

describe('InvestorReport page — financing slider interaction', () => {
  beforeEach(() => {
    mockedUseInvestorReport.mockReturnValue(makeLoadedState())
    mockUpdateFinancing.mockReset()
  })

  it('changing the OSFI preset button calls updateFinancing with rate=0.0679', () => {
    renderInvestorReport()
    fireEvent.click(screen.getByRole('button', { name: 'OSFI' }))
    expect(mockUpdateFinancing).toHaveBeenCalledWith(
      expect.objectContaining({ mortgageRate: 0.0679 })
    )
  })

  it('clicking Base preset calls updateFinancing with default values', () => {
    renderInvestorReport()
    fireEvent.click(screen.getByRole('button', { name: 'Base' }))
    expect(mockUpdateFinancing).toHaveBeenCalledWith(
      expect.objectContaining({ downPaymentPct: 0.2, mortgageRate: 0.0479 })
    )
  })
})

describe('InvestorReport page — snapshot', () => {
  it('matches loaded-state snapshot (Vaughan)', () => {
    mockedUseInvestorReport.mockReturnValue(makeLoadedState())
    const { container } = renderInvestorReport()
    expect(container).toMatchSnapshot()
  })

  it('matches loading-state snapshot', () => {
    mockedUseInvestorReport.mockReturnValue({
      loading: true,
      error: null,
      financing: loadedFinancing,
      metrics: null,
      dealScore: null,
      updateFinancing: mockUpdateFinancing,
    })
    const { container } = renderInvestorReport()
    expect(container).toMatchSnapshot()
  })

  it('matches error-state snapshot', () => {
    mockedUseInvestorReport.mockReturnValue({
      loading: false,
      error: 'Analysis failed — please try again.',
      financing: loadedFinancing,
      metrics: null,
      dealScore: null,
      updateFinancing: mockUpdateFinancing,
    })
    const { container } = renderInvestorReport()
    expect(container).toMatchSnapshot()
  })
})
