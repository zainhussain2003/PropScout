// Wordmark — "Prop Scout" brand mark.
// "Prop" in Geist regular, "Scout" in Instrument Serif italic.
// Includes the ScoutMark glyph at a proportional size.
// No emoji, no hardcoded colors — uses currentColor / --ink via CSS.

import { ScoutMark } from './ScoutMark'

interface WordmarkProps {
  /** Height of the wordmark in pixels. ScoutMark and type scale proportionally. Default 28. */
  height?: number
}

export function Wordmark({ height = 28 }: WordmarkProps): JSX.Element {
  return (
    <div
      className="row gap-12"
      style={{ height, display: 'inline-flex', alignItems: 'center', gap: 10 }}
    >
      <ScoutMark size={Math.round(height * 0.95)} />
      <span
        style={{
          fontFamily: "'Geist', sans-serif",
          fontSize: Math.round(height * 1.05),
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: 'var(--ink)',
          userSelect: 'none',
        }}
      >
        Prop
        <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>Scout</span>
      </span>
    </div>
  )
}
