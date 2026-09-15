/**
 * ProvenanceBadge — a small mono tag saying where a figure came from
 * (D-111): listing says / you entered / calculated / assumed / published.
 * The detail rides on the title so hovering names the sources; a count of
 * assumed inputs is shown inline because that is the part a reader most
 * needs to see without hovering — in the muted tone, since most tiles rest
 * on a few labelled starting assumptions and a wall of amber would say
 * nothing.
 */

import type { Provenance } from '../../lib/provenance'
import { PROVENANCE_LABEL } from '../../lib/provenance'

const TONE: Record<Provenance['kind'], string> = {
  listing: 'var(--ink-2)',
  entered: 'var(--accent)',
  calculated: 'var(--ink-2)',
  assumed: 'var(--caution)',
  published: 'var(--ink-2)',
}

export function ProvenanceBadge({ provenance }: { provenance: Provenance }): JSX.Element {
  const assumedCount = provenance.assumed.length
  return (
    <span
      className="mono"
      title={provenance.detail}
      data-provenance={provenance.kind}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 9.5,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: TONE[provenance.kind],
        border: '1px solid var(--line)',
        borderRadius: 999,
        padding: '1px 7px',
        whiteSpace: 'nowrap',
        cursor: 'help',
      }}
    >
      {PROVENANCE_LABEL[provenance.kind]}
      {assumedCount > 0 ? ` · ${assumedCount} assumed` : ''}
    </span>
  )
}
