/**
 * PR8 · Legal pages tests
 * Test file path: Week3-4 Front end/PR8/legal.test.tsx
 *
 * Tests for PrivacyPage, TermsPage, and LegalShell behaviour.
 *
 * Privacy has 9 sections (confirmed from legalContent.ts PRIVACY_SECTIONS).
 * Terms has 11 sections (confirmed from legalContent.ts TERMS_SECTIONS).
 * TOC items are <button> elements inside <nav aria-label="Table of contents">.
 * "Download as PDF" appears in both the sticky nav and the article footer card.
 * "Back to PropScout" appears in the LegalNav (top-right Link) and the footer card.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'
import { PrivacyPage } from '../../apps/web/src/pages/PrivacyPage'
import { TermsPage } from '../../apps/web/src/pages/TermsPage'
import { LegalShell } from '../../apps/web/src/pages/legal/LegalShell'
import {
  PRIVACY_SECTIONS,
  PRIVACY_META,
  TERMS_SECTIONS,
  TERMS_META,
} from '../../apps/web/src/pages/legal/legalContent'

expect.extend(toHaveNoViolations)

// ── Render helpers ────────────────────────────────────────────────────────────

function renderPrivacy(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/privacy']}>
      <PrivacyPage />
    </MemoryRouter>
  )
}

function renderTerms(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/terms']}>
      <TermsPage />
    </MemoryRouter>
  )
}

// ── PrivacyPage ───────────────────────────────────────────────────────────────

describe('PrivacyPage', () => {
  it('renders without crashing', () => {
    const { container } = renderPrivacy()
    expect(container).toBeInTheDocument()
  })

  it('"Privacy Policy" h1 heading present', () => {
    renderPrivacy()
    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument()
  })

  it('eyebrow chip contains "PIPEDA-compliant" text', () => {
    renderPrivacy()
    expect(screen.getByText(/PIPEDA-compliant/i)).toBeInTheDocument()
  })

  it('TOC renders exactly 9 items', () => {
    renderPrivacy()
    const toc = screen.getByRole('navigation', { name: /table of contents/i })
    const buttons = toc.querySelectorAll('button')
    expect(buttons).toHaveLength(9)
  })

  it('all 9 section headings present in the document', () => {
    renderPrivacy()
    for (const section of PRIVACY_SECTIONS) {
      expect(
        screen.getByRole('heading', { name: new RegExp(section.title, 'i') })
      ).toBeInTheDocument()
    }
  })

  it('"Back to PropScout" link present', () => {
    renderPrivacy()
    const links = screen.getAllByText(/back to propscout/i)
    expect(links.length).toBeGreaterThanOrEqual(1)
  })

  it('"Download as PDF" button present', () => {
    renderPrivacy()
    const buttons = screen.getAllByText(/download as pdf/i)
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('"Privacy Policy" and "Terms of Service" switch buttons present', () => {
    renderPrivacy()
    expect(screen.getByRole('button', { name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terms of Service' })).toBeInTheDocument()
  })

  it('a11y: zero axe violations', async () => {
    const { container } = renderPrivacy()
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

// ── TermsPage ─────────────────────────────────────────────────────────────────

describe('TermsPage', () => {
  it('renders without crashing', () => {
    const { container } = renderTerms()
    expect(container).toBeInTheDocument()
  })

  it('"Terms of Service" h1 heading present', () => {
    renderTerms()
    expect(screen.getByRole('heading', { level: 1, name: /terms of service/i })).toBeInTheDocument()
  })

  it('TOC renders exactly 11 items', () => {
    renderTerms()
    const toc = screen.getByRole('navigation', { name: /table of contents/i })
    const buttons = toc.querySelectorAll('button')
    expect(buttons).toHaveLength(11)
  })

  it('all 11 section headings present in the document', () => {
    renderTerms()
    for (const section of TERMS_SECTIONS) {
      expect(
        screen.getByRole('heading', { name: new RegExp(section.title, 'i') })
      ).toBeInTheDocument()
    }
  })

  it('"Not financial or legal advice" section heading present', () => {
    renderTerms()
    expect(
      screen.getByRole('heading', { name: /not financial or legal advice/i })
    ).toBeInTheDocument()
  })

  it('eyebrow chip contains "Effective May 24, 2026" text', () => {
    renderTerms()
    expect(screen.getByText(/effective may 24, 2026/i)).toBeInTheDocument()
  })

  it('"Privacy Policy" and "Terms of Service" switch buttons present', () => {
    renderTerms()
    expect(screen.getByRole('button', { name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terms of Service' })).toBeInTheDocument()
  })
})

// ── LegalShell scroll behaviour ───────────────────────────────────────────────

describe('LegalShell scroll behaviour', () => {
  it('window.scrollTo is called when a TOC item is clicked', () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const onSwitch = vi.fn()

    render(
      <MemoryRouter>
        <LegalShell
          sections={PRIVACY_SECTIONS}
          meta={PRIVACY_META}
          activePage="privacy"
          onSwitch={onSwitch}
        />
      </MemoryRouter>
    )

    const toc = screen.getByRole('navigation', { name: /table of contents/i })
    const firstButton = toc.querySelectorAll('button')[0]
    fireEvent.click(firstButton)

    expect(scrollSpy).toHaveBeenCalled()
    scrollSpy.mockRestore()
  })

  it('onSwitch is called with "terms" when the Terms of Service switch button is clicked', () => {
    const onSwitch = vi.fn()

    render(
      <MemoryRouter>
        <LegalShell
          sections={PRIVACY_SECTIONS}
          meta={PRIVACY_META}
          activePage="privacy"
          onSwitch={onSwitch}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Terms of Service' }))
    expect(onSwitch).toHaveBeenCalledWith('terms')
  })

  it('window.scrollTo({ top: 0 }) is called when the page switch button is clicked', () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const onSwitch = vi.fn()

    render(
      <MemoryRouter>
        <LegalShell
          sections={PRIVACY_SECTIONS}
          meta={PRIVACY_META}
          activePage="privacy"
          onSwitch={onSwitch}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Terms of Service' }))

    const scrollCalls = scrollSpy.mock.calls
    const topZeroCall = scrollCalls.find(
      (args) => args[0] && typeof args[0] === 'object' && (args[0] as ScrollToOptions).top === 0
    )
    expect(topZeroCall).toBeDefined()
    scrollSpy.mockRestore()
  })
})
