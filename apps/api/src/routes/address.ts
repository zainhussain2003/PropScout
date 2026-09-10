/**
 * POST /address — start an analysis from a street address instead of a listing URL.
 *
 * ## Why this exists
 *
 * The product's one input was a Realtor.ca link. That is fine for someone already
 * on Realtor.ca with the tab open, and a dead end for everyone else: a person who
 * knows the address, saw a sign on a lawn, got it in a text, or is standing
 * outside the building had nothing to paste. They would either give up or paste
 * something that fails validation, which reads as the product being broken.
 *
 * ## What it can and cannot do
 *
 * An address gives us **location**, not a listing. Everything location-derived
 * works immediately — SunScout with real building obstruction, walk and transit
 * scores, schools, census income and population growth, rental comps for the FSA.
 * The price-dependent half — cap rate, cash flow, DSCR, deal score — needs the
 * asking price, which no address lookup can supply.
 *
 * So this endpoint does the part it can do honestly: geocode, gate on province,
 * and hand back a normalised address with coordinates. The client then asks for
 * the handful of numbers only the user has. It never guesses a price.
 *
 * Responses:
 *   200 { ok: true, address, postalCode, city, coordinates }
 *   200 { ok: false, error: 'PROVINCE_NOT_SUPPORTED', province }  — waitlist path
 *   422 ADDRESS_NOT_FOUND     — geocoder had no confident match
 *   422 POSTAL_CODE_NOT_FOUND — matched, but not precisely enough to score
 */

import type { FastifyInstance } from 'fastify'

import { randomUUID } from 'crypto'

import { geocodeAddress } from '../services/mapboxService'
import { saveListing, createPendingAnalysis } from '../services/supabaseService'
import type { Listing, ListingType } from '../types/property'
import { isOntarioPostalCode } from '../constants/provinces'
import { makeError } from '../types/api'

/** FSA first letter → province, for telling a non-Ontario user where they are. */
const FSA_PROVINCE_MAP: Record<string, string> = {
  A: 'NL',
  B: 'NS',
  C: 'PE',
  E: 'NB',
  G: 'QC',
  H: 'QC',
  J: 'QC',
  R: 'MB',
  S: 'SK',
  T: 'AB',
  V: 'BC',
  X: 'NT/NU',
  Y: 'YT',
}

/** Shortest input that could plausibly be a Canadian street address. */
const MIN_ADDRESS_LENGTH = 6

/**
 * Minimum Mapbox relevance to accept a match.
 *
 * Mapbox always returns its best guess, however poor. "asdfghjkl" scores 0.66 and
 * resolves confidently to a real street in Ingleside, Ontario — which would
 * produce a complete, plausible-looking report about a place the user never
 * typed. Real addresses score 1.0, so the gap is wide and 0.9 sits safely in it.
 */
const MIN_RELEVANCE = 0.9

/**
 * Leading unit designator, e.g. "229 - 701 Sheppard", "Unit 4-12 King", "#802-5 Bay".
 *
 * Mapbox reads "229-701 Sheppard Ave W" as street number 229 and returns a
 * different building (M2N 1N2) from the real one (M3H 0B2), with full confidence.
 * Stripping the unit first yields the correct match — and the unit itself is
 * worth keeping, because SunScout infers the floor from it.
 */
