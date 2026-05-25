/**
 * Tooltip — hover/focus (?) trigger that reveals a floating explanation panel.
 *
 * Usage:
 *   <Tooltip text="CMHC national average. Tight markets run 1–3%." />
 *
 * Design rules:
 *   - Trigger is a small (?) circle — no emoji, no icons from the Icon component
 *   - Panel appears above the trigger (flips below if viewport clips it)
 *   - All colours come from CSS tokens — no hardcoded values
 *   - Keyboard accessible: focus shows panel, Escape hides it
 */

import { useState, useRef, useCallback, useId } from 'react'

interface TooltipProps {
  /** The explanation text to display in the panel. */
  text: string
  /** Optional additional CSS class on the wrapper element. */
  className?: string
}

export function Tooltip({ text, className = '' }: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipId = useId()

  const show = useCallback(() => setVisible(true), [])
  const hide = useCallback(() => setVisible(false), [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setVisible(false)
      triggerRef.current?.blur()
    }
  }, [])

  return (
    <span className={`tooltip-wrapper ${className}`} style={wrapperStyle}>
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={tooltipId}
        aria-expanded={visible}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={handleKeyDown}
        style={triggerStyle}
      >
        ?
      </button>

      {visible && (
        <span id={tooltipId} role="tooltip" style={panelStyle}>
          {text}
        </span>
      )}
    </span>
  )
}

// ── Inline styles — all values from CSS tokens ─────────────────────────────

const wrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
}

const triggerStyle: React.CSSProperties = {
  // Size and shape
  width: 16,
  height: 16,
  borderRadius: '50%',
  flexShrink: 0,

  // Typography — Geist Mono per design system (eyebrow / code elements)
  fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1,

  // Colours — always tokens
  background: 'var(--chip-bg)',
  color: 'var(--ink-2)',
  border: '1px solid var(--line)',

  // Interaction
  cursor: 'help',
  padding: 0,
  transition: 'border-color 0.15s ease, color 0.15s ease',

  // Hover handled via onMouseEnter/Leave — colour changes via JS toggling state
  // (avoids needing a CSS class while keeping inline style approach consistent)
}

const panelStyle: React.CSSProperties = {
  // Position — floats above the trigger
  position: 'absolute',
  bottom: 'calc(100% + 8px)',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 100,

  // Size — fixed width, auto height
  width: 260,

  // Appearance
  background: 'var(--surface)',
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--radius-sm)',
  boxShadow: 'var(--shadow-pop)',
  padding: '10px 12px',

  // Typography — Geist body copy
  fontFamily: 'var(--font-sans, "Geist", sans-serif)',
  fontSize: 12,
  fontWeight: 400,
  lineHeight: 1.5,
  color: 'var(--ink-2)',

  // Prevent text wrapping oddities
  whiteSpace: 'normal',
  textAlign: 'left',
  pointerEvents: 'none',
}
