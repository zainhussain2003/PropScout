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
  // One 5-pt red flag is applied: subtotal 70 → stored total 65 → display round(65×100/95)=68.
  dealScore: {
    total: 65,
    displayTotal: 68,
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

const PERSONAL_ANALYSIS: Analysis = {
  ...ANALYSIS,
  mode: 'personal',
  riskFlags: [
    // Deliberately amber-first in the data to prove the render re-orders red on top.
    {
      id: 'verify_history',
      severity: 'amber',
      label: 'Language worth verifying — ask the agent why',
      evidence: 'no representations',
      confidence: 65,
    },
    {
      id: 'grow_op_history',
      severity: 'red',
      label: 'Grow-op history',
      evidence: 'former grow-op',
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

  it('shows the backend deal score and does NOT re-derive it on live dismiss (one source of truth)', async () => {
    getAnalysisByToken.mockResolvedValue({ analysis: INVESTOR_ANALYSIS, listing: SALE_LISTING })
    listOverrides.mockResolvedValue([])
    renderReport()

    // Composition / one-source: the displayed /100 number is the backend's
    // display_total (raw 65 → round(65×100/95) = 68), and the verdict LABEL is the
    // backend's verdict (good_deal → "Good deal") — number and label can't disagree
    // because both come from the same calc-engine result, not a frontend recompute.
    expect(await screen.findByLabelText(/Deal score: 68 out of 100/i)).toBeInTheDocument()
    expect(screen.getByText(/Good deal/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))

    // Dismiss persists + greys the flag (Restore appears) — but the frontend
    // does NOT re-derive the score. It stays at the backend value until a re-run.
    // Re-deriving once inflated a gated grow-op property from 40 up to ~90; never again.
    expect(await screen.findByRole('button', { name: /restore/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Deal score: 68 out of 100/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(addOverride).toHaveBeenCalledWith('test-token', 'flag-basement')
    })
  })

  it('shows the backend score on load even with a persisted dismissal (no frontend re-derivation)', async () => {
    getAnalysisByToken.mockResolvedValue({ analysis: INVESTOR_ANALYSIS, listing: SALE_LISTING })
    listOverrides.mockResolvedValue(['flag-basement'])
    renderReport()

    // The stored backend score is shown as-is; the frontend never recomputes it.
    expect(await screen.findByLabelText(/Deal score: 68 out of 100/i)).toBeInTheDocument()
  })

  it('routes personal mode to the HomeScore report — gauge suppressed, risk readout survives', async () => {
    getAnalysisByToken.mockResolvedValue({ analysis: PERSONAL_ANALYSIS, listing: SALE_LISTING })
    listOverrides.mockResolvedValue([])
    renderReport()

    // Owner-occupiers get the HomeScore report, not the investment gauge:
    // the numeric score is paused with an explanation, not a blank space.
    expect(await screen.findByText(/Overall score paused/i)).toBeInTheDocument()
    // The investment deal-score gauge must NOT appear for a personal buyer.
    expect(screen.queryByLabelText(/Deal score: .* out of 100/i)).not.toBeInTheDocument()
    // The safety readout survives the gauge suppression — the red flag still shows.
    const growOp = await screen.findByText(/Grow-op history/i)
    expect(growOp).toBeInTheDocument()

    // ...and the red flag is surfaced ABOVE the amber soft-caution, even though
    // the data listed amber first — the safety signal is on top.
    const verify = screen.getByText(/Language worth verifying/i)
    expect(growOp.compareDocumentPosition(verify) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('feeds real risk flags into the HomeScore risk component (standard red → 5/10)', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: {
        ...PERSONAL_ANALYSIS,
        riskFlags: [
          {
            id: 'needs_work',
            severity: 'red',
            label: 'Needs significant work',
            evidence: 'sold as-is, needs TLC',
            confidence: 88,
          },
        ],
      },
      listing: SALE_LISTING,
    })
    listOverrides.mockResolvedValue([])
    renderReport()

    // The score breakdown bars render even while the aggregate gauge is
    // suppressed — a standard red flag must show up as a real deduction
    // (10 → 5), not the hardcoded no-flags baseline.
    expect(await screen.findByText(/Overall score paused/i)).toBeInTheDocument()
    expect(await screen.findByText('5 / 10')).toBeInTheDocument()
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
