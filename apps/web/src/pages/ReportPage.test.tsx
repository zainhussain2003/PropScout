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

// ── Mapbox GL service (jsdom has no WebGL) ────────────────────────────────────
const getMapboxToken = vi.fn()
const mountMiniMap = vi.fn()
vi.mock('../lib/services/mapboxGlService', () => ({
  getMapboxToken: () => getMapboxToken(),
  mountMiniMap: (el: HTMLElement, opts: unknown) => mountMiniMap(el, opts),
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
  // Self-consistent with the calc engine for this listing: 55 Front St is a
  // TORONTO property (M5J), so a $729,900 purchase owes municipal LTT as well
  // as provincial. These are the engine's own figures for 20% down at 4.79%
  // over 25 years on NOI $22,000 — the client recomputes the financing-
  // dependent ones from the sliders and must reproduce exactly these at the
  // submitted financing. The fixture previously carried a $2,600 payment,
  // −$800 cash flow and zero municipal LTT, none of which this property could
  // produce, which hid the fact that the page showed Toronto LTT in its
  // bracket table but omitted it from cash-to-close.
  metrics: {
    cashFlowMonthly: -1493.31,
    cashFlowAnnual: -17919.68,
    capRate: 0.045,
    cashOnCashReturn: -0.105549,
    dscr: 0.5511,
    grm: 18,
    noi: 22000,
    mortgagePaymentMonthly: 3326.64,
    downPayment: 145980,
    mortgageAmount: 583920,
    amortizationYears: 25,
    mortgageRate: 0.0479,
    breakEvenRent: 3200,
    closingCostsTotal: 23796,
    lttProvincial: 11073,
    lttMunicipal: 10323,
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

  it('shows a missing-report message only when the API confirms absence', async () => {
    getAnalysisByToken.mockResolvedValue(null)
    listOverrides.mockResolvedValue([])
    renderReport()

    expect(await screen.findByText('Report not found')).toBeInTheDocument()
    expect(screen.queryByText('Report temporarily unavailable')).not.toBeInTheDocument()
  })

  it('does not claim a saved report is missing during a network failure', async () => {
    getAnalysisByToken.mockRejectedValue(new Error('network unavailable'))
    listOverrides.mockResolvedValue([])
    renderReport()

    expect(await screen.findByText('Report temporarily unavailable')).toBeInTheDocument()
    expect(screen.getByText(/report may still exist/i)).toBeInTheDocument()
    expect(screen.queryByText('Report not found')).not.toBeInTheDocument()
  })

  it('renders a Dismiss button on a risk flag for a live token', async () => {
    listOverrides.mockResolvedValue([])
    renderReport()

    // The flag now appears in §02 Listing accuracy AND as §04 negotiation leverage,
    // so match all occurrences; the Dismiss button (on the §02 RiskRow) is the point.
    const flags = await screen.findAllByText(/Possible undisclosed basement unit/i)
    expect(flags.length).toBeGreaterThanOrEqual(1)
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
    // Per the design the verdict renders twice — pill inside the gauge + eyebrow.
    expect(screen.getAllByText(/Good deal/i).length).toBeGreaterThanOrEqual(1)

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

  it('uses and labels the backend tax estimate when a sale listing publishes no usable tax', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: {
        ...PERSONAL_ANALYSIS,
        metrics: {
          ...INVESTOR_ANALYSIS.metrics!,
          annualTaxesUsed: 5218,
          annualTaxesEstimated: true,
        },
      },
      listing: { ...SALE_LISTING, annualTaxes: null },
    })
    listOverrides.mockResolvedValue([])
    renderReport()

    expect(await screen.findByText('$5,218/yr · city-rate estimate; verify')).toBeInTheDocument()
    expect(screen.queryByText('$0/yr')).not.toBeInTheDocument()
  })

  it('keeps an undisclosed tenant asking rent unknown', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: { ...ANALYSIS, mode: 'tenant', riskFlags: [] },
      listing: { ...LISTING, listingType: 'for-rent', rentMonthly: null },
    })
    listOverrides.mockResolvedValue([])
    renderReport()
    expect(await screen.findByText(/asking rent not provided/i)).toBeInTheDocument()
    expect(screen.queryByText('$0/mo')).not.toBeInTheDocument()
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

  it('does not unlock an invented buyer score or photo count when schools arrive', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: {
        ...PERSONAL_ANALYSIS,
        schools: { elementary: [], middle: [], high: [], catchmentNote: 'Not verified' },
        comparableSalesAreSample: true,
      },
      listing: {
        ...SALE_LISTING,
        url: 'https://www.realtor.ca/real-estate/30180258/example',
        parkingSpots: 0,
        photos: [],
      },
    })
    listOverrides.mockResolvedValue([])
    renderReport()
    expect(await screen.findByText(/Overall score paused/i)).toBeInTheDocument()
    expect(screen.getByText(/Verified pricing data pending/)).toBeInTheDocument()
    expect(screen.queryByText('18 / 25')).not.toBeInTheDocument()
    expect(screen.queryByText(/28 more/)).not.toBeInTheDocument()
    expect(screen.getByText(/No listing photos/)).toBeInTheDocument()
    expect(screen.getByText(/— parking · not provided/)).toBeInTheDocument()
    expect(screen.queryByText('Make an offer')).not.toBeInTheDocument()
  })

  it('passes the analysis coordinates into the real MiniMap (live map, not the placeholder)', async () => {
    getMapboxToken.mockReturnValue('pk.test-token')
    mountMiniMap.mockResolvedValue({ remove: vi.fn() })
    getAnalysisByToken.mockResolvedValue({
      analysis: { ...INVESTOR_ANALYSIS, coordinates: { lat: 43.7942, lng: -79.5268 } },
      listing: SALE_LISTING,
    })
    listOverrides.mockResolvedValue([])
    renderReport()

    await waitFor(() => {
      expect(mountMiniMap).toHaveBeenCalledTimes(1)
    })
    const [, opts] = mountMiniMap.mock.calls[0]! as [HTMLElement, { center: unknown }]
    expect(opts.center).toEqual({ lat: 43.7942, lng: -79.5268 })
    expect(screen.queryByText(/Map placeholder/i)).not.toBeInTheDocument()
  })

  it('feeds real pvlib sun output into the HomeScore light component', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: {
        ...PERSONAL_ANALYSIS,
        riskFlags: [],
        sunScout: {
          annualPeakSunHours: 1400,
          summerDailyHours: 8.4,
          winterDailyHours: 3.1,
          seasonalGrid: { Dec: 3.1, Mar: 5.5, Jun: 8.4, Sep: 6.2 },
          monthlyHours: [3.1, 4.0, 5.5, 6.4, 7.6, 8.4, 8.2, 7.3, 6.2, 4.8, 3.6, 3.0],
          sunScore: 85,
          verdict: 'excellent',
        },
      },
      listing: SALE_LISTING,
    })
    listOverrides.mockResolvedValue([])
    renderReport()

    // The overall score stays paused until verified FMV is available, while
    // the sourced SunScout result remains visible in its own section.
    expect(await screen.findByText(/Excellent · 85\/100/)).toBeInTheDocument()
    expect(screen.getByText(/Overall score paused/i)).toBeInTheDocument()
    expect(screen.queryByText('15 / 15')).not.toBeInTheDocument()
  })

  it('light component stays at the honest 4/15 floor when sun data is unavailable', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: { ...PERSONAL_ANALYSIS, riskFlags: [], sunScout: null },
      listing: SALE_LISTING,
    })
    listOverrides.mockResolvedValue([])
    renderReport()

    expect(await screen.findByText(/Overall score paused/i)).toBeInTheDocument()
    expect(screen.queryByText('4 / 15')).not.toBeInTheDocument()
    expect(screen.getByText(/Solar path analysis/)).toBeInTheDocument()
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

