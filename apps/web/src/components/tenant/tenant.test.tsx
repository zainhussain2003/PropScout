/**
 * Tests for tenant report components.
 *
 * None of these components are built yet — all tests use it.todo().
 * They will pass once the tenant report is built in the corresponding PR.
 *
 * Tenant report (Report C) is the free funnel — shown for for-rent URLs
 * when user selects "I'm a tenant".
 */

import { describe, it } from 'vitest'

// ── FlagDeepRow ───────────────────────────────────────────────────

describe('FlagDeepRow', () => {
  it.todo('renders collapsed state by default (detail not visible on initial render)')
  it.todo('clicking the row expands it to show the evidence quote')
  it.todo('clicking again collapses and hides the evidence quote')
  it.todo('"Ask before signing" link or button is present when expanded')
  it.todo('tone="red" → red indicator class or color applied')
  it.todo('tone="amber" → amber indicator class or color applied')
  it.todo('has role="button" or is a button element')
  it.todo('aria-expanded is false when collapsed')
  it.todo('aria-expanded is true when expanded')
  it.todo('renders label text in collapsed state')
  it.todo('renders evidence text only when expanded')
})

// ── ListedVsRealitySection ────────────────────────────────────────

describe('ListedVsRealitySection', () => {
  it.todo('does NOT render when no flags fired (conditional render returns null)')
  it.todo('renders when at least one flag fires')
  it.todo('shows side-by-side "Listed" and "Reality" cards when flags present')
  it.todo('renders as many flag pairs as there are fired flags')
  it.todo('empty flags array → section is null')
})

// ── WhatsIncludedSection ──────────────────────────────────────────

describe('WhatsIncludedSection', () => {
  it.todo('renders amenity grid')
  it.todo('items with status="included" have the included class or styling')
  it.todo('items with status="extra" have the extra class or styling')
  it.todo('items with status="unclear" have the unclear class or styling')
  it.todo('empty amenities array renders the section without crashing')
  it.todo('renders icon or label for each amenity')
  it.todo('counts of each status type are reflected correctly')
})

// ── LocationCommuteSection ────────────────────────────────────────

describe('LocationCommuteSection', () => {
  it.todo('renders Walk Score value and label')
  it.todo('renders Transit Score value and label')
  it.todo('renders Bike Score value and label')
  it.todo('score = 0 renders "0" not blank or undefined')
  it.todo('score = 100 renders "100" not blank or undefined')
  it.todo('distances list renders at least one destination')
  it.todo('missing score data shows "No data" or equivalent (not blank)')
})

// ── NegotiationSection ────────────────────────────────────────────

describe('NegotiationSection', () => {
  it.todo('renders the leverage card')
  it.todo('renders the suggested message card with copy-pasteable text')
  it.todo('copy button (if present) copies the suggested message text to clipboard')
  it.todo('empty leverage text renders the section without errors')
  it.todo('leverage score drives the strength label (strong/moderate/weak)')
})

// ── TenantSchoolsSection ──────────────────────────────────────────

describe('TenantSchoolsSection', () => {
  it.todo('renders 3 school levels: elementary, middle, and high')
  it.todo('each school shows board name, school name, and rating')
  it.todo('catchment badge is visible when is_catchment=true')
  it.todo('missing rating data shows "Not rated" (not blank, not undefined)')
  it.todo('renders one school per board per level (slim version)')
})

// ── Full unit breakdown card ──────────────────────────────────────

describe('Unit breakdown card (tenant)', () => {
  it.todo('all scraped fields render: beds, baths, sqft, parking, laundry, etc.')
  it.todo('missing field shows "Not listed" exactly (not undefined, null, or blank)')
  it.todo('no field shows "undefined" in rendered output')
  it.todo('no field shows "null" in rendered output')
  it.todo('renders the full address from the listing data')
})

// ── Confirm-before-signing checklist ─────────────────────────────

describe('Confirm-before-signing checklist', () => {
  it.todo('checklist items are dynamically generated from the fired flags list')
  it.todo('zero flags → checklist is empty or the section is hidden')
  it.todo('each checklist item has a checkbox')
  it.todo('negotiation script text is present and selectable/copyable')
  it.todo('conversion prompt links to Report A investor flow')
})

// ── Tenant report page — integration ─────────────────────────────

describe('Tenant report page integration', () => {
  it.todo('all 12 section headings render (§ 01 through § 12)')
  it.todo('PropertyHero renders with address and listing details')
  it.todo('page loads without requiring login (no auth redirect for tenant mode)')
  it.todo('all 12 sections render in correct vertical order')
  it.todo('FlagDeepRow expand/collapse works in context of full page')
  it.todo('ListedVsRealitySection only appears when flags fired')
  it.todo('Confirm-before-signing section appears at the bottom')
  it.todo('axe passes on full tenant report render')
})
