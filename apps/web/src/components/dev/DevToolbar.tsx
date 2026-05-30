/**
 * DevToolbar — DEV-only floating toolbar for triggering test states.
 * Renders null in production builds (import.meta.env.DEV is false).
 * Collapsed by default so it doesn't obstruct UI testing.
 * Add slots from App.tsx — no need to touch this file per PR.
 */

import { useState } from 'react'

interface DevToolbarSlot {
  label: string
  onClick: () => void
  color?: 'orange' | 'red' | 'blue'
}

interface DevToolbarProps {
  slots: DevToolbarSlot[]
}

// Inner implementation — only rendered in DEV builds via the outer shell below
function DevToolbarInner({ slots }: DevToolbarProps): JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <div
      data-testid="dev-toolbar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        zIndex: 999999,
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      {/* Toggle tab — always visible in DEV */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: '#1a1a2e',
          color: '#7b7bf7',
          border: 'none',
          padding: '4px 10px',
          cursor: 'pointer',
          borderTopRightRadius: 6,
          letterSpacing: '0.1em',
        }}
      >
        {open ? '▼ DEV' : '▲ DEV'}
      </button>

      {/* Toolbar panel — only shown when open */}
      {open && (
        <div
          style={{
            background: '#1a1a2e',
            borderTop: '1px solid #2a2a4e',
            padding: '8px 10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            maxWidth: 480,
          }}
        >
          <span style={{ color: '#7b7bf7', width: '100%', marginBottom: 2 }}>
            ⚙ PropScout DevToolbar — DEV only
          </span>
          {slots.map((slot) => (
            <button
              key={slot.label}
              onClick={slot.onClick}
              style={{
                background:
                  slot.color === 'orange'
                    ? '#7a3a1e'
                    : slot.color === 'red'
                      ? '#5a1e1e'
                      : slot.color === 'blue'
                        ? '#1e3a5a'
                        : '#2a2a4e',
                color: '#e0e0f0',
                border: '1px solid #3a3a6e',
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              {slot.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Outer shell — returns null in prod, renders inner in DEV
export function DevToolbar(props: DevToolbarProps): JSX.Element | null {
  if (!import.meta.env.DEV) return null
  return <DevToolbarInner {...props} />
}
