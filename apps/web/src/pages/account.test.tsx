/**
 * Tests for the Account dashboard page (/account).
 *
 * Page not built yet — all tests use it.todo().
 * The account page has 4 tabs: saved, profile, plan, notifications.
 */

import { describe, it } from 'vitest'

// ── Account dashboard ─────────────────────────────────────────────

describe('Account page', () => {
  it.todo('/account renders the account dashboard without crashing')
  it.todo('default view shows "saved" tab as active')
  it.todo('?view=saved query param activates the saved analyses tab')
  it.todo('?view=profile query param activates the profile tab')
  it.todo('?view=plan query param activates the plan/billing tab')
  it.todo('?view=notifications query param activates the notifications tab')
  it.todo('switching tabs does not cause a full page reload (SPA navigation)')
  it.todo('unauthenticated user is redirected to sign-in page')
  it.todo('axe passes on saved tab view')
  it.todo('axe passes on profile tab view')
  it.todo('axe passes on plan tab view')
  it.todo('axe passes on notifications tab view')
})

describe('Account — saved analyses tab', () => {
  it.todo('renders list of saved analyses for authenticated user')
  it.todo('empty state shows "No saved analyses yet" or equivalent')
  it.todo('each saved analysis shows the address, date, and deal score')
  it.todo('clicking a saved analysis navigates to the report page')
  it.todo('delete button removes the analysis from the list')
})

describe('Account — profile tab', () => {
  it.todo('shows current user email')
  it.todo('name field is editable')
  it.todo('saving profile calls the update API')
  it.todo('success message shown after save')
})

describe('Account — plan tab', () => {
  it.todo('shows current tier name (Free, Pro, Professional, Team)')
  it.todo('Free tier shows upgrade CTA')
  it.todo('Pro tier shows "Manage subscription" link to Stripe billing portal')
  it.todo('shows analyses used this month vs monthly limit')
  it.todo('shows next billing date for paid tiers')
})

// ── Auth stub pages ───────────────────────────────────────────────

describe('Auth stub pages', () => {
  it.todo('/auth/confirm renders MagicLinkConfirmed component')
  it.todo('/auth/reset renders PasswordResetRequest with an email input')
  it.todo('/auth/reset/confirm renders PasswordResetConfirm with a new password input')
  it.todo('/auth/verified renders EmailVerified confirmation')
  it.todo('/welcome-to-pro renders StripeWelcomePro page')
  it.todo('/checkout/cancelled renders StripeCancelled page')
  it.todo('axe passes on each auth stub page')
})
