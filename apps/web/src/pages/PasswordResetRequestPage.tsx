/**
 * PasswordResetRequestPage — two states:
 *   State 1 (default) — email form: StubState card + input + submit below
 *   State 2 (submitted) — sent confirmation with "Back to sign in" primary
 * Route: /auth/reset
 * Design source: auth-stubs.jsx::PasswordResetRequest
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StubState } from '../components/states/StubState'

export function PasswordResetRequestPage(): JSX.Element {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')

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
            onChange={(e) => setEmail(e.target.value)}
            className="pr-input"
            placeholder="you@example.com"
          />
          <button
            className="btn btn-primary"
            style={{ justifyContent: 'center' }}
            onClick={() => setSubmitted(true)}
          >
            Send reset link
          </button>
        </div>
      </div>
    </div>
  )
}
