/**
 * Auth stub pages — integration tests
 *
 * PR7 · Auth stub page tests
 * Test file path: Week3-4 Front end/PR7/authStubs.integration.test.tsx
 *
 * Each page is wrapped in MemoryRouter (required for useNavigate).
 * Tests assert the key headline appears and the primary CTA button is present.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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
  it('renders "Forgot your password?" headline', () => {
    wrap(<PasswordResetRequestPage />)
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument()
  })

  it('renders the "Send reset link" primary CTA', () => {
    wrap(<PasswordResetRequestPage />)
    expect(screen.getByText('Send reset link')).toBeInTheDocument()
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
