/**
 * Per-city state classifier for the scraper yield alarm.
 *
 * Consumes an array of per-page results for a single city and returns exactly
 * one of four mutually-exclusive states:
 *
 *   OK           — at least one page has rows > 0 AND no page is blocked.
 *   BLOCKED      — every page is blocked (status 403/429 OR blocked === true).
 *   TRANSIENT    — at least one page is blocked AND at least one other page
 *                  has rows > 0  (on a non-blocked page).
 *   NEEDS_REVIEW — every page has status 200 with rows === 0 and none blocked.
 *
 * "Producing" is intentionally restricted to non-blocked pages: a page that
 * returns 403/429 or sets the blocked flag cannot reliably produce parsed rows,
 * so any rows value on a blocked page is ignored for classification purposes.
 *
 * Out-of-scope: retry logic, alarm/exit-code logic, multi-city aggregation.
 */

export type CityState = "OK" | "BLOCKED" | "TRANSIENT" | "NEEDS_REVIEW";

export interface PageResult {
  /** HTTP status returned for this page (e.g. 200, 403, 429). */
  status: number;
  /** Number of listing rows successfully parsed from this page. */
  rows: number;
  /** Explicit blocked flag (set by the scraper when it detects a soft-block). */
  blocked: boolean;
}

/**
 * Returns true when a single page should be considered blocked.
 * A page is blocked when the scraper flagged it OR the HTTP status is 403/429.
 */
function isPageBlocked(page: PageResult): boolean {
  return page.blocked || page.status === 403 || page.status === 429;
}

/**
 * Returns true when a page is non-blocked AND has rows > 0.
 *
 * Rows on a blocked page are not counted: a 403/429 response body cannot
 * contain valid listing data, so any rows field there is noise.
 */
function isPageProducing(page: PageResult): boolean {
  return !isPageBlocked(page) && page.rows > 0;
}

/**
 * Classify all pages scraped for one city into a single CityState.
 *
 * @param pages  Array of per-page results for a single city (may be empty).
 * @returns      One of: "OK" | "BLOCKED" | "TRANSIENT" | "NEEDS_REVIEW"
 */
export function classifyCity(pages: PageResult[]): CityState {
  if (pages.length === 0) {
    // Empty input cannot satisfy any positive condition; treat conservatively.
    return "NEEDS_REVIEW";
  }

  const anyBlocked = pages.some(isPageBlocked);
  const anyProducing = pages.some(isPageProducing);
  const allBlocked = pages.every(isPageBlocked);

  // TRANSIENT: mixed signal — some pages blocked, at least one (unblocked) page
  // is producing rows.
  if (anyBlocked && anyProducing) {
    return "TRANSIENT";
  }

  // BLOCKED: every page is blocked (implies !anyProducing at this point).
  if (allBlocked) {
    return "BLOCKED";
  }

  // OK: at least one unblocked page has rows > 0 AND no page is blocked.
  if (anyProducing && !anyBlocked) {
    return "OK";
  }

  // NEEDS_REVIEW: everything responded 200 / rows === 0 / not blocked.
  return "NEEDS_REVIEW";
}
