/**
 * AIVerdictBlock — dark full-bleed AI verdict card.
 *
 * Features:
 *   - Dark ink background with ScoutMark SVG watermark at 6–8% opacity
 *   - Live dot + "Scout AI · investor verdict" eyebrow
 *   - Large Instrument Serif headline (with inline accents via JSX)
 *   - Serif sub-paragraph at reduced opacity
 *   - compact=true: reduced padding, smaller type
 */

import { useState, useEffect, type ReactNode } from 'react'
import { ScoutMark } from '../shared/ScoutMark'

interface AIVerdictBlockProps {
  eyebrow: string
  headline: ReactNode
  sub: ReactNode
  compact?: boolean
}

export function AIVerdictBlock({
  eyebrow,
  headline,
  sub,
  compact = false,
}: AIVerdictBlockProps): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)

  useEffect(() => {
    const handler = (): void => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Reset expanded state when headline content changes (new verdict loaded)
  useEffect(() => {
    setExpanded(false)
  }, [headline])

  return (
    <div
      style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        borderRadius: 24,
        padding: compact ? 'clamp(24px, 3vw, 36px)' : 'clamp(36px, 4vw, 56px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ScoutMark watermark — right side, 6% opacity */}
      <div
        style={{
          position: 'absolute',
          right: -80,
          top: -40,
          opacity: 0.06,
          color: 'var(--accent)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <ScoutMark size={520} color="var(--accent)" />
      </div>

      {/* Eyebrow — live dot + label + model tag */}
      <div
        className="row gap-8"
        style={{
          color: 'color-mix(in oklab, var(--bg) 55%, transparent)',
          marginBottom: 20,
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {/* Pulsing live dot */}
        <span
          className="live-dot"
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: 'var(--accent)',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </span>
        <span style={{ flex: 1 }} />
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'color-mix(in oklab, var(--bg) 40%, transparent)',
          }}
        >
          claude · sonnet 4.6
        </span>
      </div>

      {/* Headline */}
      <div
        className="serif"
        style={{
          fontSize: compact ? 'clamp(20px, 2.4vw, 30px)' : 'clamp(26px, 3.4vw, 42px)',
          lineHeight: 1.1,
          letterSpacing: '-0.025em',
          color: 'var(--bg)',
          textWrap: 'balance',
          maxWidth: 920,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {headline}
      </div>

      {/* Sub paragraph — on mobile: hidden until expanded */}
      {(!isMobile || expanded) && (
        <div
          className="serif"
          style={{
            fontSize: compact ? 'clamp(14px, 1.4vw, 18px)' : 'clamp(17px, 1.7vw, 21px)',
            lineHeight: 1.5,
            color: 'color-mix(in oklab, var(--bg) 78%, transparent)',
            marginTop: 22,
            maxWidth: 880,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {sub}
        </div>
      )}

      {/* Mobile expand / collapse */}
      {isMobile && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--accent)',
            fontFamily: "'Geist Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {expanded ? 'Show less' : 'Read full verdict →'}
        </button>
      )}
    </div>
  )
}