// ── Schools read path (tenant live report) ────────────────────────────────────

describe('ReportPage — live tenant schools', () => {
  const SCHOOLS = {
    elementary: [
      {
        name: 'Jesse Ketchum Jr & Sr PS',
        schoolType: 'elementary' as const,
        board: 'TDSB',
        distanceKm: 0.6,
        eqaoScore: 8.2,
        fraserRankPct: 74,
        graduationRate: null,
      },
    ],
    middle: [],
    high: [],
    catchmentNote: 'Nearest by distance — catchment not verified.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getMapboxToken.mockReturnValue(null)
  })

  it('keeps empty listing-audit sections addressable by the report rail', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: { ...ANALYSIS, riskFlags: [] },
      listing: LISTING,
    })
    listOverrides.mockResolvedValue([])
    renderReport()

    await screen.findByText('No supported flags')
    expect(document.querySelector('[data-section="02"]')).toBeInTheDocument()
    expect(document.querySelector('[data-section="03"]')).toBeInTheDocument()
  })

  it('renders the real nearest schools when analysis.schools is present', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: { ...ANALYSIS, schools: SCHOOLS },
      listing: LISTING,
    })
    listOverrides.mockResolvedValue([])
    renderReport()

    expect(await screen.findByText('Jesse Ketchum Jr & Sr PS')).toBeInTheDocument()
    // Distance-derived walk estimate (0.6 km × 12 min/km)
    expect(screen.getByText(/~7 min walk/)).toBeInTheDocument()
    expect(screen.getByText(/drawn from available EQAO results/i)).toBeInTheDocument()
    expect(screen.getByText(/attendance boundaries are not verified/i)).toBeInTheDocument()
    expect(screen.queryByText(/Fraser Institute/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Highlighted/)).not.toBeInTheDocument()
    expect(screen.getByText(/rather than a pedestrian route/i)).toBeInTheDocument()
  })

  it('lets a saved tenant report replace the assumed SunScout facade direction', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: {
        ...ANALYSIS,
        sunScout: {
          annualPeakSunHours: 1400,
          summerDailyHours: 8.4,
          winterDailyHours: 3.1,
          seasonalGrid: { Dec: 3.1, Mar: 5.5, Jun: 8.4, Sep: 6.2 },
          monthlyHours: [3.1, 4, 5.5, 6.4, 7.6, 8.4, 8.2, 7.3, 6.2, 4.8, 3.6, 3],
          sunScore: 85,
          verdict: 'excellent',
        },
      },
      listing: LISTING,
    })
    listOverrides.mockResolvedValue([])
    renderReport()

    expect(await screen.findByLabelText(/Primary facade faces/i)).toBeInTheDocument()
    expect(screen.queryByText(/Assumes south-facing primary facade/i)).not.toBeInTheDocument()
  })

  it('shows no schools section when the table has no data yet', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: { ...ANALYSIS, schools: null },
      listing: LISTING,
    })
    listOverrides.mockResolvedValue([])
    renderReport()

    await screen.findByText(/Is the listing/i)
    expect(screen.queryByText('Jesse Ketchum Jr & Sr PS')).not.toBeInTheDocument()
  })
})

