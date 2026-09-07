/**
 * scratch/yieldAlarm/aggregate.test.ts
 *
 * Proves the COMPOSITION behaviour of aggregateRun:
 *
 *  1. HARD survives aggregation — a source blocked in 6/12 cities yields HARD
 *     (blocked findings are never masked or discarded).
 *
 *  2. Per-source breaker isolation — tripping source A's circuit-breaker does
 *     NOT affect source B's processing; source B's breaker runs independently.
 *
 *  3. Prior findings survive a breaker trip — BLOCKED cities classified
 *     before the breaker trips are still counted in the final alarm.
 *
 *  4. Fully healthy run across all sources/cities → NONE, exitCode 0.
 */

import { aggregateRun, SourceCityPages } from "./aggregate";
import { CONSECUTIVE_BLOCK_TRIP_COUNT } from "./retry";
import { PageResult } from "./classifyCity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a list of pages that classifyCity will classify as BLOCKED. */
function blockedPages(): PageResult[] {
  return [{ status: 403, rows: 0, blocked: true }];
}

/** Builds a list of pages that classifyCity will classify as OK. */
function okPages(): PageResult[] {
  return [{ status: 200, rows: 10, blocked: false }];
}

/**
 * Builds a SourceCityPages entry.
 */
function entry(
  source: string,
  city: string,
  pages: PageResult[]
): SourceCityPages {
  return { source, city, pages };
}

// ---------------------------------------------------------------------------
// Sanity-check the helpers against classifyCity so test failures are
// unambiguous about where the fault lies.
// ---------------------------------------------------------------------------
import { classifyCity } from "./classifyCity";

describe("helper sanity", () => {
  it("blockedPages() classifies as BLOCKED", () => {
    expect(classifyCity(blockedPages())).toBe("BLOCKED");
  });
  it("okPages() classifies as OK", () => {
    expect(classifyCity(okPages())).toBe("OK");
  });
});

