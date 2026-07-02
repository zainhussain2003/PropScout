/**
 * pdfService — Puppeteer PDF generation for report exports (spec Section 14).
 *
 * Headless Chrome renders the live web report at FRONTEND_URL/r/:token and
 * captures it as a PDF, so the PDF always matches the web report exactly —
 * there is no separate PDF template to maintain.
 *
 * Branding (Free/Pro): PropScout footer with propscout.ca, the "not financial
 * or legal advice" disclaimer, a date stamp, and the share token. Professional
 * white-label branding and the QR code are not built yet (tracked in
 * AUDIT_TRACKER) — the tier is sold with manual delivery until then.
 */

import puppeteer from 'puppeteer'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

// Rendering budget: the report fires several async loads (analysis fetch,
// fonts, map tiles). networkidle2 + a hard cap keeps a wedged page from
// holding the request open forever.
const PAGE_LOAD_TIMEOUT_MS = 60_000

/**
 * Build the branded footer template shown on every PDF page.
 * Exported for unit testing — Puppeteer requires inline styles here.
 */
export function buildFooterTemplate(token: string): string {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return `
    <div style="width:100%; font-size:8px; font-family:Arial, sans-serif; color:#8a8578;
                padding:0 36px; display:flex; justify-content:space-between; align-items:center;">
      <span>PropScout · propscout.ca — Not financial or legal advice</span>
      <span>${stamp} UTC · ${token} · page <span class="pageNumber"></span>/<span class="totalPages"></span></span>
    </div>`
}

/**
 * Render the shareable report page for `token` and return it as a PDF buffer.
 *
 * Returns null on any failure (Chrome missing, page error, timeout) — the
 * route turns that into a friendly 502 rather than a crash.
 */
export async function generateReportPdf(token: string): Promise<Buffer | null> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
  try {
    browser = await puppeteer.launch({
      headless: true,
      // Railway/containers run as root without a sandbox user namespace.
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })
    await page.goto(`${FRONTEND_URL}/r/${encodeURIComponent(token)}`, {
      waitUntil: 'networkidle2',
      timeout: PAGE_LOAD_TIMEOUT_MS,
    })

    const pdf = await page.pdf({
      format: 'a4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: buildFooterTemplate(token),
      margin: { top: '14mm', bottom: '16mm', left: '10mm', right: '10mm' },
    })
    return Buffer.from(pdf)
  } catch (err) {
    console.error('[pdfService] generateReportPdf failed', err)
    return null
  } finally {
    await browser?.close().catch(() => {})
  }
}
