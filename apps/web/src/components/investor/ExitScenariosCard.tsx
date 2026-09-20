/**
 * ExitScenariosCard — §07's "what does a sale return?" table (D-110).
 *
 * Four columns (stress, flat, conservative, the slider's base rate) at a
 * hold the reader picks (5 / 10 / 20 years, matching the equity chart's
 * snapshots). Rendering only: the numbers come from lib/exitScenarios, the
 * hold period is the one piece of UI state it owns.
 */

import { useState } from 'react'
import type { ComputedInvestorMetrics, FinancingInputs, ListingData } from '../../types/analysis'
import { computeExitScenarios, type ExitScenario } from '../../lib/exitScenarios'
import { fmtMoney } from '../../lib/investorCalc'
import { EXIT_COSTS } from '../../constants/thresholds'

interface ExitScenariosCardProps {
  metrics: ComputedInvestorMetrics
  listing: ListingData
  financing: FinancingInputs
}

const HOLDS = [5, 10, 20] as const

function fmtSignedPct(rate: number | null): string {
  if (rate == null) return '—'
  return `${rate >= 0 ? '+' : '−'}${Math.abs(rate * 100).toFixed(1)}%`
}

function fmtSignedMoney(v: number): string {
  return `${v < 0 ? '−' : ''}${fmtMoney(Math.abs(v))}`
}

export function ExitScenariosCard({
  metrics,
  listing,
  financing,
}: ExitScenariosCardProps): JSX.Element | null {
  const [holdYears, setHoldYears] = useState<(typeof HOLDS)[number]>(10)
  const scenarios = computeExitScenarios({
    price: listing.price,
    principal: metrics.principal,
    mortgageRate: financing.mortgageRate,
    amortizationYears: financing.amortizationYears,
    cashFlowMonthly: metrics.cashFlowMonthly,
    totalCashInvested: metrics.totalCashInvested,
    baseAppreciationRate: financing.appreciationRate,
    holdYears,
  })
  if (scenarios.length === 0) return null

  const rows: Array<{ label: string; cell: (s: ExitScenario) => string; strong?: boolean }> = [
    { label: 'Sale price', cell: (s) => fmtMoney(s.salePrice) },
    { label: 'Cost of selling', cell: (s) => `−${fmtMoney(s.sellingCosts)}` },
    { label: 'Mortgage paid off', cell: (s) => `−${fmtMoney(s.mortgageBalance)}` },
    { label: 'Net proceeds', cell: (s) => fmtMoney(s.netProceeds), strong: true },
    {
      label: 'Cash flow over the hold',
      cell: (s) =>
        s.cumulativeContribution > 0
          ? `−${fmtMoney(s.cumulativeContribution)} put in`
          : s.cumulativeCashFlow > 0
            ? `+${fmtMoney(s.cumulativeCashFlow)}`
            : '$0',
    },
    { label: 'Cash in, all told', cell: (s) => fmtMoney(s.cashIn) },
    { label: 'Profit before tax', cell: (s) => fmtSignedMoney(s.profit), strong: true },
    {
      // IRR on the dated stream (D-123), not the simple multiple: a shortfall
      // funded in year nine is not the same money as the down payment.
      label: 'IRR, before tax',
      cell: (s) => fmtSignedPct(s.irr),
      strong: true,
    },
  ]

  return (
    <div className="card" style={{ padding: 28, marginTop: 18 }} data-testid="exit-scenarios">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h3
          style={{
            fontFamily: 'Instrument Serif, Georgia, serif',
            fontSize: 26,
            fontWeight: 400,
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          What does a <em>sale</em> return?
        </h3>
        <div role="group" aria-label="Hold period" style={{ display: 'flex', gap: 6 }}>
          {HOLDS.map((h) => (
            <button
              key={h}
              type="button"
              className={`btn ${h === holdYears ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={h === holdYears}
              onClick={() => setHoldYears(h)}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              {h} yrs
            </button>
          ))}
        </div>
      </div>
      <p style={{ margin: '10px 0 0', color: 'var(--muted)', maxWidth: '64ch' }}>
        Selling after {holdYears} years under four price paths, after the cost of selling and the
        mortgage still owed, against every dollar put in. Before tax.
      </p>

      <div style={{ overflowX: 'auto', marginTop: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '10px 12px 10px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              />
              {scenarios.map((s) => (
                <th
                  key={s.key}
                  style={{
                    textAlign: 'right',
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--line)',
                    color: 'var(--ink)',
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                    {fmtSignedPct(s.appreciationRate)} / yr
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td
                  style={{
                    padding: '9px 12px 9px 0',
                    borderBottom: '1px solid var(--line)',
                    color: row.strong ? 'var(--ink)' : 'var(--ink-2)',
                    fontWeight: row.strong ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.label}
                </td>
                {scenarios.map((s) => {
                  const text = row.cell(s)
                  const negative = text.startsWith('−')
                  return (
                    <td
                      key={s.key}
                      className="mono tabular"
                      style={{
                        padding: '9px 12px',
                        borderBottom: '1px solid var(--line)',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        fontWeight: row.strong ? 600 : 400,
                        color: row.strong
                          ? negative
                            ? 'var(--fail)'
                            : 'var(--pass)'
                          : 'var(--ink-2)',
                      }}
                    >
                      {text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', margin: '12px 0 0' }}>
        Cost of selling = {Math.round(EXIT_COSTS.COMMISSION_RATE * 100)}% commission + HST +{' '}
        {fmtMoney(EXIT_COSTS.LEGAL_FEES)} legal, a starting assumption. Capital gains tax (half the
        gain at your marginal rate) is not deducted. Maintenance is already inside the cash flow; a
        major repair would come off these figures. IRR counts your cash at closing, each year&apos;s
        cash flow when it happens, and the sale at the end of the hold.
      </p>
    </div>
  )
}
