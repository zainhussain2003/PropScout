// VerdictPill — pass / caution / fail status badge.
// Used in report section headers and inline risk flag rows.
// Color is driven entirely by the tone prop and CSS tokens — never hardcoded.
// A dot prefix is injected via CSS ::before — no emoji.

export type VerdictTone = 'pass' | 'caution' | 'fail'

interface VerdictPillProps {
  tone: VerdictTone
  label: string
}

export function VerdictPill({ tone, label }: VerdictPillProps): JSX.Element {
  return <span className={`verdict-pill ${tone}`}>{label}</span>
}
