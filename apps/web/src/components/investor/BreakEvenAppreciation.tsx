/**
 * BreakEvenAppreciation — what price growth this hold has to deliver to return
 * the cash it consumes, at 5, 10 and 20 years.
 *
 * Sits under the equity chart because it answers the other half of the same
 * question: the chart shows what you would own, this shows what the market has
 * to do for you to have lost nothing.
 *
 * Presentation rules, and the reasons they are rules:
 *
 *   - The required rate is shown beside the CASH it takes to get there. A deep
 *     monthly shortfall can produce a reassuringly small percentage over twenty
 *     years while demanding several hundred thousand dollars of contributions;
 *     showing the rate alone would read as "this deal is fine".
 *   - It never says whether the rate is achievable. There is no local
 *     appreciation series connected (docs/DECISIONS.md D-058), so "likely" or
 *     "unlikely" would be invented.
 *   - It is labelled break-even, not return: the model credits nothing for what
 *     the cash could have earned elsewhere, and the equity stays illiquid.
 *   - It is a MINIMUM. Selling costs are excluded because realtor commission is
 *     not a published rate in Ontario, so every figure here is a floor and the
 *     copy has to say "at least". Presenting it as exact would understate the
 *     bar, which is the direction that flatters a deal.
 *
 * All figures come from the calc engine (`calculations/hold_case.py`); nothing
 * is recomputed here.
 */

import type { HoldCaseRow } from '../../types/analysis'
import { fmtMoney } from '../../lib/investorCalc'

interface BreakEvenAppreciationProps {
  holdCase: HoldCaseRow[]
  /** Monthly cash flow from the same analysis, used only to word the intro. */
  cashFlowMonthly: number
}

/** Signed percentage with one decimal — a negative rate is a real result. */
function fmtRate(rate: number): string {
  return `${rate >= 0 ? '' : '−'}${Math.abs(rate * 100).toFixed(1)}%`
}

export function BreakEvenAppreciation({
  holdCase,
  cashFlowMonthly,
}: BreakEvenAppreciationProps): JSX.Element | null {
  if (holdCase.length === 0) return null

  const running = cashFlowMonthly < 0

  return (
    <div
      className="card"
      style={{ padding: 28, marginTop: 18 }}
      data-testid="break-even-appreciation"
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
        What would the market have to <em>do</em>?
      </h3>

      <p style={{ margin: '10px 0 0', color: 'var(--muted)', maxWidth: '64ch' }}>
        {running
          ? `This property costs you ${fmtMoney(Math.abs(cashFlowMonthly))} a month to hold. ` +
            'Below is the least the price would have to rise each year to get every ' +
            'dollar back — the deposit, the closing costs and every monthly top-up — ' +
            'after paying off the mortgage.'
          : 'This property covers its own costs. Below is the least the price would have ' +
            'to move each year to get your deposit and closing costs back after paying ' +
            'off the mortgage. A negative figure means prices could fall that much a ' +
            'year and you would still get your money back.'}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${holdCase.length}, minmax(0, 1fr))`,
          gap: 18,
          marginTop: 22,
        }}
        className="grid-1col-mobile"
      >
        {holdCase.map((row) => (
          <div
            key={row.year}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              padding: 18,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontFamily: 'Geist Mono, monospace',
                fontSize: 12,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              If you hold {row.year} years
            </div>

            <div
              style={{
                fontFamily: 'Geist Mono, monospace',
                fontSize: 34,
                color: 'var(--accent)',
                marginTop: 8,
                lineHeight: 1.1,
              }}
            >
              {fmtRate(row.breakEvenAnnualRate)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              a year, at least
            </div>

            <dl style={{ margin: '16px 0 0', fontSize: 13 }}>
              <Line
                label="Cash you'd put in"
                value={fmtMoney(row.totalCashIn)}
                emphasis={row.cumulativeContribution > 0}
              />
              <Line label="Mortgage paid down" value={fmtMoney(row.principalRepaid)} />
              <Line label="Sale price to get even" value={fmtMoney(row.breakEvenSalePrice)} />
            </dl>
          </div>
        ))}
      </div>

      <p style={{ margin: '20px 0 0', fontSize: 13, color: 'var(--muted)', maxWidth: '72ch' }}>
        These are minimums, and your real figure is higher: selling a property costs money —
        commission and legal fees — and we don&rsquo;t include it, because commission is negotiated
        rather than published, so we won&rsquo;t put a number on yours. Getting even is also not the
        same as earning a return: nothing here credits what that cash could have made elsewhere, and
        equity cannot be spent until you sell. Figures hold today&rsquo;s rent and costs flat for
        the whole period. We don&rsquo;t have a local price history for this area, so we can&rsquo;t
        tell you whether these growth rates are realistic here.
      </p>
    </div>
  )
}

function Line({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: string
  emphasis?: boolean
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '4px 0',
        borderTop: '1px solid var(--line)',
      }}
    >
      <dt style={{ color: 'var(--muted)', minWidth: 0 }}>{label}</dt>
      <dd
        style={{
          margin: 0,
          fontFamily: 'Geist Mono, monospace',
          color: emphasis ? 'var(--ink)' : 'var(--muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </dd>
    </div>
  )
}
