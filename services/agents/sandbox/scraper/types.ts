/**
 * scraper/types.ts
 *
 * Shared type definitions for the block-aware yield alarm system.
 * Every other module imports from here — no circular deps.
 */

// ── Page-level types ──────────────────────────────────────────────────────────

/** Result returned by open_page for a single scraper page fetch. */
export interface PageResult {
  /** Raw page HTML / text body (may be empty string on hard block). */
  page: string
  /** HTTP status code received (or 0 if the request failed at the network layer). */
  status: number
  /**
   * True when the page is unambiguously blocked:
   *   - status 403 or 429, OR
   *   - status 200 but the body contains a recognised challenge marker.
   */
  blocked: boolean
}

// ── Scrape-level types ────────────────────────────────────────────────────────

/**
 * One page's contribution to a (source, city) accumulator.
 * Produced by the scraper after fetching a single paginated page.
 */
export interface PageScrapeOutcome {
  source: string
  city: string
  /** Number of listing rows extracted from this page (0 on block or empty result). */
  rowCount: number
  status: number
  blocked: boolean
}

/**
 * Aggregated page outcomes for a single (source, city) pair.
 * Built by scrape_all_sources before classification.
 */
export interface CityAccumulator {
  source: string
  city: string
  pages: PageScrapeOutcome[]
}

// ── Classification types ──────────────────────────────────────────────────────

/**
 * Per-city classification produced by classify_city().
 *
 * OK           – at least one page returned rows > 0 with no block status.
 * BLOCKED      – ALL pages returned 403/429/challenge-marker after one retry.
 * TRANSIENT    – one page was blocked but other pages in this city returned rows.
 * NEEDS_REVIEW – all pages returned status 200 but zero rows with no block markers.
 *                Ambiguous: could be a stale selector, a soft 200 block, or an
 *                empty market segment. The human disambiguates — never assume benign.
 */
export type CityClassification = 'OK' | 'BLOCKED' | 'TRANSIENT' | 'NEEDS_REVIEW'

export interface CityResult {
  source: string
  city: string
  classification: CityClassification
}

// ── Alarm types ───────────────────────────────────────────────────────────────

/**
 * HARD  – at least one city is BLOCKED.  Causes non-zero process exit.
 * SOFT  – no cities are BLOCKED but at least one is NEEDS_REVIEW.  Exit 0.
 * NONE  – all cities are OK or TRANSIENT.  No notification, exit 0.
 */
export type AlarmLevel = 'HARD' | 'SOFT' | 'NONE'

export interface AlarmResult {
  level: AlarmLevel
  blockedCities: CityResult[]
  needsReviewCities: CityResult[]
  /** Suggested process exit code: 1 for HARD, 0 for SOFT/NONE. */
  exitCode: number
}

// ── Scraper-source contract ───────────────────────────────────────────────────

/**
 * A minimal interface that scrape_all_sources expects each source driver to
 * satisfy.  Concrete implementations (realtor_ca, kijiji, etc.) are outside the
 * sandbox scope; this type keeps the alarm layer decoupled from them.
 */
export interface ScraperSource {
  id: string
  /** List of (city, pageUrl) pairs this source will fetch this run. */
  pages: Array<{ city: string; url: string }>
  /** Fetch a single page URL and return its raw HTML and HTTP metadata. */
  fetchPage: (url: string) => Promise<{ html: string; status: number }>
  /** Extract listing rows from a successfully fetched page. */
  extractRows: (html: string) => number
}
