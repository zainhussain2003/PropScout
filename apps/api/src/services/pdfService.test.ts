/**
 * Unit tests for pdfService's pure footer builder (spec Section 14 branding).
 * generateReportPdf itself is Puppeteer glue — covered by the route tests
 * with the service mocked, and by manual TESTING.md checks against Chrome.
 */

// puppeteer ships untransformed ESM that jest cannot parse — the unit under
// test here is the pure footer builder, so the browser module is stubbed out.
jest.mock('puppeteer', () => ({ launch: jest.fn() }))

import puppeteer from 'puppeteer'
import { buildFooterTemplate, buildShareQr, generateReportPdf } from './pdfService'

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

describe('PDF renderer capacity', () => {
  it('serializes Chrome lifetimes, bounds the queue, and releases capacity after failure', async () => {
    const launch = jest.mocked(puppeteer.launch)
    let failFirst: (reason: Error) => void = () => undefined
    launch.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          failFirst = reject
        })
    )
    const page = {
      evaluateOnNewDocument: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      goto: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')),
    }
    const close = jest.fn().mockResolvedValue(undefined)
    let finishClose: () => void = () => undefined
    let signalClose: () => void = () => undefined
    const closeStarted = new Promise<void>((resolve) => {
      signalClose = resolve
    })
    close.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishClose = resolve
          signalClose()
        })
    )
    launch.mockResolvedValue({ newPage: async () => page, close } as unknown as Awaited<
      ReturnType<typeof puppeteer.launch>
    >)
    const report = {} as Parameters<typeof generateReportPdf>[1]
    const first = generateReportPdf('one', report)
    const second = generateReportPdf('two', report)
    const third = generateReportPdf('three', report)
    const overflow = generateReportPdf('four', report)
    await expect(overflow).resolves.toBeNull()
    expect(launch).toHaveBeenCalledTimes(1)
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    failFirst(new Error('Chrome failed'))
    await expect(first).resolves.toBeNull()
    await closeStarted
    expect(launch).toHaveBeenCalledTimes(2)
    finishClose()
    await expect(second).resolves.toEqual(Buffer.from('%PDF-test'))
    await expect(third).resolves.toEqual(Buffer.from('%PDF-test'))
    expect(close).toHaveBeenCalledTimes(2)
    await expect(generateReportPdf('five', report)).resolves.toEqual(Buffer.from('%PDF-test'))
    logged.mockRestore()
    launch.mockReset()
  })
})
