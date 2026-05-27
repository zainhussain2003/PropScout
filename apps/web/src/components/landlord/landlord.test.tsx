/**
 * Tests for landlord report components (Report D).
 *
 * Report D reuses many investor components. None of the landlord-specific
 * or investor integration components are built yet — all tests use it.todo().
 *
 * Report D — Landlord rental: for-rent URL + user selects "I'm a landlord".
 */

import { describe, it } from 'vitest'

// ── Component reuse verification ──────────────────────────────────
// These verify that investor components are reused, not re-defined.

describe('Investor component reuse in landlord report', () => {
  it.todo('DealScore imported from analysis/, not re-defined in landlord')
  it.todo('Metric tiles imported from analysis/, not re-defined in landlord')
  it.todo('RentalCompsBar imported from analysis/, not re-defined in landlord')
  it.todo('FinancingSliders imported from investor/, not re-defined in landlord')
  it.todo('EquityChart imported from investor/, not re-defined in landlord')
})

// ── Landlord-specific sections ────────────────────────────────────

describe('Landlord report sections', () => {
  it.todo('renders all landlord-specific section headings')
  it.todo('RentalCompsBar is present showing current asking rent vs comps')
  it.todo('Deal Score gauge renders with landlord-specific scoring inputs')
  it.todo('Risk flags section shows landlord-relevant flags')
  it.todo('Financing sliders are present (rent sensitivity analysis)')
  it.todo('Vacancy rate metric is displayed')
  it.todo('Gross Rent Multiplier metric is displayed')
})

// ── Landlord report page — integration ───────────────────────────

describe('Landlord report page integration', () => {
  it.todo('all section headings render for landlord report')
  it.todo('PropertyHero renders with address and asking rent')
  it.todo('FinancingSliders present (reused from investor report)')
  it.todo('axe passes on full landlord report render')
  it.todo('report loads without requiring login')
  it.todo('RentalCompsBar shows asking price vs P25/P50/P75 comps')
  it.todo('changing rate slider updates yield metrics')
})
