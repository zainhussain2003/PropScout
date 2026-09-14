/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

// ── HeroStaticMap ─────────────────────────────────────────────────────
// Mapbox Static Images map of Yonge–Eglinton with comp diamonds drawn as
// GeoJSON polygons in the accent blue, styled like the in-report comp map.
// Renders nothing without VITE_MAPBOX_TOKEN (graceful fallback).

export function HeroStaticMap(): JSX.Element | null {
  const mapToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
  if (!mapToken) return null

  // Yonge–Eglinton (M4R) — the same neighbourhood as the sample report.
  const center: [number, number] = [-79.3986, 43.708]
  const comps: Array<[number, number]> = [
    [-79.4028, 43.7104],
    [-79.3941, 43.7117],
    [-79.4007, 43.7042],
    [-79.3927, 43.706],
    [-79.3966, 43.7128],
  ]
  // Small diamond polygon around each comp — matches the in-report marker.
  const dLat = 0.0007
  const dLng = 0.001
  const diamond = ([lng, lat]: [number, number]): number[][] => [
    [lng, lat + dLat],
    [lng + dLng, lat],
    [lng, lat - dLat],
    [lng - dLng, lat],
    [lng, lat + dLat],
  ]
  const geojson = {
    type: 'FeatureCollection',
    features: comps.map((c) => ({
      type: 'Feature',
      // Mapbox Static Images API overlay — needs a literal hex (no CSS vars);
      // #1F4E68 mirrors the harbour --accent token.
      properties: { fill: '#1F4E68', 'fill-opacity': 1, stroke: '#ffffff', 'stroke-width': 1 },
      geometry: { type: 'Polygon', coordinates: [diamond(c)] },
    })),
  }
  const overlay = `geojson(${encodeURIComponent(JSON.stringify(geojson))})`
  const base = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${overlay}/${center[0]},${center[1]},13.4/640x360`
  const src = `${base}?access_token=${mapToken}&attribution=false&logo=false`
  const src2x = `${base}@2x?access_token=${mapToken}&attribution=false&logo=false`

  return (
    <div className="card col gap-12" style={{ padding: 22 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Comps within 1 km
        </div>
        <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
          Toronto · M4R
        </span>
      </div>
      <div
        style={{
          overflow: 'hidden',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--line)',
        }}
      >
        <img
          src={src}
          srcSet={`${src} 1x, ${src2x} 2x`}
          alt="Map of the Yonge–Eglinton area with five comparable rentals marked as blue diamonds"
          loading="lazy"
          style={{ width: '100%', display: 'block' }}
        />
      </div>
      <span className="mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em' }}>
        © Mapbox · © OpenStreetMap
      </span>
    </div>
  )
}
