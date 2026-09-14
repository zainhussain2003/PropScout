/**
 * How much of the surroundings the obstruction model actually saw.
 *
 * The building-obstruction pass (spec §17 Phase 2) only uses footprints with a
 * known height; the rest are left out rather than guessed, so the calculated
 * shade is a floor. The panel already says how many were left out. What it did
 * not do was draw a line: with 2 of 30 buildings measured, "Real surroundings
 * · checked" and a hard hours figure read as more than the model knows.
 *
 * Coverage = used / (used + unknown). Below SUN_OBSTRUCTION_COVERAGE.INDICATIVE
 * the result is labelled indicative rather than checked.
 */

import { SUN_OBSTRUCTION_COVERAGE } from '../constants/thresholds'

export type ObstructionCoverageLevel = 'checked' | 'indicative' | 'none'

export interface ObstructionCoverage {
  used: number
  unknown: number
  /** 0–1; 1 when every nearby building had a height. Null when nothing was nearby. */
  ratio: number | null
  level: ObstructionCoverageLevel
}

export function obstructionCoverage(
  used: number | null | undefined,
  unknown: number | null | undefined
): ObstructionCoverage {
  const u = Math.max(0, used ?? 0)
  const k = Math.max(0, unknown ?? 0)
  const total = u + k
  if (total === 0) return { used: u, unknown: k, ratio: null, level: 'none' }
  const ratio = u / total
  return {
    used: u,
    unknown: k,
    ratio,
    level: ratio >= SUN_OBSTRUCTION_COVERAGE.INDICATIVE ? 'checked' : 'indicative',
  }
}