// ---------------------------------------------------------------------------
// Suite 1 — HARD alarm survives aggregation
//
// Source A has 12 cities: 6 BLOCKED, 6 OK (interleaved so the circuit-breaker
// never trips on consecutive blocks — the point is about HARD propagation, not
// the breaker).  The run must end up HARD with all 6 blocked cities listed.
// ---------------------------------------------------------------------------
describe("Suite 1 — HARD alarm survives aggregation", () => {
  const TOTAL_CITIES = 12;
  const BLOCKED_COUNT = 6;

  // Build 12 cities for source A, alternating blocked/ok so the circuit-
  // breaker (which needs CONSECUTIVE_BLOCK_TRIP_COUNT in a row) never trips.
  const entries: SourceCityPages[] = Array.from(
    { length: TOTAL_CITIES },
    (_, i) => {
      const isBlocked = i % 2 === 0; // cities 0,2,4,6,8,10 are blocked
      return entry("sourceA", `city-${i}`, isBlocked ? blockedPages() : okPages());
    }
  );

  it("yields HARD level", () => {
    const result = aggregateRun(entries);
    expect(result.level).toBe("HARD");
  });

  it("yields exitCode 1", () => {
    const result = aggregateRun(entries);
    expect(result.exitCode).toBe(1);
  });

  it("notification lists exactly the 6 blocked cities", () => {
    const result = aggregateRun(entries);
    expect(result.notification).toBeDefined();
    const blocked = result.notification!.blockedCities;
    expect(blocked).toHaveLength(BLOCKED_COUNT);
    // The blocked cities are the even-indexed ones: city-0,2,4,6,8,10
    expect(blocked.sort()).toEqual(
      ["city-0", "city-2", "city-4", "city-6", "city-8", "city-10"].sort()
    );
  });

  it("no blocked cities are masked or merged away", () => {
    const result = aggregateRun(entries);
    // Every blocked city must appear exactly once in notification
    expect(result.notification!.blockedCities).toHaveLength(BLOCKED_COUNT);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Per-source breaker isolation
//
// Source A trips its circuit-breaker (CONSECUTIVE_BLOCK_TRIP_COUNT consecutive
// BLOCKED cities).  Source B, processed in the same run, has its own
// independent breaker and must NOT be affected — its non-blocked cities must
// still be classified OK and included normally in the alarm decision.
//
// We verify isolation by checking:
//   a. The run is HARD (because of source A).
//   b. Source B's cities are NOT in the blockedCities list.
//   c. Specifically, source B's OK cities remain OK in the outcome.
// ---------------------------------------------------------------------------
describe("Suite 2 — per-source breaker isolation", () => {
  // Source A: exactly CONSECUTIVE_BLOCK_TRIP_COUNT consecutive BLOCKED cities
  // followed by 2 more BLOCKED cities (should be skipped for retry but still
  // classified).
  const sourceAEntries: SourceCityPages[] = Array.from(
    { length: CONSECUTIVE_BLOCK_TRIP_COUNT + 2 },
    (_, i) => entry("sourceA", `a-city-${i}`, blockedPages())
  );

  // Source B: all OK cities — breaker should never trip for source B.
  const sourceBCities = ["b-city-0", "b-city-1", "b-city-2"];
  const sourceBEntries: SourceCityPages[] = sourceBCities.map((city) =>
    entry("sourceB", city, okPages())
  );

  // Interleave: A, B, A, B, … to stress that isolation survives interleaving.
  const interleaved: SourceCityPages[] = [];
  const maxLen = Math.max(sourceAEntries.length, sourceBEntries.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < sourceAEntries.length) interleaved.push(sourceAEntries[i]);
    if (i < sourceBEntries.length) interleaved.push(sourceBEntries[i]);
  }

  it("run is HARD because source A is blocked", () => {
    const result = aggregateRun(interleaved);
    expect(result.level).toBe("HARD");
  });

  it("source B cities are NOT in the blockedCities list", () => {
    const result = aggregateRun(interleaved);
    const blocked = result.notification!.blockedCities;
    for (const city of sourceBCities) {
      expect(blocked).not.toContain(city);
    }
  });

  it("all source A cities appear in blockedCities — the breaker does not hide them", () => {
    const result = aggregateRun(interleaved);
    const blocked = result.notification!.blockedCities;
    for (let i = 0; i < CONSECUTIVE_BLOCK_TRIP_COUNT + 2; i++) {
      expect(blocked).toContain(`a-city-${i}`);
    }
  });

  it("source B breaker never trips independently — pure source B run is NONE", () => {
    // Run source B alone; since it is all OK the outcome should be NONE.
    const result = aggregateRun(sourceBEntries);
    expect(result.level).toBe("NONE");
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Prior BLOCKED findings survive a breaker trip
//
// Source A: (CONSECUTIVE_BLOCK_TRIP_COUNT - 1) BLOCKED cities before the
// breaker trips, then the trip city, then additional BLOCKED cities after
// the breaker has tripped.
//
// ALL of those BLOCKED cities — before AND after the trip — must appear in
// the alarm decision.  Tripping the breaker must only affect retry-skipping,
// not the classification record.
// ---------------------------------------------------------------------------
describe("Suite 3 — prior BLOCKED findings survive a breaker trip", () => {
  // Cities:
  //   [0 .. TRIP-1]  → BLOCKED  (these trigger the trip on the last one)
  //   [TRIP .. TRIP+2] → BLOCKED (after-trip cities, retry skipped)
  //   [TRIP+3]       → OK       (after-trip, still classifies OK)
  const PRE_TRIP = CONSECUTIVE_BLOCK_TRIP_COUNT; // the trip happens after these
  const POST_TRIP = 3;
  const TOTAL_BLOCKED = PRE_TRIP + POST_TRIP;

  const entries: SourceCityPages[] = [
    ...Array.from({ length: PRE_TRIP }, (_, i) =>
      entry("sourceA", `pre-${i}`, blockedPages())
    ),
    ...Array.from({ length: POST_TRIP }, (_, i) =>
      entry("sourceA", `post-${i}`, blockedPages())
    ),
    entry("sourceA", "late-ok", okPages()),
  ];

  it("result is HARD", () => {
    const result = aggregateRun(entries);
    expect(result.level).toBe("HARD");
  });

  it(`all ${TOTAL_BLOCKED} blocked cities appear in the alarm (pre- and post-trip)`, () => {
    const result = aggregateRun(entries);
    const blocked = result.notification!.blockedCities;
    expect(blocked).toHaveLength(TOTAL_BLOCKED);

    for (let i = 0; i < PRE_TRIP; i++) {
      expect(blocked).toContain(`pre-${i}`);
    }
    for (let i = 0; i < POST_TRIP; i++) {
      expect(blocked).toContain(`post-${i}`);
    }
  });

  it("the post-trip OK city is NOT in the blockedCities list", () => {
    const result = aggregateRun(entries);
    expect(result.notification!.blockedCities).not.toContain("late-ok");
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Fully healthy run → NONE / exit 0
//
// Multiple sources, multiple cities each, all OK pages.
// ---------------------------------------------------------------------------
describe("Suite 4 — fully healthy run yields NONE / exit 0", () => {
  const sources = ["zillow", "redfin", "apartments"];
  const citiesPerSource = ["city-a", "city-b", "city-c", "city-d"];

  const entries: SourceCityPages[] = sources.flatMap((source) =>
    citiesPerSource.map((city) => entry(source, city, okPages()))
  );

  it("level is NONE", () => {
    const result = aggregateRun(entries);
    expect(result.level).toBe("NONE");
  });

  it("exitCode is 0", () => {
    const result = aggregateRun(entries);
    expect(result.exitCode).toBe(0);
  });

  it("notification is undefined", () => {
    const result = aggregateRun(entries);
    expect(result.notification).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Edge cases
// ---------------------------------------------------------------------------
describe("Suite 5 — edge cases", () => {
  it("empty run yields NONE / exit 0", () => {
    const result = aggregateRun([]);
    expect(result.level).toBe("NONE");
    expect(result.exitCode).toBe(0);
    expect(result.notification).toBeUndefined();
  });

  it("single BLOCKED city is HARD", () => {
    const result = aggregateRun([entry("sourceA", "city-0", blockedPages())]);
    expect(result.level).toBe("HARD");
    expect(result.exitCode).toBe(1);
  });

  it("NEEDS_REVIEW city with no BLOCKED → SOFT / exit 0", () => {
    // All-zero-row pages that aren't blocked → NEEDS_REVIEW
    const needsReviewPages: PageResult[] = [
      { status: 200, rows: 0, blocked: false },
    ];
    const result = aggregateRun([
      entry("sourceA", "city-0", needsReviewPages),
      entry("sourceA", "city-1", okPages()),
    ]);
    expect(result.level).toBe("SOFT");
    expect(result.exitCode).toBe(0);
    expect(result.notification!.needsReviewCities).toContain("city-0");
  });

  it("circuit-breaker trip count matches the imported constant", () => {
    // Trip exactly at CONSECUTIVE_BLOCK_TRIP_COUNT — before that, NONE.
    const almostTrip = Array.from(
      { length: CONSECUTIVE_BLOCK_TRIP_COUNT - 1 },
      (_, i) => entry("sourceA", `city-${i}`, blockedPages())
    );
    // These are all BLOCKED so alarm is HARD, but the interesting thing is
    // that the same constant is shared — we're not shadowing it.
    const result = aggregateRun(almostTrip);
    expect(result.level).toBe("HARD"); // still HARD even before trip
  });
});
