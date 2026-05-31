/**
 * PR8 · Regression tests
 * Test file path: Week3-4 Front end/PR8/regression.test.tsx
 *
 * Confirms PR1–PR7 components are unaffected by PR8 changes.
 *
 * Icon.tsx facts (from Icon.tsx):
 *   - IconName union now includes 'bookmark' and 'share' (PR8 additions)
 *   - All 17 prior icons still present
 *
 * InvestmentMetricsSection facts (from InvestmentMetricsSection.tsx):
 *   - grid-2col-mobile class added to the 4-col tile grid div
 *   - 9 tiles total (8 headline metrics + gross yield = 9 tiles rendered)
 *   - Wait: the tiles array has 9 items (cap rate, monthly cash flow, cash-on-cash,
 *     DSCR, monthly payment, NOI, GRM, break-even rent, gross yield)
 *
 * StickyActionBar label text (from StickyActionBar.tsx): "Save", "Share", "PDF"
 *
 * ModeModal desktop: has <button aria-label="Close"> — drag handle absent.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Icon } from '../../apps/web/src/components/shared/Icon'
import { InvestmentMetricsSection } from '../../apps/web/src/components/investor/InvestmentMetricsSection'
import { ModeModal } from '../../apps/web/src/components/shared/ModeModal'
import { InvestorReport } from '../../apps/web/src/pages/InvestorReport'
import { TenantReport } from '../../apps/web/src/pages/TenantReport'
import { PersonalBuyerPage } from '../../apps/web/src/pages/PersonalBuyerPage'
import { LandlordPage } from '../../apps/web/src/pages/LandlordPage'
import type { ComputedInvestorMetrics, ListingData } from '../../apps/web/src/types/analysis'

// ── Viewport helper ───────────────────────────────────────────────────────────

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

// ── Mock data for InvestmentMetricsSection ────────────────────────────────────

const MOCK_LISTING: ListingData = {
  id: 'test-1',
  addressLine1: '5702 Buttermill Ave',
  addressLine2: 'Vaughan, ON L4H 0A1',
  postal: 'L4H',
  province: 'ON',
  isToronto: false,
  propertyType: 'Condo',
  beds: '3',
  baths: '2',
  sqft: 900,
  parking: '1',
  yearBuilt: 2018,
  rentControl: true,
  price: 729900,
  annualTaxes: 3326,
  condoFeeMonthly: 761,
  rentEstimate: 2900,
  rentLow: 2700,
  rentHigh: 3200,
  compCount: 8,
  compConfidence: 'medium',
  market: { cmhcVacancy: 0.018, rentalDOM: 14, rentTrend: 'flat' },
  riskFlags: [],
  chips: ['Condo', '3 bed', '900 sqft'],
}

const MOCK_METRICS: ComputedInvestorMetrics = {
  cashFlowMonthly: -1833,
  cashFlowAnnual: -21996,
  capRate: 0.0248,
  cashOnCashReturn: -0.12,
  dscr: 0.45,
  grm: 20.97,
  noi: 18082,
  mortgagePaymentMonthly: 3312,
  downPayment: 145980,
  mortgageAmount: 583920,
  amortizationYears: 25,
  mortgageRate: 0.0479,
  breakEvenRent: 4733,
  closingCostsTotal: 21000,
  lttProvincial: 9475,
  lttMunicipal: 0,
  hasSanityWarnings: false,
  grossRentAnnual: 34800,
  totalCashInvested: 166980,
  principal: 583920,
  expenses: {
    taxes: 3326,
    insurance: 2555,
    maintenance: 3650,
    vacancy: 1740,
    condo: 9132,
    management: 0,
    total: 20403,
  },
  ltt: {
    rows: [],
    provincial: 9475,
    municipal: 0,
    total: 9475,
  },
  osfi: {
    qualifyingRate: 0.0679,
    qualifyingPmt: 4050,
    gds: 0.52,
    pass: false,
    threshold: 0.44,
  },
  equityCurve: [],
}

// ── Icon.tsx — new icons present without breaking existing ───────────────────

describe('Icon.tsx — new icons present without breaking existing', () => {
  it('bookmark icon renders an SVG', () => {
    const { container } = render(<Icon name="bookmark" size={16} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('share icon renders an SVG', () => {
    const { container } = render(<Icon name="share" size={16} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('existing icon "arrow" still renders', () => {
    const { container } = render(<Icon name="arrow" size={16} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('existing icon "doc" still renders', () => {
    const { container } = render(<Icon name="doc" size={16} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('existing icon "check" still renders', () => {
    const { container } = render(<Icon name="check" size={16} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('existing icon "house" still renders', () => {
    const { container } = render(<Icon name="house" size={16} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('existing icon "chart" still renders', () => {
    const { container } = render(<Icon name="chart" size={16} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

// ── InvestmentMetricsSection — grid-2col-mobile added ────────────────────────

describe('InvestmentMetricsSection — grid-2col-mobile added', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(<InvestmentMetricsSection metrics={MOCK_METRICS} listing={MOCK_LISTING} />)
    ).not.toThrow()
  })

  it('grid-2col-mobile class present on the metrics grid element', () => {
    const { container } = render(
      <InvestmentMetricsSection metrics={MOCK_METRICS} listing={MOCK_LISTING} />
    )
    expect(container.querySelector('.grid-2col-mobile')).toBeInTheDocument()
  })

  it('all 9 metric tiles render', () => {
    render(<InvestmentMetricsSection metrics={MOCK_METRICS} listing={MOCK_LISTING} />)
    // The 9 tile labels from the tiles array
    expect(screen.getByText('Cap rate')).toBeInTheDocument()
    expect(screen.getByText('Monthly cash flow')).toBeInTheDocument()
    expect(screen.getByText('Cash-on-cash')).toBeInTheDocument()
    expect(screen.getByText('DSCR')).toBeInTheDocument()
    expect(screen.getByText('Monthly payment')).toBeInTheDocument()
    expect(screen.getByText('NOI')).toBeInTheDocument()
    expect(screen.getByText('GRM')).toBeInTheDocument()
    expect(screen.getByText('Break-even rent')).toBeInTheDocument()
    expect(screen.getByText('Gross yield')).toBeInTheDocument()
  })
})

// ── StickyActionBar mounted in all 4 report pages ────────────────────────────

describe('StickyActionBar mounted in all 4 report pages', () => {
  it('InvestorReport at 375px: Save, Share, PDF labels visible', () => {
    setViewportWidth(375)
    render(
      <MemoryRouter>
        <InvestorReport tier="free" />
      </MemoryRouter>
    )
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Share')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('TenantReport at 375px: Save, Share, PDF labels visible', () => {
    setViewportWidth(375)
    render(
      <MemoryRouter>
        <TenantReport tier="free" />
      </MemoryRouter>
    )
    expect(screen.getAllByText('Save').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Share').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('PDF').length).toBeGreaterThanOrEqual(1)
  })

  it('PersonalBuyerPage at 375px: Save, Share, PDF labels visible', () => {
    setViewportWidth(375)
    render(
      <MemoryRouter>
        <PersonalBuyerPage tier="free" />
      </MemoryRouter>
    )
    expect(screen.getAllByText('Save').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Share').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('PDF').length).toBeGreaterThanOrEqual(1)
  })

  it('LandlordPage at 375px: Save, Share, PDF labels visible', () => {
    setViewportWidth(375)
    render(
      <MemoryRouter>
        <LandlordPage tier="free" />
      </MemoryRouter>
    )
    expect(screen.getAllByText('Save').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Share').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('PDF').length).toBeGreaterThanOrEqual(1)
  })
})

// ── BottomSheet absent from desktop ModeModal ─────────────────────────────────

describe('BottomSheet absent from desktop ModeModal', () => {
  it('at 1280px, desktop modal renders without drag handle', () => {
    setViewportWidth(1280)
    const { container } = render(
      <ModeModal
        open
        listing={{
          kind: 'sale',
          address: '5702 Buttermill Ave, Vaughan',
          price: '$729,900',
          beds: '3 bed',
          sqft: '900 sqft',
        }}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    )
    // Desktop modal: has close button, no BottomSheet drag handle (which would be
    // the sole aria-hidden div — desktop has aria-hidden spans for decorative elements)
    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument()

    // Confirm the sheet's drag handle pattern (36×4 inline style) is absent
    const allDivs = Array.from(container.querySelectorAll<HTMLElement>('div'))
    const hasDragHandle = allDivs.some(
      (el) =>
        el.style.width === '36px' && el.style.height === '4px' && el.style.borderRadius === '999px'
    )
    expect(hasDragHandle).toBe(false)
  })
})
