/**
 * usePdfExport — PDF download for a live report (spec §14, D-126).
 *
 * During beta, a live report token is enough to download without sign-in.
 * Demo routes have no live token and cannot export. The legacy paid mode
 * still checks tier and Supabase session.
 *
 * The API checks entitlement in paid mode; UPGRADE_REQUIRED opens its modal.
 */

import { useCallback, useState } from 'react'
import { usePaywall } from '../components/paywall/PaywallContext'
import { getSession } from '../lib/services/authService'
import { downloadReportPdf, ReportPdfError } from '../lib/services/reportService'
import { BETA_FREE_ACCESS } from '../constants/tiers'

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
  const isLocked = !BETA_FREE_ACCESS && tier === 'free'

  const exportPdf = useCallback(() => {
    if (isLocked) {
      openUpgradeModal('pdf')
      return
    }
    if (!token || exporting) return
    void (async () => {
      setExporting(true)
      try {
        const session = BETA_FREE_ACCESS ? null : await getSession()
        if (!BETA_FREE_ACCESS && !session?.access_token) {
          // Signed out — the API would 401; route through the upgrade/sign-in flow
          openUpgradeModal('pdf')
          return
        }
        await downloadReportPdf(token, session?.access_token)
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
