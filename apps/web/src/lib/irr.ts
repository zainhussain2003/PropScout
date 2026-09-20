/**
 * Internal rate of return on a dated cash-flow stream (D-123).
 *
 * The exit scenarios (D-110) reported "a year, on your cash" as the simple
 * annualised multiple (cashOut / cashIn)^(1/years) − 1, which treats every
 * dollar as put in on day one and every dollar as returned at the sale. A
 * hold's cash flows arrive each year, and a shortfall funded in year nine
 * is not the same money as the down payment in year zero. IRR is the rate
 * at which the stream's net present value is zero — the annual return the
 * timing actually earns.
 *
 * Pure. `cashFlows[0]` is the initial outlay (negative), each later entry
 * one period's net flow, the last one including the sale proceeds. Solved
 * by bisection on NPV, which is monotone in r for the conventional stream
 * (one outlay, then flows) the report builds.
 */

import { IRR_SOLVER } from '../constants/thresholds'

/** Net present value of `cashFlows` at rate `r` per period. */
export function npv(cashFlows: readonly number[], r: number): number {
  let total = 0
  for (let t = 0; t < cashFlows.length; t += 1) {
    total += cashFlows[t]! / Math.pow(1 + r, t)
  }
  return total
}

/**
 * The per-period rate at which NPV is zero, or null when the stream has no
 * such rate: nothing was put in, nothing ever came back, or NPV keeps one
 * sign across the search range. A total loss (every later flow ≤ 0 after
 * a real outlay) returns −1, not null — that is a return, and the worst one.
 */
export function irr(cashFlows: readonly number[]): number | null {
  if (cashFlows.length < 2) return null
  const outlay = cashFlows[0]!
  if (!(outlay < 0)) return null
  const later = cashFlows.slice(1)
  if (later.every((v) => v <= 0)) return -1
  if (!later.some((v) => v > 0)) return null

  let lo: number = IRR_SOLVER.MIN_RATE
  let hi: number = IRR_SOLVER.MAX_RATE
  let fLo = npv(cashFlows, lo)
  const fHi = npv(cashFlows, hi)
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi)) return null
  if (fLo * fHi > 0) return null
  for (let i = 0; i < IRR_SOLVER.MAX_ITERATIONS; i += 1) {
    const mid = (lo + hi) / 2
    const fMid = npv(cashFlows, mid)
    if (Math.abs(fMid) < IRR_SOLVER.TOLERANCE || hi - lo < IRR_SOLVER.TOLERANCE) return mid
    if (fLo * fMid < 0) {
      hi = mid
    } else {
      lo = mid
      fLo = fMid
    }
  }
  return (lo + hi) / 2
}
