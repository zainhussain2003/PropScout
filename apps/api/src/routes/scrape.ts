/**
 * POST /scrape
 * Accepts a Realtor.ca URL, calls the Python scraper service, runs the
 * province gate, writes listing + pending analysis to Supabase, and
 * returns a token. The token is what the frontend uses for all subsequent
 * calls to POST /analysis and GET /analysis/:token.
 */

import { randomUUID } from 'crypto'
import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import type { Listing, ListingType, PropertyType } from '../types/property'
import { isOntarioPostalCode } from '../constants/provinces'
import { RENT_BOUNDS } from '../constants/thresholds'
import { saveListing, createPendingAnalysis } from '../services/supabaseService'

const SCRAPER_URL = process.env.SCRAPER_URL ?? 'http://localhost:8001'

// FSA first letter → province abbreviation (Ontario handled separately via isOntarioPostalCode)
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
  X: 'NT',
  Y: 'YT',
}

// Scraper response shape — dataclasses.asdict() of Python ScrapedListing (snake_case JSON)
interface ScrapedListingResponse {
  url: string
  address: string
  price: number
  beds: number
  baths: number
  sqft: number | null
  property_type: string
  annual_taxes: number | null
  taxes_known: boolean
  condo_fee_monthly: number | null
  condo_fee_known: boolean
  year_built: number | null
  year_built_known: boolean
  listing_type: string // 'for_sale' | 'for_rent'
  listing_description: string | null
  photo_urls: string[]
  days_on_market: number | null
  raw: Record<string, unknown>
}

function mapPropertyType(raw: string): PropertyType {
  const lower = raw.toLowerCase()
  if (lower.includes('town') || lower.includes('row')) return 'townhouse'
  if (lower.includes('semi')) return 'semi-detached'
  if (lower.includes('detach')) return 'detached'
  // Realtor.ca uses "Single Family" for detached houses. Map to 'detached'.
  if (lower.includes('single family') || lower.includes('house')) return 'detached'
  if (lower.includes('multiplex') || lower.includes('duplex') || lower.includes('triplex'))
    return 'multiplex'
  if (lower.includes('commercial')) return 'commercial'
  if (lower.includes('condo') || lower.includes('apartment')) return 'condo'
  // Unknown — default to 'detached' rather than 'condo' since the latter triggers
  // the synthetic condo_fee_unknown flag (often a false positive). Detached is the
  // more common Ontario type and doesn't carry a fee assumption.
  return 'detached'
}

function extractCity(address: string): string {
  // Realtor.ca format: "Street, City, Province PostalCode"
  const parts = address.split(',')
  if (parts.length >= 3) return parts[parts.length - 2].trim()
  if (parts.length === 2) return parts[0].trim()
  return ''
}

async function scrapeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: { url: string } }>('/', async (req, reply) => {
    try {
      const { url } = req.body

      // Step 1 — call the Python scraper
      let scraperRes: Response
      try {
        scraperRes = await fetch(`${SCRAPER_URL}/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
      } catch (err) {
        fastify.log.error({ err }, 'Scraper service unreachable')
        return reply
          .code(503)
          .send(
            makeError(
              'SCRAPER_UNAVAILABLE',
              'Analysis service temporarily unavailable — try again in a moment.'
            )
          )
      }

      if (scraperRes.status === 422) {
        return reply
          .code(422)
          .send(
            makeError('SCRAPER_FAILED', 'Could not read that listing — enter details manually.')
          )
      }

      if (!scraperRes.ok) {
        fastify.log.error({ status: scraperRes.status }, 'Scraper returned unexpected error')
        return reply
          .code(503)
          .send(
            makeError(
              'SCRAPER_UNAVAILABLE',
              'Analysis service temporarily unavailable — try again in a moment.'
            )
          )
      }

      const scraped = (await scraperRes.json()) as ScrapedListingResponse

      // Step 2 — extract postal code and run province gate
      const pcMatch = scraped.address.match(/([A-Z][0-9][A-Z])\s*([0-9][A-Z][0-9])/i)
      if (!pcMatch) {
        return reply
          .code(422)
          .send(
            makeError('POSTAL_CODE_NOT_FOUND', 'Could not determine province from this listing.')
          )
      }

      const postalCode = (pcMatch[1] + pcMatch[2]).toUpperCase()
      const fsa = postalCode.charAt(0)

      if (!isOntarioPostalCode(postalCode)) {
        const province = FSA_PROVINCE_MAP[fsa] ?? 'UNKNOWN'
        return reply.code(200).send({ error: 'PROVINCE_NOT_SUPPORTED', province })
      }

      // Step 3 — detect partial scrape failure
      const listingType: ListingType = scraped.listing_type === 'for_rent' ? 'for-rent' : 'for-sale'

      // A for-rent price outside plausible monthly-rent bounds is a scrape/unit
      // error ($29 or $290,000/mo), not a real rent — null it and route the user
      // to manual entry rather than scoring garbage downstream.
      const rentMonthly =
        listingType === 'for-rent' &&
        scraped.price >= RENT_BOUNDS.MIN_MONTHLY &&
        scraped.price <= RENT_BOUNDS.MAX_MONTHLY
          ? scraped.price
          : null

      const missingFields: string[] = []
      if (scraped.sqft == null) missingFields.push('sqft')
      if (!scraped.taxes_known) missingFields.push('annual_taxes')
      if (!scraped.year_built_known) missingFields.push('year_built')
      if (listingType === 'for-rent' && rentMonthly === null) missingFields.push('rent_monthly')
      const scraperFailed = missingFields.length > 0

      // Step 4 — map scraper output to Listing type
      const listing: Omit<Listing, 'id'> = {
        url: scraped.url,
        listingType,
        address: scraped.address,
        city: extractCity(scraped.address),
        province: 'ON',
        postalCode,
        price: listingType === 'for-sale' ? scraped.price : null,
        rentMonthly,
        beds: scraped.beds,
        baths: scraped.baths,
        sqft: scraped.sqft,
        propertyType: mapPropertyType(scraped.property_type),
        yearBuilt: scraped.year_built,
        parkingSpots: 0,
        condoFeeMonthly: scraped.condo_fee_monthly,
        condoFeeKnown: scraped.condo_fee_known,
        annualTaxes: scraped.annual_taxes,
        description: scraped.listing_description,
        photos: scraped.photo_urls,
        scrapedAt: new Date().toISOString(),
      }

      // Step 5 — write to Supabase
      const listingId = await saveListing(listing, 'realtor_ca')
      const token = randomUUID()
      await createPendingAnalysis(listingId, token)

      // Step 6 — return response
      if (scraperFailed) {
        return reply.send({ token, listing, scraperFailed: true, missingFields })
      }
      return reply.send({ token, listing })
    } catch (err) {
      fastify.log.error({ err }, 'Unexpected error in POST /scrape')
      return reply.code(500).send(makeError('INTERNAL_ERROR', 'Something went wrong — try again.'))
    }
  })
}

export default scrapeRoutes
