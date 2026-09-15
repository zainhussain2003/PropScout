/**
 * Days-on-market and rent trend measured from the nightly comps table (D-105).
 *
 * Pure: takes the rows supabaseService fetched for the FSA and the clock, and
 * returns either a measurement or null per input. Null means "not observed"
 * — the engine scores it 0, the ledger says why. Nothing here ever returns a
 * default figure.
 */

import { MARKET_DEMAND } from '../constants/thresholds'

export type RentTrend = 'rising' | 'flat' | 'declining'

/** The columns the measurement needs from rental_listings. */
export interface DemandSourceRow {
  rent_monthly: number
  beds: number | null
  /** Created / first-insertion time. */
  first_seen_at: string | null
  /** Last-seen time — refreshed on every nightly upsert. */
  scraped_at: string | null
}

export interface MarketDemandObservation {
  /** Median days from first to last seen, over listings that left the market. */
  daysOnMarket: number | null
  /** How many departed listings the DOM median rests on. */
  domSample: number
  rentTrend: RentTrend | null
  /** Recent-window median rent against the prior window, as a fraction. */
  trendChangePct: number | null
  recentSample: number
  priorSample: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
    : (sorted[mid] as number)
}

function parse(iso: string | null): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

/**
 * Measure both demand inputs from one FSA's rows.
 *
 * DOM uses every bedroom count (a lease is a lease); the trend compares like
 * with like, so it narrows to the subject's bedroom count when known.
 */
export function computeMarketDemand(
  rows: DemandSourceRow[],
  beds: number | null,
  now: Date = new Date()
): MarketDemandObservation {
  const nowMs = now.getTime()
  const windowStart = nowMs - MARKET_DEMAND.WINDOW_DAYS * DAY_MS
  const recentStart = nowMs - MARKET_DEMAND.RECENT_DAYS * DAY_MS
  const goneBefore = nowMs - MARKET_DEMAND.GONE_AFTER_DAYS * DAY_MS

  const lifetimes: number[] = []
  const recent: number[] = []
  const prior: number[] = []

  for (const r of rows) {
    if (!(r.rent_monthly > 0)) continue
    const first = parse(r.first_seen_at)
    const last = parse(r.scraped_at)
    if (first == null || last == null || first < windowStart) continue

    // Departed listings only: a listing still being re-seen has an open-ended
    // lifetime, and counting it would bias the median short.
    if (last < goneBefore && last >= first) {
      lifetimes.push((last - first) / DAY_MS)
    }

    if (beds == null || r.beds === beds) {
      if (first >= recentStart) recent.push(r.rent_monthly)
      else prior.push(r.rent_monthly)
    }
  }

  const domObserved = lifetimes.length >= MARKET_DEMAND.MIN_SAMPLE
  const trendObserved =
    recent.length >= MARKET_DEMAND.MIN_SAMPLE && prior.length >= MARKET_DEMAND.MIN_SAMPLE

  let rentTrend: RentTrend | null = null
  let trendChangePct: number | null = null
  if (trendObserved) {
    const priorMedian = median(prior)
    trendChangePct = priorMedian > 0 ? median(recent) / priorMedian - 1 : null
    if (trendChangePct != null) {
      rentTrend =
        trendChangePct > MARKET_DEMAND.TREND_FLAT_BAND
          ? 'rising'
          : trendChangePct < -MARKET_DEMAND.TREND_FLAT_BAND
            ? 'declining'
            : 'flat'
    }
  }

  return {
    daysOnMarket: domObserved ? Math.round(median(lifetimes)) : null,
    domSample: lifetimes.length,
    rentTrend,
    trendChangePct,
    recentSample: recent.length,
    priorSample: prior.length,
  }
}
