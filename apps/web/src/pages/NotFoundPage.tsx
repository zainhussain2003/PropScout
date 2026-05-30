/**
 * NotFoundPage — 404 catch-all.
 * Uses BlockState (full-page wrapper) rather than StubState.
 * Route: * (must be last in the route list)
 * Design source: error-states.jsx::BlockState
 */

import { useNavigate } from 'react-router-dom'
import { BlockState } from '../components/states/BlockState'

export function NotFoundPage(): JSX.Element {
  const navigate = useNavigate()

  return (
    <BlockState
      icon="map"
      tone="neutral"
      eyebrow="404"
      headline="Nothing here."
      body="That page doesn't exist or has moved."
      primary={{ label: 'Back to home', onClick: () => navigate('/') }}
    />
  )
}
