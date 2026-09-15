/**
 * EquitySection — §07 of the investor report: the equity curve and the
 * break-even appreciation card (D-062).
 *
 * One implementation for the live report and the demo route (D-073). The demo
 * rendered the chart alone, so the break-even card shipped in #32 was
 * invisible on the route people are shown first.
 */

import { SectionHead } from '../shared/SectionHead'
import { EquityChart } from './EquityChart'
import { BreakEvenAppreciation } from './BreakEvenAppreciation'
import { ExitScenariosCard } from './ExitScenariosCard'
import { fmtMoney } from '../../lib/investorCalc'
import type { ComputedInvestorMetrics, FinancingInputs, ListingData } from '../../types/analysis'

export interface EquitySectionProps {
  metrics: ComputedInvestorMetrics
  /** With the listing and financing, the exit-scenarios table renders too (D-110). */
  listing?: ListingData
  financing?: FinancingInputs
}

export function EquitySection({ metrics, listing, financing }: EquitySectionProps): JSX.Element {
  const finalPoint = metrics.equityCurve[metrics.equityCurve.length - 1]
  const year20Equity = finalPoint?.equity ?? 0

  return (
    <section className="container tr-section" data-section="07">
      <SectionHead
        n="07"
        topic="Equity build"
        question={
          <>
            What <em>builds</em> over time?
          </>
        }
        verdict={`${fmtMoney(year20Equity)} at year 20`}
        tone="pass"
      />
      <div className="card" style={{ padding: 28 }}>
        <EquityChart
          equityCurve={metrics.equityCurve}
          totalCashInvested={metrics.totalCashInvested}
        />
      </div>
      <BreakEvenAppreciation
        holdCase={metrics.holdCase}
        cashFlowMonthly={metrics.cashFlowMonthly}
      />
      {listing != null && financing != null && (
        <ExitScenariosCard metrics={metrics} listing={listing} financing={financing} />
      )}
    </section>
  )
}
