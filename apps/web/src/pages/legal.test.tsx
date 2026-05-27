/**
 * Tests for legal pages (Privacy Policy, Terms of Service) and the 404 page.
 *
 * Pages not built yet — all tests use it.todo().
 */

import { describe, it } from 'vitest'

// ── Privacy policy ────────────────────────────────────────────────

describe('Privacy policy (/privacy)', () => {
  it.todo('renders at the /privacy route without crashing')
  it.todo('TOC sidebar renders with at least 3 section links')
  it.todo('clicking a TOC link scrolls to the correct section (anchor navigation)')
  it.todo('all section headings are present in the DOM')
  it.todo('heading "Data We Collect" or equivalent is present')
  it.todo('heading "How We Use Your Data" or equivalent is present')
  it.todo('heading "Contact" or equivalent is present')
  it.todo('axe passes on privacy policy page')
})

// ── Terms of service ──────────────────────────────────────────────

describe('Terms of service (/terms)', () => {
  it.todo('renders at the /terms route without crashing')
  it.todo('TOC sidebar is present with section links')
  it.todo('page contains "Not financial advice" disclaimer language')
  it.todo('page contains subscription and billing terms')
  it.todo('axe passes on terms of service page')
})

// ── 404 catch-all ─────────────────────────────────────────────────

describe('404 page', () => {
  it.todo('any unrecognised route renders the NotFoundState component')
  it.todo('NotFoundState renders a prominent heading (h1 or role=heading level 1)')
  it.todo('a link back to "/" (home) is present and labelled')
  it.todo('page title includes "404" or "Not Found"')
  it.todo('axe passes on 404 page')
})
