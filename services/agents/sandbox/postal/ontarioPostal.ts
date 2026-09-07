/**
 * ontarioPostal.ts
 * Utilities for normalising and classifying Ontario (Canada) postal codes.
 */

/**
 * Normalises a raw Canadian postal code string into the canonical
 * "ANA NAN" format (upper-case, single space in the middle).
 *
 * Examples:
 *   normalizePostalCode("m5v2t6")   → "M5V 2T6"
 *   normalizePostalCode("m5v 2t6")  → "M5V 2T6"
 *   normalizePostalCode("M5V2T6")   → "M5V 2T6"
 *
 * @param raw - Raw postal code string, with or without interior space.
 * @returns   Normalised postal code in "ANA NAN" format.
 * @throws    {Error} If the sanitised input is not exactly 6 alphanumeric characters.
 */
export function normalizePostalCode(raw: string): string {
  // Strip all whitespace and upper-case.
  const sanitised: string = raw.replace(/\s+/g, "").toUpperCase();

  if (sanitised.length !== 6) {
    throw new Error(
      `Invalid postal code "${raw}": expected 6 alphanumeric characters after stripping spaces, got ${sanitised.length}.`
    );
  }

  // Insert the canonical single space after the FSA (first 3 chars).
  return `${sanitised.slice(0, 3)} ${sanitised.slice(3)}`;
}

/**
 * Returns `true` when the postal code's Forward Sortation Area (FSA)
 * begins with one of the letters assigned to Ontario: K, L, M, N, or P.
 *
 * The function accepts both normalised ("M5V 2T6") and raw ("m5v2t6") input;
 * it inspects only the very first character.
 *
 * Ontario FSA prefix letters:
 *   K — Eastern Ontario
 *   L — Central Ontario
 *   M — Metropolitan Toronto
 *   N — Southwestern Ontario
 *   P — Northern Ontario
 *
 * @param postal - Postal code string (raw or normalised).
 * @returns `true` if the first letter is an Ontario FSA prefix, `false` otherwise.
 */
export function isOntarioFSA(postal: string): boolean {
  const ONTARIO_PREFIXES = new Set<string>(["K", "L", "M", "N", "P"]);
  const firstLetter: string = postal.trim().charAt(0).toUpperCase();
  return ONTARIO_PREFIXES.has(firstLetter);
}
