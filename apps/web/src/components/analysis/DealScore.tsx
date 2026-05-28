/**
 * DealScore — radial SVG gauge displaying the 0–95 deal score.
 *
 * Props:
 *   score        — 0–95 (clamped automatically)
 *   size         — 'sm' (84px) | 'md' (120px) | 'lg' (180px). Default 'md'.
 *   label        — mono label below the number (e.g. 'Deal score / 100')
 *   showVerdict  — when true, shows a VerdictPill below the score
 *   animate      — when true, stroke animates from empty → target on mount
 *
 * Colour rules (per spec):
 *   ≤ 25  → var(--fail)     clay red
 *   26–60 → var(--caution)  amber
 *   61+   → var(--pass)     sage green
 */

import { useEffect, useState } from 'react'

interface DealScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showVerdict?: boolean
  animate?: boolean
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg', number> = {
  sm: 84,
  md: 120,
  lg: 180,
}

function getScoreColor(score: number): string {
  if (score <= 25) return 'var(--fail)'
  if (score <= 60) return 'var(--caution)'
  return 'var(--pass)'
}

export function DealScore({
  score,
  size = 'md',
  label,
  showVerdict = false,
  animate = true,
}: DealScoreProps): JSX.Element {
  const px = SIZE_MAP[size]
  const strokeWidth = Math.round(px * 0.085)
  const R = (px - strokeWidth) / 2
  const circumference = 2 * Math.PI * R
  const cx = px / 2
  const cy = px / 2

  const clamped = Math.max(0, Math.min(95, Math.round(score)))
  const targetOffset = circumference * (1 - clamped / 95)

  // Start at full offset (gap = 0 shown) then animate to target
  const [offset, setOffset] = useState(animate ? circumference : targetOffset)

  useEffect(() => {
    if (!animate) {
      setOffset(targetOffset)
      return
    }
    // Defer one frame so the CSS transition fires
    const id = requestAnimationFrame(() => {
      setOffset(targetOffset)
    })
    return () => cancelAnimationFrame(id)
  }, [targetOffset, animate])

  const color = getScoreColor(clamped)

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
      aria-label={`Deal score: ${clamped} out of 95`}
    >
      <div style={{ position: 'relative', width: px, height: px }}>
        {/* SVG gauge */}
        <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} role="img" aria-hidden="true">
          {/* Track ring */}
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke="var(--line)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              transition: animate ? 'stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)' : 'none',
            }}
          />
        </svg>

        {/* Numeric score + optional label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
          }}
        >
          <span
            className="serif tabular"
            style={{
              fontSize: px * 0.235,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color,
            }}
          >
            {clamped}
          </span>
          {label && (
            <span
              className="mono"
              style={{
                fontSize: Math.max(8, px * 0.071),
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                textAlign: 'center',
                paddingInline: 6,
                lineHeight: 1.2,
              }}
            >
              {label}
            </span>
          )}
        </div>
      </div>

      {showVerdict && (
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color,
          }}
        >
          {clamped <= 25
            ? 'Hard pass'
            : clamped <= 35
              ? 'Do not buy'
              : clamped <= 50
                ? 'Marginal'
                : clamped <= 65
                  ? 'Caution'
                  : clamped <= 80
                    ? 'Good deal'
                    : 'Strong deal'}
        </span>
      )}
    </div>
  )
}
