/**
 * validateUrl — validates a Realtor.ca or Zillow.ca listing URL.
 *
 * Returns null when the URL is valid for PropScout to analyse.
 * Returns a user-facing error string when the URL is invalid or unsupported.
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

  const isKnownSite = /(realtor\.ca|zillow\.ca|zillow\.com)/.test(u)
  if (!isKnownSite) {
    return (
      "That listing source isn't supported yet. " +
      'We currently read Realtor.ca and Zillow.ca — more sources coming soon.'
    )
  }

  // zillow.com is the US site; only zillow.ca is Canadian.
  if (/zillow\.com/.test(u) && !/zillow\.ca/.test(u)) {
    return 'This appears to be a US listing. PropScout covers Canadian properties only.'
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
