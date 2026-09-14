/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { Icon } from '../shared/Icon'

export type RiskTone = 'red' | 'amber' | 'good'

interface ShowcaseRiskRowProps {
  tone: RiskTone
  label: string
  detail: string
}
export function ShowcaseRiskRow({ tone, label, detail }: ShowcaseRiskRowProps): JSX.Element {
  const color = tone === 'red' ? 'var(--fail)' : tone === 'amber' ? 'var(--caution)' : 'var(--pass)'
  const iconName = tone === 'good' ? ('check' as const) : ('flag' as const)
  return (
    <div
      className="row gap-12"
      style={{
        padding: '10px 0',
        borderTop: '1px solid var(--line)',
        alignItems: 'flex-start',
      }}
    >
      <span style={{ color, marginTop: 2, flexShrink: 0 }}>
        <Icon name={iconName} size={14} />
      </span>
      <div className="col gap-2">
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{detail}</span>
      </div>
    </div>
  )
}
