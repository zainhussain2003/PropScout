/**
 * LockedSection — blurred mock content with an upgrade card overlay.
 * Used to show free users what they're missing while gating access.
 *
 * Design source: paywall-components.jsx::LockedSection
 */

import type { ReactNode } from 'react'
import { UpgradeCard } from './UpgradeCard'

interface LockedSectionProps {
  /** Upgrade card headline. */
  headline: string
  /** Upgrade card supporting copy. */
  sub?: string
  /** Mock content rendered behind the blur overlay. */
  mockContent?: ReactNode
  /** Height of the wrapper in pixels. Default 240. */
  height?: number
}

export function LockedSection({
  headline,
  sub,
  mockContent,
  height = 240,
}: LockedSectionProps): JSX.Element {
  return (
    <div
      className="locked-base"
      style={{
        height,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
      }}
    >
      {/* Mock content underneath — blurred by the overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{mockContent}</div>

      {/* Blur + upgrade card overlay */}
      <div className="locked-overlay">
        <UpgradeCard headline={headline} sub={sub} size="sm" dense />
      </div>
    </div>
  )
}
