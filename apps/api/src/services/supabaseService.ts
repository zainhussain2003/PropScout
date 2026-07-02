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
  city: string | null
  postal_code: string | null
  province: string | null
  price: number | null
  rent_monthly: number | null
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
  parking_spots: number | null
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
 * `source` defaults to 'manual' for non-scraper paths; scrape.ts passes 'realtor_ca'.
 */
function listingToRow(
  listing: Listing,
  source: 'manual' | 'realtor_ca' | 'zillow_ca' = 'manual'
): Omit<ListingRow, 'id' | 'scraped_at'> {
  return {
    source_url: listing.url,
    source,
    listing_type: listing.listingType === 'for-sale' ? 'for_sale' : 'for_rent',
    address: listing.address,
    city: listing.city || null,
    postal_code: listing.postalCode ?? null,
    province: listing.province ?? null,
    price: listing.price ?? null,
    rent_monthly: listing.rentMonthly ?? null,
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
    parking_spots: listing.parkingSpots ?? null,
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
    city: row.city ?? '',
    province: (row.province ?? 'ON') as Listing['province'],
    postalCode: row.postal_code ?? '',
    price: row.price,
    rentMonthly: row.rent_monthly,
    beds: row.beds ?? 0,
    baths: row.baths ?? 0,
    sqft: row.sqft,
    propertyType: (row.property_type ?? 'detached') as Listing['propertyType'],
    yearBuilt: row.year_built,
    parkingSpots: row.parking_spots ?? 0,
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
  const marketData = row.market_data as {
    dealScore?: Analysis['dealScore']
    sunScout?: Analysis['sunScout']
    walkScore?: Analysis['walkScore']
    coordinates?: Analysis['coordinates']
    hasSanityWarnings?: boolean
  } | null
  const dealScore = marketData?.dealScore ?? null
  const riskFlags = Array.isArray(row.risk_flags) ? (row.risk_flags as Analysis['riskFlags']) : []
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
    hasSanityWarnings: marketData?.hasSanityWarnings ?? false,
    walkScore: marketData?.walkScore ?? null,
    neighbourhood: null,
    sunScout: marketData?.sunScout ?? null,
    coordinates: marketData?.coordinates ?? null,
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
      userId == null ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null

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
      market_data: {
        dealScore: analysis.dealScore,
        sunScout: analysis.sunScout,
        walkScore: analysis.walkScore,
        coordinates: analysis.coordinates ?? null,
        hasSanityWarnings: analysis.hasSanityWarnings,
      },
      calculated_metrics: analysis.metrics ?? null,
      deal_score: analysis.dealScore?.total ?? null,
      risk_flags: analysis.riskFlags,
      ai_narrative: analysis.narrative,
      share_token: token,
      share_expires_at: expiresAt,
    }

    const { error: analysisError } = await db().from('analyses').insert(analysisPayload)

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
export async function logSanityFailure(address: string, failures: string[]): Promise<void> {
  const { error } = await db()
    .from('sanity_failures')
    .insert({ address, failures, logged_at: new Date().toISOString() })

  if (error) {
    // Don't throw — sanity logging must never crash the analysis pipeline
    console.error('Failed to log sanity failure:', error)
  }
}

// ── User management (called by billing routes and webhooks) ───────────────────

export interface UserRow {
  id: string
  email: string
  tier: 'free' | 'pro' | 'professional' | 'team'
  stripe_customer_id: string | null
  created_at: string
}

/**
 * Fetch a user row by Supabase user ID.
 * Returns null if not found.
 */
export async function getUserById(userId: string): Promise<UserRow | null> {
  const { data, error } = await db().from('users').select('*').eq('id', userId).maybeSingle()
  if (error) {
    console.error('getUserById error:', error)
    return null
  }
  return (data as UserRow | null) ?? null
}

/**
 * Upsert a user row when a new Supabase auth user signs up.
 * Safe to call multiple times — on conflict does nothing.
 */
export async function upsertUser(userId: string, email: string): Promise<void> {
  const { error } = await db()
    .from('users')
    .upsert({ id: userId, email, tier: 'free' }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) {
    console.error('upsertUser error:', error)
  }
}

/**
 * Update a user's tier and Stripe customer ID after a successful subscription.
 */
export async function updateUserTier(
  userId: string,
  tier: 'free' | 'pro' | 'professional' | 'team',
  stripeCustomerId?: string
): Promise<void> {
  const patch: Partial<UserRow> = { tier }
  if (stripeCustomerId) patch.stripe_customer_id = stripeCustomerId

  const { error } = await db().from('users').update(patch).eq('id', userId)
  if (error) {
    console.error('updateUserTier error:', error)
  }
}

/**
 * Upsert a subscription row after a Stripe checkout.completed event.
 */
export async function upsertSubscription(
  userId: string,
  tier: 'pro' | 'professional' | 'team',
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: Date | null
): Promise<void> {
  const { error } = await db()
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        tier,
        stripe_subscription_id: stripeSubscriptionId,
        status,
        current_period_end: currentPeriodEnd?.toISOString() ?? null,
      },
      { onConflict: 'stripe_subscription_id' }
    )
  if (error) {
    console.error('upsertSubscription error:', error)
  }
}

