/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import type { ReactNode } from 'react'
import { clampStr } from './landingHelpers'

// ── SectionHeader — landing page section intro ────────────────────────

interface SectionHeaderProps {
  tag: string
  title: ReactNode
  children?: ReactNode
}
export function SectionHeader({ tag, title, children }: SectionHeaderProps): JSX.Element {
  return (
    <div className="col gap-16" style={{ maxWidth: 680 }}>
      <span className="section-tag">{tag}</span>
      <h2 className="serif" style={{ textWrap: 'balance' } as React.CSSProperties}>
        {title}
      </h2>
      {children !== undefined && (
        <p style={{ fontSize: clampStr(15, 17), color: 'var(--ink-2)' }}>{children}</p>
      )}
    </div>
  )
}
