/**
 * What the financing slider's base rate is, said next to the slider (D-123).
 *
 * The analysis runs at the Bank of Canada prime rate the API fetched (or a
 * cached one, or PropScout's default when the feed was down; or the rate a
 * landlord entered for the mortgage they hold — D-108). The ledger's
 * `mortgage_rate` row records which, with the fetch time. The slider showed
 * "vs Base +0.00%" without saying what the base was or when it was read.
 *
 * Pure: reads the ledger row the API stored (D-088). Null when the analysis
 * carries no ledger (a demo route or a report saved before it shipped) —
 * nothing is claimed that was not recorded.
 */

import type { AssumptionEntry } from '../types/analysis'

function readOn(asOf: string | null): string | null {
  if (!asOf) return null
  const d = new Date(asOf)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** The ledger row for the rate the analysis used, if the analysis carries one. */
export function rateLedgerRow(
  ledger: AssumptionEntry[] | null | undefined
): AssumptionEntry | null {
  return ledger?.find((e) => e.key === 'mortgage_rate') ?? null
}

/**
 * One sentence under the mortgage-rate slider: what the base rate is and
 * where it came from. The rate itself is the slider's base, formatted by
 * the caller, so the note never disagrees with the number beside it.
 */
export function rateBaseNote(row: AssumptionEntry | null, baseRatePct: string): string | null {
  if (row == null) return null
  const when = readOn(row.asOf)
  if (row.basis === 'observed') {
    return `Base ${baseRatePct} is the contract rate you entered${when ? ` on ${when}` : ''}.`
  }
  if (row.basis === 'published') {
    const cached = /cached/i.test(row.method)
    return cached
      ? `Base ${baseRatePct} is the Bank of Canada prime rate from the last successful fetch${when ? `, ${when}` : ''}. A quoted mortgage rate will differ — set yours here.`
      : `Base ${baseRatePct} is the Bank of Canada prime rate${when ? `, read ${when}` : ''}. A quoted mortgage rate will differ — set yours here.`
  }
  return `Base ${baseRatePct} is PropScout's default — the Bank of Canada feed was unavailable. Set your quoted rate here.`
}
