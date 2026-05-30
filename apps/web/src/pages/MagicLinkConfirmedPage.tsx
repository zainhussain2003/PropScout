/**
 * MagicLinkConfirmedPage — shown after the user clicks a magic-link
 * and Supabase confirms the session.
 * Route: /auth/confirm
 * Design source: auth-stubs.jsx::MagicLinkConfirmed
 */

import { useNavigate } from 'react-router-dom'
import { StubState } from '../components/states/StubState'

export function MagicLinkConfirmedPage(): JSX.Element {
  const navigate = useNavigate()

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
