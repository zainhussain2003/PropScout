/**
 * MiniMap — real Mapbox GL JS map when a token + subject coordinates exist,
 * design-faithful SVG placeholder otherwise.
 *
 * The real map mounts via mapboxGlService (lazy mapbox-gl import, subject
 * ink pin, accent comp markers). Any failure — no token, no coordinates, no
 * WebGL, init error — falls back to the SVG placeholder so the report never
 * shows a blank hole.
 *
 * Placeholder pins are rendered as circles with price labels. Lat/lng coords
 * from the MapPin type are converted to SVG x/y positions via a simple linear
 * mapping against a fixed bounding box that approximates the Ontario area.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { MapPin } from '../../types/analysis'
import { getMapboxToken, mountMiniMap } from '../../lib/services/mapboxGlService'

interface MiniMapProps {
  height?: number
  address: string
  pins?: MapPin[]
  /** Subject property coordinates — enables the real Mapbox map. */
  center?: { lat: number; lng: number } | null
}

// Simple lat/lng → SVG coordinate mapping
// Covers a rough ~20km bounding box centred on the address area
function latLngToXY(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  svgWidth: number,
  svgHeight: number
): { x: number; y: number } {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * svgWidth
  // Latitude increases upward but SVG y increases downward — flip
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * svgHeight
  return {
    x: Math.max(24, Math.min(svgWidth - 24, x)),
    y: Math.max(24, Math.min(svgHeight - 24, y)),
  }
}

