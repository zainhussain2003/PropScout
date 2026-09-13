/**
 * validateUrl — validates a listing URL PropScout can actually read.
 *
 * Returns null when the URL is valid for PropScout to analyse.
 * Returns a user-facing error string when the URL is invalid or unsupported.
 *
 * Realtor.ca only. Zillow.ca used to pass here and then fail in the scraper
 * (its scraper is deferred — see FUTURE.md), so the page accepted a URL it
 * could not read and reported the failure as the listing's fault (audit
 * J-01). The message points at the address path, which works for anything.
 *
 * This is the single canonical implementation; the Hero and ModeModal both
 * import it — never re-implement inline.
 */
export function validateUrl(raw: string): string | null {
  const u = (raw ?? '').trim().toLowerCase()

  if (!u) {
    return 'Paste a listing URL to begin.'
  }

  if (!/^https?:\/\//.test(u)) {
    return "That doesn't look like a valid URL."
  }

  // zillow.com is the US site.
  if (/zillow\.com/.test(u) && !/zillow\.ca/.test(u)) {
    return 'This appears to be a US listing. PropScout covers Canadian properties only.'
  }

  if (!/realtor\.ca/.test(u)) {
    return (
      "That listing source isn't supported yet. " +
      'We read Realtor.ca listings today — or type the address instead.'
    )
  }

  return null
}

/**
 * detectListingKind — infers whether a URL is for a rental or for-sale listing.
 *
 * Returns 'rent' when rental-specific URL patterns are found.
 * Defaults to 'sale' when the listing type cannot be inferred.
 *
 * This is a best-effort hint for the UI. In production, the scraper's
 * structured output is the authoritative source — it always overrides this.
 */
export function detectListingKind(url: string): 'sale' | 'rent' {
  const u = url.toLowerCase()
  if (/\/rental\/|\/for-rent\/|\/apartments-for-rent\//.test(u)) {
    return 'rent'
  }
  return 'sale'
}
