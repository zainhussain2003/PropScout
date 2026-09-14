/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

// ── ReportsSection ────────────────────────────────────────────────────

export type ModeStat = [string, string, string]

export function ModeStatTiles({ stats }: { stats: ModeStat[] }): JSX.Element {
  // Sample figures, labelled as such. The personal card used to show an
  // "FMV band" and a "School rank · Top 8%" — outputs the product does not
  // produce (no sales feed, Fraser rankings not loaded), presented as if it did.
  return (
    <div
      className="row gap-12"
      style={{ marginTop: 4, flexWrap: 'wrap' }}
      aria-label="Example figures from a sample report"
    >
      {stats.map(([lbl, val, status]) => (
        <div
          key={lbl}
          className="col gap-8"
          style={{
            flex: '1 1 0',
            minWidth: 90,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            {lbl}
          </div>
          <div
            className="serif tabular"
            style={{
              fontSize: 22,
              lineHeight: 1,
              color:
                status === 'pass'
                  ? 'var(--pass)'
                  : status === 'caution'
                    ? 'var(--caution)'
                    : status === 'fail'
                      ? 'var(--fail)'
                      : 'var(--ink)',
            }}
          >
            {val}
          </div>
        </div>
      ))}
      <span
        className="mono"
        style={{ flexBasis: '100%', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}
      >
        EXAMPLE FIGURES FROM A SAMPLE REPORT
      </span>
    </div>
  )
}
