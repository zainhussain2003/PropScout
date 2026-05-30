/**
 * LockedButton — a button for Pro-only actions (PDF export, Save to portfolio).
 * Renders a lock SVG + optional icon + label + small "Pro" badge.
 * Hovering shows terracotta accent; clicking calls onClick (opens UpgradeModal).
 *
 * Design source: paywall-components.jsx::LockedButton
 */

import type { MouseEvent } from 'react'
import type { IconName } from '../shared/Icon'
import { Icon } from '../shared/Icon'

interface LockedButtonProps {
  /** Button label text. */
  label: string
  /** Optional icon name (from Icon component library) shown after the lock. */
  icon?: IconName
  /** Click handler — typically opens an UpgradeModal. */
  onClick?: () => void
}

export function LockedButton({ label, icon, onClick }: LockedButtonProps): JSX.Element {
  function handleMouseEnter(e: MouseEvent<HTMLButtonElement>): void {
    e.currentTarget.style.borderColor = 'var(--accent)'
    e.currentTarget.style.color = 'var(--accent)'
  }

  function handleMouseLeave(e: MouseEvent<HTMLButtonElement>): void {
    e.currentTarget.style.borderColor = 'var(--line)'
    e.currentTarget.style.color = 'var(--muted)'
  }

  return (
    <button
      onClick={onClick}
      className="btn"
      style={{
        background: 'var(--bg-elev)',
        color: 'var(--muted)',
        border: '1px solid var(--line)',
        padding: '11px 16px',
        cursor: 'pointer',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Lock SVG — always present on locked buttons */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="11" width="16" height="10" rx="1.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>

      {/* Optional contextual icon (e.g. doc for PDF) */}
      {icon && <Icon name={icon} size={13} />}

      {label}

      {/* Inline "Pro" badge */}
      <span className="pro-badge" style={{ marginLeft: 4, padding: '3px 7px', fontSize: 9 }}>
        Pro
      </span>
    </button>
  )
}