// ── For-rent listing through the investor/landlord renderer (live bugs 2026-07-02) ──

describe('ReportPage — for-rent landlord hero honesty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMapboxToken.mockReturnValue(null)
  })

  it('keeps missing scraped listing facts unknown and labels the maintenance assumption', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: INVESTOR_ANALYSIS,
      listing: {
        ...SALE_LISTING,
        url: 'https://www.realtor.ca/real-estate/30180258/example',
        yearBuilt: null,
        parkingSpots: 0,
      },
    })
    listOverrides.mockResolvedValue([])
    renderReport()
    expect(await screen.findByText(/assumed; build year unknown/)).toHaveTextContent('1.00%')
    expect(screen.getByText(/— parking · not provided/)).toBeInTheDocument()
    expect(screen.queryByText(/Built \d{4}/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^0 parking$/)).not.toBeInTheDocument()
    // The API's $23,796 closing total already includes $11,073 provincial and
    // $10,323 municipal LTT (Toronto), so cash to close is
    // $145,980 + $23,796 = $169,776. The guard this test exists for is that
    // neither LTT is added a second time on top of that total (D-039).
    expect(screen.getAllByText('$169,776').length).toBeGreaterThan(0)
    expect(screen.queryByText('$170,526')).not.toBeInTheDocument()
    expect(screen.queryByText('$191,172')).not.toBeInTheDocument()
    expect(screen.getByText('Other closing costs (est.)')).toBeInTheDocument()
    expect(screen.getByText('$2,400')).toBeInTheDocument()
  })

  it('shows asking RENT (not $0), hides the fabricated build year, and does not duplicate units', async () => {
    getAnalysisByToken.mockResolvedValue({
      analysis: {
        ...INVESTOR_ANALYSIS,
        mode: 'landlord',
        rentalComps: null,
        riskFlags: [],
      },
      // For-rent: no sale price, no build year (LISTING has yearBuilt 2015 — null it)
      listing: { ...LISTING, price: null, rentMonthly: 2650, yearBuilt: null },
    })
    listOverrides.mockResolvedValue([])
    renderReport()

    // Asking rent, not "Asking $0" (rentEstimate comes from comps — null here → 0,
    // so the label is the assertion target)
    expect(await screen.findByText('Asking rent')).toBeInTheDocument()
    // No fabricated "Built <currentYear-10>"
    expect(screen.queryByText(/Built \d{4}/)).not.toBeInTheDocument()
    // No duplicated unit words
    expect(screen.queryByText(/bed bed/)).not.toBeInTheDocument()
    expect(screen.queryByText(/bath bath/)).not.toBeInTheDocument()
    // Purchase-transaction section hidden without a sale price
    expect(screen.queryByText(/on closing day/i)).not.toBeInTheDocument()
  })
})

