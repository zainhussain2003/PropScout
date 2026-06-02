/**
 * InvestmentMetricsSection — §01 of the investor report.
 *
 * Shows:
 *   - 8-tile headline metrics grid (cap rate, cash flow, CoC, DSCR, NOI, GRM,
 *     break-even rent, gross yield)
 *   - Annual operating expense breakdown (6 line items in a 2-column table)
 *
 * All values update live when financing sliders change.
 */

import type { ComputedInvestorMetrics, ListingData } from '../../types/analysis'
import { SectionHead } from '../shared/SectionHead'
import { Metric } from '../analysis/Metric'
import { fmtMoney, fmtPct } from '../../lib/investorCalc'

interface InvestmentMetricsSectionProps {
  metrics: ComputedInvestorMetrics
  listing: ListingData
}

export function InvestmentMetricsSection({
  metrics,
  listing,
}: InvestmentMetricsSectionProps): JSX.Element {
  const grossYield = metrics.grossRentAnnual / listing.price

  // 8 headline tiles
  const tiles: Array<{
    label: string
    value: string
    sub: string
    status: 'pass' | 'caution' | 'fail' | 'neutral'
  }> = [
    {
      label: 'Cap rate',
      value: fmtPct(metrics.capRate),
      sub:
        metrics.capRate >= 0.05
          ? 'Above 5% threshold'
          : metrics.capRate >= 0.03
            ? '3–5% range'
            : 'Below 3% threshold',
      status: metrics.capRate >= 0.05 ? 'pass' : metrics.capRate >= 0.03 ? 'caution' : 'fail',
    },
    {
      label: 'Monthly cash flow',
      value: fmtMoney(metrics.cashFlowMonthly),
      sub: 'per month',
      status:
        metrics.cashFlowMonthly >= 200 ? 'pass' : metrics.cashFlowMonthly >= 0 ? 'caution' : 'fail',
    },
    {
      label: 'Cash-on-cash',
      value: fmtPct(metrics.cashOnCashReturn),
      sub: `On ${fmtMoney(metrics.totalCashInvested)} invested`,
      status:
        metrics.cashOnCashReturn >= 0.05
          ? 'pass'
          : metrics.cashOnCashReturn >= 0.03
            ? 'caution'
            : 'fail',
    },
    {
      label: 'DSCR',
      value: `${metrics.dscr.toFixed(2)}×`,
      sub:
        metrics.dscr >= 1.1
          ? 'Investment-grade'
          : metrics.dscr >= 1.0
            ? 'Marginal'
            : 'Will not qualify',
      status: metrics.dscr >= 1.1 ? 'pass' : metrics.dscr >= 1.0 ? 'caution' : 'fail',
    },
    {
      label: 'Monthly payment',
      value: fmtMoney(metrics.mortgagePaymentMonthly),
      sub: 'mortgage P+I',
      status: 'neutral',
    },
    {
      label: 'NOI',
      value: fmtMoney(metrics.noi),
      sub: 'annual',
      status: 'neutral',
    },
    {
      label: 'GRM',
      value: metrics.grm > 0 ? metrics.grm.toFixed(1) : '—',
      sub: metrics.grm > 0 ? 'Gross Rent Multiplier' : 'No comps available',
      status: 'neutral',
    },
    {
      label: 'Break-even rent',
      value: fmtMoney(metrics.breakEvenRent),
      sub: 'to cover all costs',
      status: metrics.breakEvenRent <= listing.rentEstimate ? 'pass' : 'fail',
    },
    {
      label: 'Gross yield',
      value: grossYield > 0 ? fmtPct(grossYield) : '—',
      sub: grossYield > 0 ? 'before expenses' : 'No comps available',
      status: 'neutral',
    },
  ]

  // Expense rows: [label, value, note]
  const expenseRows: Array<[string, number, string]> = [
    ['Property taxes', metrics.expenses.taxes, 'as listed'],
    ['Insurance (0.35%)', metrics.expenses.insurance, 'of value'],
    [
      'Maintenance reserve',
      metrics.expenses.maintenance,
      `${fmtPct(metrics.expenses.maintenance / listing.price, 2)} of value`,
    ],
    ['Vacancy allowance (5%)', metrics.expenses.vacancy, 'of gross rent'],
    [
      'Condo fee',
      metrics.expenses.condo,
      listing.condoFeeMonthly > 0 ? `${fmtMoney(listing.condoFeeMonthly)}/mo` : 'N/A',
    ],
    [
      'Property management',
      metrics.expenses.management,
      metrics.expenses.management > 0 ? '8% of gross rent' : 'not included',
    ],
  ]

  const verdictLabel =
    metrics.dscr >= 1.1
      ? 'Passes thresholds'
      : metrics.dscr >= 1.0
        ? '2 below threshold'
        : '4 below threshold'

  const verdictTone = metrics.dscr >= 1.1 ? 'pass' : metrics.dscr >= 1.0 ? 'caution' : 'fail'

  return (
    <section className="container tr-section" data-section="01">
      <SectionHead
        n="01"
        topic="Investment metrics"
        question={
          <>
            Does the deal <em>pencil</em>?
          </>
        }
        verdict={verdictLabel}
        tone={verdictTone}
      />

      {/* 8-tile grid — 4-col desktop, 2-col mobile */}
      <div
        className="grid-2col-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
        }}
      >
        {tiles.map((tile) => (
          <Metric
            key={tile.label}
            label={tile.label}
            value={tile.value}
            sub={tile.sub}
            status={tile.status}
          />
        ))}
      </div>

      {/* Expense breakdown */}
      <div className="card" style={{ marginTop: 22, padding: 28 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 18,
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div className="col" style={{ gap: 4 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Operating expenses · annual
            </span>
            <h3 className="serif" style={{ fontSize: 22 }}>
              Where the money goes.
            </h3>
          </div>
          <span
            className="serif tabular"
            style={{ fontSize: 26, lineHeight: 1, color: 'var(--accent)' }}
          >
            {fmtMoney(metrics.expenses.total)}
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>/yr</span>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {expenseRows.map(([label, value, note], i) => (
            <div
              key={label}
              style={{
                padding: '12px 0',
                borderBottom: i < 4 ? '1px solid var(--line)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
                paddingRight: i % 2 === 0 ? 24 : 0,
                paddingLeft: i % 2 === 1 ? 24 : 0,
                borderLeft: i % 2 === 1 ? '1px solid var(--line)' : 'none',
              }}
            >
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>{label}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {note}
                </span>
              </div>
              <span
                className="mono tabular"
                style={{
                  fontWeight: 500,
                  color: value > 0 ? 'var(--ink)' : 'var(--muted)',
                }}
              >
                {value > 0 ? fmtMoney(value) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
