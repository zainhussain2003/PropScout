/**
 * Field-level provenance for the report (D-111): where a figure came from,
 * said next to the figure instead of only in the §12 ledger.
 *
 *   listing     — the source listing stated it (scraped)
 *   entered     — the person typed it (address path, landlord value)
 *   calculated  — computed by the engine from the inputs below it
 *   assumed     — a PropScout estimate or default stood in for a fact
 *   published   — read from a published series (CMHC, Bank of Canada)
 *
 * Pure: reads the ledger the API already produces (D-088) and the listing's
 * own source fields; nothing here decides a number.
 */

import type { AssumptionEntry, ListingData } from '../types/analysis'
import type { Listing } from '../types/property'

export type ProvenanceKind = 'listing' | 'entered' | 'calculated' | 'assumed' | 'published'

export const PROVENANCE_LABEL: Record<ProvenanceKind, string> = {
  listing: 'listing says',
  entered: 'you entered',
  calculated: 'calculated',
  assumed: 'assumed',
  published: 'published',
}

export interface Provenance {
  kind: ProvenanceKind
  /** What to say on hover / in the small print: the sources behind it. */
  detail: string
  /** Ledger rows that are estimates or defaults among this figure's inputs. */
  assumed: AssumptionEntry[]
}

/** Operating inputs every rent-side figure depends on. */
const OPERATING = [
  'rent',
  'property_tax',
  'insurance',
  'maintenance',
  'condo_fee',
  'vacancy',
  'management_fee',
]
/** The value the whole model runs on — one of these rows is present on a rental listing. */
const VALUE = ['value_owner', 'value_estimate']
/** Financing rows — purchase or owned position. */
const FINANCING = ['mortgage_rate', 'down_payment', 'amortization', 'mortgage_balance']
/** Closing rows. */
const CLOSING = ['legal_fees', 'title_insurance', 'home_inspection']

/** Which ledger rows feed each headline tile, by the tile's label. */
export const TILE_INPUTS: Record<string, readonly string[]> = {
  'Cap rate': [...OPERATING, ...VALUE],
  'Monthly cash flow': [...OPERATING, ...VALUE, ...FINANCING],
  'Cash-on-cash': [...OPERATING, ...VALUE, ...FINANCING, ...CLOSING],
  DSCR: [...OPERATING, ...VALUE, ...FINANCING],
  'Monthly payment': [...VALUE, ...FINANCING],
  NOI: [...OPERATING, ...VALUE],
  GRM: ['rent', ...VALUE],
  'Break-even rent': [...OPERATING, ...VALUE, ...FINANCING],
  'Gross yield': ['rent', ...VALUE],
}

const ASSUMED_BASES = new Set<AssumptionEntry['basis']>(['estimate', 'default'])

/**
 * Provenance of a calculated tile: always "calculated", with the estimates
 * and defaults among its inputs named so the reader knows what it rests on.
 */
export function tileProvenance(
  tileLabel: string,
  ledger: AssumptionEntry[] | null | undefined
): Provenance {
  const keys = TILE_INPUTS[tileLabel] ?? []
  const rows = (ledger ?? []).filter((e) => keys.includes(e.key))
  const assumed = rows.filter((e) => ASSUMED_BASES.has(e.basis))
  const detail =
    rows.length === 0
      ? 'Calculated by the engine.'
      : assumed.length === 0
        ? 'Calculated from observed and published inputs.'
        : `Calculated; assumes ${assumed.map((e) => e.label.toLowerCase()).join(', ')}. See §12.`
  return { kind: 'calculated', detail, assumed }
}

/** Where the listing's own facts came from: a scraped page or the person. */
export function listingProvenance(
  listing: Pick<Listing, 'url' | 'scrapedAt'>
): NonNullable<ListingData['provenance']> {
  const scraped = listing.url != null && listing.url !== ''
  let host: string | null = null
  if (scraped) {
    try {
      host = new URL(listing.url).hostname.replace(/^www\./, '')
    } catch {
      host = null
    }
  }
  return {
    kind: scraped ? 'listing' : 'entered',
    source: scraped ? (host ?? 'the listing') : 'details you entered',
    asOf: listing.scrapedAt || null,
  }
}

/** The price line on the hero: the listing's, the person's, or the model's. */
export function priceProvenance(listing: ListingData): Provenance {
  if (listing.ownerValue != null) {
    return { kind: 'entered', detail: 'The value you entered in this card.', assumed: [] }
  }
  if (listing.provenance?.kind === 'entered') {
    return { kind: 'entered', detail: 'The price you entered with the address.', assumed: [] }
  }
  return {
    kind: 'listing',
    detail: `Asking price as stated on ${listing.provenance?.source ?? 'the listing'}.`,
    assumed: [],
  }
}
