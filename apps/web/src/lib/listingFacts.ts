/**
 * listingFacts — the one rule for rendering a listing count the source may
 * not have provided (beds, baths, parking). D-072.
 *
 * Every report used to decide this for itself: `String(listing.beds)` in six
 * places, `parkingSpots > 0` in nine, and the address path stored a blank
 * bathroom field as 0. So the same unknown rendered as "0 bath" on one page,
 * "—" on another and "Not listed" on a third, and D-030, D-053 and D-060 each
 * fixed one field in one place. This module is where the contract lives;
 * report shims call it and do not re-derive it.
 *
 * The rule, matching the API's `Listing` type:
 *   null  → not provided.
 *   n > 0 → provided.
 *   0     → treated as not provided. The scraper writes 0 for a missing
 *           count and rows stored before the rule hold 0 for "absent", so a
 *           zero cannot be told from a gap. "— bed" is a floor; "0 bed" is a
 *           claim. (D-060's parking reasoning, applied to every count.)
 */

/** Rendered wherever a count is not provided. */
export const NOT_PROVIDED = '—'

/** The count when the source provided one, else null. */
export function knownCount(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) && n > 0 ? n : null
}

/** "2" or "—". For layouts that append their own unit word. */
export function bareCount(n: number | null | undefined): string {
  const k = knownCount(n)
  return k == null ? NOT_PROVIDED : String(k)
}

/**
 * "2 spots" / "1 spot" / fallback. `noun` is singular; the plural is `noun + 's'`
 * unless given.
 */
export function countLabel(
  n: number | null | undefined,
  noun: string,
  opts: { plural?: string; fallback?: string } = {}
): string {
  const k = knownCount(n)
  if (k == null) return opts.fallback ?? NOT_PROVIDED
  const word = k === 1 ? noun : (opts.plural ?? `${noun}s`)
  return `${k} ${word}`
}

/** "2 bed · 1 bath", with "—" standing in for whatever was not provided. */
export function bedBathLabel(listing: {
  beds: number | null | undefined
  baths: number | null | undefined
}): string {
  return `${bareCount(listing.beds)} bed · ${bareCount(listing.baths)} bath`
}