export function MiniMap({ height = 280, address, pins = [], center }: MiniMapProps): JSX.Element {
  const token = getMapboxToken()
  const wantRealMap = token != null && center != null
  const [mapFailed, setMapFailed] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!wantRealMap || mapContainerRef.current == null) return
    let cancelled = false
    let teardown: (() => void) | undefined

    void mountMiniMap(mapContainerRef.current, { token, center, pins }).then((handle) => {
      if (handle == null) {
        if (!cancelled) setMapFailed(true)
        return
      }
      if (cancelled) {
        handle.remove()
      } else {
        teardown = () => handle.remove()
      }
    })

    return () => {
      cancelled = true
      teardown?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantRealMap, token, center?.lat, center?.lng])

  if (wantRealMap && !mapFailed) {
    return (
      <div
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          position: 'relative',
        }}
        role="img"
        aria-label={`Map showing rental comps near ${address}`}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height, display: 'block' }} />

        {/* Address label overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            background: 'color-mix(in oklab, var(--surface) 92%, transparent)',
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 11,
            fontFamily: "'Geist Mono', monospace",
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            pointerEvents: 'none',
          }}
        >
          {address}
        </div>
      </div>
    )
  }

  // Derive a rough bounding box from provided pins, or use Ontario defaults
  const hasPins = pins.length > 0
  const bounds = hasPins
    ? {
        minLat: Math.min(...pins.map((p) => p.lat)) - 0.05,
        maxLat: Math.max(...pins.map((p) => p.lat)) + 0.05,
        minLng: Math.min(...pins.map((p) => p.lng)) - 0.07,
        maxLng: Math.max(...pins.map((p) => p.lng)) + 0.07,
      }
    : { minLat: 43.4, maxLat: 43.9, minLng: -79.8, maxLng: -79.2 }

  // HTML-overlay pin positions as percentages (design demo positions, or
  // real pins projected into the bounding box)
  const overlayPins: Array<{ x: number; y: number; n: string }> = hasPins
    ? pins.map((pin) => {
        const pos = latLngToXY(pin.lat, pin.lng, bounds, 100, 100)
        return { x: pos.x, y: pos.y, n: pin.label }
      })
    : [
        { x: 14, y: 40, n: '$2,850' },
        { x: 72, y: 22, n: '$3,050' },
        { x: 36, y: 64, n: '$2,750' },
        { x: 75, y: 68, n: '$3,200' },
        { x: 58, y: 78, n: '$2,900' },
      ]

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius: 14,
        overflow: 'hidden',
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
      }}
      role="img"
      aria-label={`Map showing rental comps near ${address}`}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mapWash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--accent) 5%, var(--bg-elev))" />
            <stop offset="100%" stopColor="var(--bg-elev)" />
          </linearGradient>
          <pattern id="mapMicro" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="transparent" />
            <circle cx="0.5" cy="0.5" r="0.4" fill="currentColor" opacity="0.05" />
          </pattern>
        </defs>

        {/* Land wash */}
        <rect width="400" height="240" fill="url(#mapWash)" />
        <rect width="400" height="240" fill="url(#mapMicro)" style={{ color: 'var(--ink)' }} />

        {/* River sliver across top-right corner */}
        <path
          d="M 280 -20 Q 320 30 380 50 L 410 60 L 410 -10 Z"
          fill="color-mix(in oklab, var(--accent) 14%, var(--bg-elev))"
          opacity="0.45"
        />
        <path
          d="M 280 -20 Q 320 30 380 50"
          fill="none"
          stroke="color-mix(in oklab, var(--accent) 25%, transparent)"
          strokeWidth="0.6"
        />

        {/* Park block (soft sage) */}
        <rect
          x="170"
          y="78"
          width="118"
          height="68"
          rx="3"
          fill="color-mix(in oklab, var(--pass) 20%, transparent)"
          stroke="color-mix(in oklab, var(--pass) 25%, transparent)"
          strokeWidth="0.5"
        />
        <rect
          x="172"
          y="80"
          width="114"
          height="64"
          rx="2"
          fill="none"
          stroke="color-mix(in oklab, var(--pass) 18%, transparent)"
          strokeWidth="0.5"
          strokeDasharray="2 3"
        />

        {/* Major roads — wide, light ink, with casing */}
        <g style={{ color: 'var(--line-strong)' }}>
          {(
            [
              [-10, 84, 410, 80],
              [-10, 152, 410, 155],
            ] as const
          ).map(([x1, y1, x2, y2]) => (
            <g key={`h-${y1}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="9"
                opacity="0.45"
              />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--bg-elev)" strokeWidth="7" />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--bg)"
                strokeWidth="5"
                opacity="0.85"
              />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="color-mix(in oklab, var(--accent) 40%, transparent)"
                strokeWidth="0.5"
                strokeDasharray="3 4"
                opacity="0.7"
              />
            </g>
          ))}
          {(
            [
              [168, -10, 170, 250],
              [290, -10, 288, 250],
            ] as const
          ).map(([x1, y1, x2, y2]) => (
            <g key={`v-${x1}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="9"
                opacity="0.45"
              />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--bg-elev)" strokeWidth="7" />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--bg)"
                strokeWidth="5"
                opacity="0.85"
              />
            </g>
          ))}
        </g>

        {/* Minor roads — thin lines */}
        <g stroke="var(--line)" strokeWidth="2" opacity="0.7">
          <line x1="-10" y1="22" x2="170" y2="22" />
          <line x1="200" y1="22" x2="410" y2="22" />
          <line x1="-10" y1="46" x2="170" y2="46" />
          <line x1="200" y1="46" x2="410" y2="46" />
          <line x1="-10" y1="112" x2="170" y2="112" />
          <line x1="-10" y1="138" x2="170" y2="138" />
          <line x1="290" y1="112" x2="410" y2="112" />
          <line x1="290" y1="138" x2="410" y2="138" />
          <line x1="-10" y1="180" x2="170" y2="180" />
          <line x1="-10" y1="206" x2="170" y2="206" />
          <line x1="290" y1="180" x2="410" y2="180" />
          <line x1="290" y1="206" x2="410" y2="206" />
          <line x1="40" y1="-10" x2="40" y2="250" />
          <line x1="86" y1="-10" x2="86" y2="78" />
          <line x1="86" y1="160" x2="86" y2="250" />
          <line x1="130" y1="-10" x2="130" y2="78" />
          <line x1="130" y1="160" x2="130" y2="250" />
          <line x1="218" y1="-10" x2="218" y2="78" />
          <line x1="218" y1="160" x2="218" y2="250" />
          <line x1="252" y1="-10" x2="252" y2="78" />
          <line x1="252" y1="160" x2="252" y2="250" />
          <line x1="338" y1="-10" x2="338" y2="250" />
          <line x1="380" y1="-10" x2="380" y2="250" />
        </g>

        {/* Buildings — small, varied, low-contrast */}
        <g fill="var(--ink)" opacity="0.07">
          {BUILDINGS.map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx="1.5" />
          ))}
        </g>

        {/* Faint border to suggest tile edge */}
        <rect
          x="0.5"
          y="0.5"
          width="399"
          height="239"
          fill="none"
          stroke="var(--line)"
          strokeWidth="0.5"
        />
      </svg>

      {/* Subject pin (large, accent, with halo) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -22,
            borderRadius: 999,
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--accent) 40%, transparent) 0%, transparent 65%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: 30,
            height: 30,
            borderRadius: 999,
            background: 'var(--accent)',
            border: '3px solid var(--surface)',
            boxShadow: '0 8px 22px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          ★
        </div>
      </div>

      {/* Comp pins — price tag + anchor dot */}
      {overlayPins.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: 'translate(-50%, -100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            pointerEvents: 'none',
          }}
        >
          <div
            className="mono tabular"
            style={{
              fontSize: 11,
              padding: '4px 9px',
              borderRadius: 999,
              background: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--line-strong)',
              boxShadow: '0 6px 14px -6px rgba(14,19,32,0.25), 0 1px 2px rgba(14,19,32,0.08)',
              whiteSpace: 'nowrap',
              fontWeight: 500,
              letterSpacing: '-0.005em',
            }}
          >
            {p.n}
          </div>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--ink)',
              border: '1.5px solid var(--surface)',
            }}
          />
        </div>
      ))}

      {/* Top-left address label */}
      <div
        className="mono"
        style={{
          position: 'absolute',
          top: 12,
          left: 14,
          padding: '4px 10px',
          borderRadius: 6,
          background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          border: '1px solid var(--line)',
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        {address}
      </div>

      {/* Bottom-right zoom controls (decorative — this is a placeholder) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(14,19,32,0.08)',
        }}
      >
        <div style={MAP_BTN_STYLE}>+</div>
        <div style={{ ...MAP_BTN_STYLE, borderTop: '1px solid var(--line)' }}>−</div>
      </div>

      {/* Attribution + placeholder badge */}
      <div
        className="mono"
        style={{
          position: 'absolute',
          bottom: 8,
          left: 14,
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          background: 'color-mix(in oklab, var(--surface) 85%, transparent)',
          padding: '2px 6px',
          borderRadius: 4,
        }}
      >
        © Mapbox · OpenStreetMap
      </div>
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
          backdropFilter: 'blur(6px)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 10,
          fontFamily: "'Geist Mono', monospace",
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          border: '1px solid var(--line)',
        }}
      >
        Map placeholder · Mapbox GL JS
      </div>
    </div>
  )
}

