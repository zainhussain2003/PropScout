import { createClient } from '@supabase/supabase-js'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'

// Use SERVICE_ROLE_KEY server-side only — never expose to frontend
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Save a completed analysis to the database.
 */
export async function saveAnalysis(
  _analysis: Analysis,
  _listing: Listing,
  _userId: string | null
): Promise<void> {
  // TODO: implement
  throw new Error('saveAnalysis: not yet implemented')
}

/**
 * Fetch an analysis by its share token.
 */
export async function getAnalysisByToken(
  _token: string
): Promise<{ analysis: Analysis; listing: Listing } | null> {
  // TODO: implement
  throw new Error('getAnalysisByToken: not yet implemented')
}

/**
 * Log a sanity check failure for review.
 * Never silently return wrong numbers — log first, then return with warning flag.
 */
export async function logSanityFailure(
  address: string,
  failures: string[]
): Promise<void> {
  const { error } = await supabase
    .from('sanity_failures')
    .insert({ address, failures, logged_at: new Date().toISOString() })

  if (error) {
    // Don't throw — sanity logging must never crash the analysis pipeline
    console.error('Failed to log sanity failure:', error)
  }
}

export { supabase }
