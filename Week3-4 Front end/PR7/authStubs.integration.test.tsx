/**
 * Auth stub pages — integration tests
 *
 * PR7 · Auth stub page tests
 * Test file path: Week3-4 Front end/PR7/authStubs.integration.test.tsx
 *
 * Each page is wrapped in MemoryRouter (required for useNavigate).
 * Tests assert the key headline appears and the primary CTA button is present.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// The reset-request page had no test that it called anything, which is how it
// shipped showing "Reset link sent." from a bare setState. Mocked here so the
// call itself can be asserted.
// Only resetPasswordForEmail is replaced — the rest of the module is real, so
// MagicLinkConfirmedPage keeps its onAuthStateChange subscription.
const resetPasswordForEmail = vi.fn()
vi.mock('../../apps/web/src/lib/services/authService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../apps/web/src/lib/services/authService')>()),
  resetPasswordForEmail: (email: string) => resetPasswordForEmail(email),
}))

import { MagicLinkSentPage } from '../../apps/web/src/pages/MagicLinkSentPage'
import { MagicLinkConfirmedPage } from '../../apps/web/src/pages/MagicLinkConfirmedPage'
import { PasswordResetRequestPage } from '../../apps/web/src/pages/PasswordResetRequestPage'
import { PasswordResetConfirmPage } from '../../apps/web/src/pages/PasswordResetConfirmPage'
import { EmailVerifiedPage } from '../../apps/web/src/pages/EmailVerifiedPage'
import { StripeWelcomePage } from '../../apps/web/src/pages/StripeWelcomePage'
import { StripeCancelledPage } from '../../apps/web/src/pages/StripeCancelledPage'
import { NotFoundPage } from '../../apps/web/src/pages/NotFoundPage'

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

// ── MagicLinkSentPage ──────────────────────────────────────────────────────────

describe('MagicLinkSentPage', () => {
  it('renders "Magic link sent." headline', () => {
    wrap(<MagicLinkSentPage />)
    expect(screen.getByText('Magic link sent.')).toBeInTheDocument()
  })

  it('renders "Open Gmail" primary CTA', () => {
    wrap(<MagicLinkSentPage />)
    expect(screen.getByText('Open Gmail')).toBeInTheDocument()
  })
})

// ── MagicLinkConfirmedPage ─────────────────────────────────────────────────────

describe('MagicLinkConfirmedPage', () => {
  it('renders "Signed in successfully." headline', () => {
    wrap(<MagicLinkConfirmedPage />)
    expect(screen.getByText('Signed in successfully.')).toBeInTheDocument()
  })

  it('renders a primary CTA button', () => {
    wrap(<MagicLinkConfirmedPage />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})

// ── PasswordResetRequestPage ───────────────────────────────────────────────────

describe('PasswordResetRequestPage', () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset()
    resetPasswordForEmail.mockResolvedValue({ error: null })
  })

  it('renders "Forgot your password?" headline', () => {
    wrap(<PasswordResetRequestPage />)
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument()
  })

  it('renders the "Send reset link" primary CTA', () => {
    wrap(<PasswordResetRequestPage />)
    expect(screen.getByText('Send reset link')).toBeInTheDocument()
  })

  it('actually sends the reset email', async () => {
    // THE missing test. The button was `onClick={() => setSubmitted(true)}`, so
    // someone locked out of their account was told a link was on its way and
    // none was sent. Asserting the confirmation text alone would still pass
    // against that bug — the call is what matters.
    wrap(<PasswordResetRequestPage />)

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'locked.out@example.com' },
    })
    fireEvent.click(screen.getByText('Send reset link'))

    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith('locked.out@example.com')
    })
    expect(await screen.findByText('Reset link sent.')).toBeInTheDocument()
  })

  it('trims whitespace before sending', async () => {
    wrap(<PasswordResetRequestPage />)
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: '  user@example.com  ' },
    })
    fireEvent.click(screen.getByText('Send reset link'))

    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith('user@example.com')
    })
  })

  it('does not claim a link was sent when the send fails', async () => {
    // The failure that made the old page a lie: reaching the confirmation
    // regardless of outcome. A real error (auth unavailable, rate limited)
    // must be visible instead.
    resetPasswordForEmail.mockResolvedValue({ error: 'Email rate limit exceeded' })
    wrap(<PasswordResetRequestPage />)

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByText('Send reset link'))

    expect(await screen.findByText('Email rate limit exceeded')).toBeInTheDocument()
    expect(screen.queryByText('Reset link sent.')).not.toBeInTheDocument()
  })

  it('rejects an address that cannot be one, without calling the service', async () => {
    wrap(<PasswordResetRequestPage />)

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'not-an-email' },
    })
    fireEvent.click(screen.getByText('Send reset link'))

    expect(
      await screen.findByText('Enter the email address you signed up with')
    ).toBeInTheDocument()
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
    expect(screen.queryByText('Reset link sent.')).not.toBeInTheDocument()
  })

  it('shows progress and blocks a double send while in flight', async () => {
    let release: (v: { error: null }) => void = () => {}
    resetPasswordForEmail.mockReturnValue(
      new Promise<{ error: null }>((resolve) => {
        release = resolve
      })
    )
    wrap(<PasswordResetRequestPage />)

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByText('Send reset link'))

    const button = await screen.findByText('Sending…')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1)

    release({ error: null })
    expect(await screen.findByText('Reset link sent.')).toBeInTheDocument()
  })
})

// ── PasswordResetConfirmPage ───────────────────────────────────────────────────

describe('PasswordResetConfirmPage', () => {
  it('renders "Set a new password." headline', () => {
    wrap(<PasswordResetConfirmPage />)
    expect(screen.getByText('Set a new password.')).toBeInTheDocument()
  })

  it('renders the "Set new password" primary CTA', () => {
    wrap(<PasswordResetConfirmPage />)
    expect(screen.getByText('Set new password')).toBeInTheDocument()
  })
})

// ── EmailVerifiedPage ──────────────────────────────────────────────────────────

describe('EmailVerifiedPage', () => {
  it('renders "Your email is verified." headline', () => {
    wrap(<EmailVerifiedPage />)
    expect(screen.getByText('Your email is verified.')).toBeInTheDocument()
  })

  it('renders a primary CTA button', () => {
    wrap(<EmailVerifiedPage />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})

// ── StripeWelcomePage ──────────────────────────────────────────────────────────

describe('StripeWelcomePage', () => {
  it('renders "You\'re a Pro now." headline', () => {
    wrap(<StripeWelcomePage />)
    expect(screen.getByText("You're a Pro now.")).toBeInTheDocument()
  })

  it('renders a primary CTA button', () => {
    wrap(<StripeWelcomePage />)
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(1)
  })
})

// ── StripeCancelledPage ────────────────────────────────────────────────────────

describe('StripeCancelledPage', () => {
  it('renders "No charge was made." headline', () => {
    wrap(<StripeCancelledPage />)
    expect(screen.getByText('No charge was made.')).toBeInTheDocument()
  })

  it('renders a primary CTA button', () => {
    wrap(<StripeCancelledPage />)
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(1)
  })
})

// ── NotFoundPage ───────────────────────────────────────────────────────────────

describe('NotFoundPage', () => {
  it('renders "Nothing here." headline', () => {
    wrap(<NotFoundPage />)
    expect(screen.getByText('Nothing here.')).toBeInTheDocument()
  })

  it('renders the "Back to home" primary CTA', () => {
    wrap(<NotFoundPage />)
    expect(screen.getByText('Back to home')).toBeInTheDocument()
  })
})

// ── PasswordResetConfirmPage — mismatch validation ─────────────────────────────

describe('PasswordResetConfirmPage — mismatch validation', () => {
  it('shows "Passwords don\'t match" error and does NOT show success headline', () => {
    wrap(<PasswordResetConfirmPage />)

    const [passwordInput, confirmInput] = screen.getAllByPlaceholderText(/password/i)
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmInput, { target: { value: 'different456' } })
    fireEvent.click(screen.getByText('Set new password'))

    expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
    expect(screen.queryByText('Password updated.')).not.toBeInTheDocument()
  })
})
