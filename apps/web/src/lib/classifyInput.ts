/**
 * classifyInput — decide whether what someone typed is a listing link or an address.
 *
 * ## Why
 *
 * The product accepted exactly one thing: a Realtor.ca URL. That works if you are
 * already on Realtor.ca with the tab open, and is a dead end otherwise — someone
 * who saw a sign on a lawn, got the address in a text, or is standing outside the
 * building has nothing to paste. Making them go and find a link first is the
 * single most likely place to lose them.
 *
 * So the one input now takes either. This decides which, before anything is sent,
 * so the person gets a useful message instead of "that doesn't look like a valid
 * URL" for an address they typed perfectly.
 *
 * ## Deliberately not a search box
 *
 * This does NOT search listings. One input, one property, one verdict — the
 * moment we let people browse we are competing with HouseSigma and Realtor.ca at
 * what they already do well. An address identifies a specific property; it does
 * not open a catalogue.
 */

export type InputKind = 'url' | 'address' | 'empty' | 'unusable'

export interface InputClassification {
  kind: InputKind
  /** The cleaned value to send onward. */
  value: string
  /** User-facing reason, only when kind is 'unusable'. */
  message?: string
}

/** Anything with a scheme or a bare domain is being offered as a link. */
const LOOKS_LIKE_URL = /^(https?:\/\/|www\.)|\.(ca|com|org|net)(\/|$)/i

/**
 * Shortest plausible Canadian address, e.g. "1 Bay St" is 8 characters.
 * Kept low deliberately: the server has the authoritative answer, and rejecting
 * a real address here would be worse than passing a doubtful one along.
 */
const MIN_ADDRESS_LENGTH = 6

/** A street address effectively always starts with, or contains, a number. */
const HAS_A_NUMBER = /\d/

/**
 * Classify raw input from the single hero field.
 *
 * @param raw - exactly what the person typed or pasted.
 * @returns which kind of input it is, the cleaned value, and a reason when unusable.
 */
export function classifyInput(raw: string): InputClassification {
  const value = (raw ?? '').trim()

  if (value === '') {
    return { kind: 'empty', value }
  }

  if (LOOKS_LIKE_URL.test(value)) {
    return { kind: 'url', value }
  }

  if (value.length < MIN_ADDRESS_LENGTH) {
    return {
      kind: 'unusable',
      value,
      message: 'Add a bit more — a street number and name, or a listing link.',
    }
  }

  if (!HAS_A_NUMBER.test(value)) {
    // "Sheppard Avenue West" is a street, not an address. Without a number the
    // geocoder returns a road centroid, and a report pinned to the middle of a
    // road is confidently wrong rather than usefully vague.
    return {
      kind: 'unusable',
      value,
      message: 'Include the street number too — like 701 Sheppard Ave W, Toronto.',
    }
  }

  return { kind: 'address', value }
}
