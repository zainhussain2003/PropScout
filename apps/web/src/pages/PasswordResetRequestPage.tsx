/**
 * PasswordResetRequestPage — two states:
 *   State 1 (default) — email form: StubState card + input + submit below
 *   State 2 (submitted) — sent confirmation with "Back to sign in" primary
 * Route: /auth/reset
 * Design source: auth-stubs.jsx::PasswordResetRequest
 *
 * The submit button used to be `onClick={() => setSubmitted(true)}` — it showed
 * "Reset link sent" without calling anything, so someone locked out of their
 * account was told an email was on its way that was never sent. The service
 * function and the confirm page at /auth/reset/confirm were both already
 * working; only this call was missing.
 *
 * The confirmation deliberately does not say whether the address exists. That
 * is Supabase's behaviour and the right one: a reset form that distinguishes
 * "sent" from "no such account" is an account-enumeration oracle.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StubState } from '../components/states/StubState'
import { resetPasswordForEmail } from '../lib/services/authService'

/** Enough to catch a typo, without reimplementing address validation. */
function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length >= 5 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export function PasswordResetRequestPage(): JSX.Element {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(): Promise<void> {
    if (!looksLikeEmail(email)) {
      setError('Enter the email address you signed up with')
      return
    }
    setError('')
    setLoading(true)
    const result = await resetPasswordForEmail(email.trim())
    setLoading(false)
    // A real failure (auth unavailable, rate limited) must surface. Showing
    // "check your inbox" on an error is what made this page lie in the first
    // place, so the confirmation is only reached when the send succeeded.
    if (result.error != null) {
      setError(result.error)
      return
    }
    setSubmitted(true)
  }

  // ── State 2: sent confirmation ────────────────────────────────────
  if (submitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--gutter)',
        }}
      >
        <StubState
          icon="doc"
          tone="neutral"
          eyebrow="Check your inbox"
          headline="Reset link sent."
          body="If that address is in our system, you'll get an email shortly. Check spam if it doesn't arrive."
          primary={{ label: 'Back to sign in', onClick: () => navigate('/') }}
        />
      </div>
    )
  }

  // ── State 1: email form ───────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--gutter)',
      }}
    >
      <div className="col" style={{ gap: 16, maxWidth: 560, width: '100%' }}>
        <StubState
          icon="key"
          tone="neutral"
          eyebrow="Reset password"
          headline="Forgot your password?"
          body="Enter your email and we'll send you a reset link."
        />

        {/* Form below the card */}
        <div className="col" style={{ gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            className="pr-input"
            placeholder="you@example.com"
          />
          {error && <span style={{ fontSize: 13, color: 'var(--fail)' }}>{error}</span>}
          <button
            className="btn btn-primary"
            style={{ justifyContent: 'center' }}
            onClick={() => void handleSubmit()}
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </div>
      </div>
    </div>
  )
}
