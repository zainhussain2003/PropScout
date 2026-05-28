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

export function RiskRow({ tone, label, detail }: RiskRowProps): JSX.Element {
  const color = TONE_COLOR[tone]
  const bg = TONE_BG[tone]

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
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ink)',
          }}
        >
          {label}
        </span>
        <span
          className="mono"
          style={{ fontSize: 12, color: 'var(--ink-2)', flex: 1, textAlign: 'right' }}
        >
          {detail}
        </span>
      </div>
    </div>
  )
}