/**
 * Update subscription status (e.g., when cancelled or past_due).
 * Also downgrades the user's tier to 'free' when the subscription is cancelled.
 */
export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: Date | null
): Promise<void> {
  const { data, error } = await db()
    .from('subscriptions')
    .update({
      status,
      current_period_end: currentPeriodEnd?.toISOString() ?? null,
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .select('user_id')
    .maybeSingle()

  if (error) {
    console.error('updateSubscriptionStatus error:', error)
    return
  }

  if (status === 'canceled' && data) {
    const row = data as { user_id: string }
    await updateUserTier(row.user_id, 'free')
  }
}

/**
 * Count how many analyses the given user has run in the current calendar month.
 * Used to enforce the free tier limit of 10 analyses/month.
 * Returns 0 on error so the analysis is allowed through (fail-open).
 */
export async function getMonthlyAnalysisCount(userId: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await db()
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())

  if (error) {
    console.error('[supabaseService] getMonthlyAnalysisCount error:', error)
    return 0
  }

  return count ?? 0
}

export async function addToWaitlist(email: string, province: string): Promise<void> {
  const { error } = await db()
    .from('waitlist')
    .upsert({ email, province }, { onConflict: 'email,province' })
  if (error) {
    console.error('[supabaseService] addToWaitlist error:', error)
  }
}

// ── flag_overrides ───────────────────────────────────────────────────────────
//
// A row in flag_overrides means "the user has dismissed this risk flag for
// this analysis." The report UI reads these (GET /analysis/:token/overrides)
// and restores each dismissed flag's deduction to the deal score live; the
// stored deal_score stays the raw baseline.

/**
 * Look up the analysis row id for a share token.
 * Internal helper for the flag_overrides functions.
 */
async function getAnalysisIdByToken(token: string): Promise<string | null> {
  const { data, error } = await db()
    .from('analyses')
    .select('id')
    .eq('share_token', token)
    .maybeSingle()

  if (error != null || data == null) return null
  return (data as { id: string }).id
}

/**
 * Return the set of flag_ids the user has dismissed for this analysis.
 */
export async function getFlagOverrides(token: string): Promise<string[]> {
  const analysisId = await getAnalysisIdByToken(token)
  if (analysisId == null) return []

  const { data, error } = await db()
    .from('flag_overrides')
    .select('flag_id')
    .eq('analysis_id', analysisId)

  if (error != null || data == null) {
    console.error('[supabaseService] getFlagOverrides error:', error)
    return []
  }

  return (data as Array<{ flag_id: string }>).map((r) => r.flag_id)
}

/**
 * Mark a flag as dismissed by the user for this analysis.
 * Idempotent — re-adding the same override is a no-op.
 */
export async function addFlagOverride(token: string, flagId: string): Promise<boolean> {
  const analysisId = await getAnalysisIdByToken(token)
  if (analysisId == null) return false

  const { error } = await db().from('flag_overrides').insert({
    analysis_id: analysisId,
    flag_id: flagId,
    user_override: true,
  })

  // 23505 = unique_violation; treat as success (idempotent)
  if (error != null && error.code !== '23505') {
    console.error('[supabaseService] addFlagOverride error:', error)
    return false
  }

  return true
}

/**
 * Remove a previously-set override (un-dismiss the flag).
 */
export async function deleteFlagOverride(token: string, flagId: string): Promise<boolean> {
  const analysisId = await getAnalysisIdByToken(token)
  if (analysisId == null) return false

  const { error } = await db()
    .from('flag_overrides')
    .delete()
    .eq('analysis_id', analysisId)
    .eq('flag_id', flagId)

  if (error != null) {
    console.error('[supabaseService] deleteFlagOverride error:', error)
    return false
  }

  return true
}

// ── HEAD route-wiring helpers ────────────────────────────────────────────────
//
// These functions support the scrape → token → analyze flow added on
// feat/route-wiring. They live alongside the origin saveAnalysis (which
// generates a fresh token) and the share_token-based getAnalysisByToken.
//
//   POST /scrape    → saveListing + createPendingAnalysis
//   GET  /analysis/:token → getAnalysisStatus + getAnalysisByToken
//   POST /analysis  → getListingByToken + (run pipeline) + updateAnalysisStatus

/**
 * Upsert a listing by source_url and return its id.
 * Used by POST /scrape to persist the scraped listing before analysis.
 *
 * @param source distinguishes Realtor.ca scraper from manual entry — controls
 *   the `source` column for downstream filtering (analytics, debugging).
 */
export async function saveListing(
  listing: Omit<Listing, 'id'>,
  source: 'manual' | 'realtor_ca' | 'zillow_ca' = 'manual'
): Promise<string> {
  const payload = listingToRow(listing as Listing, source)
  const { data, error } = await db()
    .from('listings')
    .upsert(payload, { onConflict: 'source_url' })
    .select('id')
    .single()

  if (error != null || data == null) {
    throw new Error(`saveListing failed: ${error?.message ?? 'no data returned'}`)
  }

  return (data as { id: string }).id
}

/**
 * Insert a pending analysis row with just the listing_id and share_token.
 * The analyze pipeline fills in the remaining fields later.
 */
export async function createPendingAnalysis(listingId: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await db().from('analyses').insert({
    listing_id: listingId,
    report_mode: 'investment', // default; updated when POST /analysis runs
    share_token: token,
    share_expires_at: expiresAt,
  })
  if (error != null) {
    throw new Error(`createPendingAnalysis failed: ${error.message}`)
  }
}

/**
 * Fetch a listing by its share token (via the analyses join).
 * Returns null if no analyses row exists for that token.
 */
export async function getListingByToken(token: string): Promise<Listing | null> {
  const { data, error } = await db()
    .from('analyses')
    .select('listings(*)')
    .eq('share_token', token)
    .maybeSingle()

  if (error != null || data == null) {
    return null
  }

  const listings = (data as { listings: ListingRow | ListingRow[] | null }).listings
  const row = Array.isArray(listings) ? (listings[0] ?? null) : listings
  if (row == null) return null
  return rowToListing(row)
}

/**
 * Current state of an analysis row. Computed from row state:
 *   - row missing         → null
 *   - calculated_metrics  → 'complete'
 *   - otherwise           → 'pending'
 *
 * 'processing' / 'failed' are not persisted in origin's schema today;
 * callers tolerate them resolving to 'pending'.
 */
export async function getAnalysisStatus(
  token: string
): Promise<'pending' | 'processing' | 'complete' | 'failed' | null> {
  const { data, error } = await db()
    .from('analyses')
    .select('calculated_metrics')
    .eq('share_token', token)
    .maybeSingle()

  if (error != null) return null
  if (data == null) return null

  const metrics = (data as { calculated_metrics: unknown }).calculated_metrics
  return metrics == null ? 'pending' : 'complete'
}

/**
 * No-op in the merged schema — status is computed on read rather than stored.
 * Kept as an export so HEAD's orchestrator continues to compile.
 */
export async function updateAnalysisStatus(
  _token: string,
  _status: 'pending' | 'processing' | 'complete' | 'failed'
): Promise<void> {
  // Intentionally a no-op — see getAnalysisStatus.
}

/**
 * Update an existing analyses row (created by createPendingAnalysis) with the
 * completed pipeline output. Matches by share_token so the token from
 * POST /scrape is preserved end-to-end.
 */
export async function updateAnalysisByToken(token: string, analysis: Analysis): Promise<void> {
  const modeMap: Record<ReportMode, string> = {
    investor: 'investment',
    personal: 'personal',
    tenant: 'tenant',
    landlord: 'landlord',
  }

  const { error } = await db()
    .from('analyses')
    .update({
      report_mode: modeMap[analysis.mode],
      rental_estimate: analysis.rentalComps ?? null,
      market_data: {
        dealScore: analysis.dealScore,
        sunScout: analysis.sunScout,
        walkScore: analysis.walkScore,
        coordinates: analysis.coordinates ?? null,
        hasSanityWarnings: analysis.hasSanityWarnings,
      },
      calculated_metrics: analysis.metrics ?? null,
      deal_score: analysis.dealScore?.total ?? null,
      risk_flags: analysis.riskFlags,
      ai_narrative: analysis.narrative,
    })
    .eq('share_token', token)

  if (error != null) {
    throw new Error(`updateAnalysisByToken failed: ${error.message}`)
  }
}

export { db as getSupabase }
