/**
 * Metric — headline metric tile.
 *
 * Used in the 8-tile investment metrics grid (§01).
 * The value is displayed in Instrument Serif (tabular), coloured by status.
 * The label is a mono eyebrow; the sub is a mono annotation below.
 */

interface MetricProps {
  label: string
  value: string
  sub?: string
  status?: 'pass' | 'caution' | 'fail' | 'neutral'
}

const STATUS_COLOR: Record<NonNullable<MetricProps['status']>, string> = {
  pass: 'var(--pass)',
  caution: 'var(--caution)',
  fail: 'var(--fail)',
  neutral: 'var(--ink)',
}

export function Metric({ label, value, sub, status = 'neutral' }: MetricProps): JSX.Element {
  return (
    <div
      className="col"
      style={{
        padding: '18px 20px',
        borderRadius: 14,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        gap: 6,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        {label}
      </div>

      <div
        className="serif tabular"
        style={{
          fontSize: 30,
          lineHeight: 1,
          color: STATUS_COLOR[status],
        }}
      >
        {value}
      </div>

      {sub !== undefined && (
        <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
