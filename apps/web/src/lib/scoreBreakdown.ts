import type { DealScoreBreakdown, ScoreBarData } from '../types/analysis'

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
      trackPercent:
        Number.isFinite(max) && max > 0 && Number.isFinite(largest) && largest > 0
          ? (max / largest) * 100
          : 0,
      fillPercent: valid ? (value / max) * 100 : 0,
    }
  })
}
