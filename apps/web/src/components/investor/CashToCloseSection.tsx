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

  // Already owned (D-108): nothing is due on any closing day. The section
  // stays in the outline and says so, with the equity the model runs on.
  if (financing.owned === true) {
    const equity = Math.round(listing.price * financing.downPaymentPct)
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
          verdict="Owned · nothing to close"
          tone="pass"
        />
        <div className="card col" style={{ padding: 28, gap: 10 }}>
          <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>
            You already own this property, so no land-transfer tax, legal fees or down payment are
            due.
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', margin: 0 }}>
            The equity the report measures your return on is {fmtMoney(equity)} —{' '}
            {Math.round(financing.downPaymentPct * 100)}% of the {fmtMoney(listing.price)} value you
            entered
            {financing.downPaymentPct >= 1
              ? ', owned outright.'
              : ', after the mortgage balance you entered.'}
          </p>
        </div>
      </section>
    )
  }

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

      {/* Two cards, the bracket table wider: auto-fill at 280px left two narrow
          cards and half a row of empty space at 1440px (2026-09-14 review). */}
      <div
        className="grid-1col-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
          gap: 16,
          alignItems: 'start',
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
