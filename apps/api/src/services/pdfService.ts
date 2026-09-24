/**
 * pdfService — Puppeteer PDF generation for report exports (spec Section 14).
 *
 * After the route verifies paid access, Headless Chrome renders the report
 * payload through the web app's /print-report route. It needs no user session.
 *
 * Branding (Free/Pro): PropScout footer with propscout.ca, the "not financial
 * or legal advice" disclaimer, a date stamp, the share token, and a QR code
 * linking back to the live report (spec §14 "share token as QR code").
 * White-label branding is not offered for new subscriptions.
 */

import puppeteer from 'puppeteer'
import QRCode from 'qrcode'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

// Rendering budget: the report fires several async loads (analysis fetch,
// fonts, map tiles). networkidle2 + a hard cap keeps a wedged page from
// holding the request open forever.
const PAGE_LOAD_TIMEOUT_MS = 60_000

/**
 * Build the branded footer template shown on every PDF page.
 * Exported for unit testing — Puppeteer requires inline styles here.
 *
 * @param token   Share token (printed and encoded in the QR when provided)
 * @param qrDataUrl  Optional data-URL PNG of the share-link QR code
 */
export function buildFooterTemplate(token: string, qrDataUrl?: string | null): string {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const qr = qrDataUrl
    ? `<img src="${qrDataUrl}" style="width:34px; height:34px; margin-left:8px;" />`
    : ''
  return `
    <div style="width:100%; font-size:8px; font-family:Arial, sans-serif; color:#8a8578;
                padding:0 36px; display:flex; justify-content:space-between; align-items:center;">
      <span>PropScout · propscout.ca — Not financial or legal advice</span>
      <span style="display:flex; align-items:center;">
        ${stamp} UTC · ${token} · page <span class="pageNumber"></span>/<span class="totalPages"></span>${qr}
      </span>
    </div>`
}

/**
 * Encode the live share link as a small QR data-URL PNG for the footer.
 * Returns null on failure — the footer renders without the QR rather than
 * failing the whole export.
 */
export async function buildShareQr(token: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(`${FRONTEND_URL}/r/${encodeURIComponent(token)}`, {
      width: 68,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#0e1320', light: '#ffffff' },
    })
  } catch (err) {
    console.error('[pdfService] buildShareQr failed', err)
    return null
  }
}

/**
 * Render the shareable report page for `token` and return it as a PDF buffer.
 *
 * Returns null on any failure (Chrome missing, page error, timeout) — the
 * route turns that into a friendly 502 rather than a crash.
 */
export async function generateReportPdf(
  token: string,
  report: {
    analysis: import('../types/analysis').Analysis
    listing: import('../types/property').Listing
  }
): Promise<Buffer | null> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
  try {
    browser = await puppeteer.launch({
      headless: true,
      // Railway/containers run as root without a sandbox user namespace.
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    const page = await browser.newPage()
    // Inject only this report after the route has verified paid access. Never
    // expose the customer's session or a service credential to the browser.
    await page.evaluateOnNewDocument((payload) => {
      Object.defineProperty(globalThis, '__PROPSCOUT_PRINT__', { value: payload })
    }, report)
    await page.setViewport({ width: 1280, height: 900 })
    await page.goto(`${FRONTEND_URL}/print-report`, {
      waitUntil: 'networkidle2',
      timeout: PAGE_LOAD_TIMEOUT_MS,
    })
    await page.waitForSelector('[data-print-ready="true"]', { timeout: PAGE_LOAD_TIMEOUT_MS })
    await page.evaluate('document.fonts.ready')

    const qrDataUrl = await buildShareQr(token)
    const pdf = await page.pdf({
      format: 'a4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: buildFooterTemplate(token, qrDataUrl),
      margin: { top: '14mm', bottom: '18mm', left: '10mm', right: '10mm' },
    })
    return Buffer.from(pdf)
  } catch (err) {
    console.error('[pdfService] generateReportPdf failed', err)
    return null
  } finally {
    await browser?.close().catch(() => {})
  }
}
