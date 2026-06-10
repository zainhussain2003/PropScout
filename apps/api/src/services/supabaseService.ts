import crypto from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Analysis, ReportMode } from '../types/analysis'
import type { Listing } from '../types/property'

// Lazy singleton — only created on first DB call so tests can import
// this module without needing SUPABASE_URL set at load time.
// Explicit generic args match what createClient(url, key) infers by default.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = SupabaseClient<any, 'public', any>

let _db: DbClient | null = null

function db(): DbClient {
  if (_db == null) {
    _db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) as DbClient
  }
  return _db
}

// ── Internal DB row types ─────────────────────────────────────────────────────

interface ListingRow {
  id: string
  source_url: string
  source: string
  listing_type: string
  address: string
  postal_code: string | null
  province: string | null
  price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  property_type: string | null
  annual_taxes: number | null
  taxes_known: boolean
  condo_fee_monthly: number | null
  condo_fee_known: boolean
  year_built: number | null
  year_built_known: boolean
  listing_description: string | null
  photo_urls: string[] | null
  days_on_market: number | null
  scraped_at: string
}

interface AnalysisRow {
  id: string
  user_id: string | null
  listing_id: string | null
  report_mode: string
  financing_params: unknown
  rental_estimate: unknown
  market_data: unknown
  calculated_metrics: unknown
  deal_score: number | null
  risk_flags: unknown
  ai_narrative: string | null
  pdf_url: string | null
  share_token: string | null
  share_expires_at: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Map a Listing object to the listings table row shape.
 */
function listingToRow(listing: Listing): Omit<ListingRow, 'id' | 'scraped_at'> {
  return {
    source_url: listing.url,
    source: 'manual' as const,
    listing_type: listing.listingType === 'for-sale' ? 'for_sale' : 'for_rent',
    address: listing.address,
    postal_code: listing.postalCode ?? null,
    province: listing.province ?? null,
    price: listing.price ?? null,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft ?? null,
    property_type: listing.propertyType ?? null,
    annual_taxes: listing.annualTaxes ?? null,
    taxes_known: listing.annualTaxes != null,
    condo_fee_monthly: listing.condoFeeMonthly ?? null,
    condo_fee_known: listing.condoFeeKnown,
    year_built: listing.yearBuilt ?? null,
    year_built_known: listing.yearBuilt != null,
    listing_description: listing.description ?? null,
    photo_urls: listing.photos.length > 0 ? listing.photos : null,
    days_on_market: null,
  }
}

/**
 * Map a ListingRow back to a Listing object.
 */
function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    url: row.source_url,
    listingType: row.listing_type === 'for_sale' ? 'for-sale' : 'for-rent',
    address: row.address,
    city: '',
    province: (row.province ?? 'ON') as Listing['province'],
    postalCode: row.postal_code ?? '',
    price: row.price,
    rentMonthly: null,
    beds: row.beds ?? 0,
    baths: row.baths ?? 0,
    sqft: row.sqft,
    propertyType: (row.property_type ?? 'condo') as Listing['propertyType'],
    yearBuilt: row.year_built,
    parkingSpots: 0,
    condoFeeMonthly: row.condo_fee_monthly,
    condoFeeKnown: row.condo_fee_known,
    annualTaxes: row.annual_taxes,
    description: row.listing_description,
    photos: (row.photo_urls as string[] | null) ?? [],
    scrapedAt: row.scraped_at,
  }
}

/**
 * Map an AnalysisRow + ListingRow back to an Analysis object.
 */
function rowToAnalysis(row: AnalysisRow): Analysis {
  const metrics = row.calculated_metrics as Analysis['metrics']
  const dealScore = (row.market_data as { dealScore?: Analysis['dealScore'] } | null)
    ?.dealScore ?? null
  const riskFlags = Array.isArray(row.risk_flags)
    ? (row.risk_flags as Analysis['riskFlags'])
    : []
  const rentalEstimate = row.rental_estimate as Analysis['rentalComps']

  // report_mode in DB uses 'investment', frontend uses 'investor'
  const modeMap: Record<string, ReportMode> = {
    investment: 'investor',
    personal: 'personal',
    tenant: 'tenant',
    landlord: 'landlord',
  }

  return {
    id: row.id,
    token: row.share_token ?? '',
    mode: modeMap[row.report_mode] ?? 'investor',
    createdAt: row.created_at,
    metrics,
    dealScore,
    rentalComps: rentalEstimate,
    riskFlags,
    narrative: row.ai_narrative,
    hasSanityWarnings: false,
  }
}

// ── Percentile helper ─────────────────────────────────────────────────────────

/**
 * Calculate the Nth percentile of a sorted numeric array.
 * Array must be sorted ascending before calling.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]!
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]!
  const fraction = idx - lower
  return sorted[lower]! + fraction * (sorted[upper]! - sorted[lower]!)
}

/**
 * Remove outliers using the 1.5× IQR rule.
 */
function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = percentile(sorted, 25)
  const q3 = percentile(sorted, 75)
  const iqr = q3 - q1
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr
  return sorted.filter((v) => v >= lower && v <= upper)
}

// ── saveAnalysis ──────────────────────────────────────────────────────────────

/**
 * Save a completed analysis to the database.
 *
 * Returns the generated share token on success, or null on failure.
 * NEVER throws — errors are logged and the analysis still returns to the frontend.
 */
