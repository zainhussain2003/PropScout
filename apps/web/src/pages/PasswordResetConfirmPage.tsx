/**
 * PasswordResetConfirmPage — two states:
 *   State 1 (default) — new-password form with validation
 *   State 2 (success) — confirmation with "Sign in" primary
 * Route: /auth/reset/confirm
 * Design source: auth-stubs.jsx::PasswordResetConfirm
 *
 * Supabase auto-detects the recovery code in the URL on client init
 * (detectSessionInUrl: true). Once a PASSWORD_RECOVERY session is active,
 * updateUser({ password }) sets the new password.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StubState } from '../components/states/StubState'
import { updatePassword } from '../lib/services/authService'

const MIN_PASSWORD_LENGTH = 8

export function PasswordResetConfirmPage(): JSX.Element {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(): Promise<void> {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }
    setError('')
    setLoading(true)
    const result = await updatePassword(password)
    setLoading(false)
    if (result.error != null) {
      setError(result.error)
      return
    }
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
            onClick={() => void handleSubmit()}
            disabled={loading}
          >
            {loading ? 'Updating…' : 'Set new password'}
          </button>
        </div>
      </div>
    </div>
  )
}
