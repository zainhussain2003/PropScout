/**
 * Clamps `value` to the inclusive range [min, max].
 *
 * @returns The bounded value, or null if the range is invalid (min > max).
 */
export function clamp(value: number, min: number, max: number): number | null {
  if (min > max) {
    return null;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
