/**
 * Mobile responsive tests — all run at 380px viewport width.
 *
 * Most dependent components do not exist yet — use it.todo() for those.
 * A few basic responsive checks on existing components are marked .todo
 * because they require viewport simulation that is not yet set up.
 */

import { describe, it } from 'vitest'

// ── Setup note ────────────────────────────────────────────────────
// Tests in this file require viewport width = 380px.
// Setup: beforeAll(() => { Object.defineProperty(window, 'innerWidth', { value: 380, writable: true }) })
// Full responsive CSS is not applied in jsdom — these tests verify DOM structure,
// not visual layout. CSS class presence is verified where applicable.

// ── ModeModal at 380px ────────────────────────────────────────────

describe('ModeModal at 380px mobile viewport', () => {
  it.todo('renders as a bottom-sheet (has bottom-sheet class or position:fixed bottom:0)')
  it.todo('choice cards stack vertically (not side-by-side) at 380px')
  it.todo('drag handle element present in DOM at mobile size')
  it.todo('axe passes at 380px viewport')
})

// ── Investor report at 380px ──────────────────────────────────────

describe('Investor report at 380px mobile viewport', () => {
  it.todo('layout is single-column — two-column class NOT applied at 380px')
  it.todo('score card appears above the content section in DOM order at mobile')
  it.todo('DealScore gauge renders at 84px or smaller on mobile (size ≤ 84)')
  it.todo('sticky bottom action bar renders at mobile (Save/Share/PDF row)')
  it.todo('sticky bar has position:fixed and bottom:0 at mobile')
})

// ── Tenant report at 380px ────────────────────────────────────────

describe('Tenant report at 380px mobile viewport', () => {
  it.todo('single-column layout — no multi-column class at 380px')
  it.todo('all 12 sections still render in the DOM at 380px')
  it.todo('FlagDeepRow expand/collapse still works at 380px')
})

// ── AIVerdictBlock at 380px ───────────────────────────────────────

describe('AIVerdictBlock at 380px mobile viewport', () => {
  it.todo('only headline text visible initially at 380px')
  it.todo('"Read full verdict" button or link is present')
  it.todo('clicking "Read full verdict" expands the full body text')
})

// ── Account dashboard at 380px ────────────────────────────────────

describe('Account dashboard at 380px mobile viewport', () => {
  it.todo('all 4 tab buttons visible and not cut off at 380px')
  it.todo('active tab content renders below tab row at 380px')
  it.todo('no horizontal scroll on account page at 380px')
})

// ── Legal pages at 380px ──────────────────────────────────────────

describe('Legal pages at 380px mobile viewport', () => {
  it.todo('TOC sidebar collapsed or moved below content at 380px (no side-by-side)')
  it.todo('no horizontal scroll on privacy page at 380px')
  it.todo('no horizontal scroll on terms page at 380px')
})

// ── Cross-PR mobile regression ────────────────────────────────────

describe('Cross-PR mobile regression at 380px', () => {
  it.todo('landing page hero renders correctly at 380px')
  it.todo('URL input bar is full-width and tappable at 380px')
  it.todo('ModeModal bottom-sheet animation class is present at 380px')
  it.todo('Nav component is present on all report pages at 380px')
  it.todo('Footer links are tappable — min 44px touch target at 380px')
  it.todo('primary CTA button is full-width at 380px')
  it.todo('pricing cards stack vertically at 380px')
})
