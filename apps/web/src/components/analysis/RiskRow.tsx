/**
 * RiskRow — single inline risk flag row.
 *
 * Left colour bar driven by tone:
 *   red   → var(--fail)    clay red
 *   amber → var(--caution) amber
 *   green → var(--pass)    sage green
 */

interface RiskRowProps {
  tone: 'red' | 'amber' | 'green'
  label: string
  detail: string
  /** When provided, renders a Dismiss/Restore button on the row. */
  dismissable?: boolean
  /** True when the user has dismissed this flag — row is dimmed + struck through. */
  dismissed?: boolean
  /** Called when the user toggles dismissal. Ignored if dismissable is false. */
  onToggleDismiss?: () => void
}

const TONE_COLOR: Record<RiskRowProps['tone'], string> = {
  red: 'var(--fail)',
  amber: 'var(--caution)',
  green: 'var(--pass)',
}

const TONE_BG: Record<RiskRowProps['tone'], string> = {
  red: 'color-mix(in oklab, var(--fail) 6%, transparent)',
  amber: 'color-mix(in oklab, var(--caution) 6%, transparent)',
  green: 'color-mix(in oklab, var(--pass) 6%, transparent)',
}

export function RiskRow({
  tone,
  label,
  detail,
  dismissable = false,
  dismissed = false,
  onToggleDismiss,
}: RiskRowProps): JSX.Element {
  const color = TONE_COLOR[tone]
  const bg = TONE_BG[tone]
  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--ink)',
    textDecoration: dismissed ? 'line-through' : 'none',
    opacity: dismissed ? 0.55 : 1,
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-card)',
        opacity: dismissed ? 0.75 : 1,
      }}
    >
      {/* Left colour bar */}
      <div style={{ width: 4, background: color, flexShrink: 0 }} aria-hidden="true" />

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: '14px 18px',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span style={labelStyle}>{label}</span>
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: 'var(--ink-2)',
            flex: 1,
            textAlign: 'right',
            textDecoration: dismissed ? 'line-through' : 'none',
          }}
        >
          {detail}
        </span>
        {dismissable ? (
          <button
            type="button"
            onClick={onToggleDismiss}
            className="mono"
            style={{
              fontSize: 11,
              padding: '4px 10px',
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--line)'
              e.currentTarget.style.color = 'var(--ink-2)'
            }}
          >
            {dismissed ? 'Restore' : 'Dismiss'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
