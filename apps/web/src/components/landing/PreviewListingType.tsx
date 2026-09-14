/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import type { ReactNode } from 'react'

export function PreviewListingType({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div
      data-listing-type-bar
      className="mono"
      style={{
        width: '100%',
        minHeight: 30,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--surface-2)',
        color: 'var(--ink-2)',
        fontSize: 10,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}
