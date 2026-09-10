/**
 * scratch/yieldAlarm/retry.ts
 *
 * Retry logic for the scraper yield-alarm pipeline.
 *
 * Two responsibilities:
 *   1. shouldRetryPage  — decide whether a single page result warrants one retry.
 *   2. trackSourceBlocks — per-source circuit-breaker that trips once
 *                          CONSECUTIVE_BLOCK_TRIP_COUNT cities in a row come
 *                          back BLOCKED, preventing further retries against a
 *                          source that is plainly refusing all traffic.
 *
 * Everything here is pure (no I/O, no timers).  Backoff duration is the
 * caller's concern; this module only answers "should you retry?" and
 * "has the breaker tripped?".
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Number of *consecutive* BLOCKED city outcomes required to trip the
 * per-source circuit-breaker.  Once tripped, all further cities for that
 * source skip the retry entirely for the remainder of the run.
 *
 * Default: 3.  Raise it if a source has known intermittent blocks that
 * clear within a run; lower it if hammering a refusing source is a concern.
 */
export const CONSECUTIVE_BLOCK_TRIP_COUNT = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Outcome recorded for one city against one source. */
export type CityOutcome = "BLOCKED" | "OK";

/** Snapshot returned by trackSourceBlocks. */
export interface CircuitBreakerState {
  /** True when the breaker has tripped and retries should be skipped. */
  readonly tripped: boolean;
  /** How many consecutive BLOCKED cities are at the tail of the sequence. */
  readonly consecutiveBlockedCount: number;
}

// ---------------------------------------------------------------------------
// 1. shouldRetryPage
// ---------------------------------------------------------------------------

/**
 * Returns `true` when a page result indicates a block and the page should be
 * retried exactly once (with caller-managed backoff).
 *
 * A page is considered blocked when:
 *   - HTTP status is 403 or 429, OR
 *   - the scraper's `blocked` flag is explicitly set to `true`.
 *
 * Any other status (200, 404, 5xx, …) is treated as a definitive result that
 * does not warrant a retry via this path.
 */
export function shouldRetryPage(status: number, blocked: boolean): boolean {
  return blocked || status === 403 || status === 429;
}

// ---------------------------------------------------------------------------
// 2. trackSourceBlocks — per-source circuit-breaker
// ---------------------------------------------------------------------------

/**
 * Given the ordered sequence of per-city outcomes recorded so far for one
 * source, returns the current circuit-breaker state.
 *
 * The breaker trips as soon as the *tail* of `outcomes` contains
 * CONSECUTIVE_BLOCK_TRIP_COUNT or more consecutive BLOCKED entries.  Once
 * tripped it stays tripped regardless of any later OK entries (callers should
 * stop appending outcomes after the breaker trips, but the function is safe
 * even if they don't).
 *
 * Usage pattern inside a scrape run:
 *
 *   const outcomes: CityOutcome[] = [];
 *   for (const city of cities) {
 *     const { tripped } = trackSourceBlocks(outcomes);
 *     if (tripped) {
 *       // skip retry for this city
 *     } else if (pageIsBlocked) {
 *       outcomes.push("BLOCKED");
 *     } else {
 *       outcomes.push("OK");
 *     }
 *   }
 */
export function trackSourceBlocks(outcomes: CityOutcome[]): CircuitBreakerState {
  // Walk backwards to count the trailing run of BLOCKED entries.
  let consecutiveBlockedCount = 0;
  for (let i = outcomes.length - 1; i >= 0; i--) {
    if (outcomes[i] === "BLOCKED") {
      consecutiveBlockedCount++;
    } else {
      break;
    }
  }

  // The breaker trips (and stays tripped) once the threshold is reached.
  // We also scan the full sequence for any earlier trip so the state remains
  // correct even if outcomes continues to be appended after tripping.
  const tripped = _wasEverTripped(outcomes);

  return { tripped, consecutiveBlockedCount };
}

/**
 * Scans the full outcomes array for any point at which the breaker would have
 * tripped.  This ensures `tripped` stays `true` even if an OK entry was
 * appended after the threshold was reached.
 */
function _wasEverTripped(outcomes: CityOutcome[]): boolean {
  let run = 0;
  for (const outcome of outcomes) {
    if (outcome === "BLOCKED") {
      run++;
      if (run >= CONSECUTIVE_BLOCK_TRIP_COUNT) return true;
    } else {
      run = 0;
    }
  }
  return false;
}
