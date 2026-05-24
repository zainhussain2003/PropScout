// SectionHead — every report section header, shared across all 4 report types.
//
// Layout: section number + topic (mono eyebrow, left) · verdict pill (right, optional)
//         section question in Instrument Serif below (styled externally via .serif class or <em>)
//
// Usage:
//   <SectionHead
//     n="01"
//     topic="Rent positioning"
//     question={<>Is the rent <em>fair</em>?</>}
//     verdict="$150 above market"
//     tone="caution"
//   />
//
// The italic keyword in `question` must use <em> — not manual fontStyle styling.

import type { ReactNode } from 'react'
import { VerdictPill } from './VerdictPill'
import type { VerdictTone } from './VerdictPill'

interface SectionHeadProps {
  /** Two-digit section number, e.g. "01", "02" */
  n: string
  /** Topic label, e.g. "Rent positioning" */
  topic: string
  /** Section question — supports JSX with <em> italic accent. */
  question: ReactNode
  /** Optional verdict summary text, e.g. "$150 above market" */
  verdict?: string
  /** Tone of the verdict pill. Only used when verdict is set. Default "pass". */
  tone?: VerdictTone
}

export function SectionHead({
  n,
  topic,
  question,
  verdict,
  tone = 'pass',
}: SectionHeadProps): JSX.Element {
  return (
    <div className="tr-section-head">
      <div className="col gap-12" style={{ maxWidth: 760 }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          <span style={{ color: 'var(--accent)' }}>§ {n}</span>
          <span style={{ marginLeft: 12, color: 'var(--muted)' }}>{topic}</span>
        </span>

        <h2 className="serif" style={{ textWrap: 'balance' } as React.CSSProperties}>
          {question}
        </h2>
      </div>

      {verdict !== undefined && verdict !== '' && <VerdictPill tone={tone} label={verdict} />}
    </div>
  )
}
