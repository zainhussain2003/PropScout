// ScoutMark — the triangulation glyph (compass + crosshair + roof angle).
// Used standalone on dark hero cards as a watermark, and inside Wordmark.
// No text — purely the SVG mark.

interface ScoutMarkProps {
  /** Size in pixels. Default 28. */
  size?: number
  /** Stroke / fill color. Defaults to currentColor. */
  color?: string
}

export function ScoutMark({ size = 28, color }: ScoutMarkProps): JSX.Element {
  const c = color ?? 'currentColor'

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* outer ring */}
      <circle cx="16" cy="16" r="14.5" stroke={c} strokeWidth="1" opacity="0.35" />
      {/* roof / triangulation */}
      <path
        d="M5 21 L16 8 L27 21"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* center pin */}
      <circle cx="16" cy="21" r="1.8" fill={c} />
      {/* compass tick */}
      <path d="M16 4 L16 7" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
