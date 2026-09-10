/**
 * normalizePostalCode
 *
 * Accepts any Ontario (or broader Canadian) postal-code string in common
 * user-entered formats and returns the canonical 6-character uppercase
 * no-space form (e.g. "L4H0A1").
 *
 * Returns null when the input does not match the Canadian postal-code pattern
 * after whitespace is stripped:
 *   - Format : <letter> <digit> <letter> <digit> <letter> <digit>
 *   - Ontario FSAs begin with L, K, M, N, or P (validated here).
 *
 * Ontario FSA letters: K, L, M, N, P
 * ref: https://en.wikipedia.org/wiki/Postal_codes_in_Canada#Table_of_all_postal_codes
 */

const ONTARIO_FSA_LETTERS = new Set(["K", "L", "M", "N", "P"]);

// Matches the 6 significant characters of a Canadian postal code,
// optionally separated by a single space or hyphen in the middle.
const CANADIAN_POSTAL_CODE_RE =
  /^([A-Za-z])(\d)([A-Za-z])\s?-?(\d)([A-Za-z])(\d)$/;

export function normalizePostalCode(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(CANADIAN_POSTAL_CODE_RE);

  if (!match) {
    return null;
  }

  // Rebuild the canonical form (uppercase, no space).
  const normalized = (match[1] + match[2] + match[3] + match[4] + match[5] + match[6]).toUpperCase();

  // Validate the FSA (first letter) is an Ontario prefix.
  const fsa = normalized[0];
  if (!ONTARIO_FSA_LETTERS.has(fsa)) {
    return null;
  }

  return normalized;
}
