/**
 * Functionality tests for ReportPage risk-flag override wiring.
 *
 * Verifies the end-to-end flow (with the API mocked):
 *   - A live analysis token renders a Dismiss button on each risk flag
 *   - Clicking Dismiss persists the dismissal via the override service
 *   - Already-dismissed flags render a Restore button and call removeOverride
 *
 * Tenant mode is used because it has the lightest render path while still
 * exercising the shared RiskRow / FlagOverrideControls wiring that the
 * investor, landlord and personal modes also use.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReportPage } from './ReportPage'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'

// ── Router: fixed token, no real navigation ───────────────────────────────────
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...mod,
    useParams: () => ({ token: 'test-token' }),
    useNavigate: () => vi.fn(),
  }
})

// ── Analysis fetch ────────────────────────────────────────────────────────────
const getAnalysisByToken = vi.fn()
vi.mock('../lib/services/analysisService', () => ({
  getAnalysisByToken: (token: string) => getAnalysisByToken(token),
}))

// ── Override service ──────────────────────────────────────────────────────────
const listOverrides = vi.fn()
const addOverride = vi.fn()
const removeOverride = vi.fn()
vi.mock('../lib/services/overrideService', () => ({
  listOverrides: (token: string) => listOverrides(token),
  addOverride: (token: string, flagId: string) => addOverride(token, flagId),
  removeOverride: (token: string, flagId: string) => removeOverride(token, flagId),
}))

const LISTING: Listing = {
  id: 'listing-1',
  url: 'https://www.realtor.ca/real-estate/9999/55-front-st-toronto',
  listingType: 'for-rent',
  address: '55 Front St, Toronto, ON M5J 1E6',
  city: 'Toronto',
  province: 'ON',
  postalCode: 'M5J1E6',
  price: null,
  rentMonthly: 2400,
  beds: 2,
  baths: 1,
  sqft: 720,
  propertyType: 'condo',
  yearBuilt: 2015,
  parkingSpots: 0,
  condoFeeMonthly: null,
  condoFeeKnown: false,
  annualTaxes: null,
  description: 'Bright downtown unit.',
  photos: [],
  scrapedAt: '2026-06-01T00:00:00.000Z',
}

const ANALYSIS: Analysis = {
  id: 'analysis-1',
  token: 'test-token',
  mode: 'tenant',
  createdAt: '2026-06-01T00:00:00.000Z',
  metrics: null,
  dealScore: null,
  rentalComps: null,
  riskFlags: [
    {
      id: 'flag-basement',
      severity: 'red',
      label: 'Possible undisclosed basement unit',
      evidence: 'Mentions separate entrance',
      confidence: 90,
    },
  ],
  narrative: null,
  walkScore: null,
  neighbourhood: null,
  hasSanityWarnings: false,
}

// ── Investor-mode fixtures (for live score recalc) ────────────────────────────
const SALE_LISTING: Listing = {
  ...LISTING,
  listingType: 'for-sale',
  price: 729_900,
  rentMonthly: null,
}

const INVESTOR_ANALYSIS: Analysis = {
  ...ANALYSIS,
  mode: 'investor',
  metrics: {
    cashFlowMonthly: -800,
    cashFlowAnnual: -9600,
    capRate: 0.045,
    cashOnCashReturn: -0.02,
    dscr: 1.05,
    grm: 18,
    noi: 22000,
    mortgagePaymentMonthly: 2600,
    downPayment: 145980,
    mortgageAmount: 583920,
    amortizationYears: 25,
    mortgageRate: 0.0479,
    breakEvenRent: 3200,
    closingCostsTotal: 13473,
    lttProvincial: 11073,
    lttMunicipal: 0,
    hasSanityWarnings: false,
  },
  // One 5-pt red flag is applied: subtotal 70 → stored total 65.
  dealScore: {
    total: 65,
    verdict: 'good_deal',
    breakdown: {
      capRate: 15,
      cashFlow: 10,
      cashOnCash: 15,
      dscr: 15,
      demand: 15,
      subtotal: 70,
      deduction: 5,
      componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
    },
  },
  riskFlags: [
    {
      id: 'flag-basement',
      severity: 'red',
      label: 'Possible undisclosed basement unit',
      evidence: 'Mentions separate entrance',
      confidence: 90,
    },
  ],
}

function renderReport(): void {
  render(
    <MemoryRouter>
      <ReportPage tier="pro" />
    </MemoryRouter>
  )
}

describe('ReportPage — risk-flag overrides', () => {
  beforeEach(() => {
    getAnalysisByToken.mockReset()
    listOverrides.mockReset()
    addOverride.mockReset()
    removeOverride.mockReset()
    getAnalysisByToken.mockResolvedValue({ analysis: ANALYSIS, listing: LISTING })
    addOverride.mockResolvedValue(undefined)
    removeOverride.mockResolvedValue(undefined)
  })

  it('renders a Dismiss button on a risk flag for a live token', async () => {
    listOverrides.mockResolvedValue([])
    renderReport()

    expect(await screen.findByText(/Possible undisclosed basement unit/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it('persists the dismissal via the override service when clicked', async () => {
    listOverrides.mockResolvedValue([])
    renderReport()

    const dismissBtn = await screen.findByRole('button', { name: /dismiss/i })
    fireEvent.click(dismissBtn)

    await waitFor(() => {
      expect(addOverride).toHaveBeenCalledWith('test-token', 'flag-basement')
    })
    // Optimistic update flips the button to Restore.
    expect(await screen.findByRole('button', { name: /restore/i })).toBeInTheDocument()
  })

  it('shows Restore and calls removeOverride for an already-dismissed flag', async () => {
    listOverrides.mockResolvedValue(['flag-basement'])
    renderReport()

    const restoreBtn = await screen.findByRole('button', { name: /restore/i })
    fireEvent.click(restoreBtn)

    await waitFor(() => {
      expect(removeOverride).toHaveBeenCalledWith('test-token', 'flag-basement')
    })
  })

  it('raises the deal score live when a flag is dismissed (investor mode)', async () => {
    getAnalysisByToken.mockResolvedValue({ analysis: INVESTOR_ANALYSIS, listing: SALE_LISTING })
    listOverrides.mockResolvedValue([])
    renderReport()

    // Stored score reflects the 5-pt red-flag deduction: 70 − 5 = 65.
    expect(await screen.findByLabelText(/Deal score: 65 out of 95/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))

    // Dismissing the only red flag restores the deduction live: 70.
    expect(await screen.findByLabelText(/Deal score: 70 out of 95/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(addOverride).toHaveBeenCalledWith('test-token', 'flag-basement')
    })
  })

  it('starts from the already-dismissed score on load (investor mode)', async () => {
    getAnalysisByToken.mockResolvedValue({ analysis: INVESTOR_ANALYSIS, listing: SALE_LISTING })
    listOverrides.mockResolvedValue(['flag-basement'])
    renderReport()

    // Persisted dismissal is applied on first render — score already at 70.
    expect(await screen.findByLabelText(/Deal score: 70 out of 95/i)).toBeInTheDocument()
  })

  it('recomputes the OSFI verdict live when household income changes', async () => {
    getAnalysisByToken.mockResolvedValue({ analysis: INVESTOR_ANALYSIS, listing: SALE_LISTING })
    listOverrides.mockResolvedValue([])
    renderReport()

    const slider = await screen.findByLabelText(/Gross household income/i)

    // Drop income to the floor → GDS blows past 44%, OSFI must read "Fails".
    fireEvent.change(slider, { target: { value: '40000' } })
    expect(await screen.findByText(/Fails at .* income/i)).toBeInTheDocument()

    // Raise income to the ceiling → comfortably qualifies again.
    fireEvent.change(slider, { target: { value: '400000' } })
    expect(await screen.findByText(/Passes at .* income/i)).toBeInTheDocument()
  })
})
