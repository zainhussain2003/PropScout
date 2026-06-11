/**
 * MagicLinkConfirmedPage — shown after the user clicks a magic-link
 * and Supabase confirms the session.
 * Route: /auth/confirm
 * Design source: auth-stubs.jsx::MagicLinkConfirmed
 *
 * Supabase JS v2 auto-detects the auth code or token in the URL on client
 * init (detectSessionInUrl: true by default). We subscribe to onAuthStateChange
 * and navigate to /account as soon as a session is established.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StubState } from '../components/states/StubState'
import { onAuthStateChange } from '../lib/services/authService'

export function MagicLinkConfirmedPage(): JSX.Element {
  const navigate = useNavigate()
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    // Supabase processes the URL params automatically. Subscribe to auth state
    // and navigate once the session is ready.
    const unsub = onAuthStateChange((session) => {
      if (session != null) {
        navigate('/account', { replace: true })
      }
    })

    // Fallback: if no session fires within 6 seconds, show an error prompt
    // so the user is never stuck on a blank screen.
    const timeout = setTimeout(() => setAuthError(true), 6_000)

    return () => {
      unsub()
      clearTimeout(timeout)
    }
  }, [navigate])

  if (authError) {
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
          icon="x"
          tone="fail"
          eyebrow="Sign-in failed"
          headline="This link may have expired."
          body="Magic links expire after a short time. Request a new one to sign in."
          primary={{ label: 'Try again', onClick: () => navigate('/') }}
        />
      </div>
    )
  }

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
        eyebrow="You're in"
        headline="Signed in successfully."
        body="Redirecting you to your dashboard…"
        primary={{ label: 'Go to dashboard', onClick: () => navigate('/account') }}
      />
    </div>
  )
}
