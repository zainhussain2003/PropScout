/* eslint-disable no-console */
/**
 * StatsCan census stats service.
 *
 * Reads median household income + 5-year population growth for a listing's
 * Forward Sortation Area (the first 3 chars of the postal code) from the
 * `neighbourhood_stats` Supabase table, loaded from the 2021 Census Profile by
 * FSA (see scripts/load-neighbourhood-stats.mjs + supabase migration).
 *
 * Returns null (honest empty — never a fabricated number) when:
 *   - the postal code has no usable FSA,
 *   - the FSA isn't in the table (not loaded, or a rural/new FSA),
 *   - the query fails.
 */

import { getSupabase } from './supabaseService'
import type { NeighbourhoodStats } from '../types/analysis'

interface StatsRow {
  fsa: string
  median_income: number | null
  pop_growth_5y: number | null
}

export async function getNeighbourhoodStats(
  postalCode: string
): Promise<NeighbourhoodStats | null> {
  const fsa = (postalCode ?? '').replace(/\s+/g, '').toUpperCase().slice(0, 3)
  if (fsa.length < 3) return null

  try {
    const { data, error } = await getSupabase()
      .from('neighbourhood_stats')
      .select('fsa, median_income, pop_growth_5y')
      .eq('fsa', fsa)
      .maybeSingle()

    if (error != null) {
      console.error('[statsCanService] getNeighbourhoodStats query failed', error)
      return null
    }
    if (data == null) return null

    const row = data as StatsRow
    // If both figures are missing there's nothing to show — treat as no match.
    if (row.median_income == null && row.pop_growth_5y == null) return null

    return {
      avgIncome: row.median_income,
      popGrowth5y: row.pop_growth_5y,
      areaLabel: fsa,
    }
  } catch (err) {
    console.error('[statsCanService] getNeighbourhoodStats unexpected error', err)
    return null
  }
}
