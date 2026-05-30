/**
 * NoCompsInlineState — inline callout card rendered inside a report
 * when fewer than 3 comparable rentals were found nearby.
 * Does NOT take over the full page — the report continues to render.
 *
 * Design source: error-states.jsx::NoCompsInlineState
 */

import { Icon } from '../shared/Icon'

export function NoCompsInlineState(): JSX.Element {
  return (
    <div
      className="card col"
      style={{
        padding: 28,
        gap: 14,
        borderColor: 'color-mix(in oklab, var(--caution) 25%, var(--line))',
        background: 'color-mix(in oklab, var(--caution) 4%, var(--surface))',
      }}
    >
      <div className="row gap-10">
        <span style={{ color: 'var(--caution)', flexShrink: 0 }}>
          <Icon name="search" size={20} />
        </span>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>
            Low confidence — <em>limited rental comps</em>
          </h3>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--caution)',
            }}
          >
            Confidence: low
          </span>
        </div>
      </div>

      <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 620, lineHeight: 1.55 }}>
        Fewer than 3 comparable rentals were found within 1&nbsp;km. The rental estimate above is
        directional only.
      </p>

      <div className="row gap-12" style={{ marginTop: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost">
          <Icon name="flag" size={13} /> Report an issue
        </button>
      </div>
    </div>
  )
}
