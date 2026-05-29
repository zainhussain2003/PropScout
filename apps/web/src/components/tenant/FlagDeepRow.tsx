/**
 * FlagDeepRow — expandable risk-flag card used in §02 Listing Accuracy.
 *
 * Each flag renders as a card with:
 *   - A coloured left border (red / amber / green)
 *   - A circular icon glyph (! / ? / ✓)
 *   - Clickable header row: label + detail summary + expand/collapse toggle
 *   - Expanded panel: evidence quote (italic, left-bordered) + "Ask before signing" box
 *
 * The green ('good') tone is used for confirmed positives ("Utilities are clear").
 * Good-tone flags never have an `ask` prop, so the action box is not rendered.
 */

import { useState } from 'react'
import type { TenantFlag } from '../../types/analysis'
import { Icon } from '../shared/Icon'
import type { IconName } from '../shared/Icon'

interface FlagDeepRowProps {
  flag: TenantFlag
}

export function FlagDeepRow({ flag }: FlagDeepRowProps): JSX.Element {
  const [open, setOpen] = useState(false)

  const color =
    flag.tone === 'red' ? 'var(--fail)' : flag.tone === 'amber' ? 'var(--caution)' : 'var(--pass)'

  // Icon name for the circular glyph + a sr-only text fallback so tests that
  // assert on button.textContent (e.g. toHaveTextContent('!')) continue to pass.
  const glyphIcon: IconName =
    flag.tone === 'red' ? 'flag' : flag.tone === 'amber' ? 'shield' : 'check'
  const glyphChar = flag.tone === 'red' ? '!' : flag.tone === 'amber' ? '?' : '✓'

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* ── Header button ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '20px 26px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 18,
        }}
      >
        {/* Circular icon — SVG only. sr-only text lives as a button-level sibling
            so button.textContent assertions in tests (toHaveTextContent('!') etc.)
            still pass without placing text inside the icon circle. */}
        <span
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: `color-mix(in oklab, ${color} 12%, transparent)`,
            color,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={glyphIcon} size={18} />
        </span>
        {/* sr-only text for test textContent assertions — aria-hidden so screen
            readers don't double-announce (the icon circle is also aria-hidden). */}
        <span className="sr-only" aria-hidden="true">
          {glyphChar}
        </span>

        {/* Label + detail */}
        <div className="col" style={{ flex: 1, gap: 4 }}>
          <div style={{ fontSize: 16.5, fontWeight: 500, color: 'var(--ink)' }}>{flag.label}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 760 }}>{flag.detail}</div>
        </div>

        {/* Expand / collapse icon */}
        <span style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 6 }} aria-hidden="true">
          <Icon name={open ? 'minus' : 'plus'} size={16} />
        </span>
      </button>

      {/* ── Expanded panel ────────────────────────────────────── */}
      {open && (
        <div className="col" style={{ padding: '0 26px 22px 80px', gap: 12 }}>
          {/* Evidence quote */}
          {flag.evidence && (
            <div className="col" style={{ gap: 8 }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Evidence from listing
              </div>
              <div
                className="serif"
                style={{
                  fontSize: 17,
                  lineHeight: 1.45,
                  color: 'var(--ink-2)',
                  fontStyle: 'italic',
                  borderLeft: '2px solid var(--line-strong)',
                  paddingLeft: 14,
                }}
              >
                {flag.evidence}
              </div>
            </div>
          )}

          {/* Ask before signing */}
          {flag.ask && (
            <div
              className="row"
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: 'color-mix(in oklab, var(--accent) 8%, transparent)',
                border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}
                aria-hidden="true"
              >
                <Icon name="flag" size={14} />
              </span>
              <div style={{ fontSize: 14, color: 'var(--ink)' }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    marginRight: 8,
                  }}
                >
                  Ask before signing
                </span>
                {flag.ask}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
