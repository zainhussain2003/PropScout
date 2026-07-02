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
 * Colour rules — unified on the DEAL_SCORE verdict brackets so the gauge colour
 * always matches the verdict label/tone (VERDICT_DISPLAY in investorCalc):
 *   ≥ 65 (good_deal+)        → var(--pass)     sage green
 *   35–64 (caution/marginal) → var(--caution)  amber
 *   < 35 (do_not_buy+)       → var(--fail)     clay red
 */

import { useEffect, useState } from 'react'
import { DEAL_SCORE } from '../../constants/thresholds'
import { verdictLabelForScore } from '../../lib/investorCalc'

interface DealScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showVerdict?: boolean
  animate?: boolean
  /** Denominator for the arc + aria-label. Default 95 (raw scale); pass 100 for display-normalized. */
  max?: number
  /**
   * Ring colour driven by the verdict tone (one source of truth). When omitted,
   * colour falls back to the bracket-based default — but for any score that has
   * a backend verdict, ALWAYS pass tone so the colour can't disagree with the
   * number (a normalized number against raw brackets would mismatch the label).
   */
  tone?: 'pass' | 'caution' | 'fail'
  /**
   * Verdict text rendered verbatim when showVerdict is set. Pass the backend
   * verdict label on live paths; when omitted, the label is derived from the
   * raw score via the shared verdict brackets (demo gauges only).
   */
  verdictLabel?: string
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg', number> = {
  sm: 84,
  md: 120,
  lg: 180,
}

const TONE_COLOR: Record<'pass' | 'caution' | 'fail', string> = {
  pass: 'var(--pass)',
  caution: 'var(--caution)',
  fail: 'var(--fail)',
}

function getScoreColor(score: number): string {
  if (score >= DEAL_SCORE.GOOD) return 'var(--pass)'
  if (score >= DEAL_SCORE.MARGINAL) return 'var(--caution)'
  return 'var(--fail)'
}

export function DealScore({
  score,
  size = 'md',
  label,
  showVerdict = false,
  animate = true,
  max = 95,
  tone,
  verdictLabel,
}: DealScoreProps): JSX.Element {
  const px = SIZE_MAP[size]
  const strokeWidth = Math.max(5, Math.round(px * 0.075))
  const R = (px - strokeWidth) / 2
  const circumference = 2 * Math.PI * R
  const cx = px / 2
  const cy = px / 2

  const clamped = Math.max(0, Math.min(max, Math.round(score)))
  const targetOffset = circumference * (1 - clamped / max)

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

  // Colour from the backend verdict tone when given — never re-derive it from
  // the (possibly normalized) number, or it can disagree with the verdict label.
  const color = tone ? TONE_COLOR[tone] : getScoreColor(clamped)

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
      aria-label={`Deal score: ${clamped} out of ${max}`}
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

        {/* Numeric score + optional label + optional verdict pill (all inside the ring) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: strokeWidth + 2,
          }}
        >
          <span
            className="serif tabular"
            style={{
              fontSize: px >= 80 ? px * 0.42 : px * 0.52,
              lineHeight: 1,
              fontWeight: 400,
              color: 'var(--ink)',
            }}
          >
            {clamped}
          </span>
          {label && (
            <span
              className="mono"
              style={{
                fontSize: 9,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                textAlign: 'center',
                marginTop: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          )}
          {showVerdict && (
            <span
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
              {verdictLabel ?? verdictLabelForScore(clamped)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
