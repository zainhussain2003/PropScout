/**
 * mapboxGlService — thin adapter around the Mapbox GL JS client library.
 *
 * Keeps the mapbox-gl import, token access, and map/marker construction out
 * of component files (CLAUDE.md service-layer rule) and makes the map
 * mockable in jsdom tests, where WebGL is unavailable.
 *
 * mapbox-gl is loaded lazily on first mount so users who never see a map
 * (no token configured, no coordinates) never download it.
 */

import type { MapPin } from '../../types/analysis'

export interface MiniMapHandle {
  /** Tear the map down and release its WebGL context. */
  remove: () => void
}

export interface MountMiniMapOptions {
  token: string
  center: { lat: number; lng: number }
  /** Rental comp markers with price labels. */
  pins?: MapPin[]
  zoom?: number
}

/**
 * Public Mapbox token from the frontend env (pk.* — never a secret key).
 * Returns null when unconfigured so callers can fall back to the placeholder.
 */
export function getMapboxToken(): string | null {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
  return token != null && token.length > 0 ? token : null
}

/** Read a design token off :root so map chrome follows the token system. */
function cssToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return val.length > 0 ? val : fallback
}

/**
 * Mount a non-scroll-hijacking Mapbox GL mini map into `container`, with an
 * ink pin on the subject property and accent markers for any comp pins.
 *
 * Returns a handle whose remove() tears the map down, or null when Mapbox
 * fails to load or initialise (no WebGL, bad token, network) — callers must
 * treat null as "show the placeholder", never a blank hole.
 */
export async function mountMiniMap(
  container: HTMLElement,
  opts: MountMiniMapOptions
): Promise<MiniMapHandle | null> {
  try {
    const mapboxgl = (await import('mapbox-gl')).default
    await import('mapbox-gl/dist/mapbox-gl.css')

    mapboxgl.accessToken = opts.token

    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [opts.center.lng, opts.center.lat],
      zoom: opts.zoom ?? 13.5,
    })
    // A report section must never hijack page scroll.
    map.scrollZoom.disable()

    // Subject property — ink pin, matching the placeholder's centre target.
    new mapboxgl.Marker({ color: cssToken('--ink', '#0E1320') })
      .setLngLat([opts.center.lng, opts.center.lat])
      .addTo(map)

    // Comp pins — accent markers with the price label as a popup.
    for (const pin of opts.pins ?? []) {
      const marker = new mapboxgl.Marker({
        color: cssToken('--accent', '#D97757'),
        scale: 0.8,
      }).setLngLat([pin.lng, pin.lat])
      if (pin.label.length > 0) {
        marker.setPopup(new mapboxgl.Popup({ closeButton: false, offset: 18 }).setText(pin.label))
      }
      marker.addTo(map)
    }

    return { remove: () => map.remove() }
  } catch (err) {
    // Degrade to the placeholder — a broken map must not break the report.
    console.error('[mapboxGlService] mountMiniMap failed', err)
    return null
  }
}
