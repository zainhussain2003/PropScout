// TermsPage — /terms route.
// Thin wrapper around LegalShell with terms content.

import { useNavigate } from 'react-router-dom'
import { LegalShell } from './legal/LegalShell'
import { TERMS_SECTIONS, TERMS_META } from './legal/legalContent'

export function TermsPage(): JSX.Element {
  const navigate = useNavigate()

  return (
    <LegalShell
      sections={TERMS_SECTIONS}
      meta={TERMS_META}
      activePage="terms"
      onSwitch={(p) => navigate(p === 'terms' ? '/terms' : '/privacy')}
    />
  )
}
