import type { DealScoreBreakdown, ScoreBarData } from '../types/analysis'

/**
 * Of the demand component's 10 points, 4 are awarded for inputs the engine
 * never observes: median rental days-on-market (default 21 → +2) and rent
 * trend (default "flat" → +2). Only the CMHC vacancy part is measured. Every
 * live report therefore carries 4 assumed demand points (audit S-02). Until
 * the nightly comps scraper yields real DOM and trend, the row says so
 * rather than presenting 8/10 as observed demand.
 */
export const ASSUMED_DEMAND_POINTS = 4
export const DEMAND_ASSUMPTION_NOTE = `${ASSUMED_DEMAND_POINTS} of these points assume typical days-on-market and flat rents — not measured for this area.`

/** Keep component weights visible without recalculating the backend verdict. */
export function scoreBreakdownBars(breakdown: DealScoreBreakdown): ScoreBarData[] {
  const components = [
    ['Cap rate', 'capRate'],
    ['Cash flow', 'cashFlow'],
    ['Cash-on-cash return', 'cashOnCash'],
    ['Debt coverage (DSCR)', 'dscr'],
    ['Rental demand', 'demand'],
  ] as const
  const largest = Math.max(...Object.values(breakdown.componentMaxes))
  return components.map(([label, key]) => {
    const max = breakdown.componentMaxes[key]
    const value = breakdown[key]
    const valid =
      Number.isFinite(value) && Number.isFinite(max) && max > 0 && value >= 0 && value <= max
    return {
      label,
      value: valid ? value : null,
      max,
      note: key === 'demand' && valid && value > 0 ? DEMAND_ASSUMPTION_NOTE : undefined,
      trackPercent:
        Number.isFinite(max) && max > 0 && Number.isFinite(largest) && largest > 0
          ? (max / largest) * 100
          : 0,
      fillPercent: valid ? (value / max) * 100 : 0,
    }
  })
}
