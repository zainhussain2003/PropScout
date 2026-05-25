/**
 * RateBanner — amber warning shown when the live Bank of Canada rate is
 * unavailable and the UI is using a cached or fallback value.
 *
 * Only renders when `warning` is non-null (i.e. source is "cached" or "fallback").
 * Renders nothing when the rate is live — no empty space, no collapsed divs.
 *
 * Design rules:
 *   - Colour: --caution (amber) for border and icon; translucent background
 *   - No emoji — uses a plain warning label
 *   - All spacing and radii from CSS tokens
 */

interface RateBannerProps {
  /** Warning text from the API. Null = live rate, nothing renders. */
  warning: string | null
}

export function RateBanner({ warning }: RateBannerProps): JSX.Element | null {
  if (!warning) return null

  return (
    <div role="alert" aria-live="polite" style={bannerStyle}>
      <span style={labelStyle}>Rate notice</span>
      <span style={messageStyle}>{warning}</span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const bannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '8px 12px',
  background: 'color-mix(in srgb, var(--caution) 8%, transparent)',
  border: '1px solid var(--caution)',
  borderRadius: 'var(--radius-sm)',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--caution)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  flexShrink: 0,
  paddingTop: 1,
}

const messageStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans, "Geist", sans-serif)',
  fontSize: 12,
  color: 'var(--caution)',
  lineHeight: 1.5,
}
