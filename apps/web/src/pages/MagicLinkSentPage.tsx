/**
 * MagicLinkSentPage — shown inline after a user submits their email
 * on the sign-in flow. Not a direct route.
 * Design source: auth-stubs.jsx::MagicLinkSent
 */

import { StubState } from '../components/states/StubState'

export function MagicLinkSentPage(): JSX.Element {
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
        headline="Magic link sent."
        body="We emailed a sign-in link to your address. It expires in 10 minutes. Check spam if it doesn't arrive."
        primary={{
          label: 'Open Gmail',
          // External URL — opens in a new tab, not React-router navigation
          onClick: () => window.open('https://mail.google.com', '_blank'),
        }}
        secondary={{ label: 'Resend link' }}
      />
    </div>
  )
}
