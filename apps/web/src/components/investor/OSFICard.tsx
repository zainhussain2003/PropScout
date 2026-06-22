/**
 * OSFICard — OSFI B-20 mortgage stress test result card.
 *
 * Shows: contract rate, stress buffer, qualifying rate, qualifying payment,
 * GDS ratio, and pass/fail verdict. Updates whenever financing prop changes.
 */

import type { OSFIResult, FinancingInputs } from '../../types/analysis'
import { VerdictPill } from '../shared/VerdictPill'
import { fmtPct, fmtMoney } from '../../lib/investorCalc'

interface OSFICardProps {
  osfi: OSFIResult
  financing: FinancingInputs
  /**
   * Gross household income the GDS is computed against — shown in the footnote.
   * Optional: falls back to financing.assumedIncome for static/demo callers.
   */
  income?: number
}

export function OSFICard({ osfi, financing, income }: OSFICardProps): JSX.Element {
  const tone = osfi.pass ? 'pass' : 'fail'
  const displayIncome = income ?? financing.assumedIncome

  const rows: Array<{
    label: string
    value: string
    bold?: boolean
    colorVar?: string
  }> = [
    { label: 'Contract rate', value: fmtPct(financing.mortgageRate, 2) },
    { label: 'Stress buffer', value: '+2.00 pts' },
    {
      label: 'Qualifying rate (higher of)',
      value: fmtPct(osfi.qualifyingRate, 2),
      bold: true,
      colorVar: 'var(--accent)',
    },
    { label: 'Qualifying payment', value: `${fmtMoney(osfi.qualifyingPmt)}/mo` },
    {
      label: 'GDS ratio',
      value: fmtPct(osfi.gds, 1),
      bold: true,
      colorVar: osfi.pass ? 'var(--pass)' : 'var(--fail)',
    },
    { label: 'Threshold', value: fmtPct(osfi.threshold, 0) },
  ]

  return (
    <div className="card col gap-20" style={{ padding: 26 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
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
            OSFI stress test
          </span>
          <h4 className="serif" style={{ fontSize: 22 }}>
            B-20 mortgage qualification
          </h4>
        </div>
        <VerdictPill tone={tone} label={osfi.pass ? 'Qualifies' : 'Fails'} />
      </div>

      {/* Rows */}
      <div className="col" style={{ gap: 12 }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: i < rows.length - 1 ? 12 : 0,
              borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none',
              fontSize: 13,
              alignItems: 'baseline',
            }}
          >
            <span style={{ color: 'var(--ink-2)' }}>{row.label}</span>
            <span
              className="mono tabular"
              style={{
                fontWeight: row.bold ? 600 : 500,
                color: row.colorVar ?? 'var(--ink)',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* B-20 rule note */}
      <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
        Higher of: contract rate + 2.00% or 5.25% floor
      </span>

      {/* Summary callout */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          background: `color-mix(in oklab, ${osfi.pass ? 'var(--pass)' : 'var(--fail)'} 8%, transparent)`,
          border: `1px solid color-mix(in oklab, ${osfi.pass ? 'var(--pass)' : 'var(--fail)'} 25%, transparent)`,
          fontSize: 12,
          color: 'var(--ink-2)',
          lineHeight: 1.5,
        }}
      >
        {osfi.pass ? (
          <>
            Gross household income {fmtMoney(displayIncome)}. At {fmtPct(osfi.qualifyingRate, 2)}{' '}
            qualifying rate, GDS sits comfortably under the 44% federal threshold — most
            insured-mortgage products available.
          </>
        ) : (
          <>
            Gross household income {fmtMoney(displayIncome)}. Qualifying payment pushes GDS to{' '}
            {fmtPct(osfi.gds, 1)} — above the 44% federal threshold. Standard A-lender financing
            likely unavailable; alt-lender or higher income required.
          </>
        )}
      </div>
    </div>
  )
}