const UNIT_PREFIX = /^\s*(?:unit\s*|suite\s*|apt\.?\s*|#)?([0-9]+[A-Za-z]?)\s*[-–—]\s*(?=[0-9])/i

/**
 * Split a leading unit number off an address.
 *
 * @param raw - address as typed
 * @returns the unit (or null) and the address with the unit removed
 */
export function splitUnitPrefix(raw: string): { unit: string | null; street: string } {
  const match = raw.match(UNIT_PREFIX)
  if (!match) return { unit: null, street: raw.trim() }
  return { unit: match[1], street: raw.slice(match[0].length).trim() }
}

interface AddressBody {
  address?: string
}

/**
 * The handful of facts an address cannot supply.
 *
 * Everything location-derived (SunScout, walk/transit, schools, census, rental
 * comps) comes from the coordinates. Price does not exist in any address lookup,
 * and guessing it would fabricate the number the whole report turns on — so it is
 * asked for, not inferred.
 */
interface StartBody {
  address?: string
  postalCode?: string
  city?: string
  lat?: number
  lng?: number
  listingType?: ListingType
  price?: number | null
  rentMonthly?: number | null
  beds?: number
  baths?: number
  sqft?: number | null
  propertyType?: string
  condoFeeMonthly?: number | null
  annualTaxes?: number | null
}

async function addressRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: AddressBody }>('/', async (req, reply) => {
    const raw = (req.body?.address ?? '').trim()

    if (raw.length < MIN_ADDRESS_LENGTH) {
      return reply
        .code(422)
        .send(
          makeError(
            'ADDRESS_TOO_SHORT',
            'That looks too short to be an address — try including the street number and city.'
          )
        )
    }

    // Strip any leading unit designator before geocoding — see UNIT_PREFIX.
    const { unit, street } = splitUnitPrefix(raw)

    // Geocode exactly what was typed, restricted to Canada by the service.
    // An earlier version appended ", Ontario, Canada" to bias the match; that
    // was worse in both directions. It manufactured confident matches for
    // nonsense ("qwertyuiop zxcvbn" resolved to a street in Ingleside), and it
    // made out-of-province addresses unfindable — a Vancouver address returned
    // "we couldn't find that" instead of reaching the BC waitlist gate below.
    const query = street

    let geo: Awaited<ReturnType<typeof geocodeAddress>>
    try {
      geo = await geocodeAddress(query)
    } catch (err) {
      fastify.log.error({ err }, 'Geocoding failed for address input')
      return reply
        .code(503)
        .send(
          makeError(
            'GEOCODER_UNAVAILABLE',
            'Address lookup is temporarily unavailable — try again in a moment.'
          )
        )
    }

    if (!geo) {
      return reply
        .code(422)
        .send(
          makeError(
            'ADDRESS_NOT_FOUND',
            "We couldn't find that address. Check the spelling, or add the city and postal code."
          )
        )
    }

    if (geo.relevance < MIN_RELEVANCE) {
      // A weak match is worse than no match: it produces a real report about the
      // wrong place, and nothing on the page would look wrong.
      return reply
        .code(422)
        .send(
          makeError(
            'ADDRESS_NOT_FOUND',
            "We couldn't find that address. Check the spelling, or add the city and postal code."
          )
        )
    }

    const postalCode = (geo.postalCode ?? '').replace(/\s+/g, '').toUpperCase()
    if (postalCode.length < 6) {
      // A match without a full postal code is a street or neighbourhood centroid,
      // not a building. Scoring it would attach real numbers to the wrong place.
      return reply
        .code(422)
        .send(
          makeError(
            'POSTAL_CODE_NOT_FOUND',
            'We found that street but not the specific address — add the unit or postal code.'
          )
        )
    }

    if (!isOntarioPostalCode(postalCode)) {
      const province = FSA_PROVINCE_MAP[postalCode.charAt(0)] ?? 'UNKNOWN'
      // 200, not an error: this is a supported outcome with its own screen
      // (the province waitlist), matching how POST /scrape reports it.
      return reply.send({ ok: false, error: 'PROVINCE_NOT_SUPPORTED', province })
    }

    return reply.send({
      ok: true,
      // Re-attach the unit so the report shows the address the user actually
      // typed, and SunScout can infer the floor from it.
      address: unit ? `${unit} - ${geo.formattedAddress}` : (geo.formattedAddress ?? raw),
      unit,
      postalCode,
      city: geo.city ?? '',
      coordinates: { lat: geo.lat, lng: geo.lng },
    })
  })

  /**
   * POST /address/start — create an analysis from a confirmed address plus the
   * details the user supplied.
   *
   * Mirrors what POST /scrape does after a successful scrape: persist a listing,
   * open a pending analysis, hand back a share token. The difference is only
   * where the facts came from — a person rather than a listing page — so the
   * whole downstream pipeline is unchanged.
   */
  fastify.post<{ Body: StartBody }>('/start', async (req, reply) => {
    const b = req.body ?? {}

    if (!b.address || typeof b.lat !== 'number' || typeof b.lng !== 'number' || !b.postalCode) {
      return reply
        .code(400)
        .send(makeError('MISSING_LOCATION', 'Look the address up again before continuing.'))
    }

    if (!isOntarioPostalCode(b.postalCode)) {
      return reply
        .code(422)
        .send(makeError('PROVINCE_NOT_SUPPORTED', 'PropScout covers Ontario for now.'))
    }

    const listingType: ListingType = b.listingType === 'for-rent' ? 'for-rent' : 'for-sale'
    const price = listingType === 'for-sale' ? (b.price ?? null) : null
    const rentMonthly = listingType === 'for-rent' ? (b.rentMonthly ?? null) : null

    if (listingType === 'for-sale' && (price === null || price <= 0)) {
      return reply
        .code(422)
        .send(makeError('PRICE_REQUIRED', 'Enter the asking price so we can run the numbers.'))
    }
    if (listingType === 'for-rent' && (rentMonthly === null || rentMonthly <= 0)) {
      return reply
        .code(422)
        .send(makeError('RENT_REQUIRED', 'Enter the monthly rent so we can run the numbers.'))
    }

    const listing: Omit<Listing, 'id'> = {
      // No source URL: this listing came from a person, not a page. Recording a
      // fake one would make it indistinguishable from a scraped listing later.
      url: '',
      listingType,
      address: b.address,
      city: b.city ?? '',
      province: 'ON',
      postalCode: b.postalCode,
      price,
      rentMonthly,
      beds: b.beds ?? 0,
      baths: b.baths ?? 0,
      sqft: b.sqft ?? null,
      propertyType: (b.propertyType as Listing['propertyType']) ?? 'condo',
      yearBuilt: null,
      parkingSpots: 0,
      condoFeeMonthly: b.condoFeeMonthly ?? null,
      condoFeeKnown: b.condoFeeMonthly != null,
      annualTaxes: b.annualTaxes ?? null,
      description: null,
      photos: [],
      scrapedAt: new Date().toISOString(),
    }

    try {
      const listingId = await saveListing(listing, 'manual')
      const token = randomUUID()
      await createPendingAnalysis(listingId, token)
      return reply.send({ token, listing })
    } catch (err) {
      fastify.log.error({ err }, 'Failed to start analysis from address')
      return reply
        .code(500)
        .send(makeError('INTERNAL_ERROR', 'Something went wrong — please try again.'))
    }
  })
}

export default addressRoutes
