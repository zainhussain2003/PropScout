/**
 * StripeCancelledPage — shown when a user cancels the Stripe checkout.
 * Route: /checkout/cancelled
 * Design source: auth-stubs.jsx::StripeCancelled
 */

import { useNavigate } from 'react-router-dom'
import { StubState } from '../components/states/StubState'

export function StripeCancelledPage(): JSX.Element {
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
        icon="flag"
        tone="caution"
        eyebrow="Checkout cancelled"
        headline="No charge was made."
        body="You cancelled before completing checkout. Every available report feature is free during beta."
        primary={{ label: 'Explore free beta', onClick: () => navigate('/') }}
        secondary={{ label: 'Back to my account', onClick: () => navigate('/account') }}
      />
    </div>
  )
}
