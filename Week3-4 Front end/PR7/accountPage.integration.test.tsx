/**
 * AccountPage — integration tests
 *
 * PR7 · Account page integration tests
 * Test file path: Week3-4 Front end/PR7/accountPage.integration.test.tsx
 *
 * All renders are wrapped in MemoryRouter with initialEntries
 * so that useSearchParams resolves to the correct view.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AccountPage } from '../../apps/web/src/pages/AccountPage'

function renderWithView(view: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/', search: `?view=${view}` }]}>
      <AccountPage />
    </MemoryRouter>
  )
}

describe('AccountPage — ?view=saved', () => {
  it('renders "Saved analyses" text', () => {
    renderWithView('saved')
    expect(screen.getAllByText(/Saved analyses/i).length).toBeGreaterThanOrEqual(1)
  })

  it('says saving is unavailable rather than showing analyses the user never ran', () => {
    // The page used to render eight hardcoded analyses — real Toronto and
    // Vaughan addresses with scores, verdicts, "3 hours ago" and open counts —
    // to every signed-in user as their own history. There is no save-to-account
    // feature and no endpoint listing a user's analyses, so the honest state is
    // "not available", not "nothing saved yet".
    renderWithView('saved')
    expect(
      screen.getByText(/Saving reports to your account isn.t available yet/i)
    ).toBeInTheDocument()
  })

  it('renders none of the fabricated addresses', () => {
    renderWithView('saved')
    for (const address of [
      'Unit 5702 · 5 Buttermill Ave',
      '146 East 19th Street',
      'Unit 3705 · 28 Charles St E',
      '248 Mountcrest Avenue',
      'Unit 3208 · 88 Harbour Street',
      '128 Spadina Road',
      '17 Linden Avenue',
      '42 Wellesley St E #1107',
    ]) {
      expect(screen.queryByText(address)).not.toBeInTheDocument()
    }
  })

  it('does not claim a used quota when the real count is unavailable', () => {
    // "You've saved 8 of 10 on the free plan · 2 slots left" was computed from
    // the fixture's length, so it invented a history AND manufactured scarcity
    // against the free limit. Signed out, there is no figure to show.
    renderWithView('saved')
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/8 of 10/)
    expect(text).not.toMatch(/slots? left/i)
  })
})

describe('AccountPage — ?view=profile', () => {
  it('renders "Profile" text', () => {
    renderWithView('profile')
    expect(screen.getAllByText(/Profile/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows no invented identity', () => {
    // The identity card was pre-filled with a name and email belonging to
    // nobody. Signed out there is nothing to show, so it must read as unset —
    // never as a plausible real person.
    renderWithView('profile')
    expect(screen.queryByDisplayValue('Marcus Reilly')).not.toBeInTheDocument()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/Marcus Reilly/)
    expect(text).not.toMatch(/marcus\.reilly@example\.com/)
    expect(text).not.toMatch(/March 2026/)
  })
})

describe('AccountPage — ?view=plan', () => {
  it('renders "Plan" text in the page', () => {
    renderWithView('plan')
    expect(screen.getAllByText(/Plan/i).length).toBeGreaterThanOrEqual(1)
  })
})

describe('AccountPage — ?view=notifications', () => {
  it('renders "Notifications" text', () => {
    renderWithView('notifications')
    expect(screen.getAllByText(/Notifications/i).length).toBeGreaterThanOrEqual(1)
  })
})

describe('AccountPage — ?view=plan', () => {
  it('shows no fabricated invoices', () => {
    // Three hardcoded "Investor Pro · monthly · $10.00 · Paid" rows were shown
    // as a payment history. Stripe's portal is the only real source; the card
    // now points at it via the existing Manage plan button.
    renderWithView('plan')
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/May 24, 2026/)
    expect(text).not.toMatch(/\$10\.00/)
    expect(screen.queryByText('Paid')).not.toBeInTheDocument()
  })
})
