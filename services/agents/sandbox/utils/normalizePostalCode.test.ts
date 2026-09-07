import { normalizePostalCode } from "./normalizePostalCode";

describe("normalizePostalCode", () => {
  // ── Valid inputs ──────────────────────────────────────────────────────────

  it("normalizes a lowercase spaced Ontario postal code", () => {
    expect(normalizePostalCode("l4h 0a1")).toBe("L4H0A1");
  });

  it("normalizes an uppercase spaced postal code", () => {
    expect(normalizePostalCode("M5V 3A8")).toBe("M5V3A8");
  });

  it("normalizes a postal code with no space already", () => {
    expect(normalizePostalCode("K1A0B1")).toBe("K1A0B1");
  });

  it("normalizes a mixed-case postal code with leading/trailing whitespace", () => {
    expect(normalizePostalCode("  n2l 6r2  ")).toBe("N2L6R2");
  });

  it("normalizes a postal code with a hyphen separator", () => {
    expect(normalizePostalCode("P3A-5K2")).toBe("P3A5K2");
  });

  it("handles all valid Ontario FSA prefixes (K, L, M, N, P)", () => {
    expect(normalizePostalCode("K0A 0A0")).toBe("K0A0A0");
    expect(normalizePostalCode("L0A 0A0")).toBe("L0A0A0");
    expect(normalizePostalCode("M0A 0A0")).toBe("M0A0A0");
    expect(normalizePostalCode("N0A 0A0")).toBe("N0A0A0");
    expect(normalizePostalCode("P0A 0A0")).toBe("P0A0A0");
  });

  // ── Invalid inputs ────────────────────────────────────────────────────────

  it("returns null for an empty string", () => {
    expect(normalizePostalCode("")).toBeNull();
  });

  it("returns null for a non-Ontario Canadian postal code (BC prefix V)", () => {
    expect(normalizePostalCode("V6B 2W9")).toBeNull();
  });

  it("returns null for a non-Ontario Canadian postal code (AB prefix T)", () => {
    expect(normalizePostalCode("T2P 1J9")).toBeNull();
  });

  it("returns null for a US ZIP code", () => {
    expect(normalizePostalCode("10001")).toBeNull();
  });

  it("returns null for a string that is too short", () => {
    expect(normalizePostalCode("L4H 0A")).toBeNull();
  });

  it("returns null for a string that is too long", () => {
    expect(normalizePostalCode("L4H 0A1X")).toBeNull();
  });

  it("returns null for wrong character order (digit first)", () => {
    expect(normalizePostalCode("4LH 0A1")).toBeNull();
  });

  it("returns null for a completely random string", () => {
    expect(normalizePostalCode("not-a-code")).toBeNull();
  });
});
