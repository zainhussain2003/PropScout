/**
 * Unit tests for pdfService's pure footer builder (spec Section 14 branding).
 * generateReportPdf itself is Puppeteer glue — covered by the route tests
 * with the service mocked, and by manual TESTING.md checks against Chrome.
 */

// puppeteer ships untransformed ESM that jest cannot parse — the unit under
// test here is the pure footer builder, so the browser module is stubbed out.
jest.mock('puppeteer', () => ({ launch: jest.fn() }))

import { buildFooterTemplate } from './pdfService'

describe('buildFooterTemplate', () => {
  it('carries the PropScout branding, disclaimer, timestamp, and share token', () => {
    const html = buildFooterTemplate('tok-123')
    expect(html).toContain('PropScout · propscout.ca')
    expect(html).toContain('Not financial or legal advice')
    expect(html).toContain('tok-123')
    // ISO date stamp (YYYY-MM-DD HH:MM)
    expect(html).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/)
    // Page counters Puppeteer substitutes at render time
    expect(html).toContain('class="pageNumber"')
    expect(html).toContain('class="totalPages"')
  })
})
