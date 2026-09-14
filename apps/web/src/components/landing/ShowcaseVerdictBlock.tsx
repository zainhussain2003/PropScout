/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import type { ReactNode } from 'react'
import { ScoutMark } from '../shared/ScoutMark'
import { clampStr } from './landingHelpers'

interface ShowcaseVerdictBlockProps {
  addr: string
  headline: ReactNode
  sub: ReactNode
}
export function ShowcaseVerdictBlock({
  addr,
  headline,
  sub,
}: ShowcaseVerdictBlockProps): JSX.Element {
  return (
    <div
      style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(20px, 2.4vw, 28px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: -40,
          bottom: -20,
          opacity: 0.06,
          color: 'var(--accent)',
        }}
      >
        <ScoutMark size={200} color="var(--accent)" />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'color-mix(in oklab, var(--bg) 50%, transparent)',
            display: 'block',
            marginBottom: 8,
          }}
        >
          PropScout verdict · {addr}
        </span>
        <p
          style={{
            fontSize: clampStr(14, 16),
            lineHeight: 1.6,
            color: 'var(--bg)',
            marginBottom: 12,
          }}
        >
          {headline}
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'color-mix(in oklab, var(--bg) 70%, transparent)',
            lineHeight: 1.6,
          }}
        >
          {sub}
        </p>
      </div>
    </div>
  )
}
