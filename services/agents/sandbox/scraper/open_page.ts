/**
 * scraper/open_page.ts
 *
 * Fetches a single URL via a caller-supplied `fetchPage` driver and returns a
 * typed PageResult.  This is the only place the "are we blocked?" decision is
 * made; nothing else in the pipeline needs to re-derive it.
 *
 * Block detection
 * ───────────────
 *  • HTTP 403 or 429                     → blocked
 *  • Body contains a challenge/captcha   → blocked  (status 200 soft-block)
 *
 * Retry behaviour
 * ───────────────
 *  When the first attempt is blocked we wait `RETRY_DELAY_MS` (doubles on each
 *  call via the `delayMs` override — useful in tests) and try once more.
 *  If the second attempt is clean, `blocked` is false; the transient hiccup is
 *  invisible to callers.  If the second attempt is also blocked, `blocked` is
 *  true and we surface that final result.
 *
 *  Network-layer failures (thrown errors) are caught, the body is set to "",
 *  and status is 0.  A status-0 result is not counted as blocked because there
 *  is no definitive evidence of an anti-scraping response; the caller can treat
 *  status 0 as a separate "fetch error" case if desired.
 */

import { PageResult } from './types.js'

// ── Configuration ─────────────────────────────────────────────────────────────

/** Base delay before the single retry, in milliseconds. */
export const RETRY_DELAY_MS = 2_000

/**
 * Regex that matches common challenge / captcha markers found in response
 * bodies.  Tested against lowercased body text.
 *
 * Recognised markers:
 *   cf-challenge  – Cloudflare interstitial
 *   captcha       – generic captcha keyword
 *   recaptcha     – Google reCAPTCHA widget
 *   hcaptcha      – hCaptcha widget
 *   ddos-guard    – DDoS-Guard challenge page
 *   just a moment – Cloudflare "Just a moment…" title text
 *   enable javascript – JS-challenge message
 *   checking your browser – Cloudflare browser-check phrase
 */
export const CHALLENGE_PATTERN =
  /cf-challenge|captcha|recaptcha|hcaptcha|ddos-guard|just a moment|enable javascript|checking your browser/i

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Status codes that unambiguously indicate an anti-scraping block. */
const BLOCKED_STATUSES = new Set([403, 429])

function isBlockedStatus(status: number): boolean {
  return BLOCKED_STATUSES.has(status)
}

function isBlockedBody(body: string): boolean {
  return CHALLENGE_PATTERN.test(body)
}

function isBlocked(status: number, body: string): boolean {
  return isBlockedStatus(status) || isBlockedBody(body)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Driver type: matches the `fetchPage` signature on `ScraperSource` so any
 * concrete driver can be passed in without coupling this module to a specific
 * HTTP library.
 */
export type FetchPageFn = (url: string) => Promise<{ html: string; status: number }>

/**
 * Fetches `url` using `fetchPage` and returns a fully-typed `PageResult`.
 *
 * @param url       - The URL to fetch.
 * @param fetchPage - Caller-supplied HTTP driver.
 * @param delayMs   - Override the retry back-off delay (default: RETRY_DELAY_MS).
 *                    Pass 0 in unit tests so they don't actually sleep.
 */
export async function open_page(
  url: string,
  fetchPage: FetchPageFn,
  delayMs: number = RETRY_DELAY_MS,
): Promise<PageResult> {
  // ── Attempt 1 ────────────────────────────────────────────────────────────
  const first = await safeFetch(url, fetchPage)

  if (!isBlocked(first.status, first.page)) {
    // Happy path — no block, no retry needed.
    return { ...first, blocked: false }
  }

  // ── Block detected — wait then retry once ─────────────────────────────────
  await sleep(delayMs)

  const second = await safeFetch(url, fetchPage)
  const stillBlocked = isBlocked(second.status, second.page)

  return { ...second, blocked: stillBlocked }
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Wraps `fetchPage` so that network-layer throws produce a status-0 result
 * rather than bubbling up.  Keeps `open_page` logic clean.
 */
async function safeFetch(
  url: string,
  fetchPage: FetchPageFn,
): Promise<{ page: string; status: number }> {
  try {
    const { html, status } = await fetchPage(url)
    return { page: html, status }
  } catch {
    return { page: '', status: 0 }
  }
}
