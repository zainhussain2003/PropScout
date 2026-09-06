/**
 * Metric — headline metric tile.
 *
 * Used in the 8-tile investment metrics grid (§01).
 * The value is displayed in Instrument Serif (tabular), coloured by status.
 * The label is a mono eyebrow; the sub is a mono annotation below.
 *
 * `plainEnglish` is a one-line, jargon-free explanation of what the metric
 * actually means, rendered under the tile in normal sentence case. The report is
 * read by first-time landlords and by people buying their first home, not only by
 * analysts — "DSCR" and "GRM" mean nothing without it, and a sub-label that just
 * expands the acronym ("Gross Rent Multiplier") explains nothing either.
 */

interface MetricProps {
  label: string
  value: string
  sub?: string
  /**
   * Plain-language meaning of this metric, in a full sentence, no jargon and no
   * acronym expansion. Example for DSCR: "Rent covers 13% of the mortgage. Lenders
   * usually want at least 100%."
   */
  plainEnglish?: string
  status?: 'pass' | 'caution' | 'fail' | 'neutral'
}

const STATUS_COLOR: Record<NonNullable<MetricProps['status']>, string> = {
  pass: 'var(--pass)',
  caution: 'var(--caution)',
  fail: 'var(--fail)',
  neutral: 'var(--ink)',
}

export function Metric({
  label,
  value,
  sub,
  plainEnglish,
  status = 'neutral',
}: MetricProps): JSX.Element {
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

      {plainEnglish !== undefined && (
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.45,
            color: 'var(--ink-2)',
            marginTop: 2,
            paddingTop: 8,
            borderTop: '1px solid var(--line)',
          }}
        >
          {plainEnglish}
        </div>
      )}
    </div>
  )
}
