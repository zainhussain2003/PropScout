/**
 * validateUrl.ts — URL validation and listing-type detection.
 *
 * Only Realtor.ca and Zillow.ca are supported at MVP launch.
 * Zillow.com (US) is detected and rejected with a specific error.
 *
 * Listing type (for-sale vs for-rent) is inferred from the URL path:
 *   - Realtor.ca for-rent URLs contain "/property-for-rent/" or end with
 *     a listing segment that suggests a rental (e.g. price pattern).
 *     In practice, Realtor.ca puts "for-rent" in the path for rental listings.
 *   - Ambiguous cases default to 'for-sale' (the user toggles from the modal).
 */

export type ListingSource = 'realtor-ca' | 'zillow-ca'

export type ListingKind = 'sale' | 'rent'

export interface UrlValidationResult {
  valid: true
  source: ListingSource
  kind: ListingKind
  normalised: string
}

export interface UrlValidationError {
  valid: false
  message: string
}

export type UrlValidation = UrlValidationResult | UrlValidationError

// ── Regex patterns ────────────────────────────────────────────────

/** Matches any Realtor.ca listing URL */
const REALTOR_CA_RE = /^https?:\/\/(?:www\.)?realtor\.ca\/real-estate\//i

/** Matches Zillow.ca listing URLs (Canadian) */
const ZILLOW_CA_RE = /^https?:\/\/(?:www\.)?zillow\.ca\//i

/** Matches Zillow.com (US) to show a specific error */
const ZILLOW_COM_RE = /^https?:\/\/(?:www\.)?zillow\.com\//i

/**
 * Realtor.ca for-rent URL pattern.
 * Rental listings use the path segment "for-rent" in the URL.
 * e.g. https://www.realtor.ca/real-estate/12345/unit-1-100-main-st-toronto-for-rent
 */
const REALTOR_FOR_RENT_RE = /for-rent/i

// ── Validation function ───────────────────────────────────────────

/**
 * Validate a listing URL and infer its type.
 *
 * @param raw - The raw string the user pasted
 * @returns UrlValidation — either a result with source/kind or an error message
 */
export function validateUrl(raw: string): UrlValidation {
  const url = (raw ?? '').trim()

  if (!url) {
    return { valid: false, message: 'Paste a listing URL to begin.' }
  }

  if (!/^https?:\/\//i.test(url)) {
    return { valid: false, message: "That doesn't look like a valid URL." }
  }

  // US Zillow — reject before general Zillow check
  if (ZILLOW_COM_RE.test(url) && !ZILLOW_CA_RE.test(url)) {
    return {
      valid: false,
      message: 'This appears to be a US listing. PropScout covers Canadian properties only.',
    }
  }

  if (REALTOR_CA_RE.test(url)) {
    const kind: ListingKind = REALTOR_FOR_RENT_RE.test(url) ? 'rent' : 'sale'
    return { valid: true, source: 'realtor-ca', kind, normalised: url }
  }

  if (ZILLOW_CA_RE.test(url)) {
    // Zillow.ca — Cloudflare bypass is deferred; kind defaults to 'sale'
    // until the scraper can read the page type. The modal lets the user
    // correct this before proceeding.
    return { valid: true, source: 'zillow-ca', kind: 'sale', normalised: url }
  }

  return {
    valid: false,
    message:
      "That listing source isn't supported yet. We currently read Realtor.ca and Zillow.ca — more sources coming soon.",
  }
}

/**
 * Detect listing kind (sale/rent) from a URL alone.
 * Returns null if the URL is not a recognised supported listing source.
 *
 * Used for pre-populating the ModeModal without running full validation.
 */
export function detectListingKind(url: string): ListingKind | null {
  const trimmed = (url ?? '').trim()
  if (REALTOR_CA_RE.test(trimmed)) {
    return REALTOR_FOR_RENT_RE.test(trimmed) ? 'rent' : 'sale'
  }
  if (ZILLOW_CA_RE.test(trimmed)) {
    return 'sale' // conservative default
  }
  return null
}
