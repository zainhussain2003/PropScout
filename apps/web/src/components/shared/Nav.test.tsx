/**
 * Nav (report variant) — the controls do what they say, for whoever is looking.
 *
 * Seen on the first signed-in production run (2026-09-12): the owner's own
 * report offered them "Sign in"; "Share link" had no handler; "Save to
 * account" (paid tiers) called the sign-in callback and did nothing. D-059.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PaywallContext } from '../paywall/PaywallContext'

const useAuthMock = vi.fn()
vi.mock('../../hooks/useAuth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/useAuth')>()),
  useAuth: () => useAuthMock(),
}))

const navigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))

import { Nav } from './Nav'

const SIGNED_OUT = { session: null, user: null, loading: false }
const SIGNED_IN = { session: { access_token: 'jwt' }, user: { email: 'o@x.com' }, loading: false }

function renderReportNav(tier: string, onSignIn = vi.fn()): ReturnType<typeof vi.fn> {
  render(
    <PaywallContext.Provider
      value={{ tier, openUpgradeModal: () => undefined, openHardGate: () => undefined }}
    >
      <MemoryRouter>
        <Nav
          variant="report"
          dark={false}
          onToggleDark={() => undefined}
          onSignIn={onSignIn}
          reportLabel="Investor report"
          addressSlug="5-buttermill-ave"
        />
      </MemoryRouter>
    </PaywallContext.Provider>
  )
  return onSignIn
}

describe('Nav — report variant', () => {
  beforeEach(() => {
    navigate.mockReset()
    useAuthMock.mockReturnValue(SIGNED_OUT)
  })

  it('offers Sign in to a visitor, and it opens the sign-in flow', () => {
    const onSignIn = renderReportNav('free')
    fireEvent.click(screen.getByRole('button', { name: /^Sign in$/ }))
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it('offers Account, not Sign in, to someone who is signed in', () => {
    useAuthMock.mockReturnValue(SIGNED_IN)
    renderReportNav('free')
    expect(screen.queryByRole('button', { name: /^Sign in$/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Account$/ }))
    expect(navigate).toHaveBeenCalledWith('/account')
  })

  it('Share link copies the current URL and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderReportNav('free')
    fireEvent.click(screen.getByRole('button', { name: /Share link/ }))
    expect(writeText).toHaveBeenCalledWith(window.location.href)
    // Both the button and the slug acknowledge the copy.
    expect((await screen.findAllByText(/Link copied/)).length).toBeGreaterThanOrEqual(1)
  })

  it('shows no "Save to account" button on paid tiers — there is nothing to save to yet', () => {
    useAuthMock.mockReturnValue(SIGNED_IN)
    renderReportNav('pro')
    expect(screen.queryByText(/Save to account/)).not.toBeInTheDocument()
  })

  it('keeps the locked Save control on the free tier', () => {
    renderReportNav('free')
    expect(screen.getByText(/^Save$/)).toBeInTheDocument()
  })
})
