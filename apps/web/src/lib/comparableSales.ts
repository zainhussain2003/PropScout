/**
 * Map comparable sales from the analysis payload into the shape the personal
 * buyer's §03 table renders.
 *
 * ## Why this exists
 *
 * Two shapes describe the same thing for different reasons. The API returns
 * sold price both formatted (`sold`) and numeric (`soldPrice`) because the FMV
 * band is derived from the number while the table shows the string. The
 * report's own `PersonalComp` predates the feed and was designed around the
 * demo fixtures, which have a distance and a days-on-market figure.
 *
 * The live feed publishes neither. Rather than fill those columns with a
 * plausible-looking zero — which in a DOM column reads as "sold the same day"
 * and is indistinguishable from a real figure — this maps them to null and the
 * table renders an em dash. A blank is honest; a zero is a fabricated fact.
 *
 * Kept out of the component per the service/logic split: components render.
 */

import type { Analysis } from '../types/analysis'
import type { PersonalComp } from '../types/personal'

type AnalysisComp = NonNullable<Analysis['comparableSales']>[number]

/**
 * Convert analysis comparable sales into table rows.
 *
 * @param comps - comparable sales exactly as the API returned them
 * @returns rows for PBSalesSection, with unavailable fields set to null
 */
export function toPersonalComps(comps: readonly AnalysisComp[]): PersonalComp[] {
  return comps.map((c) => ({
    addr: c.addr,
    // The feed gives one combined string ("3 bed · 2 bath", or "—" when it
    // omitted both). The table has a single Beds column, so it goes there whole
    // and baths stays empty rather than being parsed back out of prose.
    beds: c.beds,
    baths: '',
    sqft: c.sqft,
    sold: c.soldPrice,
    soldDate: c.date,
    dom: null,
    ppsqft: c.pricePerSqft,
    distance: null,
  }))
}

/**
 * Median of the values that exist, ignoring nulls.
 *
 * @param values - numbers that may be missing
 * @returns the median, or null when nothing is known
 */
export function medianOf(values: readonly (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null).sort((a, b) => a - b)
  if (known.length === 0) return null
  return known[Math.floor(known.length / 2)] ?? null
}
