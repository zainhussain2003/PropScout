/**
 * RentalCompsBar — horizontal percentile bar with a diamond marker.
 *
 * Shows the rental comps range (low → high) and marks the ask (estimated rent)
 * position with a diamond. Hovering the diamond shows an exact-value tooltip.
 *
 * - ask > high → marker clamped to right edge
 * - ask < low  → marker clamped to left edge
 * - Diamond scales 1.18× and turns --accent on hover (per design spec)
 */

import { useState } from 'react'

interface RentalCompsBarProps {
  low: number
  mid: number
  high: number
  ask: number
}

function fmtDollar(n: number): string {
  return '$' + n.toLocaleString('en-CA')
}

export function RentalCompsBar({ low, mid, high, ask }: RentalCompsBarProps): JSX.Element {
  const [hovered, setHovered] = useState(false)

  // Position ask as a fraction of the bar width [0, 1], clamped
  const range = high - low
  const raw = range === 0 ? 0.5 : (ask - low) / range
  const fraction = Math.max(0, Math.min(1, raw))

  return (
    <div
      style={{ padding: '20px 0' }}
      role="region"
      aria-label={`Rental comps: low ${fmtDollar(low)}, mid ${fmtDollar(mid)}, high ${fmtDollar(high)}, estimate ${fmtDollar(ask)}`}
    >
      {/* Labels row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 10,
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        <span className="mono">
          {fmtDollar(low)}
          <br />
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Low
          </span>
        </span>
        <span className="mono" style={{ textAlign: 'center' }}>
          {fmtDollar(mid)}
          <br />
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Median
          </span>
        </span>
        <span className="mono" style={{ textAlign: 'right' }}>
          {fmtDollar(high)}
          <br />
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            High
          </span>
        </span>
      </div>

      {/* Bar + diamond */}
      <div style={{ position: 'relative', height: 40 }}>
        {/* Track */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 8,
            borderRadius: 999,
            background: 'var(--line)',
            transform: 'translateY(-50%)',
          }}
        />

        {/* Filled range bar (low → high in full) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 8,
            borderRadius: 999,
            background: `linear-gradient(90deg,
              color-mix(in oklab, var(--caution) 40%, transparent) 0%,
              color-mix(in oklab, var(--pass) 60%, transparent) 100%)`,
            transform: 'translateY(-50%)',
          }}
        />

        {/* Diamond marker */}
        <div
          role="img"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'absolute',
            top: '50%',
            left: `${fraction * 100}%`,
            transform: `translate(-50%, -50%) rotate(45deg) scale(${hovered ? 1.18 : 1})`,
            width: 16,
            height: 16,
            background: hovered ? 'var(--accent)' : 'var(--ink)',
            border: '2px solid var(--surface)',
            boxShadow: '0 2px 8px rgba(0,0,0,.18)',
            transition: 'transform 0.12s ease, background-color 0.12s ease',
            cursor: 'crosshair',
            zIndex: 2,
          }}
          aria-label={`Estimated rent: ${fmtDollar(ask)}`}
        />

        {/* Hover tooltip */}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              top: -72,
              left: `${fraction * 100}%`,
              transform: fraction > 0.75 ? 'translateX(-110%)' : 'translateX(-50%)',
              background: 'var(--ink)',
              color: 'var(--bg)',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,.25)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,.5)',
                marginBottom: 6,
              }}
            >
              Rent estimate
            </div>
            {(
              [
                ['Low', low],
                ['Median', mid],
                ['High', high],
                ['Estimate', ask],
              ] as Array<[string, number]>
            ).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '2px 0',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,.65)' }}>{k}</span>
                <span
                  className="mono tabular"
                  style={{
                    color: k === 'Estimate' ? 'var(--accent)' : 'rgba(255,255,255,.9)',
                    fontWeight: k === 'Estimate' ? 600 : 400,
                  }}
                >
                  {fmtDollar(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: 'center',
          marginTop: 10,
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        <span className="mono">
          Ask rent <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmtDollar(ask)}/mo</span>
          {ask > high && <span style={{ color: 'var(--caution)' }}> · above comp range</span>}
          {ask < low && <span style={{ color: 'var(--caution)' }}> · below comp range</span>}
        </span>
      </div>
    </div>
  )
}
