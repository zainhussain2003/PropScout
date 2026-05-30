/**
 * StripeWelcomePage — shown after a successful Stripe checkout.
 * Route: /welcome-to-pro
 * Design source: auth-stubs.jsx::StripeWelcomePro
 */

import { useNavigate } from 'react-router-dom'
import { StubState } from '../components/states/StubState'

export function StripeWelcomePage(): JSX.Element {
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
        icon="sparkle"
        tone="pass"
        eyebrow="Welcome to Investor Pro"
        headline="You're a Pro now."
        body="Full AI verdicts, PDF export, portfolio tracker, and SunScout 3D are all unlocked. Go find your next deal."
        primary={{ label: 'Start analyzing', onClick: () => navigate('/') }}
        secondary={{ label: 'View my plan', onClick: () => navigate('/account?view=plan') }}
      />
    </div>
  )
}
