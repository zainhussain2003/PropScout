/**
 * CompRowsTable — the comparable rentals behind a rent band (D-099).
 *
 * Shared by the investor/landlord §03 and the tenant §01. A band is only as
 * good as what it was drawn from; these are the rows after outlier removal,
 * most similar first (distance, recency, size, bedroom match — D-109), with
 * the match shown so a reader can see what the band leaned on. Sanitised: no
 * address, no link — the listing itself is the source site's to publish.
 */

import type { CompRow, CompUnitTypes } from '../../types/analysis'

const SOURCE_LABEL: Record<string, string> = {
  rentals_ca: 'Rentals.ca',
  kijiji: 'Kijiji',
  padmapper: 'PadMapper',
}

/** Reader-facing dwelling type (D-117); rows from before D-117 have none. */
const UNIT_TYPE_LABEL: Record<string, string> = {
  apartment: 'Apartment',
  house: 'House',
  townhouse: 'Townhouse',
  'house-unit': 'Unit in house',
  basement: 'Basement',
  room: 'Room',
}

const SUBJECT_LABEL: Record<NonNullable<CompUnitTypes['subject']>, string> = {
  apartment: 'apartment',
  house: 'house',
  townhouse: 'townhouse',
}

/**
 * One sentence on how the comps' dwelling types compare with the subject's
 * (D-117). Null when nothing was matched — an older analysis, or a listing
 * that stated no type — so nothing is claimed.
 */
export function unitTypeCaption(unitTypes: CompUnitTypes | undefined): string | null {
  if (unitTypes == null || unitTypes.subject == null) return null
  const total = unitTypes.matched + unitTypes.near + unitTypes.unknown
  if (total === 0) return null
  const kind = SUBJECT_LABEL[unitTypes.subject]
  if (unitTypes.matched === total) return `all ${total} the same dwelling type (${kind})`
  const rest: string[] = []
  if (unitTypes.near > 0) rest.push(`${unitTypes.near} a near type at reduced weight`)
  if (unitTypes.unknown > 0) rest.push(`${unitTypes.unknown} of unread type at reduced weight`)
  return `${unitTypes.matched} of ${total} the same dwelling type (${kind}); ${rest.join(', ')}`
}

function seenLabel(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

interface CompRowsTableProps {
  rows: CompRow[] | undefined
  /** Total comps behind the band (the rows may be a capped subset). */
  compCount: number
  /** How the comps' dwelling types compare with the subject's (D-117). */
  unitTypes?: CompUnitTypes
}

export function CompRowsTable({
  rows,
  compCount,
  unitTypes,
}: CompRowsTableProps): JSX.Element | null {
  if (!rows || rows.length === 0) return null
  // Analyses from before D-117 carry no type; the column only appears when some row has one.
  const showType = rows.some((r) => r.unitType != null)
  const typeCaption = unitTypeCaption(unitTypes)
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
          <thead>
            <tr
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                textAlign: 'left',
              }}
            >
              {[
                'Asking rent',
                'Match',
                ...(showType ? ['Type'] : []),
                'Beds',
                'Sqft',
                'Area',
                'Distance',
                'Source',
                'Seen',
              ].map((h) => (
                <th key={h} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {[
                  `$${r.rentMonthly.toLocaleString('en-CA')}`,
                  r.similarity == null ? '—' : `${Math.round(r.similarity * 100)}%`,
                  ...(showType ? [UNIT_TYPE_LABEL[r.unitType ?? ''] ?? '—'] : []),
                  r.beds == null ? '—' : String(r.beds),
                  r.sqft == null ? '—' : r.sqft.toLocaleString('en-CA'),
                  r.fsa ?? '—',
                  r.distanceKm == null ? '—' : `${r.distanceKm.toFixed(1)} km`,
                  SOURCE_LABEL[r.source] ?? r.source,
                  seenLabel(r.seenAt),
                ].map((cell, j) => (
                  <td
                    key={j}
                    className={j === 0 || j === 1 || j === (showType ? 6 : 5) ? 'mono' : undefined}
                    style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid var(--line)',
                      color: j === 0 ? 'var(--ink)' : 'var(--ink-2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p
        className="mono"
        style={{ fontSize: 10.5, color: 'var(--muted)', padding: '10px 16px', margin: 0 }}
      >
        {rows.length < compCount
          ? `Showing ${rows.length} of ${compCount} comps behind the band. `
          : ''}
        Asking rents as scraped, not signed leases; addresses are not republished.
        {rows.some((r) => r.similarity != null)
          ? showType
            ? ' Match weighs distance, how recently the comp was seen, size, bedroom count and dwelling type; the band is the match-weighted percentile.'
            : ' Match weighs distance, how recently the comp was seen, size and bedroom count; the band is the match-weighted percentile.'
          : ''}
        {typeCaption
          ? ` Dwelling type: ${typeCaption}; rooms, basements and the other market were left out.`
          : ''}
      </p>
    </div>
  )
}
