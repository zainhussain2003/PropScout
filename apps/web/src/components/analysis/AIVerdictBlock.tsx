// AIVerdictBlock — dark full-bleed AI verdict card.
//
// Shown in every report type as the primary AI output section.
// Features:
//   - Dark ink background
//   - ScoutMark watermark at low opacity (right side)
//   - Live-dot pulsing indicator
//   - "claude · sonnet" tag
//   - Headline + optional body paragraph in Instrument Serif

import { ScoutMark } from '../shared/ScoutMark'

interface AIVerdictBlockProps {
  /** Optional address shown in the footer of the card */
  addr?: string
  /** Main verdict headline — can be a React node for styled spans */
  headline?: React.ReactNode
  /** Supporting body paragraph — pass null to hide entirely */
  sub?: React.ReactNode | null
  /** Compact mode — smaller padding, no body paragraph */
  compact?: boolean
  /** Eyebrow text (default: "PropScout AI · verdict") */
  eyebrow?: string
  /** Called when user clicks "read full verdict →" */
  onReadMore?: () => void
}

const DEFAULT_HEADLINE = (
  <>
    The <span style={{ color: 'var(--accent)' }}>$761/mo condo fee</span> is what ends this deal
    before it starts. At $9,132 a year it consumes 26% of the gross rent this unit can realistically
    earn — before the mortgage, taxes, or insurance are touched.
  </>
)

const DEFAULT_SUB = (
  <>
    Run the numbers at current rates and you are looking at <span className="tabular">$4,733</span>{' '}
    going out every month against roughly <span className="tabular">$2,900</span> coming in — a{' '}
    <span style={{ color: 'var(--accent)' }}>$1,833</span> shortfall every single month before a
    single vacancy or repair.
  </>
)

export function AIVerdictBlock({
  addr,
  headline,
  sub,
  compact = false,
  eyebrow,
  onReadMore,
}: AIVerdictBlockProps): JSX.Element {
  return (
    <div
      style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        borderRadius: 18,
        padding: compact ? '20px 22px' : '28px 30px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ScoutMark watermark */}
      <div
        style={{
          position: 'absolute',
          right: -80,
          top: -40,
          opacity: 0.06,
          color: 'var(--accent)',
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <ScoutMark size={460} color="var(--accent)" />
      </div>

      {/* Header row */}
      <div
        className="row gap-8"
        style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 12, position: 'relative' }}
      >
        <span
          className="live-dot"
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: 'var(--accent)',
            flexShrink: 0,
          }}
        />
        <span
          className="mono"
          style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}
        >
          {eyebrow ?? 'PropScout AI · verdict'}
        </span>
        <span style={{ flex: 1 }} />
        <span
          className="mono"
          style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}
        >
          claude · sonnet
        </span>
      </div>

      {/* Headline */}
      <div
        className="serif"
        style={{
          fontSize: compact ? 19 : 22,
          lineHeight: 1.35,
          color: 'var(--bg)',
          letterSpacing: '-0.005em',
          position: 'relative',
        }}
      >
        {headline ?? DEFAULT_HEADLINE}
      </div>

      {/* Body paragraph (not shown in compact mode or when sub is null) */}
      {!compact && sub !== null && (
        <div
          className="serif"
          style={{
            fontSize: 19,
            lineHeight: 1.4,
            color: 'rgba(255,255,255,0.78)',
            marginTop: 14,
            position: 'relative',
          }}
        >
          {sub ?? DEFAULT_SUB}
        </div>
      )}

      {/* Footer */}
      <div
        className="row"
        style={{
          marginTop: 18,
          justifyContent: 'space-between',
          gap: 16,
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          position: 'relative',
        }}
      >
        <span>{addr ?? 'Unit 5702 · 5 Buttermill Ave, Vaughan ON'}</span>
        <button
          onClick={onReadMore}
          className="mono"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--accent)',
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: '0.04em',
          }}
        >
          read full verdict →
        </button>
      </div>
    </div>
  )
}
