/**
 * BlockState — full-page centered error / gate state.
 * Used for province gate, scraper fail, 404, expired listing, etc.
 * Always occupies the full viewport height with the card centred.
 *
 * Design source: error-states.jsx::BlockState
 */

import type { IconName } from '../shared/Icon'
import { Icon } from '../shared/Icon'

export interface BlockStateAction {
  label: string
  onClick?: () => void
}

export type BlockStateTone = 'pass' | 'caution' | 'fail' | 'neutral'

export interface BlockStateProps {
  /** Colour tone applied to the icon halo and eyebrow. Default "neutral". */
  tone?: BlockStateTone
  /** Icon name from the shared Icon component. */
  icon: string
  /** Small mono uppercase label above the headline. */
  eyebrow?: string
  /** Main heading — rendered as an h2 with Instrument Serif. */
  headline: string
  /** Supporting body copy. */
  body: string
  /** Primary CTA button (btn-primary). */
  primary?: BlockStateAction
  /** Secondary CTA button (btn-ghost). */
  secondary?: BlockStateAction
}

export function toneColor(tone: BlockStateTone): string {
  switch (tone) {
    case 'pass':
      return 'var(--pass)'
    case 'caution':
      return 'var(--caution)'
    case 'fail':
      return 'var(--fail)'
    case 'neutral':
      return 'var(--muted)'
  }
}

export function BlockState({
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
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--gutter)',
      }}
    >
      <div
        className="card col"
        style={{
          padding: 'clamp(40px, 5vw, 64px)',
          alignItems: 'center',
          textAlign: 'center',
          gap: 18,
          maxWidth: 720,
          width: '100%',
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

        <h2 className="serif" style={{ maxWidth: 540 }}>
          {headline}
        </h2>

        <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 480, lineHeight: 1.55 }}>
          {body}
        </p>

        {(primary != null || secondary != null) && (
          <div
            className="row gap-12"
            style={{ marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}
          >
            {primary != null && (
              <button
                className="btn btn-primary"
                style={{ padding: '14px 22px' }}
                onClick={primary.onClick}
              >
                {primary.label} <Icon name="arrow" size={13} />
              </button>
            )}
            {secondary != null && (
              <button className="btn btn-ghost" onClick={secondary.onClick}>
                {secondary.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
