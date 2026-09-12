/**
 * Demo / live parity — the /investor-report demo and the live /r/:token
 * investor report must be the same product (D-073).
 *
 * The demo is what prospects are shown; the live report is what they pay
 * for. Sections that existed twice had drifted: the demo itemised closing
 * costs the analysis never produced, showed no break-even appreciation card,
 * had no income control on the OSFI test, and asked a different §02
 * question. Both routes now render the same §02–§07 components, and this
 * test compares the two rendered pages section by section so a future edit
 * to one cannot silently leave the other behind.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { InvestorReport } from './InvestorReport'
import { ReportPage } from './ReportPage'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useParams: () => ({ token: 'test-token' }), useNavigate: () => vi.fn() }
})

const getAnalysisByToken = vi.fn()
vi.mock('../lib/services/analysisService', () => ({
  getAnalysisByToken: (token: string) => getAnalysisByToken(token),
}))
vi.mock('../lib/services/overrideService', () => ({
  listOverrides: () => Promise.resolve([]),
  addOverride: () => Promise.resolve(undefined),
  removeOverride: () => Promise.resolve(undefined),
}))
vi.mock('../lib/services/mapboxGlService', () => ({
  getMapboxToken: () => null,
  mountMiniMap: () => undefined,
}))

const SALE_LISTING: Listing = {
  id: 'listing-1',
  url: 'https://www.realtor.ca/real-estate/1/5702-5-buttermill-ave-vaughan',
  listingType: 'for-sale',
  address: '5702-5 Buttermill Ave, Vaughan, ON L4K 0J5',
  city: 'Vaughan',
  province: 'ON',
  postalCode: 'L4K0J5',
  price: 729_900,
  rentMonthly: null,
  beds: 3,
  baths: 2,
  sqft: 1_000,
  propertyType: 'condo',
  yearBuilt: 2019,
  parkingSpots: 1,
  condoFeeMonthly: 761,
  condoFeeKnown: true,
  annualTaxes: 3_326,
  description: 'Bright corner unit.',
  photos: [],
  scrapedAt: '2026-06-01T00:00:00.000Z',
}

const INVESTOR_ANALYSIS: Analysis = {
  id: 'analysis-1',
  token: 'test-token',
  mode: 'investor',
  createdAt: '2026-06-01T00:00:00.000Z',
  metrics: {
    cashFlowMonthly: -2_126.82,
    cashFlowAnnual: -25_521.84,
    capRate: 0.0248,
    cashOnCashReturn: -0.16,
    dscr: 0.45,
    grm: 21,
    noi: 18_082,
    mortgagePaymentMonthly: 3_326.64,
    downPayment: 145_980,
    mortgageAmount: 583_920,
    amortizationYears: 25,
    mortgageRate: 0.0479,
    breakEvenRent: 4_585,
    closingCostsTotal: 13_473,
    lttProvincial: 11_073,
    lttMunicipal: 0,
    hasSanityWarnings: false,
  },
  dealScore: {
    total: 12,
    displayTotal: 13,
    verdict: 'hard_pass',
    breakdown: {
      capRate: 3,
      cashFlow: 0,
      cashOnCash: 1,
      dscr: 0,
      demand: 8,
      subtotal: 12,
      deduction: 0,
      componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
    },
  },
  rentalComps: {
    low: 2_700,
    mid: 2_900,
    high: 3_200,
    compCount: 8,
    confidence: 'medium',
    postalCode: 'L4K',
    radiusKm: null,
  },
  riskFlags: [],
  narrative: 'This condo loses money every month. The rent does not cover the mortgage.',
  walkScore: null,
  neighbourhood: null,
  hasSanityWarnings: false,
}

/** Ordered [section number, topic] pairs as rendered. */
function sectionOutline(): Array<[string, string]> {
  return Array.from(document.querySelectorAll<HTMLElement>('section[data-section]')).map((el) => {
    const n = el.getAttribute('data-section') ?? ''
    // SectionHead renders "§ 01Investment metrics" as its mono eyebrow.
    const eyebrow = el.querySelector('.mono')?.textContent?.trim() ?? ''
    return [n, eyebrow.replace(/^§\s*\d+\s*/, '')]
  })
}

async function renderLive(): Promise<void> {
  getAnalysisByToken.mockResolvedValue({
    analysis: INVESTOR_ANALYSIS,
    listing: SALE_LISTING,
    canOverride: false,
  })
  render(
    <MemoryRouter>
      <ReportPage tier="pro" />
    </MemoryRouter>
  )
  await screen.findByText('Investment metrics')
}

function renderDemo(): void {
  render(
    <MemoryRouter>
      <InvestorReport tier="pro" />
    </MemoryRouter>
  )
}

describe('demo and live investor reports are one product', () => {
  beforeEach(() => {
    getAnalysisByToken.mockReset()
  })

  it('renders the same numbered sections with the same topics, in the same order', async () => {
    renderDemo()
    const demo = sectionOutline()
    cleanup()

    await renderLive()
    const live = sectionOutline()

    // Guard the probe itself: an outline of empty topics would match trivially.
    expect(demo.map(([, topic]) => topic)).toEqual(
      expect.arrayContaining(['Rental comps', 'Cash to close', 'Equity build'])
    )
    // Any drift shows as a diff of the two outlines, not as a missing string.
    expect(live).toEqual(demo)
    expect(demo.map(([n]) => n)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
    ])
  })

  it('shows the break-even appreciation card on the demo, not only the live report', () => {
    // Shipped in #32 for the live report; the demo rendered the equity chart
    // alone, so the route prospects see first never showed it.
    renderDemo()
    expect(screen.getByTestId('break-even-appreciation')).toBeInTheDocument()
  })

  it('gives the demo the same household-income input the live OSFI test has', () => {
    renderDemo()
    expect(screen.getByLabelText('Gross household income')).toBeInTheDocument()
  })

  it('itemises cash to close identically — no invented legal or inspection lines on the demo', () => {
    renderDemo()
    const text = document.body.textContent ?? ''
    expect(text).toContain('Other closing costs (est.)')
    for (const invented of ['Legal fees', 'Title insurance', 'Home inspection', 'Miscellaneous']) {
      expect(text).not.toContain(invented)
    }
  })

  it('does not ask "does the deal pencil" twice in a row on either route', async () => {
    renderDemo()
    expect(document.body.textContent?.match(/does the deal/gi)?.length ?? 0).toBeLessThanOrEqual(1)
    cleanup()
    await renderLive()
    expect(document.body.textContent?.match(/does the deal/gi)?.length ?? 0).toBeLessThanOrEqual(1)
  })
})
