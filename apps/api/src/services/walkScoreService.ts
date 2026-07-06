/* eslint-disable no-console */
/**
 * Walk Score + Transit Score API service.
 * Docs: https://www.walkscore.com/professional/api.php
 */

import type { WalkScoreResult } from '../types/analysis'

export type { WalkScoreResult }

/**
 * Fetch Walk Score, Transit Score, and Bike Score for a given address.
 * Returns null on any failure — the orchestrator degrades gracefully without scores.
 */
export async function getWalkScore(
  address: string,
  lat: number,
  lng: number
): Promise<WalkScoreResult | null> {
  try {
    const WALKSCORE_API_KEY = process.env.WALKSCORE_API_KEY ?? ''

    if (!WALKSCORE_API_KEY) {
      console.warn('getWalkScore: WALKSCORE_API_KEY is not set — skipping walk score')
      return null
    }

    const url =
      `https://api.walkscore.com/score` +
      `?format=json` +
      `&address=${encodeURIComponent(address)}` +
      `&lat=${lat}` +
      `&lon=${lng}` + // Walk Score uses 'lon', not 'lng'
      `&transit=1` +
      `&bike=1` +
      `&wsapikey=${WALKSCORE_API_KEY}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    let res: Response
    try {
      res = await fetch(url, { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      console.warn(`getWalkScore: Walk Score API returned ${res.status} for "${address}"`)
      return null
    }

    const data = (await res.json()) as {
      walkscore?: number
      description?: string
      transit?: { score?: number }
      bike?: { score?: number }
    }

    if (data.walkscore == null) {
      return null
    }

    return {
      walk: data.walkscore,
      transit: data.transit?.score ?? null,
      bike: data.bike?.score ?? null,
      description: data.description ?? '',
    }
  } catch (err) {
    console.error(`getWalkScore: error fetching walk score for "${address}":`, err)
    return null
  }
}
