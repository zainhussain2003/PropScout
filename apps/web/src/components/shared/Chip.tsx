// Chip — inline pill tag.
// Used for property type tags, status labels, geographic tags, etc.
// Optional accent dot prefix.

import type { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  /** Show the terracotta accent dot before the label. */
  accent?: boolean
}

export function Chip({ children, accent = false }: ChipProps): JSX.Element {
  return (
    <span className="chip">
      {accent && <span className="chip-dot" />}
      {children}
    </span>
  )
}