// Fake-map building footprints — [x, y, w, h] in the 400×240 viewBox
// (ported verbatim from report-preview.jsx::MiniMap)
const BUILDINGS: ReadonlyArray<readonly [number, number, number, number]> = [
  [44, 30, 18, 14],
  [66, 30, 16, 14],
  [86, 30, 22, 14],
  [112, 30, 14, 14],
  [130, 30, 24, 14],
  [44, 50, 14, 18],
  [62, 50, 22, 18],
  [88, 50, 18, 18],
  [110, 50, 16, 18],
  [130, 50, 24, 18],
  [180, 22, 18, 12],
  [202, 22, 14, 12],
  [220, 22, 22, 12],
  [246, 22, 16, 12],
  [266, 22, 20, 12],
  [180, 40, 22, 16],
  [206, 40, 18, 16],
  [228, 40, 22, 16],
  [254, 40, 18, 16],
  [276, 40, 10, 16],
  [296, 30, 18, 14],
  [318, 30, 16, 14],
  [338, 30, 24, 14],
  [366, 30, 14, 14],
  [296, 50, 18, 18],
  [318, 50, 22, 18],
  [344, 50, 16, 18],
  [364, 50, 18, 18],
  [44, 96, 22, 16],
  [70, 96, 18, 16],
  [92, 96, 22, 16],
  [118, 96, 14, 16],
  [136, 96, 22, 16],
  [44, 116, 18, 20],
  [66, 116, 22, 20],
  [92, 116, 16, 20],
  [112, 116, 22, 20],
  [138, 116, 20, 20],
  [310, 96, 22, 14],
  [336, 96, 18, 14],
  [358, 96, 16, 14],
  [310, 114, 18, 22],
  [332, 114, 22, 22],
  [358, 114, 16, 22],
  [44, 164, 16, 14],
  [64, 164, 22, 14],
  [90, 164, 18, 14],
  [112, 164, 22, 14],
  [138, 164, 16, 14],
  [44, 182, 22, 18],
  [70, 182, 18, 18],
  [92, 182, 22, 18],
  [118, 182, 16, 18],
  [138, 182, 20, 18],
  [296, 162, 22, 16],
  [322, 162, 18, 16],
  [344, 162, 22, 16],
  [296, 184, 18, 18],
  [318, 184, 22, 18],
  [344, 184, 22, 18],
]

const MAP_BTN_STYLE: CSSProperties = {
  width: 26,
  height: 26,
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 14,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
