/**
 * Paywall wiring — integration tests
 *
 * PR7 · Paywall integration tests
 * Test file path: Week3-4 Front end/PR7/paywallWiring.integration.test.tsx
 *
 * Confirms that all 4 report pages correctly render the free-tier paywall
 * components when tier='free' is provided via PaywallContext.Provider.
 *
 * Asserts per page:
 *   - data-testid="verdict-blur" is present (TruncatedVerdict rendered)
 *   - at least one .pro-badge element is present (LockedButton rendered)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PaywallContext } from '../../apps/web/src/components/paywall/PaywallContext'
import { InvestorReport } from '../../apps/web/src/pages/InvestorReport'
import { TenantReport } from '../../apps/web/src/pages/TenantReport'
import { PersonalBuyerPage } from '../../apps/web/src/pages/PersonalBuyerPage'
import { LandlordPage } from '../../apps/web/src/pages/LandlordPage'

// ── Mock useInvestorReport (required for InvestorReport to render its content) ──

vi.mock('../../apps/web/src/hooks/useInvestorReport', () => ({
  useInvestorReport: vi.fn(),
}))

import { useInvestorReport } from '../../apps/web/src/hooks/useInvestorReport'
import type {
  ComputedInvestorMetrics,
  DealScoreData,
  FinancingInputs,
} from '../../apps/web/src/types/analysis'
import { enrichMetrics, toDealScoreData } from '../../apps/web/src/lib/investorCalc'
import { VAUGHAN_LISTING } from '../../apps/web/src/constants/demoData'
import { mockFinancingInputs, mockVaughanAnalysis } from '../PR4/testHelpers'

const mockedUseInvestorReport = vi.mocked(useInvestorReport)

const loadedMetrics: ComputedInvestorMetrics = enrichMetrics(
  mockVaughanAnalysis.metrics!,
  VAUGHAN_LISTING,
  mockFinancingInputs
)
const loadedDealScore: DealScoreData = toDealScoreData(mockVaughanAnalysis.dealScore!)
const loadedFinancing: FinancingInputs = { ...mockFinancingInputs }

function makeLoadedState() {
  return {
    loading: false,
    error: null,
    financing: loadedFinancing,
    metrics: loadedMetrics,
    dealScore: loadedDealScore,
    updateFinancing: vi.fn(),
  }
}

// ── Shared mock paywall context ────────────────────────────────────────────────

const MOCK_PAYWALL = {
  tier: 'free',
  openUpgradeModal: vi.fn(),
  openHardGate: vi.fn(),
}

function renderWithPaywall(ui: React.ReactElement) {
  return render(
    <PaywallContext.Provider value={MOCK_PAYWALL}>
      <MemoryRouter>{ui}</MemoryRouter>
    </PaywallContext.Provider>
  )
}

// ── InvestorReport ─────────────────────────────────────────────────────────────

describe('paywallWiring — InvestorReport (free tier)', () => {
  beforeEach(() => {
    mockedUseInvestorReport.mockReturnValue(makeLoadedState())
  })

  it('renders data-testid="verdict-blur" (TruncatedVerdict shown)', () => {
    renderWithPaywall(<InvestorReport tier="free" />)
    expect(screen.getByTestId('verdict-blur')).toBeInTheDocument()
  })

  it('renders at least one .pro-badge element (LockedButton shown)', () => {
    const { container } = renderWithPaywall(<InvestorReport tier="free" />)
    expect(container.querySelectorAll('.pro-badge').length).toBeGreaterThanOrEqual(1)
  })
})

// ── TenantReport ───────────────────────────────────────────────────────────────

describe('paywallWiring — TenantReport (free tier)', () => {
  it('renders data-testid="verdict-blur" (TruncatedVerdict shown)', () => {
    renderWithPaywall(<TenantReport tier="free" />)
    expect(screen.getByTestId('verdict-blur')).toBeInTheDocument()
  })

  it('renders at least one .pro-badge element (LockedButton shown)', () => {
    const { container } = renderWithPaywall(<TenantReport tier="free" />)
    expect(container.querySelectorAll('.pro-badge').length).toBeGreaterThanOrEqual(1)
  })
})

// ── PersonalBuyerPage ──────────────────────────────────────────────────────────

describe('paywallWiring — PersonalBuyerPage (free tier)', () => {
  it('renders data-testid="verdict-blur" (TruncatedVerdict shown)', () => {
    renderWithPaywall(<PersonalBuyerPage tier="free" />)
    expect(screen.getByTestId('verdict-blur')).toBeInTheDocument()
  })

  it('renders at least one .pro-badge element (LockedButton shown)', () => {
    const { container } = renderWithPaywall(<PersonalBuyerPage tier="free" />)
    expect(container.querySelectorAll('.pro-badge').length).toBeGreaterThanOrEqual(1)
  })
})

// ── LandlordPage ───────────────────────────────────────────────────────────────

describe('paywallWiring — LandlordPage (free tier)', () => {
  it('renders data-testid="verdict-blur" (TruncatedVerdict shown)', () => {
    renderWithPaywall(<LandlordPage tier="free" />)
    expect(screen.getByTestId('verdict-blur')).toBeInTheDocument()
  })

  it('renders at least one .pro-badge element (LockedButton shown)', () => {
    const { container } = renderWithPaywall(<LandlordPage tier="free" />)
    expect(container.querySelectorAll('.pro-badge').length).toBeGreaterThanOrEqual(1)
  })
})
