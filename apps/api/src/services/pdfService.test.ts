/**
 * Unit tests for pdfService's pure footer builder (spec Section 14 branding).
 * generateReportPdf itself is Puppeteer glue — covered by the route tests
 * with the service mocked, and by manual TESTING.md checks against Chrome.
 */

// puppeteer ships untransformed ESM that jest cannot parse — the unit under
// test here is the pure footer builder, so the browser module is stubbed out.
jest.mock('puppeteer', () => ({ launch: jest.fn() }))

import { buildFooterTemplate, buildShareQr } from './pdfService'

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

  it('embeds the share-link QR image when provided (spec §14)', () => {
    const html = buildFooterTemplate('tok-123', 'data:image/png;base64,abc')
    expect(html).toContain('<img src="data:image/png;base64,abc"')
  })

  it('renders without a QR when generation failed (footer must never break)', () => {
    const html = buildFooterTemplate('tok-123', null)
    expect(html).not.toContain('<img')
  })
})

describe('buildShareQr', () => {
  it('encodes the live share link as a PNG data URL', async () => {
    const dataUrl = await buildShareQr('tok-abc')
    expect(dataUrl).toMatch(/^data:image\/png;base64,/)
  })
})
