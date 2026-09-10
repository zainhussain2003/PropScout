/**
 * Returns true when value is within the inclusive range [min, max],
 * false when it is outside.
 *
 * NOTE: behaviour for invalid ranges (min > max) is intentionally
 * unspecified and not implemented here.
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
