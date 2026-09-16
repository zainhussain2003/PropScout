/**
 * Dwelling type for rental comps (D-117).
 *
 * The comps table has no dwelling-type column: rows came in on postal area,
 * bedrooms and rent alone, so a three-bedroom house was priced off
 * three-bedroom apartments in the same FSA and the band was called "high
 * confidence". Each source does carry the type, just not in a column:
 *
 *   rentals.ca   raw_json.listingType  "residential:house:town-house" …
 *   kijiji       the category in the URL (/v-apartments-condos/, /v-house-rental/,
 *                /v-room-rental-roommate/) and the words in the title, which the
 *                scraper stores as the front of `address`
 *   padmapper    /buildings/ — apartment buildings
 *
 * This module reads the type back out of what is stored, decides what the
 * subject needs from its listing's propertyType, and gives each pair a
 * factor: 1 for the same type, a reduced factor for a near one, 0 for a
 * comp that is not evidence for this subject at all (an apartment for a
 * house; a room or a basement for any whole unit). Pure and synchronous.
 */

import { COMP_WEIGHTS } from '../constants/thresholds'
import type { PropertyType } from '../types/property'

export type CompUnitType =
  | 'apartment'
  | 'house'
  | 'townhouse'
  /** A floor of a house let on its own — main floor, upper unit. */
  | 'house-unit'
  | 'basement'
  | 'room'
  | 'unknown'

/** What a subject can be matched as; null when its listing did not say. */
export type SubjectUnitType = 'apartment' | 'house' | 'townhouse'

/** The columns the classifier reads (a subset of the rental_listings row). */
export interface UnitTypeSource {
  source?: string | null
  source_url?: string | null
  /** The scraper stores the listing title at the front of the address. */
  address?: string | null
  raw_json?: unknown
}

// Words checked in order: a "basement in a house" is a basement, a "room in
// a condo" is a room. Whole-word matches so "bathroom" is not a room and
// "townhouse" is not a house.
const ROOM_RE = /\b(room|rooms|roommate|roommates|shared)\b/i
// "(not a basement)" is a common aside on ground-floor ads.
const BASEMENT_RE = /\b(?<!not an? )(?<!no )(basement|bsmt|lower[- ]level|walk[- ]?out)\b/i
const TOWNHOUSE_RE = /\b(townhouse|townhome|town[- ]house|row[- ]?house|stacked)\b/i
const HOUSE_UNIT_RE =
  /\b(main[- ]floor|upper[- ]level|upper[- ]floor|upper[- ]unit|lower[- ]unit|(?:apt|apartment|unit)\s+in\s+(?:a\s+)?house)\b/i
const HOUSE_RE = /\b(house|detached|bungalow|duplex|triplex|fourplex|cottage)\b/i
const APARTMENT_RE =
  /\b(condo|condos|condominium|apartment|apt|suite|studio|bachelor|penthouse|loft)\b/i

function fromText(text: string): CompUnitType | null {
  if (ROOM_RE.test(text)) return 'room'
  if (BASEMENT_RE.test(text)) return 'basement'
  if (HOUSE_UNIT_RE.test(text)) return 'house-unit'
  if (TOWNHOUSE_RE.test(text)) return 'townhouse'
  if (HOUSE_RE.test(text)) return 'house'
  if (APARTMENT_RE.test(text)) return 'apartment'
  return null
}

/** rentals.ca `listingType` is `residential:<family>:<kind>`. */
function fromRentalsCa(listingType: string): CompUnitType | null {
  const [, family, kind] = listingType.toLowerCase().split(':')
  if (family === 'room') return 'room'
  if (family === 'apartment' || family === 'condo') return 'apartment'
  if (family === 'house') {
    if (kind == null) return 'house'
    if (kind === 'basement') return 'basement'
    if (kind === 'main-floor') return 'house-unit'
    if (kind.startsWith('town-house')) return 'townhouse'
    return 'house'
  }
  return null
}

/** Kijiji's category is the first path segment of the ad URL. */
function fromKijijiUrl(url: string): CompUnitType | null {
  if (url.includes('/v-room-rental-roommate/')) return 'room'
  if (url.includes('/v-house-rental/')) return 'house'
  if (url.includes('/v-apartments-condos/')) return 'apartment'
  return null
}

/**
 * The dwelling type of a stored comp, from the structured field where the
 * source gave one, then the words in the title, then the source's category.
 * The category is the weakest signal — Kijiji's "apartments & condos" holds
 * basement and room ads too — so the title is read before it.
 */
export function classifyCompUnitType(row: UnitTypeSource): CompUnitType {
  const raw = row.raw_json
  if (raw != null && typeof raw === 'object' && 'listingType' in raw) {
    const lt = (raw as { listingType?: unknown }).listingType
    if (typeof lt === 'string') {
      const t = fromRentalsCa(lt)
      if (t != null) return t
    }
  }

  const url = row.source_url ?? ''
  const fromTitle = fromText(row.address ?? '')
  if (fromTitle != null) return fromTitle

  if (row.source === 'kijiji' || url.includes('kijiji.ca')) {
    return fromKijijiUrl(url) ?? 'unknown'
  }
  if (row.source === 'padmapper' || url.includes('padmapper.com')) {
    return url.includes('/buildings/') ? 'apartment' : 'unknown'
  }
  return 'unknown'
}

/**
 * What the subject's listing type asks of a comp. A condo rents against
 * apartments; a detached or semi against houses; a townhouse against
 * townhouses. Multiplex, commercial and unknown give no type to match, so
 * every whole-unit comp counts as it did before D-117.
 */
export function subjectUnitType(
  propertyType: PropertyType | null | undefined
): SubjectUnitType | null {
  switch (propertyType) {
    case 'condo':
      return 'apartment'
    case 'detached':
    case 'semi-detached':
      return 'house'
    case 'townhouse':
      return 'townhouse'
    default:
      return null
  }
}

/**
 * The weight factor for a comp's type against the subject's: 1 same, a
 * reduced factor for a near type, 0 when the comp is not evidence for this
 * subject. A room is never a whole-unit comp; a basement is not one for any
 * subject that stated its type; a floor of a house is near an apartment or a
 * townhouse and no evidence for a whole house.
 */
export function unitTypeFactor(subject: SubjectUnitType | null, comp: CompUnitType): number {
  if (comp === 'room') return 0
  if (subject == null) return 1
  if (comp === 'basement') return 0
  if (comp === 'unknown') return COMP_WEIGHTS.UNIT_TYPE_UNKNOWN
  if (comp === subject) return 1
  // A floor of a house rents like an apartment more than like the house.
  if (comp === 'house-unit') return subject === 'house' ? 0 : COMP_WEIGHTS.UNIT_TYPE_NEAR
  // Near pairs: a townhouse sits between an apartment and a house and is
  // partial evidence for either; either is partial evidence for a townhouse.
  if (subject === 'townhouse' || comp === 'townhouse') return COMP_WEIGHTS.UNIT_TYPE_NEAR
  // apartment ↔ house: a different rental market.
  return 0
}

/** Reader-facing label for a comp's type. */
export const UNIT_TYPE_LABEL: Record<CompUnitType, string> = {
  apartment: 'Apartment',
  house: 'House',
  townhouse: 'Townhouse',
  'house-unit': 'Unit in house',
  basement: 'Basement',
  room: 'Room',
  unknown: '—',
}
