/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { DEAL_SCORE } from '../../constants/thresholds'

// ── Static landing-demo micro-components ─────────────────────────────
// These are display-only inline visuals for the ReportShowcase.
// The real analysis components (with live data + animation) are PR 4.

interface ShowcaseDealScoreProps {
  score: number
  size: number
  label?: string
}
export function ShowcaseDealScore({
  score,
  size,
  label = '',
}: ShowcaseDealScoreProps): JSX.Element {
  const r = (size / 2) * 0.78
  const circ = 2 * Math.PI * r
  const filled = circ * (Math.max(0, Math.min(100, score)) / 100)

  // Unified on the DEAL_SCORE verdict brackets (matches the report gauge + labels).
  const stroke =
    score >= DEAL_SCORE.GOOD
      ? 'var(--pass)'
      : score >= DEAL_SCORE.MARGINAL
        ? 'var(--caution)'
        : 'var(--fail)'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={size * 0.065}
          strokeDasharray={circ}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
        {/* Fill */}
        <circle
          data-score-ring="clock"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={size * 0.065}
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      {/* Score number */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <span
          className="serif tabular"
          style={{ fontSize: size * 0.285, lineHeight: 1, color: 'var(--ink)' }}
        >
          {score}
        </span>
        {label && (
          <span
            className="mono"
            style={{
              width: '68%',
              fontSize: size <= 110 ? 7 : 9,
              lineHeight: 1.15,
              letterSpacing: size <= 110 ? '0.06em' : '0.1em',
              textTransform: 'uppercase',
              textAlign: 'center',
              color: 'var(--muted)',
            }}
          >
            <span style={{ display: 'block' }}>{label.replace(/\s*\/\s*100$/i, '')}</span>
            {/\/\s*100$/i.test(label) && <span style={{ display: 'block' }}>/ 100</span>}
          </span>
        )}
      </div>
    </div>
  )
}
