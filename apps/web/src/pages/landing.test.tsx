/**
 * Tests for the Landing page and Province gate.
 *
 * URL validation is already fully tested in lib/validateUrl.test.ts.
 * ModeModal is already fully tested in components/shared/ModeModal.test.tsx.
 * This file covers Landing page rendering and Province gate (not yet built).
 *
 * LandingPage exists and is tested here for structural rendering.
 * ProvinceGate component is not yet built — those tests use it.todo().
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandingPage } from '../pages/LandingPage'

// ── LandingPage — structural rendering ───────────────────────────

describe('LandingPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<LandingPage />)).not.toThrow()
  })

  it('renders a URL input element', () => {
    render(<LandingPage />)
    // The hero has a URL paste input
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('renders an Analyse/submit button', () => {
    render(<LandingPage />)
    // Should have a button to trigger analysis
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders the pricing section with tier names', () => {
    render(<LandingPage />)
    // All tier-related strings appear multiple times — use getAllByText and assert at least one exists
    expect(screen.getAllByText(/Investor Pro/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Free/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders the Nav component', () => {
    render(<LandingPage />)
    // Nav always renders the Wordmark SVG
    const { container } = render(<LandingPage />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders the Footer', () => {
    render(<LandingPage />)
    expect(screen.getAllByText(/Privacy/i).length).toBeGreaterThan(0)
  })

  it.todo('Hero URL input has correct placeholder text')
  it.todo('Analyse button is disabled until a URL is entered')
  it.todo('Pasting a valid Realtor.ca URL enables the Analyse button')
  it.todo('Pasting an invalid URL shows inline error message')
  it.todo('Pressing Analyse with valid URL opens the ModeModal')
  it.todo('Pricing section renders all four tiers (Free, Pro, Professional, Team)')
  it.todo('FAQ section is present and at least one item is expandable')
  it.todo('FAQ item expands when clicked')
  it.todo('Nav renders in landing variant (no back link)')
  it.todo('Footer links href="/privacy" and href="/terms"')
  it.todo('axe passes on full landing page render')
  it.todo('Report showcase section renders embedded sample report cards')
  it.todo('How section renders 3-step explainer')
  it.todo('SunScout section renders the teaser')
  it.todo('CTA section renders dark full-bleed card')
})

// ── Province detection ────────────────────────────────────────────
// detectProvince logic — tested here since it feeds the landing page gate

describe('Province detection from postal code', () => {
  it.todo('Ontario prefix "M5V" → "ON" → no gate')
  it.todo('Ontario prefix "L4K" → "ON" → no gate')
  it.todo('Ontario prefix "K1A" → "ON" → no gate')
  it.todo('BC prefix "V6B" → "BC" → gate triggered')
  it.todo('Alberta prefix "T2P" → "AB" → gate triggered')
  it.todo('Unknown prefix → "unknown" → gate triggered (safe default)')
})

// ── ProvinceGate component ────────────────────────────────────────
// Not yet built — all tests are .todo

describe('ProvinceGate', () => {
  it.todo('renders the correct province name in the heading (prop-driven, not hardcoded)')
  it.todo('email capture form renders with an email input')
  it.todo('submitting a valid email calls onSubmit with { email, province }')
  it.todo('submitting empty email shows validation error')
  it.todo('submitting invalid email format shows validation error')
  it.todo('submitted=true shows success state confirming email was captured')
  it.todo('axe passes on province gate render')
})

// ── ModeModal (PR 3 scope) ────────────────────────────────────────
// ModeModal is already fully tested in components/shared/ModeModal.test.tsx.
// The tests below summarize what is covered there so the PR 3 scope is complete.

describe('ModeModal (covered in ModeModal.test.tsx)', () => {
  it.todo('See ModeModal.test.tsx — does not render when open=false')
  it.todo('See ModeModal.test.tsx — for-sale URL shows Investment and Personal options')
  it.todo('See ModeModal.test.tsx — for-rent URL shows Tenant and Landlord options')
  it.todo('See ModeModal.test.tsx — onSelect fires correct mode after animation')
  it.todo('See ModeModal.test.tsx — Escape key calls onClose')
  it.todo('See ModeModal.test.tsx — backdrop click calls onClose')
  it.todo('See ModeModal.test.tsx — axe passes')
})
