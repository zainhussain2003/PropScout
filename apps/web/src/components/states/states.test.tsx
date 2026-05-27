/**
 * Tests for error, empty, and gate state components.
 *
 * None of these components are built yet — all tests use it.todo().
 */

import { describe, it } from 'vitest'

// ── BlockState ────────────────────────────────────────────────────

describe('BlockState', () => {
  it.todo('renders the eyebrow text from the eyebrow prop')
  it.todo('renders the headline text from the headline prop')
  it.todo('renders the body text from the body prop')
  it.todo('primary action button renders when primaryAction prop is supplied')
  it.todo('secondary action button renders when secondaryAction prop is supplied')
  it.todo('no buttons rendered when neither action prop is supplied')
  it.todo('tone="error" drives the error icon and colour variant')
  it.todo('tone="warning" drives the warning icon and colour variant')
  it.todo('tone="empty" drives the empty state icon and colour variant')
  it.todo('axe passes with zero violations')
})

// ── ProvinceGate (inline state variant) ──────────────────────────

describe('ProvinceGate', () => {
  it.todo('renders the province name in the heading (prop-driven, not hardcoded)')
  it.todo('renders "BC" in heading when province="BC"')
  it.todo('renders "AB" in heading when province="AB"')
  it.todo('email input is present with type="email"')
  it.todo('submitting a valid email calls onSubmit with { email, province }')
  it.todo('submitting empty email shows a validation error message')
  it.todo('submitting invalid email format (no @) shows a validation error')
  it.todo('submitted=true shows success confirmation state')
  it.todo('success state shows "We will notify you" or similar message')
  it.todo('axe passes with zero violations')
})

// ── NoCompsInlineState ────────────────────────────────────────────

describe('NoCompsInlineState', () => {
  it.todo('renders a low-confidence callout message')
  it.todo('does not crash when rendered with no props')
  it.todo('does not crash when rendered with empty comps array')
  it.todo('shows "low confidence" or equivalent label')
  it.todo('shows the number of comps found (e.g. "0 comparable rentals found")')
})

// ── ScraperPartialInlineState ─────────────────────────────────────

describe('ScraperPartialInlineState', () => {
  it.todo('renders "X of Y fields found" string based on fieldsFound and totalFields props')
  it.todo('renders a manual input for each missing field')
  it.todo('submitting manually entered values calls the onSubmit handler')
  it.todo('onSubmit receives an object with all manually entered field values')
  it.todo('renders without crashing when all fields were found (no missing fields)')
  it.todo('renders without crashing when no fields were found (all missing)')
})
