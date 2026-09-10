import { clamp } from "./clamp";

describe("clamp", () => {
  describe("value in range", () => {
    it("returns the value unchanged when it is between min and max", () => {
      expect(clamp(5, 1, 10)).toBe(5);
    });

    it("returns the value unchanged when it equals min (lower boundary)", () => {
      expect(clamp(1, 1, 10)).toBe(1);
    });

    it("returns the value unchanged when it equals max (upper boundary)", () => {
      expect(clamp(10, 1, 10)).toBe(10);
    });
  });

  describe("value below min", () => {
    it("returns min when value is less than min", () => {
      expect(clamp(-5, 0, 100)).toBe(0);
    });

    it("returns min when value is far below min", () => {
      expect(clamp(-1000, 50, 200)).toBe(50);
    });
  });

  describe("value above max", () => {
    it("returns max when value is greater than max", () => {
      expect(clamp(150, 0, 100)).toBe(100);
    });

    it("returns max when value is far above max", () => {
      expect(clamp(9999, 0, 50)).toBe(50);
    });
  });

  describe("invalid range (min > max)", () => {
    it("returns null when min is greater than max", () => {
      expect(clamp(5, 10, 1)).toBeNull();
    });

    it("returns null regardless of value when range is invalid", () => {
      expect(clamp(0, 100, -100)).toBeNull();
    });
  });
});
