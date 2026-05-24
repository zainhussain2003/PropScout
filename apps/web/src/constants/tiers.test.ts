import { describe, it, expect } from 'vitest'
import { FREE_TIER, PRO_TIER, TIER_PRICES } from './tiers'

describe('tiers', () => {
  it('free tier narrative is shorter than pro', () => {
    expect(FREE_TIER.NARRATIVE_MAX_WORDS).toBeLessThan(PRO_TIER.NARRATIVE_MIN_WORDS)
  })

  it('free tier is priced at zero', () => {
    expect(TIER_PRICES.free).toBe(0)
  })

  it('tier prices increase with tier level', () => {
    expect(TIER_PRICES.pro).toBeGreaterThan(TIER_PRICES.free)
    expect(TIER_PRICES.professional).toBeGreaterThan(TIER_PRICES.pro)
    expect(TIER_PRICES.team).toBeGreaterThan(TIER_PRICES.professional)
  })
})
