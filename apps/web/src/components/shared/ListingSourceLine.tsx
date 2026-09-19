/**
 * ListingSourceLine — "Listing facts from realtor.ca · read Sep 19, 2026"
 * under the address on every report hero (D-111; shared across the four
 * reports since D-122). Says where the facts on the page came from and
 * when, or that the person entered them.
 */

import type { ListingData } from '../../types/analysis'

export function ListingSourceLine({
  provenance,
}: {
  provenance: ListingData['provenance'] | null | undefined
}): JSX.Element | null {
  if (provenance == null) return null
  const when = provenance.asOf
    ? ` · ${provenance.kind === 'listing' ? 'read' : 'entered'} ${new Date(
        provenance.asOf
      ).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : ''
  return (
    <div
      className="mono"
      style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}
      data-testid="listing-provenance"
    >
      {provenance.kind === 'listing'
        ? `Listing facts from ${provenance.source ?? 'the listing'}`
        : 'Listing facts as you entered them'}
      {when}
    </div>
  )
}
