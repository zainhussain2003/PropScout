/**
 * Walk Score + Transit Score API service.
 * Docs: https://www.walkscore.com/professional/api.php
 */

export interface WalkScoreResult {
  walkScore: number // 0–100
  transitScore: number // 0–100
  bikeScore: number // 0–100
  description: string // e.g. "Walker's Paradise"
}

/**
 * Fetch Walk Score, Transit Score, and Bike Score for a given address.
 */
export async function getWalkScore(
  _address: string,
  _lat: number,
  _lng: number
): Promise<WalkScoreResult | null> {
  // TODO: implement — requires WALKSCORE_API_KEY
  return null
}
