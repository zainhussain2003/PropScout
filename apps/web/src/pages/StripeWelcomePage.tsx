/**
 * StripeWelcomePage — checkout return; Account shows the verified plan.
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
        eyebrow="Your plan"
        headline="Check your plan in Account."
        body="Visit Account to see your verified plan and available features."
        primary={{ label: 'Start analyzing', onClick: () => navigate('/') }}
        secondary={{ label: 'View my plan', onClick: () => navigate('/account?view=plan') }}
      />
    </div>
  )
}
