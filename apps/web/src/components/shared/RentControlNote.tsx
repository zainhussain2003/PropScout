/**
 * RentControlNote — what Ontario's rent-increase rules mean for this unit
 * (D-113), from the landlord's or the tenant's side. Rendering only: the
 * words come from lib/rentControlCopy, the facts from the analysis.
 */

import type { RentControlInfo } from '../../types/analysis'
import { rentControlCopy } from '../../lib/rentControlCopy'

interface RentControlNoteProps {
  rentControl: RentControlInfo
  perspective: 'landlord' | 'tenant'
}

const TONE: Record<'pass' | 'caution' | 'fail', string> = {
  pass: 'var(--pass)',
  caution: 'var(--caution)',
  fail: 'var(--fail)',
}

export function RentControlNote({ rentControl, perspective }: RentControlNoteProps): JSX.Element {
  const copy = rentControlCopy(rentControl, perspective)
  return (
    <div className="card col" style={{ padding: 24, gap: 10 }} data-testid="rent-control-note">
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        Ontario rent control
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: TONE[copy.tone] }}>
        {copy.statusLabel}
      </div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
        {copy.basisLine}
      </p>
      <dl className="col" style={{ margin: 0, gap: 8 }}>
        <div>
          <dt style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>Starting rent</dt>
          <dd style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            {copy.startingRentLine}
          </dd>
        </div>
        <div>
          <dt style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>Future increases</dt>
          <dd style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            {copy.increasesLine} {copy.timingLine}
          </dd>
        </div>
      </dl>
      <p className="mono" style={{ margin: 0, fontSize: 10.5, color: 'var(--muted)' }}>
        Source:{' '}
        <a href={rentControl.source} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
          {copy.sourceLine}
        </a>{' '}
        Not legal advice.
      </p>
    </div>
  )
}
