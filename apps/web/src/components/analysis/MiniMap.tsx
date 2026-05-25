// MiniMap — SVG placeholder map with comp pins.
// Replace with real Mapbox GL JS in production (Phase 2 / PR 4).
// Designed to look like a real Mapbox tile: street grid, park, river,
// buildings, and comp-price pins.

interface Pin {
  /** 0–100 percentage position from left */
  x: number
  /** 0–100 percentage position from top */
  y: number
  /** Display label e.g. "$2,850" */
  n: string
}

interface MiniMapProps {
  height?: number
  address?: string
  pins?: Pin[]
}

// Building rectangles: [x, y, w, h]
const BUILDINGS: [number, number, number, number][] = [
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

const DEFAULT_PINS: Pin[] = [
  { x: 14, y: 40, n: '$2,850' },
  { x: 72, y: 22, n: '$3,050' },
  { x: 36, y: 64, n: '$2,750' },
  { x: 75, y: 68, n: '$3,200' },
  { x: 58, y: 78, n: '$2,900' },
]

const mapBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  border: 'none',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export function MiniMap({ height = 240, address, pins }: MiniMapProps): JSX.Element {
  const activePins = pins ?? DEFAULT_PINS

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
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block' }}
        aria-hidden
      >
        <defs>
          <linearGradient id="mapWash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--accent) 5%, var(--bg-elev))" />
            <stop offset="100%" stopColor="var(--bg-elev)" />
          </linearGradient>
          <pattern id="micro" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="transparent" />
            <circle cx="0.5" cy="0.5" r="0.4" fill="currentColor" opacity="0.05" />
          </pattern>
        </defs>

        {/* Land wash */}
        <rect width="400" height="240" fill="url(#mapWash)" />
        <rect width="400" height="240" fill="url(#micro)" style={{ color: 'var(--ink)' }} />

        {/* River sliver */}
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

        {/* Parks */}
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

        {/* Major arterials */}
        <g style={{ color: 'var(--line-strong)' }}>
          {[
            { x1: -10, y1: 84, x2: 410, y2: 80 },
            { x1: -10, y1: 152, x2: 410, y2: 155 },
          ].map((l, i) => (
            <g key={i}>
              <line {...l} stroke="currentColor" strokeWidth="9" opacity="0.45" />
              <line {...l} stroke="var(--bg-elev)" strokeWidth="7" />
              <line {...l} stroke="var(--bg)" strokeWidth="5" opacity="0.85" />
              <line
                {...l}
                stroke="color-mix(in oklab, var(--accent) 40%, transparent)"
                strokeWidth="0.5"
                strokeDasharray="3 4"
                opacity="0.7"
              />
            </g>
          ))}
          {[
            { x1: 168, y1: -10, x2: 170, y2: 250 },
            { x1: 290, y1: -10, x2: 288, y2: 250 },
          ].map((l, i) => (
            <g key={i}>
              <line {...l} stroke="currentColor" strokeWidth="9" opacity="0.45" />
              <line {...l} stroke="var(--bg-elev)" strokeWidth="7" />
              <line {...l} stroke="var(--bg)" strokeWidth="5" opacity="0.85" />
            </g>
          ))}
        </g>

        {/* Minor roads */}
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

        {/* Buildings */}
        <g fill="var(--ink)" opacity="0.07">
          {BUILDINGS.map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx="1.5" />
          ))}
        </g>

        {/* Tile edge */}
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

      {/* Subject pin (accent, centre) */}
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
          aria-hidden
        >
          ★
        </div>
      </div>

      {/* Comp pins */}
      {activePins.map((p, i) => (
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

      {/* Address label */}
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
        {address ?? 'Vaughan · L4K · 1km radius'}
      </div>

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(14,19,32,0.08)',
        }}
      >
        <button aria-label="Zoom in" style={mapBtnStyle}>
          +
        </button>
        <button
          aria-label="Zoom out"
          style={{ ...mapBtnStyle, borderTop: '1px solid var(--line)' }}
        >
          −
        </button>
      </div>

      {/* Attribution */}
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
    </div>
  )
}