export async function saveAnalysis(
  analysis: Analysis,
  listing: Listing,
  userId: string | null
): Promise<string | null> {
  try {
    const token = crypto.randomBytes(16).toString('hex')

    // 1. Upsert the listing row (conflict on source_url)
    const listingPayload = listingToRow(listing)
    const { data: listingData, error: listingError } = await db()
      .from('listings')
      .upsert(listingPayload, { onConflict: 'source_url' })
      .select('id')
      .single()

    if (listingError != null) {
      console.error('[supabaseService] saveAnalysis: listing upsert failed', listingError)
      return null
    }

    const listingId: string = (listingData as { id: string }).id

    // Guests get a 30-day expiry; authenticated users get no expiry.
    const expiresAt =
      userId == null
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null

    // Map frontend mode ('investor') to DB enum ('investment')
    const modeMap: Record<ReportMode, string> = {
      investor: 'investment',
      personal: 'personal',
      tenant: 'tenant',
      landlord: 'landlord',
    }

    const analysisPayload = {
      user_id: userId,
      listing_id: listingId,
      report_mode: modeMap[analysis.mode],
      financing_params: null,
      rental_estimate: analysis.rentalComps ?? null,
      market_data: { dealScore: analysis.dealScore },
      calculated_metrics: analysis.metrics ?? null,
      deal_score: analysis.dealScore?.total ?? null,
      risk_flags: analysis.riskFlags,
      ai_narrative: analysis.narrative,
      share_token: token,
      share_expires_at: expiresAt,
    }

    const { error: analysisError } = await db()
      .from('analyses')
      .insert(analysisPayload)

    if (analysisError != null) {
      console.error('[supabaseService] saveAnalysis: analysis insert failed', analysisError)
      return null
    }

    return token
  } catch (err) {
    console.error('[supabaseService] saveAnalysis: unexpected error', err)
    return null
  }
}

// ── getAnalysisByToken ────────────────────────────────────────────────────────

/**
 * Fetch a saved analysis by its share token.
 *
 * Returns null if not found, expired, or on DB error.
 */
export async function getAnalysisByToken(
  token: string
): Promise<{ analysis: Analysis; listing: Listing } | null> {
  try {
    const { data, error } = await db()
      .from('analyses')
      .select('*, listings(*)')
      .eq('share_token', token)
      .single()

    if (error != null || data == null) {
      return null
    }

    const row = data as AnalysisRow & { listings: ListingRow | null }

    // Check expiry
    if (row.share_expires_at != null) {
      if (new Date(row.share_expires_at) < new Date()) {
        return null
      }
    }

    if (row.listings == null) {
      return null
    }

    return {
      analysis: rowToAnalysis(row),
      listing: rowToListing(row.listings),
    }
  } catch (err) {
    console.error('[supabaseService] getAnalysisByToken: unexpected error', err)
    return null
  }
}

// ── fetchRentalComps ──────────────────────────────────────────────────────────

/**
 * Fetch rental comp statistics from rental_listings for a given FSA and bed count.
 *
 * FSA match: first 3 chars of postalCode (e.g. "L4K" from "L4K5W4").
 * Bed filter: exact match; falls back to ±1 if fewer than 3 exact results.
 * Date window: last 90 days; extends to 180 days if fewer than 3 results.
 * Outliers removed via 1.5× IQR rule.
 * Percentiles: 25th (low), 50th (mid), 75th (high).
 * Confidence: 8+ → high, 3–7 → medium, 1–2 → low, 0 → null.
 *
 * Returns null if 0 comps found after all fallback attempts.
 */
export async function fetchRentalComps(
  postalCode: string,
  beds: number | null
): Promise<{
  low: number
  mid: number
  high: number
  compCount: number
  confidence: 'low' | 'medium' | 'high'
} | null> {
  const fsa = postalCode.trim().toUpperCase().slice(0, 3)
  const now = new Date()

  const windowDays = [90, 180] as const
  const bedFilters: Array<{ exact: boolean }> = [{ exact: true }, { exact: false }]

  for (const days of windowDays) {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

    for (const { exact } of bedFilters) {
      let query = db()
        .from('rental_listings')
        .select('rent_monthly')
        .gte('scraped_at', cutoff)
        .ilike('postal_code', `${fsa}%`)

      if (beds != null) {
        if (exact) {
          query = query.eq('beds', beds)
        } else {
          query = query.gte('beds', beds - 1).lte('beds', beds + 1)
        }
      }

      const { data, error } = await query

      if (error != null) {
        console.error('[supabaseService] fetchRentalComps: query error', error)
        return null
      }

      const rents = (data as Array<{ rent_monthly: number }>)
        .map((r) => r.rent_monthly)
        .filter((v) => v > 0)

      if (rents.length < 3) {
        // Try next fallback (wider beds or wider date window)
        continue
      }

      const cleaned = removeOutliers(rents)

      if (cleaned.length === 0) {
        continue
      }

      const sorted = [...cleaned].sort((a, b) => a - b)
      const low = Math.round(percentile(sorted, 25))
      const mid = Math.round(percentile(sorted, 50))
      const high = Math.round(percentile(sorted, 75))
      const compCount = cleaned.length

      let confidence: 'low' | 'medium' | 'high'
      if (compCount >= 8) {
        confidence = 'high'
      } else if (compCount >= 3) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }

      return { low, mid, high, compCount, confidence }
    }
  }

  // 0 comps found after all fallbacks
  return null
}

// ── logSanityFailure ──────────────────────────────────────────────────────────

/**
 * Log a sanity check failure for review.
 * Never silently return wrong numbers — log first, then return with warning flag.
 */
export async function logSanityFailure(
  address: string,
  failures: string[]
): Promise<void> {
  const { error } = await db()
    .from('sanity_failures')
    .insert({ address, failures, logged_at: new Date().toISOString() })

  if (error) {
    // Don't throw — sanity logging must never crash the analysis pipeline
    console.error('Failed to log sanity failure:', error)
  }
}

export { db as getSupabase }
