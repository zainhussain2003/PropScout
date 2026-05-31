/**
 * LandlordVerdictHero — unit tests
 *
 * PR6 · Landlord report component tests
 * Test file path: Week3-4 Front end/PR6/landlordVerdictHero.test.tsx
 *
 * Harbour fixture context:
 *   askingRent = $3,400, buildingP50 = $3,100
 *   positioning.gap = 3400 - 3100 = 300 → "above the building median" by $300
 *   daysOnMarket = 38
 *   dailyVacancyCost = Math.round(3400/30) = $113
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandlordVerdictHero } from '../../apps/web/src/components/landlord/LandlordVerdictHero'
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

// ── Fixture setup ──────────────────────────────────────────────────────────────

const ASKING_RENT = 3400

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

// computeRentPositioning(3400, {buildingP25:2950, buildingP50:3100, buildingP75:3350}):
//   3400 > 3100 + (3350-3100)*0.4 = 3200 (not "At market")
//   3400 <= 3350 + (3350-3100)*0.3 = 3425 → "Top of range", gap = 3400-3100 = 300
const HARBOUR_POSITIONING = computeRentPositioning(ASKING_RENT, LL_RENT_COMPS)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LandlordVerdictHero', () => {
  function renderHero() {
    return render(
      <LandlordVerdictHero
        property={LL_PROPERTY}
        askingRent={ASKING_RENT}
        positioning={HARBOUR_POSITIONING}
        metrics={HARBOUR_METRICS}
      />
    )
  }

  it('renders with dark background using the --ink token (not a raw hex)', () => {
    const { container } = renderHero()
    // The inner div has style={{ background: 'var(--ink)', ... }}
    const darkCard = container.querySelector('[style*="var(--ink)"]')
    expect(darkCard).toBeTruthy()
    // Specifically check it is NOT a raw hex value like #0E1320
    const styleAttr = (darkCard as HTMLElement)?.getAttribute('style') ?? ''
    expect(styleAttr).not.toMatch(/#[0-9a-fA-F]{6}/)
    expect(styleAttr).toContain('var(--ink)')
  })

  it('renders the ScoutMark SVG watermark in the DOM', () => {
    const { container } = renderHero()
    // ScoutMark renders an <svg> with viewBox="0 0 32 32" and aria-hidden="true"
    const svgMark = container.querySelector('svg[viewBox="0 0 32 32"][aria-hidden="true"]')
    expect(svgMark).toBeTruthy()
  })

  it('renders a non-empty headline (the main verdict sentence)', () => {
    renderHero()
    // Headline contains "above the building median" referencing positioning gap
    expect(screen.getByText(/above the building median/i)).toBeInTheDocument()
  })

  it('headline references the $300 positioning gap (3400 - P50 3100 = 300)', () => {
    renderHero()
    // positioning.gap = 300 → fmtMoney(Math.abs(300)) = '$300'
    // Appears in the headline: "You're $300 above the building median"
    expect(screen.getByText(/\$300/)).toBeInTheDocument()
  })

  it('headline references "38 days on market" from LL_PROPERTY ownership', () => {
    renderHero()
    expect(screen.getByText(/38 days on market/i)).toBeInTheDocument()
  })

  it('body text references the daily vacancy cost (~$113/day at $3,400/mo)', () => {
    renderHero()
    // dailyVacancyCost = Math.round(3400/30) = 113 → fmtMoney(113) = '$113'
    expect(screen.getByText(/\$113/)).toBeInTheDocument()
  })

  it('renders the "Scout AI · landlord verdict" eyebrow label', () => {
    renderHero()
    expect(screen.getByText(/scout ai · landlord verdict/i)).toBeInTheDocument()
  })

  it('renders the model attribution "claude · sonnet 4.6"', () => {
    renderHero()
    expect(screen.getByText('claude · sonnet 4.6')).toBeInTheDocument()
  })

  it('renders the cap rate in the source attribution strip', () => {
    renderHero()
    // "Cap rate at current rent: X.XX%"
    expect(screen.getByText(/Cap rate at current rent:/)).toBeInTheDocument()
  })

  it('body text renders (whitespace-stable check in place of toMatchSnapshot)', () => {
    renderHero()
    expect(screen.getByText(/Two comparable 1\+1 units in your building/i)).toBeInTheDocument()
    expect(screen.getByText(/lost rent every day the unit sits empty/i)).toBeInTheDocument()
  })
})
