// DealScore — radial gauge with animated stroke.
//
// Props:
//   score       0–100 integer
//   size        pixel diameter of the gauge (default 188)
//   animate     whether to animate stroke-dashoffset on mount (default true)
//   label       text inside the ring. Pass "" to hide, null/undefined for auto.
//   showVerdict override; auto-hidden below size 130 when not provided

import { useEffect, useState } from 'react'

interface DealScoreProps {
  score: number
  size?: number
  animate?: boolean
  /** Inner label text. Pass "" to hide. Omit for auto (shown ≥ 150px). */
  label?: string
  /** Override auto-hide of the verdict pill. Auto-hidden below size 130. */
  showVerdict?: boolean
}

function getVerdict(score: number): string {
  if (score >= 80) return 'Strong deal'
  if (score >= 65) return 'Good deal'
  if (score >= 50) return 'Caution'
  if (score >= 35) return 'Marginal'
  return 'Hard pass'
}

function getColor(score: number): string {
  if (score >= 65) return 'var(--pass)'
  if (score >= 35) return 'var(--caution)'
  return 'var(--fail)'
}

export function DealScore({
  score,
  size = 188,
  animate = true,
  label,
  showVerdict,
}: DealScoreProps): JSX.Element {
  // Stroke scales with size so small gauges don't look chunky
  const stroke = Math.max(5, Math.round(size * 0.075))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  const [drawn, setDrawn] = useState(animate ? 0 : score)

  useEffect(() => {
    if (!animate) {
      setDrawn(score)
      return
    }
    const t = setTimeout(() => setDrawn(score), 200)
    return () => clearTimeout(t)
  }, [score, animate])

  const off = c * (1 - drawn / 100)
  const color = getColor(score)
  const verdict = getVerdict(score)

  // Auto-hide label at small sizes
  const labelText =
    label === '' ? null : label == null ? (size >= 150 ? 'Deal score / 100' : null) : label

  // Auto-hide verdict pill below 130px
  const showV = showVerdict != null ? showVerdict : size >= 130

  const numberSize =
    size >= 170 ? size * 0.42 : size >= 120 ? size * 0.42 : size >= 80 ? size * 0.46 : size * 0.52

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
        aria-hidden
      >
        {/* Track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>

      {/* Inner content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: stroke + 2,
        }}
      >
        <div
          className="serif tabular"
          style={{ fontSize: numberSize, lineHeight: 1, fontWeight: 400, color: 'var(--ink)' }}
        >
          {score}
        </div>

        {labelText && (
          <div
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginTop: 6,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {labelText}
          </div>
        )}

        {showV && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              fontWeight: 500,
              color,
              padding: '3px 10px',
              borderRadius: 999,
              border: `1px solid ${color}`,
              background: `color-mix(in oklab, ${color} 8%, transparent)`,
              whiteSpace: 'nowrap',
            }}
          >
            {verdict}
          </div>
        )}
      </div>
    </div>
  )
}
