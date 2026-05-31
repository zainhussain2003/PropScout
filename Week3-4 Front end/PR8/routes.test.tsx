/**
 * PR8 · Route wiring tests
 * Test file path: Week3-4 Front end/PR8/routes.test.tsx
 *
 * App.tsx wraps BrowserRouter internally, so pages are rendered
 * directly using MemoryRouter to avoid double-router nesting.
 *
 * NotFoundPage facts (from NotFoundPage.tsx + Step 2 report):
 *   eyebrow: "404"
 *   headline: "Nothing here."
 *   button:   "Back to home"  (NOT "Back to PropScout")
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrivacyPage } from '../../apps/web/src/pages/PrivacyPage'
import { TermsPage } from '../../apps/web/src/pages/TermsPage'
import { NotFoundPage } from '../../apps/web/src/pages/NotFoundPage'
import { AccountPage } from '../../apps/web/src/pages/AccountPage'

// ── Routes ────────────────────────────────────────────────────────────────────

describe('routes', () => {
  it('/privacy renders PrivacyPage — "Privacy Policy" heading present', () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <PrivacyPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument()
  })

  it('/terms renders TermsPage — "Terms of Service" heading present', () => {
    render(
      <MemoryRouter initialEntries={['/terms']}>
        <TermsPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { level: 1, name: /terms of service/i })).toBeInTheDocument()
  })

  it('unknown route renders NotFoundPage — eyebrow "404" present', () => {
    render(
      <MemoryRouter initialEntries={['/this-does-not-exist']}>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('NotFoundPage headline "Nothing here." present', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Nothing here.')).toBeInTheDocument()
  })

  it('NotFoundPage button label is "Back to home" (not "Back to PropScout")', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument()
    expect(screen.queryByText(/back to propscout/i)).not.toBeInTheDocument()
  })

  it('/account renders AccountPage — "Saved analyses" heading present', () => {
    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    )
    expect(screen.getAllByText(/saved analyses/i).length).toBeGreaterThanOrEqual(1)
  })
})
