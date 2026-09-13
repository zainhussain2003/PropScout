/**
 * AccountPage — integration tests
 *
 * PR7 · Account page integration tests
 * Test file path: Week3-4 Front end/PR7/accountPage.integration.test.tsx
 *
 * All renders are wrapped in MemoryRouter with initialEntries
 * so that useSearchParams resolves to the correct view.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// The page is only a page for someone signed in. Each group below says which
// it is; the default is a signed-in session with the usage fetch left to fail
// (no API in jsdom), so the views render with usage "unavailable".
const useAuthMock = vi.fn()
vi.mock('../../apps/web/src/hooks/useAuth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../apps/web/src/hooks/useAuth')>()),
  useAuth: () => useAuthMock(),
}))

import { AccountPage } from '../../apps/web/src/pages/AccountPage'
import { PaywallContext } from '../../apps/web/src/components/paywall/PaywallContext'

const SIGNED_IN = {
  session: { access_token: 'jwt-1', user: { email: 'owner@example.com', user_metadata: {} } },
  user: { email: 'owner@example.com' },
  loading: false,
  signIn: async () => ({ error: null }),
  signInGoogle: async () => ({ error: null }),
  signOut: async () => undefined,
}
const SIGNED_OUT = { ...SIGNED_IN, session: null, user: null }
const AUTH_LOADING = { ...SIGNED_OUT, loading: true }

beforeEach(() => {
  useAuthMock.mockReturnValue(SIGNED_IN)
})

function renderWithView(view: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/', search: `?view=${view}` }]}>
      <AccountPage />
    </MemoryRouter>
  )
}

// ── Signed out: no account shell, no false "couldn't load" ───────────────────
//
// Found on the first production run (2026-09-12): /account with no session
// rendered the sidebar, an "Account · FREE" chip and "We couldn't load your
// usage just now" — nothing had been loaded because nobody was signed in.

describe('AccountPage — signed out', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue(SIGNED_OUT)
  })

  it('asks the visitor to sign in instead of claiming a load failure', () => {
    renderWithView('saved')
    expect(screen.getByText(/Sign in to see your account/i)).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/couldn.t load your usage/i)
    expect(text).not.toMatch(/Saving reports to your account/i)
  })

  it('shows no plan chip, sidebar or tier for a person who has none', () => {
    renderWithView('plan')
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\bFREE\b/)
    expect(screen.queryByText(/Saved analyses/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Manage plan/i)).not.toBeInTheDocument()
  })

  it('opens the sign-in modal from the card', () => {
    renderWithView('saved')
    fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }))
    expect(screen.getByText(/Send magic link/i)).toBeInTheDocument()
  })

  it('renders nothing while the stored session is still being read', () => {
    useAuthMock.mockReturnValue(AUTH_LOADING)
    renderWithView('saved')
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/Sign in to see your account/i)
    expect(text).not.toMatch(/Saved analyses/i)
  })
})

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
    // against the free limit. With the usage fetch failing there is no figure
    // to show.
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
    // nobody. It must show the session's own identity — never a plausible
    // invented person.
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

  // ── "This month's usage" was a fixture ──────────────────────────────────────
  //
  // Found live on the first signed-in production run (2026-09-12), after
  // D-064 had removed the same class of invention from the Saved tab: the
  // plan view told a user who had run three analyses that they had used
  // "2 / 3", had made "8" tenant reports, and had "8 / 10" saved analyses.

  // The context default outside a Provider is 'pro'; the free plan is where
  // the cap and the fixtures both lived.
  function renderFreePlan() {
    return render(
      <PaywallContext.Provider
        value={{ tier: 'free', openUpgradeModal: () => undefined, openHardGate: () => undefined }}
      >
        <MemoryRouter initialEntries={[{ pathname: '/', search: '?view=plan' }]}>
          <AccountPage />
        </MemoryRouter>
      </PaywallContext.Provider>
    )
  }

  it('shows no invented usage figures', () => {
    renderFreePlan()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/2\s*\/\s*3/)
    expect(text).not.toMatch(/8\s*\/\s*10/)
    expect(text).not.toMatch(/Three sale-listing/)
    expect(text).not.toMatch(/Tenant reports\s*8/)
  })

  it('shows the real monthly count against the real limit', async () => {
    // A fresh Response per call: the nav and the plan view each read /me,
    // and a body can only be consumed once.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ analysesThisMonth: 3, createdAt: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    renderFreePlan()
    await screen.findByText(
      (_, el) => el?.tagName === 'SPAN' && /^3\s*\/\s*10$/.test(el.textContent ?? '')
    )
    expect(document.body.textContent ?? '').toMatch(/10 sale-listing analyses per month/)
    fetchSpy.mockRestore()
  })

  it('leaves the count blank, not zero, when usage cannot be loaded', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    renderFreePlan()
    expect(await screen.findByText(/Usage unavailable right now/)).toBeInTheDocument()
    expect(document.body.textContent ?? '').not.toMatch(/0 \/ 10/)
    fetchSpy.mockRestore()
  })

  it('does not put a number on things that are not counted', () => {
    renderFreePlan()
    expect(screen.getByText(/Always unlimited · not counted/)).toBeInTheDocument()
    expect(screen.getByText(/Locked on free tier/)).toBeInTheDocument()
  })
})

// ── Profile and notifications carry no inert controls (audit A-03 / A-04) ──────
//
// The profile view offered inputs for down payment, income, appreciation and
// management fee under "used when you first open a report", a "Request export"
// button and a "Delete account…" button — none saved or did anything. The
// notifications view showed five toggles, three defaulting ON under "Listings
// you've asked us to monitor", while no monitoring job exists.

describe('AccountPage — no control claims what it cannot do', () => {
  it('profile has no inputs, no export button and no delete button', () => {
    renderWithView('profile')
    expect(document.querySelectorAll('main input, main select').length).toBe(0)
    expect(screen.queryByRole('button', { name: /Request export/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete account/ })).not.toBeInTheDocument()
    expect(screen.getAllByText(/Not available yet/).length).toBeGreaterThanOrEqual(2)
    expect(document.body.textContent ?? '').not.toMatch(/Used when you first open/)
  })

  it('notifications say nothing is being monitored, and offer no toggles', () => {
    renderWithView('notifications')
    expect(document.body.textContent ?? '').toMatch(/does not send any notifications yet/)
    expect(document.body.textContent ?? '').not.toMatch(/asked us to monitor/)
    // The old toggles were buttons with no accessible name.
    const nameless = [...document.querySelectorAll('main button')].filter(
      (b) => (b.textContent ?? '').trim() === ''
    )
    expect(nameless.length).toBe(0)
    expect(screen.getAllByText(/Not connected/).length).toBe(4)
  })
})