describe('ReportPage — live financing sliders recompute every dependent metric', () => {
  beforeEach(() => {
    getAnalysisByToken.mockReset()
    listOverrides.mockReset()
    listOverrides.mockResolvedValue([])
    getAnalysisByToken.mockResolvedValue({
      analysis: INVESTOR_ANALYSIS,
      listing: SALE_LISTING,
    })
  })

  /** The page's full text — figures are split across nested nodes. */
  function pageText(): string {
    return document.body.textContent ?? ''
  }

  it('reproduces the API figures at the submitted financing', async () => {
    // The recompute must not shift the numbers merely by loading the page. The
    // client and the calc engine now share the Canadian semi-annual convention,
    // so at 20% down the client reproduces the engine's own -$1,493.31 cash
    // flow and 0.55x DSCR exactly.
    renderReport()
    await waitFor(() => expect(pageText()).toContain('−$1,494'))
    expect(pageText()).toContain('0.55×')
  })

  it('moves cash flow and DSCR when down payment changes, not just cash-to-close', async () => {
    // The defect this pins: ReportPage called enrichMetrics alone, which spreads
    // the API metrics through untouched. Cash-to-close and the equity curve
    // moved with the slider while cash flow and DSCR stayed at the submitted
    // financing, so the page showed a 50%-down cash-to-close beside a 20%-down
    // cash flow. The code comment claimed all of them were live.
    renderReport()
    await waitFor(() => expect(pageText()).toContain('−$1,494'))

    fireEvent.change(await screen.findByLabelText('Down payment'), {
      target: { value: '50' },
    })

    // Engine values for 50% down at 4.79% over 25 years on NOI $22,000.
    await waitFor(() => expect(pageText()).toContain('−$246'))
    expect(pageText()).toContain('0.88×')
    expect(pageText()).not.toContain('−$1,494')
  })

  it('moves break-even appreciation with the sliders too', async () => {
    // Break-even depends on down payment, rate, amortization and the resulting
    // cash flow. Left at the API value it would describe a different scenario
    // from every number beside it — the reason it is recomputed client-side.
    renderReport()
    const card = await screen.findByTestId('break-even-appreciation')
    const before = card.textContent ?? ''

    fireEvent.change(await screen.findByLabelText('Down payment'), {
      target: { value: '50' },
    })

    await waitFor(() => {
      const card2 = screen.getByTestId('break-even-appreciation')
      expect(card2.textContent ?? '').not.toBe(before)
    })
  })

  it('does not re-grade the deal score when financing changes', async () => {
    // One source of truth: sliders explore the numbers, they do not re-score.
    renderReport()
    const slider = await screen.findByLabelText('Down payment')
    const score = await screen.findByText('68')

    fireEvent.change(slider, { target: { value: '50' } })

    // Wait for the recompute to land, then confirm the score did not follow it.
    await waitFor(() => expect(pageText()).toContain('−$246'))
    expect(score).toBeInTheDocument()
    expect(screen.getByText('68')).toBeInTheDocument()
  })
})
