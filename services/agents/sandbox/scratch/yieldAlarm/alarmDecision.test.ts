/**
 * alarmDecision.test.ts
 *
 * Jest suite for decideAlarm.
 *
 * Covers every case mandated by the spec:
 *  1. Any BLOCKED city  → HARD, non-zero exit code
 *  2. NEEDS_REVIEW without BLOCKED → SOFT, exit 0
 *  3. All OK / TRANSIENT → NONE, exit 0, no notification
 *  4. 6 BLOCKED + 6 OK cities → HARD (healthy cities never mask blocked ones)
 *  5. Summary correctly lists blocked and needs-review cities
 */

import { decideAlarm, CityResult } from "./alarmDecision";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function city(
  citySlug: string,
  classification: CityResult["classification"],
  source = "test-source"
): CityResult {
  return { source, city: citySlug, classification };
}

// ---------------------------------------------------------------------------
// 1. Any BLOCKED → HARD, non-zero exit code
// ---------------------------------------------------------------------------

describe("any BLOCKED city → HARD alarm", () => {
  test("single BLOCKED city produces HARD with exitCode 1", () => {
    const result = decideAlarm([city("austin-tx", "BLOCKED")]);

    expect(result.level).toBe("HARD");
    expect(result.exitCode).not.toBe(0);
    expect(result.exitCode).toBe(1);
    expect(result.notification).toBeDefined();
  });

  test("BLOCKED mixed with OK still produces HARD with exitCode 1", () => {
    const results: CityResult[] = [
      city("austin-tx", "BLOCKED"),
      city("dallas-tx", "OK"),
      city("houston-tx", "TRANSIENT"),
    ];
    const result = decideAlarm(results);

    expect(result.level).toBe("HARD");
    expect(result.exitCode).not.toBe(0);
    expect(result.exitCode).toBe(1);
  });

  test("BLOCKED mixed with NEEDS_REVIEW still produces HARD (BLOCKED wins)", () => {
    const results: CityResult[] = [
      city("austin-tx", "BLOCKED"),
      city("seattle-wa", "NEEDS_REVIEW"),
    ];
    const result = decideAlarm(results);

    expect(result.level).toBe("HARD");
    expect(result.exitCode).not.toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. NEEDS_REVIEW without BLOCKED → SOFT, exit 0
// ---------------------------------------------------------------------------

describe("NEEDS_REVIEW (no BLOCKED) → SOFT alarm", () => {
  test("single NEEDS_REVIEW city produces SOFT with exitCode 0", () => {
    const result = decideAlarm([city("portland-or", "NEEDS_REVIEW")]);

    expect(result.level).toBe("SOFT");
    expect(result.exitCode).toBe(0);
    expect(result.notification).toBeDefined();
  });

  test("NEEDS_REVIEW mixed with OK and TRANSIENT still produces SOFT", () => {
    const results: CityResult[] = [
      city("portland-or", "NEEDS_REVIEW"),
      city("denver-co", "OK"),
      city("miami-fl", "TRANSIENT"),
    ];
    const result = decideAlarm(results);

    expect(result.level).toBe("SOFT");
    expect(result.exitCode).toBe(0);
    expect(result.notification).toBeDefined();
  });

  test("multiple NEEDS_REVIEW cities produce SOFT with exitCode 0", () => {
    const results: CityResult[] = [
      city("city-a", "NEEDS_REVIEW"),
      city("city-b", "NEEDS_REVIEW"),
    ];
    const result = decideAlarm(results);

    expect(result.level).toBe("SOFT");
    expect(result.exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. All OK / TRANSIENT → NONE, exit 0, no notification
// ---------------------------------------------------------------------------

describe("all OK or TRANSIENT → NONE, no alarm", () => {
  test("all OK cities produce NONE with exitCode 0 and no notification", () => {
    const results: CityResult[] = [
      city("chicago-il", "OK"),
      city("boston-ma", "OK"),
    ];
    const result = decideAlarm(results);

    expect(result.level).toBe("NONE");
    expect(result.exitCode).toBe(0);
    expect(result.notification).toBeUndefined();
  });

  test("all TRANSIENT cities produce NONE with exitCode 0 and no notification", () => {
    const result = decideAlarm([city("phoenix-az", "TRANSIENT")]);

    expect(result.level).toBe("NONE");
    expect(result.exitCode).toBe(0);
    expect(result.notification).toBeUndefined();
  });

  test("mixed OK and TRANSIENT produce NONE", () => {
    const results: CityResult[] = [
      city("chicago-il", "OK"),
      city("phoenix-az", "TRANSIENT"),
      city("boston-ma", "OK"),
    ];
    const result = decideAlarm(results);

    expect(result.level).toBe("NONE");
    expect(result.exitCode).toBe(0);
    expect(result.notification).toBeUndefined();
  });

  test("empty result set produces NONE (no cities ran)", () => {
    const result = decideAlarm([]);

    expect(result.level).toBe("NONE");
    expect(result.exitCode).toBe(0);
    expect(result.notification).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Critical masking case: 6 BLOCKED + 6 OK → still HARD
// ---------------------------------------------------------------------------

describe("masking: 6 BLOCKED + 6 OK cities → HARD, not masked", () => {
  const blockedSlugs = [
    "blocked-city-1",
    "blocked-city-2",
    "blocked-city-3",
    "blocked-city-4",
    "blocked-city-5",
    "blocked-city-6",
  ] as const;

  const okSlugs = [
    "ok-city-1",
    "ok-city-2",
    "ok-city-3",
    "ok-city-4",
    "ok-city-5",
    "ok-city-6",
  ] as const;

  const results: CityResult[] = [
    ...blockedSlugs.map((s) => city(s, "BLOCKED")),
    ...okSlugs.map((s) => city(s, "OK")),
  ];

  test("level is HARD", () => {
    expect(decideAlarm(results).level).toBe("HARD");
  });

  test("exitCode is non-zero (1)", () => {
    const { exitCode } = decideAlarm(results);
    expect(exitCode).not.toBe(0);
    expect(exitCode).toBe(1);
  });

  test("notification is present", () => {
    expect(decideAlarm(results).notification).toBeDefined();
  });

  test("all 6 blocked cities appear in notification.blockedCities", () => {
    const { notification } = decideAlarm(results);
    expect(notification).toBeDefined();
    expect(notification!.blockedCities).toHaveLength(6);
    for (const slug of blockedSlugs) {
      expect(notification!.blockedCities).toContain(slug);
    }
  });

  test("no OK city bleeds into blockedCities or needsReviewCities", () => {
    const { notification } = decideAlarm(results);
    for (const slug of okSlugs) {
      expect(notification!.blockedCities).not.toContain(slug);
      expect(notification!.needsReviewCities).not.toContain(slug);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Summary contents — blocked and needs-review cities are listed correctly
// ---------------------------------------------------------------------------

describe("notification summary lists cities correctly", () => {
  test("HARD summary lists blocked cities and omits OK/TRANSIENT cities", () => {
    const results: CityResult[] = [
      city("austin-tx", "BLOCKED"),
      city("seattle-wa", "BLOCKED"),
      city("denver-co", "OK"),
      city("miami-fl", "TRANSIENT"),
    ];
    const { notification } = decideAlarm(results);

    expect(notification).toBeDefined();
    expect(notification!.blockedCities).toEqual(["austin-tx", "seattle-wa"]);
    expect(notification!.needsReviewCities).toEqual([]);
  });

  test("HARD summary includes NEEDS_REVIEW cities alongside BLOCKED cities", () => {
    const results: CityResult[] = [
      city("austin-tx", "BLOCKED"),
      city("portland-or", "NEEDS_REVIEW"),
      city("denver-co", "OK"),
    ];
    const { notification } = decideAlarm(results);

    expect(notification).toBeDefined();
    expect(notification!.blockedCities).toEqual(["austin-tx"]);
    expect(notification!.needsReviewCities).toEqual(["portland-or"]);
  });

  test("SOFT summary has empty blockedCities and lists NEEDS_REVIEW cities", () => {
    const results: CityResult[] = [
      city("portland-or", "NEEDS_REVIEW"),
      city("nashville-tn", "NEEDS_REVIEW"),
      city("denver-co", "OK"),
    ];
    const { notification } = decideAlarm(results);

    expect(notification).toBeDefined();
    expect(notification!.blockedCities).toEqual([]);
    // sorted alphabetically
    expect(notification!.needsReviewCities).toEqual([
      "nashville-tn",
      "portland-or",
    ]);
  });

  test("blockedCities list is sorted alphabetically for deterministic output", () => {
    const results: CityResult[] = [
      city("z-city", "BLOCKED"),
      city("a-city", "BLOCKED"),
      city("m-city", "BLOCKED"),
    ];
    const { notification } = decideAlarm(results);

    expect(notification!.blockedCities).toEqual(["a-city", "m-city", "z-city"]);
  });

  test("needsReviewCities list is sorted alphabetically for deterministic output", () => {
    const results: CityResult[] = [
      city("z-review", "NEEDS_REVIEW"),
      city("a-review", "NEEDS_REVIEW"),
    ];
    const { notification } = decideAlarm(results);

    expect(notification!.needsReviewCities).toEqual(["a-review", "z-review"]);
  });

  test("same city BLOCKED across multiple sources appears once in summary", () => {
    // The same city slug can come from different sources; de-duplication is
    // by city slug, not by (source, city) pair.
    const results: CityResult[] = [
      { source: "zillow", city: "austin-tx", classification: "BLOCKED" },
      { source: "redfin", city: "austin-tx", classification: "BLOCKED" },
    ];
    const { notification } = decideAlarm(results);

    expect(notification!.blockedCities).toEqual(["austin-tx"]);
    expect(notification!.blockedCities).toHaveLength(1);
  });
});
