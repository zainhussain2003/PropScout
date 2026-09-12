/**
 * CashToCloseSection — §04 of the investor report.
 *
 * One implementation for the live report and the demo route (D-073). The
 * demo's own copy itemised "Legal fees", "Title insurance" and a $600 "Home
 * inspection" as line items — figures nothing in the analysis produced.
 * This version shows the down payment, the two land-transfer taxes the engine
 * computed, and one honest "Other closing costs (est.)" line for the rest.
 */

import { SectionHead } from '../shared/SectionHead'
import { LTTTable } from './LTTTable'
import { computeLTT, fmtMoney } from '../../lib/investorCalc'
import type { ComputedInvestorMetrics, FinancingInputs, ListingData } from '../../types/analysis'

export interface CashToCloseSectionProps {
  metrics: ComputedInvestorMetrics
  listing: ListingData
  financing: FinancingInputs
}

export function CashToCloseSection({
  metrics,
  listing,
  financing,
}: CashToCloseSectionProps): JSX.Element {
  const lttResult = computeLTT(listing.price, financing.isToronto)
  const total = metrics.totalCashInvested

  return (
    <section className="container tr-section" data-section="04">
      <SectionHead
        n="04"
        topic="Cash to close"
        question={
          <>
            What you need in the <em>bank</em> on closing day.
          </>
        }
        verdict={fmtMoney(total)}
        tone="caution"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        <LTTTable ltt={lttResult} price={listing.price} toronto={listing.isToronto} />

        <div className="card col" style={{ padding: 24, gap: 16 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Total cash required
          </div>
          {(
            [
              { label: 'Down payment', value: metrics.downPayment },
              { label: 'Provincial LTT', value: metrics.lttProvincial },
              ...(metrics.lttMunicipal > 0
                ? [{ label: 'Toronto municipal LTT', value: metrics.lttMunicipal }]
                : []),
              {
                label: 'Other closing costs (est.)',
                value: metrics.closingCostsTotal - metrics.lttProvincial - metrics.lttMunicipal,
              },
            ] as Array<{ label: string; value: number }>
          ).map((row) => (
            <div
              key={row.label}
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}
            >
              <span style={{ color: 'var(--ink-2)' }}>{row.label}</span>
              <span className="mono tabular" style={{ fontWeight: 500 }}>
                {fmtMoney(row.value)}
              </span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span className="mono tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>
              {fmtMoney(total)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
