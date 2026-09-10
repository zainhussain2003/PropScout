/**
 * alarmDecision.ts
 *
 * Decides the scraper-yield alarm outcome for a single run given the
 * per-(source, city) classification results produced by the classifier.
 *
 * This module is intentionally narrow: it only owns the decision + exit-code
 * logic. It does NOT call process.exit, reach out to the classifier, or do
 * any aggregation/orchestration — callers own those concerns.
 */

// ---------------------------------------------------------------------------
// Types re-exported so callers never have to import them separately
// ---------------------------------------------------------------------------

/** The four states the classifier can assign to a single (source, city) pair. */
export type CityClassification = "OK" | "BLOCKED" | "TRANSIENT" | "NEEDS_REVIEW";

/** Identity key for a single classification result. */
export interface CityResult {
  /** Scrape-source identifier, e.g. "zillow", "redfin". */
  source: string;
  /** City slug, e.g. "austin-tx". */
  city: string;
  /** Classification assigned by the classifier. */
  classification: CityClassification;
}

// ---------------------------------------------------------------------------
// Alarm outcome types
// ---------------------------------------------------------------------------

/**
 * HARD  — at least one city is BLOCKED. Caller MUST exit non-zero.
 * SOFT  — no BLOCKED cities, but at least one NEEDS_REVIEW. Caller exits 0.
 * NONE  — all cities are OK or TRANSIENT. Caller exits 0, no notification.
 */
export type AlarmLevel = "HARD" | "SOFT" | "NONE";

/** Human-readable summary embedded in every notification payload. */
export interface AlarmSummary {
  /** City keys that were BLOCKED, sorted for deterministic output. */
  blockedCities: string[];
  /** City keys that were NEEDS_REVIEW (and not BLOCKED), sorted. */
  needsReviewCities: string[];
}

/**
 * The structured result returned by `decideAlarm`.
 *
 * Callers are responsible for:
 *   - calling `process.exit(result.exitCode)` when appropriate, and
 *   - dispatching `result.notification` through whatever channel they own.
 */
export interface AlarmDecision {
  level: AlarmLevel;
  /**
   * 0 for SOFT and NONE; a non-zero value (1) for HARD.
   * Intentionally typed as `number` so callers can pass it straight to
   * process.exit without a cast.
   */
  exitCode: number;
  /**
   * Present for HARD and SOFT; undefined for NONE.
   * Contains the per-city breakdown to surface in the notification.
   */
  notification: AlarmSummary | undefined;
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Inspect every classification result for a run and return a structured
 * alarm decision.
 *
 * Rules (in priority order):
 *  1. ANY city BLOCKED  → HARD alarm, exitCode = 1, notification with summary.
 *  2. No BLOCKED, ≥1 NEEDS_REVIEW → SOFT alarm, exitCode = 0, notification.
 *  3. All OK / TRANSIENT → NONE, exitCode = 0, no notification.
 *
 * @param results - Full set of per-(source, city) classification results for
 *                  the run. An empty set is treated as "all clear" (NONE).
 */
export function decideAlarm(results: readonly CityResult[]): AlarmDecision {
  const blockedCities: Set<string> = new Set();
  const needsReviewCities: Set<string> = new Set();

  for (const r of results) {
    if (r.classification === "BLOCKED") {
      blockedCities.add(r.city);
    } else if (r.classification === "NEEDS_REVIEW") {
      needsReviewCities.add(r.city);
    }
  }

  // Rule 1: HARD — any city is BLOCKED
  if (blockedCities.size > 0) {
    const summary: AlarmSummary = {
      blockedCities: [...blockedCities].sort(),
      needsReviewCities: [...needsReviewCities].sort(),
    };
    return { level: "HARD", exitCode: 1, notification: summary };
  }

  // Rule 2: SOFT — no BLOCKED, but at least one NEEDS_REVIEW
  if (needsReviewCities.size > 0) {
    const summary: AlarmSummary = {
      blockedCities: [],
      needsReviewCities: [...needsReviewCities].sort(),
    };
    return { level: "SOFT", exitCode: 0, notification: summary };
  }

  // Rule 3: NONE — all OK or TRANSIENT
  return { level: "NONE", exitCode: 0, notification: undefined };
}
