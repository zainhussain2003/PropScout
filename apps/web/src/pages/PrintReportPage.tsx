import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'
import { ReportPage } from './ReportPage'
import { PaywallContext } from '../components/paywall/PaywallContext'

declare global {
  interface Window {
    __PROPSCOUT_PRINT__?: { analysis: Analysis; listing: Listing }
  }
}

/** Data is injected by the authenticated PDF service, never fetched by this page. */
export function PrintReportPage(): JSX.Element {
  const report = window.__PROPSCOUT_PRINT__
  if (!report) return <p>No report was supplied for printing.</p>
  return (
    <PaywallContext.Provider
      value={{
        tier: 'pro',
        tierStatus: 'resolved',
        openUpgradeModal: () => undefined,
        openHardGate: () => undefined,
      }}
    >
      <div data-print-ready="true">
        <ReportPage tier="pro" printReport={report} />
      </div>
    </PaywallContext.Provider>
  )
}
