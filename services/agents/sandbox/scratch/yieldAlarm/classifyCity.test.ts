import { classifyCity, PageResult } from "./classifyCity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A clean 200 page with rows. */
const producing = (rows: number): PageResult => ({
  status: 200,
  rows,
  blocked: false,
});

/** A 200 page with no rows and no block flag. */
const empty200: PageResult = { status: 200, rows: 0, blocked: false };

/** A hard-blocked page by HTTP status. */
const blocked403: PageResult = { status: 403, rows: 0, blocked: false };
const blocked429: PageResult = { status: 429, rows: 0, blocked: false };

/** A page where the scraper set the blocked flag (soft-block, may be 200). */
const softBlocked: PageResult = { status: 200, rows: 0, blocked: true };

// ---------------------------------------------------------------------------
// Core four states
// ---------------------------------------------------------------------------

describe("classifyCity — four canonical states", () => {
  // ── OK ────────────────────────────────────────────────────────────────────

  describe("OK", () => {
    it("single page with rows > 0 and not blocked → OK", () => {
      expect(classifyCity([producing(5)])).toBe("OK");
    });

    it("multiple pages all producing, none blocked → OK", () => {
      expect(classifyCity([producing(10), producing(3), producing(1)])).toBe(
        "OK"
      );
    });

    it("mix of producing and empty-200 pages, none blocked → OK", () => {
      // Last page returned no rows but is not blocked; city still has yield.
      expect(classifyCity([producing(7), empty200, producing(2)])).toBe("OK");
    });
  });

  // ── BLOCKED ───────────────────────────────────────────────────────────────

  describe("BLOCKED", () => {
    it("single 403 page → BLOCKED", () => {
      expect(classifyCity([blocked403])).toBe("BLOCKED");
    });

    it("single 429 page → BLOCKED", () => {
      expect(classifyCity([blocked429])).toBe("BLOCKED");
    });

    it("single soft-blocked page (blocked flag) → BLOCKED", () => {
      expect(classifyCity([softBlocked])).toBe("BLOCKED");
    });

    it("multiple pages, all 403 → BLOCKED", () => {
      expect(classifyCity([blocked403, blocked403, blocked403])).toBe(
        "BLOCKED"
      );
    });

    it("mix of 403 and 429 pages → BLOCKED", () => {
      expect(classifyCity([blocked403, blocked429])).toBe("BLOCKED");
    });

    it("mix of hard-blocked and soft-blocked pages → BLOCKED", () => {
      expect(classifyCity([blocked403, softBlocked])).toBe("BLOCKED");
    });
  });

  // ── TRANSIENT ─────────────────────────────────────────────────────────────

  describe("TRANSIENT", () => {
    it("one blocked page and one producing page → TRANSIENT", () => {
      expect(classifyCity([blocked403, producing(4)])).toBe("TRANSIENT");
    });

    it("one 429 page among several producing pages → TRANSIENT", () => {
      expect(classifyCity([producing(10), blocked429, producing(6)])).toBe(
        "TRANSIENT"
      );
    });

    it("soft-blocked page alongside producing page → TRANSIENT", () => {
      expect(classifyCity([softBlocked, producing(3)])).toBe("TRANSIENT");
    });

    it("multiple blocked pages with one producing page → TRANSIENT", () => {
      expect(
        classifyCity([blocked403, blocked429, softBlocked, producing(1)])
      ).toBe("TRANSIENT");
    });
  });

  // ── NEEDS_REVIEW ──────────────────────────────────────────────────────────

  describe("NEEDS_REVIEW", () => {
    it("single 200/rows=0/unblocked page → NEEDS_REVIEW", () => {
      expect(classifyCity([empty200])).toBe("NEEDS_REVIEW");
    });

    it("all pages are 200/rows=0/unblocked → NEEDS_REVIEW", () => {
      expect(classifyCity([empty200, empty200, empty200])).toBe("NEEDS_REVIEW");
    });
  });
});

// ---------------------------------------------------------------------------
// Mandatory edge cases (spec-called-out)
// ---------------------------------------------------------------------------

describe("classifyCity — spec edge cases", () => {
  it(
    "a SINGLE blocked page among producing pages classifies TRANSIENT, not BLOCKED",
    () => {
      // The blocked page is outnumbered; city still has yield on other pages.
      const pages: PageResult[] = [
        producing(8),
        producing(12),
        blocked403,      // ← the single blocked interloper
        producing(3),
      ];
      const result = classifyCity(pages);
      expect(result).toBe("TRANSIENT");
      expect(result).not.toBe("BLOCKED");
    }
  );

  it(
    "all-200-zero-rows classifies NEEDS_REVIEW, not OK",
    () => {
      const pages: PageResult[] = [empty200, empty200];
      const result = classifyCity(pages);
      expect(result).toBe("NEEDS_REVIEW");
      expect(result).not.toBe("OK");
    }
  );

  it(
    "all-200-zero-rows classifies NEEDS_REVIEW, not BLOCKED",
    () => {
      const pages: PageResult[] = [empty200, empty200];
      const result = classifyCity(pages);
      expect(result).toBe("NEEDS_REVIEW");
      expect(result).not.toBe("BLOCKED");
    }
  );
});

// ---------------------------------------------------------------------------
// Status-code boundary checks (403 and 429 are both treated as blocked)
// ---------------------------------------------------------------------------

describe("classifyCity — status-code boundaries", () => {
  it("status 200 with rows > 0 and not blocked → OK (not mistaken for block)", () => {
    expect(classifyCity([{ status: 200, rows: 5, blocked: false }])).toBe("OK");
  });

  it("status 403 with rows > 0 is still counted as blocked → BLOCKED (rows ignored)", () => {
    // Adversarial: rows field is non-zero but the page is blocked.
    expect(classifyCity([{ status: 403, rows: 99, blocked: false }])).toBe(
      "BLOCKED"
    );
  });

  it("status 429 with rows > 0 is still counted as blocked → BLOCKED (rows ignored)", () => {
    expect(classifyCity([{ status: 429, rows: 99, blocked: false }])).toBe(
      "BLOCKED"
    );
  });

  it("soft-blocked with rows > 0 drives TRANSIENT when another page also produces", () => {
    // Two pages: one soft-blocked-but-has-rows and one clean producing page.
    expect(
      classifyCity([
        { status: 200, rows: 5, blocked: true },
        producing(10),
      ])
    ).toBe("TRANSIENT");
  });
});

// ---------------------------------------------------------------------------
// Empty-input guard
// ---------------------------------------------------------------------------

describe("classifyCity — empty input", () => {
  it("empty pages array → NEEDS_REVIEW (conservative fallback)", () => {
    expect(classifyCity([])).toBe("NEEDS_REVIEW");
  });
});
