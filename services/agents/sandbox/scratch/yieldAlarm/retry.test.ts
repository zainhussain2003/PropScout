/**
 * scratch/yieldAlarm/retry.test.ts
 *
 * Jest tests for the scraper yield-alarm retry module.
 *
 * Covers every behaviour called out in the spec:
 *   • A single blocked page triggers exactly one retry.
 *   • A non-blocked page triggers no retry.
 *   • The circuit-breaker does NOT trip at N-1 consecutive blocked cities.
 *   • The circuit-breaker DOES trip at N consecutive blocked cities.
 *   • Once tripped, a subsequent city skips retry.
 */

import {
  shouldRetryPage,
  trackSourceBlocks,
  CONSECUTIVE_BLOCK_TRIP_COUNT,
  type CityOutcome,
} from "./retry";

// ---------------------------------------------------------------------------
// shouldRetryPage
// ---------------------------------------------------------------------------

describe("shouldRetryPage", () => {
  // ── Blocked pages — should be retried ──────────────────────────────────

  it("returns true for status 403 (explicit IP/geo block)", () => {
    expect(shouldRetryPage(403, false)).toBe(true);
  });

  it("returns true for status 429 (rate-limited)", () => {
    expect(shouldRetryPage(429, false)).toBe(true);
  });

  it("returns true when the blocked flag is true, regardless of status", () => {
    // Scraper flagged a block even though the HTTP layer returned 200
    expect(shouldRetryPage(200, true)).toBe(true);
  });

  it("returns true when both status is 403 AND blocked flag is true", () => {
    expect(shouldRetryPage(403, true)).toBe(true);
  });

  it("returns true when both status is 429 AND blocked flag is true", () => {
    expect(shouldRetryPage(429, true)).toBe(true);
  });

  // ── Non-blocked pages — should NOT be retried ──────────────────────────

  it("returns false for a successful 200 page", () => {
    // ✦ SPEC: a non-blocked page triggers no retry
    expect(shouldRetryPage(200, false)).toBe(false);
  });

  it("returns false for a 404 (page missing, not a block)", () => {
    expect(shouldRetryPage(404, false)).toBe(false);
  });

  it("returns false for a 500 server error (not a block)", () => {
    expect(shouldRetryPage(500, false)).toBe(false);
  });

  it("returns false for a 301 redirect response", () => {
    expect(shouldRetryPage(301, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an outcomes array of `n` BLOCKED entries. */
function blocked(n: number): CityOutcome[] {
  return Array<CityOutcome>(n).fill("BLOCKED");
}

// ---------------------------------------------------------------------------
// trackSourceBlocks — circuit-breaker
// ---------------------------------------------------------------------------

describe("trackSourceBlocks", () => {
  const N = CONSECUTIVE_BLOCK_TRIP_COUNT; // 3 by default

  // ── Empty / no blocks ──────────────────────────────────────────────────

  it("does not trip when the outcomes list is empty", () => {
    const state = trackSourceBlocks([]);
    expect(state.tripped).toBe(false);
    expect(state.consecutiveBlockedCount).toBe(0);
  });

  it("does not trip with only OK outcomes", () => {
    const state = trackSourceBlocks(["OK", "OK", "OK", "OK"]);
    expect(state.tripped).toBe(false);
    expect(state.consecutiveBlockedCount).toBe(0);
  });

  // ── Single blocked page triggers exactly one retry ─────────────────────
  //
  // The circuit-breaker contract is: `tripped === false` → caller MAY retry.
  // `tripped === true` → caller MUST skip retry.
  // So one BLOCKED outcome must leave `tripped` false (retry allowed).

  it("✦ SPEC: a single BLOCKED outcome leaves the breaker un-tripped (one retry allowed)", () => {
    const state = trackSourceBlocks(["BLOCKED"]);
    expect(state.tripped).toBe(false);
    expect(state.consecutiveBlockedCount).toBe(1);
  });

  // ── Breaker does NOT trip at N-1 consecutive blocks ────────────────────

  it(`✦ SPEC: breaker does NOT trip at ${N - 1} consecutive BLOCKED cities`, () => {
    const outcomes = blocked(N - 1); // e.g. 2 when N=3
    const state = trackSourceBlocks(outcomes);
    expect(state.tripped).toBe(false);
    expect(state.consecutiveBlockedCount).toBe(N - 1);
  });

  it("does not trip when N-1 blocks are separated by an OK", () => {
    // Pattern: N-1 blocks, then OK, then N-1 blocks — never N in a row
    const outcomes: CityOutcome[] = [...blocked(N - 1), "OK", ...blocked(N - 1)];
    const state = trackSourceBlocks(outcomes);
    expect(state.tripped).toBe(false);
  });

  // ── Breaker DOES trip at exactly N consecutive blocks ──────────────────

  it(`✦ SPEC: breaker DOES trip at exactly ${N} consecutive BLOCKED cities`, () => {
    const outcomes = blocked(N); // e.g. 3 when N=3
    const state = trackSourceBlocks(outcomes);
    expect(state.tripped).toBe(true);
    expect(state.consecutiveBlockedCount).toBe(N);
  });

  it("trips when N consecutive blocks appear after some OK cities", () => {
    const outcomes: CityOutcome[] = ["OK", "OK", ...blocked(N)];
    const state = trackSourceBlocks(outcomes);
    expect(state.tripped).toBe(true);
  });

  it("trips when N+1 consecutive blocks are present", () => {
    const outcomes = blocked(N + 1);
    const state = trackSourceBlocks(outcomes);
    expect(state.tripped).toBe(true);
    expect(state.consecutiveBlockedCount).toBe(N + 1);
  });

  // ── Once tripped, subsequent city skips retry ──────────────────────────
  //
  // Simulate a caller that checks the breaker state BEFORE appending the
  // current city's outcome.  After N blocks the breaker trips; the caller
  // should see `tripped === true` on the very next check and skip the retry.

  it("✦ SPEC: once tripped, a subsequent city (checked before appending) sees tripped=true and skips retry", () => {
    // After N-1 cities, the breaker is still open.
    const outcomes: CityOutcome[] = blocked(N - 1);
    expect(trackSourceBlocks(outcomes).tripped).toBe(false); // safe to retry

    // N-th city comes back blocked — push it.
    outcomes.push("BLOCKED");
    expect(trackSourceBlocks(outcomes).tripped).toBe(true); // breaker just tripped

    // (N+1)-th city: caller checks BEFORE deciding whether to retry.
    // The outcomes slice does NOT yet contain this city's result.
    // The breaker is already tripped → skip retry.
    const stateBeforeNextCity = trackSourceBlocks(outcomes);
    expect(stateBeforeNextCity.tripped).toBe(true); // ✦ skip retry
  });

  it("breaker stays tripped even if an OK is appended after tripping", () => {
    // Defensive: caller shouldn't keep appending after trip, but if they do
    // the state must remain tripped (we never un-trip within a run).
    const outcomes: CityOutcome[] = [...blocked(N), "OK"];
    const state = trackSourceBlocks(outcomes);
    expect(state.tripped).toBe(true);
  });

  // ── consecutiveBlockedCount accuracy ──────────────────────────────────

  it("reports consecutiveBlockedCount as 0 when the last city was OK", () => {
    const outcomes: CityOutcome[] = [...blocked(N - 1), "OK"];
    const state = trackSourceBlocks(outcomes);
    expect(state.consecutiveBlockedCount).toBe(0);
  });

  it("reports consecutiveBlockedCount as 2 when two blocks follow an OK", () => {
    const outcomes: CityOutcome[] = ["OK", "BLOCKED", "BLOCKED"];
    const state = trackSourceBlocks(outcomes);
    expect(state.consecutiveBlockedCount).toBe(2);
  });
});
