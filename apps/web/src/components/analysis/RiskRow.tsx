// RiskRow — a single risk flag row.
// Shown in investor and landlord reports under the risk flags section,
// and in the landing page sample report showcase.

type RiskTone = 'red' | 'amber' | 'good'

interface RiskRowProps {
  tone: RiskTone
  label: string
  detail: string
}

function getToneColor(tone: RiskTone): string {
  if (tone === 'red') return 'var(--fail)'
  if (tone === 'amber') return 'var(--caution)'
  return 'var(--pass)'
}

function getToneLabel(tone: RiskTone): string {
  if (tone === 'red') return '−4 pts'
  if (tone === 'amber') return 'soft'
  return '✓ confirmed'
}

export function RiskRow({ tone, label, detail }: RiskRowProps): JSX.Element {
  const color = getToneColor(tone)
  const right = getToneLabel(tone)

  return (
    <div
      className="row gap-12"
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
      }}
    >
      {/* Tone dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          flexShrink: 0,
        }}
      />

      {/* Label + detail */}
      <div className="col grow" style={{ gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{detail}</div>
      </div>

      {/* Right label */}
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color,
          flexShrink: 0,
        }}
      >
        {right}
      </div>
    </div>
  )
}
