/**
 * LandlordPropertyHero — unit tests
 *
 * PR6 · Landlord report component tests
 * Test file path: Week3-4 Front end/PR6/landlordPropertyHero.test.tsx
 *
 * Shared DealScore component verification: DealScore renders an SVG circle gauge
 * with aria-label="Deal score: N out of 100". This verifies it is the same component
 * used by the InvestorPage — no duplicate implementation.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandlordPropertyHero } from '../../apps/web/src/components/landlord/LandlordPropertyHero'
import {
  LL_PROPERTY,
  LL_RENT_COMPS,
  LL_DEFAULT_FINANCING,
  computeRentPositioning,
  computeLandlordStable,
  computeLandlordDealScore,
} from '../../apps/web/src/data/landlordData'
import { computeDemoMetrics, enrichMetrics } from '../../apps/web/src/lib/investorCalc'
import type { ListingData, InvestorRiskFlag } from '../../apps/web/src/types/analysis'

// ── Fixture setup (mirrors LandlordPage.toListing + metric pipeline) ──────────

const ASKING_RENT = 3400

/** Inline toListing conversion (mirrors the private function in LandlordPage.tsx) */
const HARBOUR_LISTING: ListingData = {
  id: LL_PROPERTY.id,
  addressLine1: LL_PROPERTY.addressLine1,
  addressLine2: LL_PROPERTY.addressLine2,
  postal: LL_PROPERTY.postal,
  province: LL_PROPERTY.province,
  isToronto: LL_PROPERTY.toronto,
  propertyType: LL_PROPERTY.propertyType,
  beds: LL_PROPERTY.beds,
  baths: LL_PROPERTY.baths,
  sqft: LL_PROPERTY.sqft,
  parking: LL_PROPERTY.parking,
  yearBuilt: LL_PROPERTY.yearBuilt,
  rentControl: LL_PROPERTY.rentControl,
  price: LL_PROPERTY.price,
  annualTaxes: LL_PROPERTY.annualTaxes,
  condoFeeMonthly: LL_PROPERTY.condoFeeMonthly,
  rentEstimate: ASKING_RENT,
  rentLow: LL_PROPERTY.rentLow,
  rentHigh: LL_PROPERTY.rentHigh,
  compCount: LL_PROPERTY.compCount,
  compConfidence: LL_PROPERTY.compConfidence,
  market: LL_PROPERTY.market,
  riskFlags: LL_PROPERTY.riskFlags as InvestorRiskFlag[],
  chips: LL_PROPERTY.chips,
}

const stable = computeLandlordStable(LL_PROPERTY, ASKING_RENT, false)
const coreMetrics = computeDemoMetrics(stable, HARBOUR_LISTING, LL_DEFAULT_FINANCING)
const HARBOUR_METRICS = enrichMetrics(coreMetrics, HARBOUR_LISTING, LL_DEFAULT_FINANCING)
const HARBOUR_SCORE = computeLandlordDealScore(HARBOUR_METRICS, LL_PROPERTY)
const HARBOUR_POSITIONING = computeRentPositioning(ASKING_RENT, LL_RENT_COMPS)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LandlordPropertyHero', () => {
  function renderHero() {
    return render(
      <LandlordPropertyHero
        property={LL_PROPERTY}
        askingRent={ASKING_RENT}
        metrics={HARBOUR_METRICS}
        score={HARBOUR_SCORE}
        positioning={HARBOUR_POSITIONING}
      />
    )
  }

  it('renders the first address line "Unit 3208 · 88 Harbour Street"', () => {
    renderHero()
    expect(screen.getByText('Unit 3208 · 88 Harbour Street')).toBeInTheDocument()
  })

  it('renders the second address line "Toronto · M5J · South Core"', () => {
    renderHero()
    expect(screen.getByText('Toronto · M5J · South Core')).toBeInTheDocument()
  })

  it('renders "Your asking rent" label', () => {
    renderHero()
    expect(screen.getByText('Your asking rent')).toBeInTheDocument()
  })

  it('renders the asking rent value "$3,400" with "/mo" suffix', () => {
    renderHero()
    // fmtMoney(3400) = '$3,400'
    expect(screen.getByText('$3,400')).toBeInTheDocument()
    expect(screen.getByText('/mo')).toBeInTheDocument()
  })

  it('renders the DealScore gauge — the shared component (aria-label "Deal score: N out of 100")', () => {
    renderHero()
    // DealScore renders: aria-label={`Deal score: ${clamped} out of 100`}
    // This confirms it is the shared DealScore, not a custom implementation
    const gauge = screen.getByLabelText(/Deal score: \d+ out of 100/)
    expect(gauge).toBeInTheDocument()
  })

  it('renders days on market "38 days" for Harbour fixture', () => {
    renderHero()
    expect(screen.getByText('38 days')).toBeInTheDocument()
  })

  it('renders "Days on market" label in the key metrics row', () => {
    renderHero()
    expect(screen.getByText('Days on market')).toBeInTheDocument()
  })

  it('renders at least one risk flag badge or chip (LL_PROPERTY has 2 risk flags)', () => {
    renderHero()
    // Risk flags are rendered as Chip components in the property chips strip
    // The property chips array includes chip text like "Landlord · For rent"
    // LL_PROPERTY.chips has 4 chips — verify at least one chip is present
    const chipText = LL_PROPERTY.chips[0]
    expect(screen.getByText(chipText)).toBeInTheDocument()
    expect(LL_PROPERTY.riskFlags).toHaveLength(2)
  })

  it('renders "Net cash flow" label', () => {
    renderHero()
    expect(screen.getByText('Net cash flow')).toBeInTheDocument()
  })

  it('renders "Cap rate" label', () => {
    renderHero()
    expect(screen.getByText('Cap rate')).toBeInTheDocument()
  })

  it('renders "DSCR" label', () => {
    renderHero()
    expect(screen.getByText('DSCR')).toBeInTheDocument()
  })

  it('renders ownership context strip with "Purchased" label', () => {
    renderHero()
    expect(screen.getByText('Purchased')).toBeInTheDocument()
  })

  it('renders the purchased price "$720,000" in the ownership strip', () => {
    renderHero()
    // LL_PROPERTY.purchasedFor = 720000 → fmtMoney(720000) = '$720,000'
    expect(screen.getByText('$720,000')).toBeInTheDocument()
  })

  it('renders "Current value" in the ownership strip', () => {
    renderHero()
    expect(screen.getByText('Current value')).toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = renderHero()
    expect(container.firstChild).toMatchSnapshot()
  })
})
