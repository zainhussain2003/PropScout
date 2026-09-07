/**
 * scraper/open_page.test.ts
 *
 * Unit tests for open_page() — Jest / ts-jest.
 *
 * Run with:
 *   npm test
 *
 * All tests pass delayMs = 0 so there is no real sleeping.
 * The fetchPage mock is a hand-rolled call-counting closure (no jest.fn() needed).
 */

// No node:test import — describe / it / expect are Jest globals.
import { open_page, CHALLENGE_PATTERN } from './open_page'
import type { PageResult } from './types'

// ── Helper factory ────────────────────────────────────────────────────────────

/**
 * Returns a mock fetchPage function together with a `calls` counter.
 * Cycles through `responses`; the last entry is repeated if calls exceed
 * the array length (mirrors the original jest.fn() behaviour).
 */
function makeFetch(responses: Array<{ html: string; status: number }>): {
  fn: (url: string) => Promise<{ html: string; status: number }>
  calls: () => number
} {
  let callCount = 0
  const fn = async (_url: string) => {
    const resp = responses[callCount] ?? responses[responses.length - 1]
    callCount++
    return resp
  }
  return { fn, calls: () => callCount }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('open_page', () => {
  const URL = 'https://example.com/listings'

  // ── 1. Happy path ───────────────────────────────────────────────────────────
  it('returns page + status 200 + blocked=false on a clean response', async () => {
    const { fn: fetch, calls } = makeFetch([{ html: '<html>listings</html>', status: 200 }])
    const result: PageResult = await open_page(URL, fetch, 0)

    expect(result.status).toBe(200)
    expect(result.page).toBe('<html>listings</html>')
    expect(result.blocked).toBe(false)
    expect(calls()).toBe(1) // no retry
  })

  // ── 2. Hard 403 that persists ───────────────────────────────────────────────
  it('returns blocked=true when both attempts return 403', async () => {
    const { fn: fetch, calls } = makeFetch([
      { html: 'Forbidden', status: 403 },
      { html: 'Forbidden', status: 403 },
    ])
    const result = await open_page(URL, fetch, 0)

    expect(result.status).toBe(403)
    expect(result.blocked).toBe(true)
    expect(calls()).toBe(2)
  })

  // ── 3. Hard 429 that persists ───────────────────────────────────────────────
  it('returns blocked=true when both attempts return 429', async () => {
    const { fn: fetch, calls } = makeFetch([
      { html: 'Too Many Requests', status: 429 },
      { html: 'Too Many Requests', status: 429 },
    ])
    const result = await open_page(URL, fetch, 0)

    expect(result.status).toBe(429)
    expect(result.blocked).toBe(true)
    expect(calls()).toBe(2)
  })

  // ── 4. Transient 403 that recovers on retry ─────────────────────────────────
  it('returns blocked=false when first attempt is 403 but retry succeeds', async () => {
    const { fn: fetch, calls } = makeFetch([
      { html: 'Forbidden', status: 403 },
      { html: '<html>listings</html>', status: 200 },
    ])
    const result = await open_page(URL, fetch, 0)

    expect(result.status).toBe(200)
    expect(result.page).toBe('<html>listings</html>')
    expect(result.blocked).toBe(false)
    expect(calls()).toBe(2)
  })

  // ── 5. Transient 429 that recovers on retry ─────────────────────────────────
  it('returns blocked=false when first attempt is 429 but retry succeeds', async () => {
    const { fn: fetch, calls } = makeFetch([
      { html: 'Too Many Requests', status: 429 },
      { html: '<html>ok</html>', status: 200 },
    ])
    const result = await open_page(URL, fetch, 0)

    expect(result.status).toBe(200)
    expect(result.blocked).toBe(false)
    expect(calls()).toBe(2)
  })

  // ── 6. Soft block via challenge body (status 200) that persists ─────────────
  it('returns blocked=true when body contains a Cloudflare "just a moment" challenge on both attempts', async () => {
    const challengeHtml = '<html><title>Just a moment...</title></html>'
    const { fn: fetch, calls } = makeFetch([
      { html: challengeHtml, status: 200 },
      { html: challengeHtml, status: 200 },
    ])
    const result = await open_page(URL, fetch, 0)

    expect(result.status).toBe(200)
    expect(result.blocked).toBe(true)
    expect(calls()).toBe(2)
  })

  // ── 7. Soft block via challenge body that recovers on retry ─────────────────
  it('returns blocked=false when captcha body clears on retry', async () => {
    const challengeHtml = '<html>Please complete the captcha</html>'
    const cleanHtml = '<html>listings</html>'
    const { fn: fetch, calls } = makeFetch([
      { html: challengeHtml, status: 200 },
      { html: cleanHtml, status: 200 },
    ])
    const result = await open_page(URL, fetch, 0)

    expect(result.status).toBe(200)
    expect(result.page).toBe(cleanHtml)
    expect(result.blocked).toBe(false)
    expect(calls()).toBe(2)
  })

  // ── 8. hCaptcha marker ──────────────────────────────────────────────────────
  it('detects hcaptcha marker in body', async () => {
    const { fn: fetch } = makeFetch([
      { html: '<html>hCaptcha challenge</html>', status: 200 },
      { html: '<html>hCaptcha challenge</html>', status: 200 },
    ])
    const result = await open_page(URL, fetch, 0)
    expect(result.blocked).toBe(true)
  })

  // ── 9. reCAPTCHA marker ─────────────────────────────────────────────────────
  it('detects recaptcha marker in body', async () => {
    const { fn: fetch } = makeFetch([
      { html: '<html>Please verify: reCAPTCHA</html>', status: 200 },
      { html: '<html>Please verify: reCAPTCHA</html>', status: 200 },
    ])
    const result = await open_page(URL, fetch, 0)
    expect(result.blocked).toBe(true)
  })

  // ── 10. DDoS-Guard marker ───────────────────────────────────────────────────
  it('detects ddos-guard marker in body', async () => {
    const { fn: fetch } = makeFetch([
      { html: '<html>ddos-guard challenge</html>', status: 200 },
      { html: '<html>ddos-guard challenge</html>', status: 200 },
    ])
    const result = await open_page(URL, fetch, 0)
    expect(result.blocked).toBe(true)
  })

  // ── 11. Network-layer failure (fetchPage throws) ────────────────────────────
  it('returns status 0 and blocked=false when fetchPage throws (network error)', async () => {
    let callCount = 0
    const fetch = async (_url: string): Promise<{ html: string; status: number }> => {
      callCount++
      throw new Error('ECONNREFUSED')
    }
    const result = await open_page(URL, fetch, 0)

    // Status 0 is treated as a network error, NOT as a scraping block.
    expect(result.status).toBe(0)
    expect(result.page).toBe('')
    expect(result.blocked).toBe(false)
    // Only 1 attempt: the first fetch threw → safeFetch returns status 0 → not
    // a block status → no retry triggered.
    expect(callCount).toBe(1)
  })

  // ── 12. Only one retry ever occurs ─────────────────────────────────────────
  it('never makes more than 2 fetch calls even for persistent blocks', async () => {
    const { fn: fetch, calls } = makeFetch([
      { html: 'Forbidden', status: 403 },
      { html: 'Forbidden', status: 403 },
      { html: 'Forbidden', status: 403 }, // should never be reached
    ])
    await open_page(URL, fetch, 0)
    expect(calls()).toBe(2)
  })

  // ── 13. CHALLENGE_PATTERN export is usable ──────────────────────────────────
  it('CHALLENGE_PATTERN matches expected challenge strings', () => {
    const hits = [
      'cf-challenge',
      'captcha',
      'recaptcha',
      'hcaptcha',
      'ddos-guard',
      'just a moment',
      'enable javascript',
      'checking your browser',
    ]
    const misses = ['normal listing page', '200 ok', 'real estate results']

    for (const h of hits) {
      expect(CHALLENGE_PATTERN.test(h)).toBe(true)
    }
    for (const m of misses) {
      expect(CHALLENGE_PATTERN.test(m)).toBe(false)
    }
  })
})
