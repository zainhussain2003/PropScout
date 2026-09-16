/**
 * SanityNotice — the plausibility checks that failed on this analysis
 * (D-118).
 *
 * The calc engine runs bounds checks after every analysis (a cap rate
 * outside 0–20%, a break-even rent more than 3× the market rent, …), logs
 * the failures and marks the analysis. Until D-118 the mark went nowhere:
 * the report showed the numbers as if nothing had fired. This puts the
 * checks' own words above the metrics, so the reader knows which figure to
 * doubt before reading it. Shown on the investor and landlord reports —
 * the checks are on investment figures those reports display.
 *
 * Render-only: the sentences come from the engine (calculations/sanity.py)
 * through the analysis; nothing is computed here.
 */

import { Icon } from './Icon'

interface SanityNoticeProps {
  /** The failed checks in the engine's words; undefined on analyses stored before D-118. */
  warnings: string[] | undefined
  /** The stored flag — the only signal an older analysis carries. */
  hasSanityWarnings: boolean
}

export function SanityNotice({
  warnings,
  hasSanityWarnings,
}: SanityNoticeProps): JSX.Element | null {
  const lines = warnings ?? []
  if (lines.length === 0 && !hasSanityWarnings) return null

  return (
    <div
      role="status"
      aria-label="Plausibility check"
      className="container"
      style={{ marginBottom: 24 }}
    >
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'color-mix(in oklab, var(--caution) 10%, var(--surface))',
          border: '1px solid color-mix(in oklab, var(--caution) 35%, transparent)',
          color: 'var(--ink)',
          fontSize: 13,
        }}
      >
        <div className="row gap-8" style={{ alignItems: 'center', marginBottom: 6 }}>
          <Icon name="flag" size={14} />
          <span
            className="mono"
            style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}
          >
            {lines.length === 1
              ? 'One figure failed a plausibility check'
              : `${lines.length || 'Some'} figures failed a plausibility check`}
          </span>
        </div>
        {lines.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {lines.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            The engine marked this analysis as outside its plausible bounds. Treat the figures below
            as a check on the inputs, not a verdict.
          </p>
        )}
        <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }}>
          The numbers still show so you can see what the inputs produced; a failed check usually
          means the rent estimate or a listed cost is wrong for this property, not that the deal is.
        </p>
      </div>
    </div>
  )
}
