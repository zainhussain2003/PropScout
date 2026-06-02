/* eslint-disable no-console */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Analysis } from '../types/analysis'
import type { Listing, ListingType, PropertyType } from '../types/property'

// Use SERVICE_ROLE_KEY server-side only — never expose to frontend.
// Lazy-init avoids creating the client at module load time, which lets
// Jest auto-mocking work without requiring real env vars in tests.
let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }
  return _supabase
}

/**
 * Save a completed analysis to the database.
 * The analyses row was created by createPendingAnalysis — this updates it in place.
 * listing and userId are kept for API compatibility; listing is not re-inserted.
 */
export async function saveAnalysis(
  analysis: Analysis,
  _listing: Listing,
  _userId: string | null
): Promise<void> {
  try {
    const { data, error } = await getSupabase()
      .from('analyses')
      .update({
        analysis: analysis,
        status: 'complete',
        mode: analysis.mode,
      })
      .eq('token', analysis.token)
      .select('id')

    if (error) {
      throw new Error(`saveAnalysis: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error(`saveAnalysis: no row found for token ${analysis.token}`)
    }
  } catch (err) {
    console.error('saveAnalysis failed:', err)
    throw err
  }
}

/**
 * Update the status of an analysis row identified by token.
 */
export async function updateAnalysisStatus(
  token: string,
  status: 'pending' | 'processing' | 'complete' | 'failed'
): Promise<void> {
  try {
    const { data, error } = await getSupabase()
      .from('analyses')
      .update({ status })
      .eq('token', token)
      .select('id')

    if (error) {
      throw new Error(`updateAnalysisStatus: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error(`updateAnalysisStatus: no row found for token ${token}`)
    }
  } catch (err) {
    console.error('updateAnalysisStatus failed:', err)
    throw err
  }
}

/**
 * Fetch the status of an analysis by token.
 * Returns null if not found or expired — caller handles 404/410 distinction.
 */
export async function getAnalysisStatus(
  token: string
): Promise<'pending' | 'processing' | 'complete' | 'failed' | null> {
  try {
    const { data, error } = await getSupabase()
      .from('analyses')
      .select('status, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (error) {
      throw new Error(`getAnalysisStatus: ${error.message}`)
    }

    if (!data) {
      return null
    }

    if (new Date(data.expires_at as string) < new Date()) {
      return null
    }

    return data.status as 'pending' | 'processing' | 'complete' | 'failed'
  } catch (err) {
    console.error('getAnalysisStatus failed:', err)
    throw err
  }
}

// Maps a raw Supabase listings row (snake_case) to the camelCase Listing type.
// Used by both getAnalysisByToken and getListingByToken.
function mapListingRow(row: Record<string, unknown>): Listing {
  return {
    id: row.id as string,
    url: row.url as string,
    listingType: row.listing_type as ListingType,
    address: row.address as string,
    city: row.city as string,
    province: row.province as 'ON',
    postalCode: row.postal_code as string,
    price: row.price as number | null,
    rentMonthly: row.rent_monthly as number | null,
    beds: row.beds as number,
    baths: row.baths as number,
    sqft: row.sqft as number | null,
    propertyType: row.property_type as PropertyType,
    yearBuilt: row.year_built as number | null,
    parkingSpots: row.parking_spots as number,
    condoFeeMonthly: row.condo_fee_monthly as number | null,
    condoFeeKnown: row.condo_fee_known as boolean,
    annualTaxes: row.annual_taxes as number | null,
    description: row.description as string | null,
    photos: row.photos as string[],
    scrapedAt: row.scraped_at as string,
  }
}

/**
 * Fetch an analysis by its share token.
 * Returns null if not found or expired (caller handles 404/410 distinction).
 */
export async function getAnalysisByToken(
  token: string
): Promise<{ analysis: Analysis; listing: Listing } | null> {
  try {
    const { data, error } = await getSupabase()
      .from('analyses')
      .select('analysis, expires_at, listings(*)')
      .eq('token', token)
      .maybeSingle()

    if (error) {
      throw new Error(`getAnalysisByToken: ${error.message}`)
    }

    if (!data) {
      return null
    }

    if (new Date(data.expires_at as string) < new Date()) {
      return null
    }

    return {
      analysis: data.analysis as Analysis,
      listing: mapListingRow(data.listings as Record<string, unknown>),
    }
  } catch (err) {
    console.error('getAnalysisByToken failed:', err)
    throw err
  }
}

/**
 * Log a sanity check failure for review.
 * Never silently return wrong numbers — log first, then return with warning flag.
 */
export async function logSanityFailure(address: string, failures: string[]): Promise<void> {
  const { error } = await getSupabase()
    .from('sanity_failures')
    .insert({ address, failures, logged_at: new Date().toISOString() })

  if (error) {
    // Don't throw — sanity logging must never crash the analysis pipeline
    console.error('Failed to log sanity failure:', error)
  }
}

/**
 * Save a new listing to the database.
 * Returns the generated UUID for the new row.
 */
export async function saveListing(listing: Omit<Listing, 'id'>): Promise<string> {
  try {
    const { data, error } = await getSupabase()
      .from('listings')
      .insert({
        url: listing.url,
        listing_type: listing.listingType,
        address: listing.address,
        city: listing.city,
        province: listing.province,
        postal_code: listing.postalCode,
        price: listing.price,
        rent_monthly: listing.rentMonthly,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft,
        property_type: listing.propertyType,
        year_built: listing.yearBuilt,
        parking_spots: listing.parkingSpots,
        condo_fee_monthly: listing.condoFeeMonthly,
        condo_fee_known: listing.condoFeeKnown,
        annual_taxes: listing.annualTaxes,
        description: listing.description,
        photos: listing.photos,
        scraped_at: listing.scrapedAt,
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`saveListing: ${error.message}`)
    }

    return (data as { id: string }).id
  } catch (err) {
    console.error('saveListing failed:', err)
    throw err
  }
}

/**
 * Create a pending analysis row for a listing.
 * Status starts as 'pending'; mode and user_id are set later when the user selects a mode.
 */
export async function createPendingAnalysis(listingId: string, token: string): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await getSupabase().from('analyses').insert({
      listing_id: listingId,
      token,
      status: 'pending',
      analysis: null,
      expires_at: expiresAt,
    })

    if (error) {
      throw new Error(`createPendingAnalysis: ${error.message}`)
    }
  } catch (err) {
    console.error('createPendingAnalysis failed:', err)
    throw err
  }
}

/**
 * Fetch the listing associated with a token.
 * Used by the orchestrator when status is still 'pending' (before analysis runs).
 * Returns null if the token is not found or the row has expired.
 */
export async function getListingByToken(token: string): Promise<Listing | null> {
  try {
    const { data: row, error: rowError } = await getSupabase()
      .from('analyses')
      .select('listing_id, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (rowError) {
      throw new Error(`getListingByToken: analyses query failed: ${rowError.message}`)
    }

    if (!row) {
      return null
    }

    if (new Date(row.expires_at as string) < new Date()) {
      return null
    }

    const { data: listingRow, error: listingError } = await getSupabase()
      .from('listings')
      .select('*')
      .eq('id', row.listing_id as string)
      .maybeSingle()

    if (listingError) {
      throw new Error(`getListingByToken: listings query failed: ${listingError.message}`)
    }

    if (!listingRow) {
      return null
    }

    return mapListingRow(listingRow as Record<string, unknown>)
  } catch (err) {
    console.error('getListingByToken failed:', err)
    throw err
  }
}
