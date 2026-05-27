/**
 * Tests for personal buyer report components (Report B).
 *
 * None of these components are built yet — all tests use it.todo().
 * They will pass once the personal buyer report is built.
 *
 * Report B — Personal purchase: for-sale URL + user selects "Personal use".
 */

import { describe, it } from 'vitest'

// ── SchoolCard ────────────────────────────────────────────────────

describe('SchoolCard', () => {
  it.todo('renders school name')
  it.todo('renders board name')
  it.todo('renders the school rating')
  it.todo('EQAO score is displayed when present')
  it.todo('Fraser score is displayed when present')
  it.todo('catchment badge is present when is_catchment=true')
  it.todo('catchment badge is absent when is_catchment=false')
  it.todo('missing EQAO data shows "No data" not blank')
  it.todo('missing Fraser data shows "No data" not blank')
  it.todo('renders without crashing when all optional fields are absent')
})

// ── SchoolColumn ──────────────────────────────────────────────────

describe('SchoolColumn', () => {
  it.todo('renders elementary, middle, and high school cards in a column')
  it.todo('empty school list renders without crashing')
  it.todo('renders board-specific school cards (public vs Catholic)')
  it.todo('column label identifies the board type (public/Catholic)')
})

// ── PBTrueCostSection ─────────────────────────────────────────────

describe('PBTrueCostSection', () => {
  it.todo('renders itemised monthly cost table')
  it.todo('mortgage row is present and formatted as $/mo')
  it.todo('property tax row is present')
  it.todo('condo fee row is present (or hidden if $0)')
  it.todo('insurance row is present')
  it.todo('maintenance reserve row is present')
  it.todo('total row equals the sum of all displayed line items')
  it.todo('all-zero inputs render $0 values — not NaN, not blank')
  it.todo('large values format correctly with thousands separators')
})

// ── PBFMVSection ──────────────────────────────────────────────────

describe('PBFMVSection', () => {
  it.todo('renders the FMV positioning bar')
  it.todo('ask_price marker position is proportional to (ask - low) / (high - low)')
  it.todo('ask above high → marker is at or past the right end without overflowing container')
  it.todo('ask below low → marker is at the left end')
  it.todo('ask equal to mid → marker is centred')
  it.todo('renders FMV range label with low and high dollar amounts')
  it.todo('verdict label: "Above FMV", "At FMV", or "Below FMV"')
})

// ── PBSalesSection ────────────────────────────────────────────────

describe('PBSalesSection', () => {
  it.todo('renders comparable sales table with address, price, and date columns')
  it.todo('at least one row renders when comps data is provided')
  it.todo('empty comps array shows "No comparable sales found" or equivalent')
  it.todo('price per sqft column is present')
  it.todo('DOM (days on market) column is present')
  it.todo('sold price is formatted as $X,XXX,XXX')
})

// ── Personal buyer report page — integration ──────────────────────

describe('Personal buyer report page integration', () => {
  it.todo('all 6 section headings render (§ 01 through § 06)')
  it.todo('SchoolColumn renders with 3 schools per board (elementary, middle, high)')
  it.todo('PBTrueCostSection renders with all cost rows')
  it.todo('PBFMVSection renders with a positioned marker')
  it.todo('PBSalesSection renders with at least one comparable sale row')
  it.todo('PropertyHero renders with address and price')
  it.todo('axe passes on full personal buyer report render')
})
