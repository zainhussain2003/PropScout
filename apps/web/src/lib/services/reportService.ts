/**
 * reportService — PDF export + share-link helpers for the live report.
 *
 * PDF export calls the Pro-gated Fastify route GET /analysis/:token/pdf
 * (spec §14) and triggers a browser download of the returned file. The
 * frontend never runs Puppeteer — the API renders the live /r/:token page
 * server-side so the PDF always matches the web report.
 *
 * Exports:
 *   downloadReportPdf — fetch the PDF with the user's session and save it
 *   shareLinkForToken — canonical share URL for a report token
 *   ReportPdfError    — typed error carrying the API error code
 *                       ('UPGRADE_REQUIRED' → show the upgrade modal)
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

export class ReportPdfError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ReportPdfError'
  }
}

/** Canonical share URL for a report token. */
export function shareLinkForToken(token: string): string {
  return `${window.location.origin}/r/${encodeURIComponent(token)}`
}

/**
 * Download the branded PDF for a report.
 *
 * @param token - the report's share token
 * @param accessToken - Supabase session access_token (Pro+ required server-side)
 * @throws ReportPdfError with the API's machine-readable code:
 *   UNAUTHORIZED (no/expired session), UPGRADE_REQUIRED (free tier),
 *   NOT_FOUND (expired report), PDF_FAILED (renderer error)
 */
export async function downloadReportPdf(token: string, accessToken: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/analysis/${encodeURIComponent(token)}/pdf`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { message?: string; code?: string }
    throw new ReportPdfError(
      json.code ?? 'PDF_FAILED',
      json.message ?? 'Could not generate the PDF — try again in a moment.'
    )
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = `propscout-report-${token}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    // Give the click a tick to start the download before revoking
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }
}
