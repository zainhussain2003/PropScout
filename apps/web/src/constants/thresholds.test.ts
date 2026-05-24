import { describe, it, expect } from 'vitest'
import { DEAL_SCORE, CONFIDENCE } from './thresholds'

describe('thresholds', () => {
  it('deal score brackets are in ascending order', () => {
    expect(DEAL_SCORE.DO_NOT_BUY).toBeLessThan(DEAL_SCORE.MARGINAL)
    expect(DEAL_SCORE.MARGINAL).toBeLessThan(DEAL_SCORE.CAUTION)
    expect(DEAL_SCORE.CAUTION).toBeLessThan(DEAL_SCORE.GOOD)
    expect(DEAL_SCORE.GOOD).toBeLessThan(DEAL_SCORE.STRONG)
  })

  it('red flag confidence is above amber', () => {
    expect(CONFIDENCE.RED_FLAG_MIN).toBeGreaterThan(CONFIDENCE.AMBER_FLAG_MIN)
  })
})
