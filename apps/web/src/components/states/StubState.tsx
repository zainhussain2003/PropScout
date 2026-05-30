/**
 * StubState — auth-landing card state.
 * Same icon-halo + serif headline + body + CTA pattern as BlockState,
 * but rendered as a narrower card (max-width 440px) inside a page that
 * already has Nav and Footer. Does NOT take over the full viewport.
 *
 * Design source: auth-stubs.jsx::StubState
 */

import type { IconName } from '../shared/Icon'
import { Icon } from '../shared/Icon'
import type { BlockStateProps } from './BlockState'
import { toneColor } from './BlockState'

// Re-export the shared props type so consumers of StubState get full typing
export type { BlockStateProps as StubStateProps }

export function StubState({
  tone = 'neutral',
  icon,
  eyebrow,
  headline,
  body,
  primary,
  secondary,
}: BlockStateProps): JSX.Element {
  const color = toneColor(tone)

  return (
    <div
      className="card col"
      style={{
        padding: 'clamp(36px, 4.5vw, 56px)',
        alignItems: 'center',
        textAlign: 'center',
        gap: 18,
        maxWidth: 440,
        width: '100%',
        margin: '0 auto',
      }}
    >
      {/* Icon with radial-gradient halo */}
      <div className="icon-halo" style={{ color }}>
        <Icon name={icon as IconName} size={40} />
      </div>

      {eyebrow && (
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color,
          }}
        >
          {eyebrow}
        </span>
      )}

      <h2 className="serif" style={{ maxWidth: 380 }}>
        {headline}
      </h2>

      <p
        style={{
          fontSize: 15.5,
          color: 'var(--ink-2)',
          maxWidth: 360,
          lineHeight: 1.6,
        }}
      >
        {body}
      </p>

      {(primary != null || secondary != null) && (
        <div className="col" style={{ width: '100%', maxWidth: 320, marginTop: 4, gap: 14 }}>
          {primary != null && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: 14 }}
              onClick={primary.onClick}
            >
              {primary.label} <Icon name="arrow" size={13} />
            </button>
          )}
          {secondary != null && (
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', padding: 12 }}
              onClick={secondary.onClick}
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
