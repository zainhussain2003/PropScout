/**
 * LTTTable — Ontario Land Transfer Tax bracket table.
 *
 * Shows per-bracket rate, taxable amount, and LTT owed.
 * toronto=true adds a Toronto municipal LTT row (equals provincial total, stacked).
 * Total displayed prominently in the header.
 */

import type { LTTResult } from '../../types/analysis'
import { fmtMoney, fmtPct } from '../../lib/investorCalc'

interface LTTTableProps {
  ltt: LTTResult
  price: number
  toronto?: boolean
}

const COLUMN_HEADERS = ['Bracket', 'Rate', 'Amount taxed', 'LTT'] as const

export function LTTTable({ ltt, price, toronto = false }: LTTTableProps): JSX.Element {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--line)',
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
            Land Transfer Tax · Ontario{toronto ? ' + Toronto' : ''}
          </span>
          <h4 className="serif" style={{ fontSize: 22 }}>
            {fmtMoney(price)} purchase
          </h4>
        </div>
        <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
          <span
            className="serif tabular"
            style={{ fontSize: 28, lineHeight: 1, color: 'var(--accent)' }}
          >
            {fmtMoney(ltt.total)}
          </span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {toronto ? 'Provincial + municipal' : 'Provincial only'}
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          padding: '12px 24px',
          background: 'var(--bg-elev)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {COLUMN_HEADERS.map((h, i) => (
          <div
            key={h}
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              textAlign: i === 0 ? 'left' : 'right',
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {ltt.rows.map((row, i) => (
        <div
          key={row.band}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '12px 24px',
            borderBottom: i < ltt.rows.length - 1 ? '1px solid var(--line)' : 'none',
            fontSize: 13,
          }}
        >
          <span style={{ color: 'var(--ink)' }}>{row.band}</span>
          <span className="mono tabular" style={{ color: 'var(--ink-2)', textAlign: 'right' }}>
            {fmtPct(row.rate, 1)}
          </span>
          <span className="mono tabular" style={{ color: 'var(--ink-2)', textAlign: 'right' }}>
            {fmtMoney(row.amount)}
          </span>
          <span
            className="mono tabular"
            style={{ color: 'var(--ink)', textAlign: 'right', fontWeight: 500 }}
          >
            {fmtMoney(row.ltt)}
          </span>
        </div>
      ))}

      {/* Toronto municipal row */}
      {toronto && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '12px 24px',
            borderTop: '1px dashed var(--line-strong)',
            background: 'color-mix(in oklab, var(--accent) 5%, transparent)',
            fontSize: 13,
          }}
        >
          <span style={{ color: 'var(--ink-2)' }}>Toronto municipal LTT (stacked)</span>
          <span />
          <span />
          <span
            className="mono tabular"
            style={{ color: 'var(--accent)', textAlign: 'right', fontWeight: 600 }}
          >
            {fmtMoney(ltt.municipal)}
          </span>
        </div>
      )}
    </div>
  )
}
