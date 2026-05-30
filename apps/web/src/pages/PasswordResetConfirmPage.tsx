/**
 * PasswordResetConfirmPage — two states:
 *   State 1 (default) — new-password form with mismatch validation
 *   State 2 (success) — confirmation with "Sign in" primary
 * Route: /auth/reset/confirm
 * Design source: auth-stubs.jsx::PasswordResetConfirm
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StubState } from '../components/states/StubState'

export function PasswordResetConfirmPage(): JSX.Element {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(): void {
    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }
    setError('')
    setSubmitted(true)
  }

  // ── State 2: success ──────────────────────────────────────────────
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
          icon="check"
          tone="pass"
          eyebrow="All set"
          headline="Password updated."
          body="You can now sign in with your new password."
          primary={{ label: 'Sign in', onClick: () => navigate('/') }}
        />
      </div>
    )
  }

  // ── State 1: new-password form ────────────────────────────────────
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
          headline="Set a new password."
          body="Choose something you haven't used before."
        />

        {/* Form below the card */}
        <div className="col" style={{ gap: 12 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            className="pr-input"
            placeholder="New password"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              setError('')
            }}
            className="pr-input"
            placeholder="Confirm password"
          />
          {error && <span style={{ fontSize: 13, color: 'var(--fail)' }}>{error}</span>}
          <button
            className="btn btn-primary"
            style={{ justifyContent: 'center' }}
            onClick={handleSubmit}
          >
            Set new password
          </button>
        </div>
      </div>
    </div>
  )
}
