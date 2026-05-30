/**
 * EmailVerifiedPage — shown after a user clicks a verification link.
 * Route: /auth/verified
 * Design source: auth-stubs.jsx::EmailVerified
 */

import { useNavigate } from 'react-router-dom'
import { StubState } from '../components/states/StubState'

export function EmailVerifiedPage(): JSX.Element {
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
        eyebrow="Email confirmed"
        headline="Your email is verified."
        body="Your account is ready. Start by pasting a listing URL."
        primary={{ label: 'Analyze a listing', onClick: () => navigate('/') }}
      />
    </div>
  )
}
