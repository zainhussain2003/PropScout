/**
 * usePdfExport — Pro-gated PDF download for a live report (spec §14).
 *
 * Gating order:
 *   free tier            → opens the 'pdf' UpgradeModal (no request made)
 *   no live token (demo) → no-op (nothing to render server-side)
 *   pro+ with a token    → fetches GET /analysis/:token/pdf with the Supabase
 *                          session and triggers a browser download
 *
 * The API re-checks the tier server-side; an UPGRADE_REQUIRED response also
 * opens the modal (covers a stale local tier).
 */

import { useCallback, useState } from 'react'
import { usePaywall } from '../components/paywall/PaywallContext'
import { getSession } from '../lib/services/authService'
import { downloadReportPdf, ReportPdfError } from '../lib/services/reportService'

interface PdfExport {
  /** Click handler for PDF buttons — safe to call in any tier/state. */
  exportPdf: () => void
  /** True while a download request is in flight. */
  exporting: boolean
  /** True when the current tier can't export (render a LockedButton). */
  isLocked: boolean
}

export function usePdfExport(token: string | null | undefined): PdfExport {
  const { tier, openUpgradeModal } = usePaywall()
  const [exporting, setExporting] = useState(false)
  const isLocked = tier === 'free'

  const exportPdf = useCallback(() => {
    if (isLocked) {
      openUpgradeModal('pdf')
      return
    }
    if (!token || exporting) return
    void (async () => {
      setExporting(true)
      try {
        const session = await getSession()
        if (!session?.access_token) {
          // Signed out — the API would 401; route through the upgrade/sign-in flow
          openUpgradeModal('pdf')
          return
        }
        await downloadReportPdf(token, session.access_token)
      } catch (err) {
        if (err instanceof ReportPdfError && err.code === 'UPGRADE_REQUIRED') {
          openUpgradeModal('pdf')
        } else {
          // Non-fatal: log and leave the report intact (§8 error isolation)
          console.error('[usePdfExport] download failed', err)
        }
      } finally {
        setExporting(false)
      }
    })()
  }, [isLocked, token, exporting, openUpgradeModal])

  return { exportPdf, exporting, isLocked }
}
