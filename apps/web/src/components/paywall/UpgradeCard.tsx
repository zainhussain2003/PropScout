/**
 * UpgradeCard — the consistent upgrade pitch card used inside every paywall.
 * Contains ProBadge, serif headline, optional sub-copy, two action buttons,
 * and a price footer.
 *
 * Design source: paywall-components.jsx::UpgradeCard
 */

import type { ReactNode } from 'react'
import { ProBadge } from './ProBadge'
import { Icon } from '../shared/Icon'

interface UpgradeCardProps {
  /** Main headline — can be a string or JSX with em tags. */
  headline: ReactNode
  /** Optional supporting copy below the headline. */
  sub?: string
  /** CTA button label. Default "Upgrade to Pro". */
  ctaLabel?: string
  /** Size variant. Default "md". */
  size?: 'sm' | 'md'
  /** Reduces internal gap for compact layouts. */
  dense?: boolean
  /** Dark-background variant (ink background, light text). */
  dark?: boolean
}

export function UpgradeCard({
  headline,
  sub,
  ctaLabel = 'Upgrade to Pro',
  size = 'md',
  dense,
  dark,
}: UpgradeCardProps): JSX.Element {
  return (
    <div
      className="card col"
      style={{
        padding: size === 'sm' ? '20px 22px' : '28px 30px',
        gap: dense ? 12 : 16,
        maxWidth: size === 'sm' ? 360 : 460,
        textAlign: 'center',
        alignItems: 'center',
        background: dark ? 'var(--ink)' : 'var(--surface)',
        color: dark ? 'var(--bg)' : 'var(--ink)',
        borderColor: dark ? 'var(--ink)' : 'color-mix(in oklab, var(--accent) 28%, var(--line))',
        boxShadow: '0 16px 40px -16px rgba(14,19,32,.22)',
      }}
    >
      <ProBadge />

      <h3
        className="serif"
        style={{
          fontSize: size === 'sm' ? 22 : 26,
          lineHeight: 1.15,
          color: dark ? 'var(--bg)' : 'var(--ink)',
        }}
      >
        {headline}
      </h3>

      {sub && (
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: dark ? 'color-mix(in oklab, var(--bg) 72%, transparent)' : 'var(--ink-2)',
            maxWidth: 360,
          }}
        >
          {sub}
        </p>
      )}

      <div
        className="row gap-12"
        style={{
          marginTop: dense ? 0 : 4,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button className="btn btn-accent" style={{ padding: '12px 20px' }}>
          {ctaLabel} <Icon name="arrow" size={13} />
        </button>
        <button
          className="btn btn-ghost"
          style={{
            color: dark ? 'color-mix(in oklab, var(--bg) 70%, transparent)' : 'var(--ink-2)',
            borderColor: dark
              ? 'color-mix(in oklab, var(--bg) 20%, transparent)'
              : 'var(--line-strong)',
          }}
        >
          See what's included
        </button>
      </div>

      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: dark ? 'color-mix(in oklab, var(--bg) 45%, transparent)' : 'var(--muted)',
          marginTop: dense ? 2 : 4,
        }}
      >
        $10/mo · cancel anytime
      </div>
    </div>
  )
}
