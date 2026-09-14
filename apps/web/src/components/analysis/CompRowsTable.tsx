/**
 * CompRowsTable — the comparable rentals behind a rent band (D-099).
 *
 * Shared by the investor/landlord §03 and the tenant §01. A band is only as
 * good as what it was drawn from; these are the rows after outlier removal,
 * nearest first when the search used a radius. Sanitised: no address, no
 * link — the listing itself is the source site's to publish.
 */

import type { CompRow } from '../../types/analysis'

const SOURCE_LABEL: Record<string, string> = {
  rentals_ca: 'Rentals.ca',
  kijiji: 'Kijiji',
  padmapper: 'PadMapper',
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
}

export function CompRowsTable({ rows, compCount }: CompRowsTableProps): JSX.Element | null {
  if (!rows || rows.length === 0) return null
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
              {['Asking rent', 'Beds', 'Sqft', 'Area', 'Distance', 'Source', 'Seen'].map((h) => (
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
                  r.beds == null ? '—' : String(r.beds),
                  r.sqft == null ? '—' : r.sqft.toLocaleString('en-CA'),
                  r.fsa ?? '—',
                  r.distanceKm == null ? '—' : `${r.distanceKm.toFixed(1)} km`,
                  SOURCE_LABEL[r.source] ?? r.source,
                  seenLabel(r.seenAt),
                ].map((cell, j) => (
                  <td
                    key={j}
                    className={j === 0 || j === 4 ? 'mono' : undefined}
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
      </p>
    </div>
  )
}
