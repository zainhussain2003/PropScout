/**
 * MiniMap — SVG placeholder map with rental comp price pins.
 *
 * This is a design-faithful placeholder. Replace the SVG body with a real
 * Mapbox GL JS <Map> component when the Mapbox integration ships.
 *
 * Pins are rendered as circles with price labels. Lat/lng coords from
 * the MapPin type are converted to SVG x/y positions via a simple linear
 * mapping against a fixed bounding box that approximates the Ontario area.
 */

import type { MapPin } from '../../types/analysis'

interface MiniMapProps {
  height?: number
  address: string
  pins?: MapPin[]
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

// Grid lines for the fake map background
const GRID_COUNT = 8

export function MiniMap({ height = 280, address, pins = [] }: MiniMapProps): JSX.Element {
  const W = 720
  const H = height

  // If no real lat/lng data yet, distribute pins evenly as demo positions
  const hasPins = pins.length > 0

  // Derive a rough bounding box from provided pins, or use Ontario defaults
  const bounds = hasPins
    ? {
        minLat: Math.min(...pins.map((p) => p.lat)) - 0.05,
        maxLat: Math.max(...pins.map((p) => p.lat)) + 0.05,
        minLng: Math.min(...pins.map((p) => p.lng)) - 0.07,
        maxLng: Math.max(...pins.map((p) => p.lng)) + 0.07,
      }
    : { minLat: 43.4, maxLat: 43.9, minLng: -79.8, maxLng: -79.2 }

  // When no real pins, create evenly-spaced demo positions
  const demoPositions = [
    { x: 0.22, y: 0.3 },
    { x: 0.7, y: 0.22 },
    { x: 0.36, y: 0.64 },
    { x: 0.76, y: 0.68 },
    { x: 0.58, y: 0.78 },
  ]

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
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height, display: 'block' }}
      >
        {/* Map background */}
        <rect width={W} height={H} fill="color-mix(in oklab, var(--bg-elev) 100%, transparent)" />

        {/* Grid lines */}
        {Array.from({ length: GRID_COUNT + 1 }).map((_, i) => {
          const xPos = (i / GRID_COUNT) * W
          const yPos = (i / GRID_COUNT) * H
          return (
            <g key={i}>
              <line x1={xPos} y1={0} x2={xPos} y2={H} stroke="var(--line)" strokeWidth={0.75} />
              <line x1={0} y1={yPos} x2={W} y2={yPos} stroke="var(--line)" strokeWidth={0.75} />
            </g>
          )
        })}

        {/* Road suggestions */}
        <line
          x1={0}
          y1={H * 0.45}
          x2={W}
          y2={H * 0.5}
          stroke="var(--surface)"
          strokeWidth={6}
          opacity={0.8}
        />
        <line
          x1={W * 0.4}
          y1={0}
          x2={W * 0.45}
          y2={H}
          stroke="var(--surface)"
          strokeWidth={4}
          opacity={0.6}
        />
        <line
          x1={0}
          y1={H * 0.72}
          x2={W}
          y2={H * 0.68}
          stroke="var(--surface)"
          strokeWidth={3}
          opacity={0.5}
        />

        {/* Comp pins */}
        {hasPins
          ? pins.map((pin, i) => {
              const pos = latLngToXY(pin.lat, pin.lng, bounds, W, H)
              return (
                <g key={i}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={20}
                    fill="color-mix(in oklab, var(--accent) 15%, transparent)"
                  />
                  <circle cx={pos.x} cy={pos.y} r={6} fill="var(--accent)" />
                  <text
                    x={pos.x}
                    y={pos.y - 14}
                    textAnchor="middle"
                    fontSize={11}
                    fontFamily="Geist Mono, monospace"
                    fontWeight={500}
                    fill="var(--ink)"
                  >
                    {pin.label}
                  </text>
                </g>
              )
            })
          : demoPositions.slice(0, 5).map((pos, i) => {
              const px = pos.x * W
              const py = pos.y * H
              return (
                <g key={i}>
                  <circle
                    cx={px}
                    cy={py}
                    r={18}
                    fill="color-mix(in oklab, var(--accent) 15%, transparent)"
                  />
                  <circle cx={px} cy={py} r={5} fill="var(--accent)" />
                </g>
              )
            })}

        {/* Centre target pin (subject property) */}
        <g>
          <circle cx={W / 2} cy={H / 2} r={10} fill="var(--ink)" />
          <circle cx={W / 2} cy={H / 2} r={5} fill="var(--bg)" />
        </g>
      </svg>

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
        }}
      >
        {address}
      </div>

      {/* Placeholder badge */}
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
