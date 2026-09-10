/**
 * scratch/yieldAlarm/aggregate.ts
 *
 * Aggregation layer for the scraper yield alarm.
 *
 * Composes classifyCity, retry (trackSourceBlocks circuit-breaker), and
 * alarmDecision into a single run-level result.
 *
 * Responsibilities:
 *   1. For every (source, city), classify its pages via classifyCity.
 *   2. Maintain a per-source circuit-breaker via trackSourceBlocks.
 *      Once a source's breaker trips (≥ CONSECUTIVE_BLOCK_TRIP_COUNT
 *      consecutive BLOCKED cities), all subsequent cities for THAT source
 *      skip the retry path.  The breaker state is isolated per-source and
 *      does not affect other sources.
 *   3. Collect every per-(source, city) CityResult — tripping the breaker
 *      does NOT erase already-classified cities, so all BLOCKED findings
 *      reach alarmDecision intact.
 *   4. Hand the full CityResult set to decideAlarm and return the run-level
 *      AlarmDecision.
 *
 * Out-of-scope: actual I/O, backoff timers, process.exit.
 */

import { classifyCity, PageResult } from "./classifyCity";
import { trackSourceBlocks, CityOutcome } from "./retry";
import { decideAlarm, AlarmDecision, CityResult } from "./alarmDecision";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * All page-fetch results for a single (source, city) pair.
 * The `pages` array is the same shape consumed by classifyCity.
 */
export interface SourceCityPages {
  /** Scrape-source identifier, e.g. "zillow". */
  source: string;
  /** City slug, e.g. "austin-tx". */
  city: string;
  /** Per-page fetch results for this (source, city). */
  pages: PageResult[];
}

// ---------------------------------------------------------------------------
// aggregateRun
// ---------------------------------------------------------------------------

/**
 * Aggregate all per-(source, city) page-fetch results into a run-level alarm
 * decision.
 *
 * Processing order is the same as the order of `entries`.  The circuit
 * breaker for each source is driven by the sequential order of cities as they
 * appear in `entries` — cities for a given source that appear after the
 * breaker trips are marked `retrySkipped: true` (informational only); their
 * pages are still classified and their CityResult is still included in the
 * final alarm decision.
 *
 * @param entries  Ordered list of per-(source, city) page results for this run.
 * @returns        Run-level AlarmDecision from decideAlarm.
 */
export function aggregateRun(entries: readonly SourceCityPages[]): AlarmDecision {
  // Per-source circuit-breaker state: map from source → running CityOutcome[]
  const sourceBreakerOutcomes = new Map<string, CityOutcome[]>();

  // Collected classifications — grows monotonically; nothing is ever removed.
  const cityResults: CityResult[] = [];

  for (const entry of entries) {
    const { source, city, pages } = entry;

    // --- Step 1: ensure per-source breaker outcomes list exists ---
    if (!sourceBreakerOutcomes.has(source)) {
      sourceBreakerOutcomes.set(source, []);
    }
    const outcomes = sourceBreakerOutcomes.get(source) as CityOutcome[];

    // --- Step 2: check circuit-breaker BEFORE classifying (retry path) ---
    const breakerState = trackSourceBlocks(outcomes);
    const retrySkipped = breakerState.tripped;

    // --- Step 3: classify the city's pages regardless of breaker state ---
    //   The breaker only governs whether a retry attempt is issued; it never
    //   suppresses the classification result from the alarm decision.
    const classification = classifyCity(pages);

    // --- Step 4: record the CityResult for alarmDecision ---
    cityResults.push({ source, city, classification });

    // --- Step 5: feed the breaker outcome (only when retry was available) ---
    //   If the breaker already tripped we don't keep appending to outcomes —
    //   the state is already permanently tripped and there is no retry to gate.
    //   (trackSourceBlocks is safe either way, but we honour the documented
    //   usage pattern from retry.ts and avoid noise in the outcomes array.)
    if (!retrySkipped) {
      const outcome: CityOutcome = classification === "BLOCKED" ? "BLOCKED" : "OK";
      outcomes.push(outcome);
    }
  }

  // --- Step 6: hand the full set to alarmDecision ---
  return decideAlarm(cityResults);
}
