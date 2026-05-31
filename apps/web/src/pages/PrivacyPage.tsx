// PrivacyPage — /privacy route.
// Thin wrapper around LegalShell with privacy content.

import { useNavigate } from 'react-router-dom'
import { LegalShell } from './legal/LegalShell'
import { PRIVACY_SECTIONS, PRIVACY_META } from './legal/legalContent'

export function PrivacyPage(): JSX.Element {
  const navigate = useNavigate()

  return (
    <LegalShell
      sections={PRIVACY_SECTIONS}
      meta={PRIVACY_META}
      activePage="privacy"
      onSwitch={(p) => navigate(p === 'terms' ? '/terms' : '/privacy')}
    />
  )
}
