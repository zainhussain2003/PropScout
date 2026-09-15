/**
 * CompsMap — the comparable rentals behind a rent band, on the map (D-109).
 *
 * Renders the MiniMap centred on the subject with one pin per comp that has
 * an approximate position (rounded to ~110 m by the API — the building is
 * not republished, the block is). Rendering only: it takes the rows and the
 * subject coordinates and draws them; nothing here decides what a comp is.
 * Returns null when there is nothing to map so the caller can show its own
 * empty state.
 */

import type { CompRow, MapPin } from '../../types/analysis'
import { MiniMap } from './MiniMap'

interface CompsMapProps {
  rows: CompRow[] | undefined
  center: { lat: number; lng: number } | null | undefined
  /** Caption under the map, e.g. "M5V · same postal area". */
  caption?: string
  height?: number
}

/** The pins for rows that carry a position. */
export function compPins(rows: CompRow[] | undefined): MapPin[] {
  return (rows ?? [])
    .filter((r) => r.approxLat != null && r.approxLng != null)
    .map((r) => ({
      lat: r.approxLat as number,
      lng: r.approxLng as number,
      label: `$${r.rentMonthly.toLocaleString('en-CA')}${r.beds != null ? ` · ${r.beds} bed` : ''}`,
    }))
}

export function CompsMap({
  rows,
  center,
  caption,
  height = 360,
}: CompsMapProps): JSX.Element | null {
  const pins = compPins(rows)
  if (center == null || pins.length === 0) return null
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
      <MiniMap
        height={height}
        address="comparable rentals"
        pins={pins}
        center={center}
        showAddressLabel={false}
      />
      <p
        className="mono"
        style={{ fontSize: 10.5, color: 'var(--muted)', padding: '10px 16px', margin: 0 }}
      >
        {pins.length} of {rows?.length ?? 0} comps mapped
        {caption ? ` · ${caption}` : ''} · positions rounded to about 100 m; addresses are not
        republished.
      </p>
    </div>
  )
}
