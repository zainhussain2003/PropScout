/**
 * a11y — accessibility tests for all new PR6 components
 *
 * PR6 · Accessibility tests
 * Test file path: Week3-4 Front end/PR6/a11y.test.tsx
 *
 * Uses jest-axe (same tool as PR4/PR5) to assert zero axe violations for
 * each component rendered with valid props from the Burlington / Harbour fixtures.
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import { vi } from 'vitest'

// ── PR6 components ─────────────────────────────────────────────────────────────
import { SchoolCard } from '../../apps/web/src/components/personal/SchoolCard'
import { SchoolColumn } from '../../apps/web/src/components/personal/SchoolColumn'
import { PBTrueCostSection } from '../../apps/web/src/components/personal/PBTrueCostSection'
import { PBFMVSection } from '../../apps/web/src/components/personal/PBFMVSection'
import { PBSalesSection } from '../../apps/web/src/components/personal/PBSalesSection'
import { LandlordPropertyHero } from '../../apps/web/src/components/landlord/LandlordPropertyHero'
import { LandlordRentPositioningSection } from '../../apps/web/src/components/landlord/LandlordRentPositioningSection'

// ── Burlington fixtures ────────────────────────────────────────────────────────
import {
  PB_PROPERTY,
  PB_SCHOOLS,
  PB_COMPS,
  PB_NEIGHBOURHOOD,
  computeMonthlyCost,
  computeHomeScore,
} from '../../apps/web/src/data/personalBuyerData'

// ── Harbour Street fixtures ────────────────────────────────────────────────────
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
import type { PersonalSchool } from '../../apps/web/src/types/personal'

// ── Shared computed fixtures ───────────────────────────────────────────────────

const FINANCING = {
  downPct: PB_PROPERTY.defaultDownPct,
  rate: PB_PROPERTY.defaultRate,
  amort: PB_PROPERTY.defaultAmort,
}
const PB_MONTHLY = computeMonthlyCost(PB_PROPERTY, FINANCING)
const PB_SCORE = computeHomeScore(PB_PROPERTY, PB_SCHOOLS, PB_NEIGHBOURHOOD, 76)

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
const HARBOUR_SCORE = computeLandlordDealScore(HARBOUR_METRICS, LL_PROPERTY)
const HARBOUR_POSITIONING = computeRentPositioning(ASKING_RENT, LL_RENT_COMPS)

const ELEMENTARY_SCHOOL: PersonalSchool = PB_SCHOOLS.elementary[0] // Tom Thomson (inCatchment: true)
const NON_CATCHMENT_SCHOOL: PersonalSchool = PB_SCHOOLS.elementary[1] // Lakeshore (inCatchment: false)

// ── Accessibility tests ────────────────────────────────────────────────────────

describe('a11y — SchoolCard', () => {
  it('in-catchment=true: zero axe violations', async () => {
    const { container } = render(<SchoolCard school={ELEMENTARY_SCHOOL} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('in-catchment=false: zero axe violations', async () => {
    const { container } = render(<SchoolCard school={NON_CATCHMENT_SCHOOL} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — SchoolColumn', () => {
  it('elementary column with two schools: zero axe violations', async () => {
    const { container } = render(
      <SchoolColumn label="Elementary" schools={[ELEMENTARY_SCHOOL, NON_CATCHMENT_SCHOOL]} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — PBTrueCostSection', () => {
  it('zero axe violations', async () => {
    const { container } = render(<PBTrueCostSection property={PB_PROPERTY} monthly={PB_MONTHLY} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — PBFMVSection', () => {
  it('zero axe violations', async () => {
    const { container } = render(
      <PBFMVSection property={PB_PROPERTY} score={PB_SCORE} compCount={8} avgDOM={12} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — PBSalesSection', () => {
  it('zero axe violations', async () => {
    const { container } = render(<PBSalesSection comps={PB_COMPS} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — LandlordPropertyHero', () => {
  it('zero axe violations', async () => {
    const { container } = render(
      <LandlordPropertyHero
        property={LL_PROPERTY}
        askingRent={ASKING_RENT}
        metrics={HARBOUR_METRICS}
        score={HARBOUR_SCORE}
        positioning={HARBOUR_POSITIONING}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — LandlordRentPositioningSection', () => {
  it('zero axe violations', async () => {
    const onRentChange = vi.fn()
    const { container } = render(
      <LandlordRentPositioningSection
        property={LL_PROPERTY}
        askingRent={ASKING_RENT}
        onRentChange={onRentChange}
        positioning={HARBOUR_POSITIONING}
        comps={LL_RENT_COMPS}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
