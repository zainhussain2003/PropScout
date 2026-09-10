import { inRange } from "./inRange";

describe("inRange", () => {
  // ── Requirement (1): returns true when value is within [min, max] ──────────

  it("returns true for a value strictly between min and max", () => {
    expect(inRange(5, 1, 10)).toBe(true);
  });

  it("returns true when value equals min (inclusive lower bound)", () => {
    expect(inRange(1, 1, 10)).toBe(true);
  });

  it("returns true when value equals max (inclusive upper bound)", () => {
    expect(inRange(10, 1, 10)).toBe(true);
  });

  it("returns true when min === max and value equals both", () => {
    expect(inRange(7, 7, 7)).toBe(true);
  });

  // ── Requirement (2): returns false when value is outside [min, max] ────────

  it("returns false when value is below min", () => {
    expect(inRange(0, 1, 10)).toBe(false);
  });

  it("returns false when value is above max", () => {
    expect(inRange(11, 1, 10)).toBe(false);
  });

  it("returns false for a large negative value", () => {
    expect(inRange(-100, -10, -1)).toBe(false);
  });

  it("returns false for a large positive value beyond max", () => {
    expect(inRange(1000, 0, 999)).toBe(false);
  });
});
