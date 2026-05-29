// Chip — inline pill tag.
// Used for property type tags, status labels, geographic tags, etc.
// Optional accent dot prefix.

import type { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  /** Show the terracotta accent dot before the label. */
  accent?: boolean
  /** Render the chip with terracotta accent background and text colour.
   *  Used for status chips like "Coming Phase 2" on placeholder sections. */
  highlight?: boolean
}

export function Chip({ children, accent = false, highlight = false }: ChipProps): JSX.Element {
  return (
    <span
      className="chip"
      style={
        highlight
          ? {
              background: 'color-mix(in oklab, var(--accent) 15%, transparent)',
              color: 'var(--accent)',
              borderColor: 'color-mix(in oklab, var(--accent) 30%, transparent)',
            }
          : undefined
      }
    >
      {accent && <span className="chip-dot" />}
      {children}
    </span>
  )
}
