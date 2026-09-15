import { computeMarketDemand, type DemandSourceRow } from './marketDemand'
import { MARKET_DEMAND } from '../constants/thresholds'

const NOW = new Date('2026-09-15T12:00:00Z')
const day = (n: number): string => new Date(NOW.getTime() - n * 86_400_000).toISOString()

/** A listing first seen `firstAgo` days ago and last seen `lastAgo` days ago. */
function row(
  rent: number,
  firstAgo: number,
  lastAgo: number,
  beds: number | null = 2
): DemandSourceRow {
  return { rent_monthly: rent, beds, first_seen_at: day(firstAgo), scraped_at: day(lastAgo) }
}

describe('computeMarketDemand', () => {
  it('reports nothing on an empty table', () => {
    const out = computeMarketDemand([], 2, NOW)
    expect(out).toEqual({
      daysOnMarket: null,
      domSample: 0,
      rentTrend: null,
      trendChangePct: null,
      recentSample: 0,
      priorSample: 0,
    })
  })

  it('DOM is the median lifetime of listings that left the market, any bedroom count', () => {
    // Eight departed listings with lifetimes 5..12 days → median 8.5 → 9.
    const rows = Array.from({ length: 8 }, (_, i) => row(2000, 20 + i, 20 + i - (5 + i), i % 3))
    const out = computeMarketDemand(rows, 2, NOW)
    expect(out.domSample).toBe(8)
    expect(out.daysOnMarket).toBe(9)
  })

  it('a listing still being seen does not count toward DOM', () => {
    const live = Array.from({ length: 8 }, (_, i) => row(2000, 30 + i, 0)) // seen today
    const out = computeMarketDemand(live, 2, NOW)
    expect(out.domSample).toBe(0)
    expect(out.daysOnMarket).toBeNull()
  })

  it('below the minimum sample the DOM is not observed', () => {
    const rows = Array.from({ length: MARKET_DEMAND.MIN_SAMPLE - 1 }, (_, i) =>
      row(2000, 30 + i, 10)
    )
    const out = computeMarketDemand(rows, 2, NOW)
    expect(out.domSample).toBe(MARKET_DEMAND.MIN_SAMPLE - 1)
    expect(out.daysOnMarket).toBeNull()
  })

  it('listings first seen before the window are ignored entirely', () => {
    const old = Array.from({ length: 10 }, (_, i) => row(2000, 100 + i, 50))
    const out = computeMarketDemand(old, 2, NOW)
    expect(out.domSample).toBe(0)
    expect(out.priorSample).toBe(0)
  })

  it('rent trend compares the recent window to the rest, same bedroom count', () => {
    const prior = Array.from({ length: 8 }, (_, i) => row(2000 + i, 60 + i, 0))
    const recent = Array.from({ length: 8 }, (_, i) => row(2200 + i, 5 + i, 0))
    const otherBeds = Array.from({ length: 8 }, (_, i) => row(900, 5 + i, 0, 1))
    const out = computeMarketDemand([...prior, ...recent, ...otherBeds], 2, NOW)
    expect(out.recentSample).toBe(8)
    expect(out.priorSample).toBe(8)
    expect(out.trendChangePct).toBeCloseTo(2203.5 / 2003.5 - 1, 4)
    expect(out.rentTrend).toBe('rising')
  })

  it('a change inside the flat band is flat; a fall beyond it is declining', () => {
    const prior = Array.from({ length: 8 }, () => row(2000, 60, 0))
    const flat = Array.from({ length: 8 }, () => row(2020, 5, 0))
    expect(computeMarketDemand([...prior, ...flat], 2, NOW).rentTrend).toBe('flat')
    const down = Array.from({ length: 8 }, () => row(1900, 5, 0))
    expect(computeMarketDemand([...prior, ...down], 2, NOW).rentTrend).toBe('declining')
  })

  it('a thin prior window leaves the trend unobserved even with many recent rows', () => {
    const prior = Array.from({ length: 3 }, () => row(2000, 60, 0))
    const recent = Array.from({ length: 20 }, () => row(2500, 5, 0))
    const out = computeMarketDemand([...prior, ...recent], 2, NOW)
    expect(out.rentTrend).toBeNull()
    expect(out.trendChangePct).toBeNull()
  })

  it('with the subject bedroom count unknown, the trend pools every bedroom count', () => {
    const prior = Array.from({ length: 8 }, (_, i) => row(2000, 60, 0, i % 4))
    const recent = Array.from({ length: 8 }, (_, i) => row(2100, 5, 0, i % 4))
    expect(computeMarketDemand([...prior, ...recent], null, NOW).rentTrend).toBe('rising')
  })

  it('rows with unparseable or missing dates are skipped, not counted as zero-day leases', () => {
    const bad: DemandSourceRow[] = Array.from({ length: 10 }, () => ({
      rent_monthly: 2000,
      beds: 2,
      first_seen_at: null,
      scraped_at: 'not a date',
    }))
    expect(computeMarketDemand(bad, 2, NOW).domSample).toBe(0)
  })
})
