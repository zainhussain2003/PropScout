import type { DealScoreBreakdown, ScoreBarData } from '../types/analysis'

/**
 * Analyses computed before D-105 earned 4 of the demand component's 10 points
 * for inputs the engine never observed (days-on-market default 21 → +2, rent
 * trend default "flat" → +2). Those saved reports still carry the points, so
 * their row says so. An analysis whose Sources ledger has the measured rows
 * (`rental_dom`, `rent_trend`) scored only what was observed — no note.
 */
export const ASSUMED_DEMAND_POINTS = 4
export const DEMAND_ASSUMPTION_NOTE = `${ASSUMED_DEMAND_POINTS} of these points assume typical days-on-market and flat rents — not measured for this area.`

/**
 * Keep component weights visible without recalculating the backend verdict.
 * `demandMeasured` — true when the analysis scored DOM / trend from the comps
 * table or as 0 (D-105); false for fixtures and pre-D-105 reports.
 */
export function scoreBreakdownBars(
  breakdown: DealScoreBreakdown,
  demandMeasured = false
): ScoreBarData[] {
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
      note:
        key === 'demand' && valid && value > 0 && !demandMeasured
          ? DEMAND_ASSUMPTION_NOTE
          : undefined,
      trackPercent:
        Number.isFinite(max) && max > 0 && Number.isFinite(largest) && largest > 0
          ? (max / largest) * 100
          : 0,
      fillPercent: valid ? (value / max) * 100 : 0,
    }
  })
}
