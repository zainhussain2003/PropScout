/**
 * SunScout service — wraps POST /analysis/:token/sunscout.
 *
 * Recalculates the sun-path model for a user-chosen facade bearing (the
 * pipeline default assumes south / 180°). Returns null on any failure so the
 * panel keeps showing its current data instead of blanking.
 */

import type { SunScoutResult } from '../../types/analysis'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

/**
 * Recalculate SunScout for the analysis behind `token` with the primary
 * facade facing `facadeBearing` degrees (0=N, 90=E, 180=S, 270=W).
 */
export async function recalculateSunScout(
  token: string,
  facadeBearing: number
): Promise<SunScoutResult | null> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/analysis/${encodeURIComponent(token)}/sunscout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facadeBearing }),
    })
  } catch {
    return null
  }
  if (!res.ok) return null
  const body = (await res.json()) as { sunScout: SunScoutResult | null }
  return body.sunScout ?? null
}
