/**
 * TenantReport — integration tests
 *
 * PR5 · Tenant Report page integration tests
 * Test file path: Week3-4 Front end/PR5/TenantReport.integration.test.tsx
 *
 * Tests the full TenantReport page rendered into a DOM, using the CHARLES mock
 * dataset. Covers:
 *   1. ListedVsRealitySection visibility rules
 *   2. Confirm-before-signing checklist behaviour
 *   3. Section ordering (all 12 data-section attributes in 01–12 order)
 *   4. Report Nav content
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TenantReport } from '../../apps/web/src/pages/TenantReport'
import {
  CHARLES_REALITY,
  CHARLES_LISTED,
  CHARLES_CHECKLIST,
} from '../../apps/web/src/constants/tenantDemoData'
import type { TenantRealityItem } from '../../apps/web/src/types/analysis'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Render TenantReport inside a MemoryRouter (required for Nav link rendering). */
function renderPage() {
  return render(
    <MemoryRouter>
      <TenantReport />
    </MemoryRouter>
  )
}

// ── Group 1: ListedVsRealitySection visibility ────────────────────────────────

describe('TenantReport — ListedVsRealitySection visibility', () => {
  it('§03 is present in the full page because CHARLES data has bad-tone mismatches', () => {
    renderPage()
    // The section renders when mismatchCount > 0
    const section = document.querySelector('[data-section="03"]')
    expect(section).toBeTruthy()
    // Verify it shows the right verdict text (3 mismatches)
    expect(section?.textContent).toMatch(/mismatches?/)
  })

  it('CHARLES_REALITY has at least one bad-tone item (fixture sanity check)', () => {
    const badCount = CHARLES_REALITY.filter((r: TenantRealityItem) => r.tone === 'bad').length
    expect(badCount).toBeGreaterThan(0)
  })

  it('CHARLES_LISTED and CHARLES_REALITY have the same length (required by component contract)', () => {
    expect(CHARLES_LISTED.length).toEqual(CHARLES_REALITY.length)
  })
})

// ── Group 2: Checklist ────────────────────────────────────────────────────────

describe('TenantReport — Confirm-before-signing checklist', () => {
  it('renders all CHARLES_CHECKLIST items', () => {
    renderPage()
    CHARLES_CHECKLIST.forEach((item) => {
      expect(screen.getByText(item.label)).toBeInTheDocument()
    })
  })

  it('shows the initial count "0 / N complete" where N = CHARLES_CHECKLIST.length', () => {
    renderPage()
    const n = CHARLES_CHECKLIST.length
    expect(screen.getByText(`0 / ${n} complete`)).toBeInTheDocument()
  })

  it('checking one checkbox increments the count to "1 / N complete"', () => {
    renderPage()
    const n = CHARLES_CHECKLIST.length
    const checkboxes = screen.getAllByRole('checkbox')
    // Check the first checkbox
    fireEvent.click(checkboxes[0])
    expect(screen.getByText(`1 / ${n} complete`)).toBeInTheDocument()
  })

  it('checking all checkboxes shows "N / N complete"', () => {
    renderPage()
    const n = CHARLES_CHECKLIST.length
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach((cb) => fireEvent.click(cb))
    expect(screen.getByText(`${n} / ${n} complete`)).toBeInTheDocument()
  })
})

// ── Group 3: Section ordering ──────────────────────────────────────────────────

describe('TenantReport — Section ordering', () => {
  it('all 12 data-section attributes are present in the rendered page', () => {
    const { container } = renderPage()
    for (let i = 1; i <= 12; i++) {
      const padded = i.toString().padStart(2, '0')
      const section = container.querySelector(`[data-section="${padded}"]`)
      expect(section, `Expected data-section="${padded}" to be in the DOM`).toBeTruthy()
    }
  })

  it('sections appear in ascending 01–12 order in the DOM', () => {
    const { container } = renderPage()
    const sections = container.querySelectorAll('[data-section]')
    const numbers = Array.from(sections).map((el) => el.getAttribute('data-section'))

    // Filter to numeric section IDs only (01–12) and verify ascending order
    const numericSections = numbers.filter((n) => /^\d{2}$/.test(n ?? '')).map(Number)

    for (let i = 1; i < numericSections.length; i++) {
      expect(numericSections[i]).toBeGreaterThanOrEqual(numericSections[i - 1])
    }

    // Verify all 12 are present
    const uniqueSections = [...new Set(numericSections)].sort((a, b) => a - b)
    expect(uniqueSections).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
})

// ── Group 4: Report Nav ────────────────────────────────────────────────────────

describe('TenantReport — Report Nav', () => {
  it('shows "Tenant report" as the report label in the Nav', () => {
    renderPage()
    expect(screen.getByText('Tenant report')).toBeInTheDocument()
  })

  it('passes the "3705-charles-st-e" address slug to the Nav', () => {
    const { container } = renderPage()
    // The address slug is used in copy-link href — look for it in an anchor or data attribute
    const slug = container.innerHTML.includes('3705-charles-st-e')
    expect(slug).toBe(true)
  })

  it('renders a "Save report" button in the Nav', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /Save report/i })).toBeInTheDocument()
  })

  it('renders the theme toggle button in the Nav', () => {
    renderPage()
    const toggleBtn = screen.getByRole('button', { name: /Toggle (dark|light) mode/i })
    expect(toggleBtn).toBeInTheDocument()
  })
})
