/**
 * What Ontario's rent-increase rules mean for this unit, in words (D-113).
 *
 * One set of facts, two perspectives: the landlord setting a rent and the
 * tenant signing for it read the same law. Every figure comes from the
 * stored RentControlInfo (source, dates, guidelines by year) — nothing here
 * is a constant of its own, so a guideline update reaches both reports
 * through the API.
 */

import type { RentControlInfo } from '../types/analysis'

export interface RentControlCopy {
  /** Headline: "Likely rent-controlled — confirm" etc. */
  statusLabel: string
  tone: 'pass' | 'caution' | 'fail'
  /** Why we think so, and what actually decides it. */
  basisLine: string
  /** Starting rent — perspective-specific. */
  startingRentLine: string
  /** Future increases — the guideline sentence with every published year. */
  increasesLine: string
  /** The timing rules that apply either way. */
  timingLine: string
  /** Source citation. */
  sourceLine: string
}

function pct(rate: number): string {
  return `${parseFloat((rate * 100).toFixed(2))}%`
}

function guidelineSentence(rc: RentControlInfo): string {
  if (rc.guidelines.length === 0) return 'the annual guideline Ontario publishes'
  const parts = rc.guidelines.map((g) => `${pct(g.rate)} for increases taking effect in ${g.year}`)
  return parts.length === 1
    ? parts[0]!
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
}

export function rentControlCopy(
  rc: RentControlInfo,
  perspective: 'landlord' | 'tenant'
): RentControlCopy {
  const exemptDate = fmtDate(rc.exemptionFirstOccupancyAfter)
  const guideline = guidelineSentence(rc)
  const timingLine = `Either way, an increase needs at least ${rc.minMonthsBetweenIncreases} months since the last one (or the start of the tenancy) and ${rc.noticeDays} days' written notice on the proper form.`
  const sourceLine = `${rc.sourceTitle}, page updated ${fmtDate(rc.sourceUpdatedAt)}; checked ${fmtDate(rc.checkedAt)}.`

  const basisLine =
    rc.basis === 'listing_build_year'
      ? `Based on the listed build year (${rc.yearBuilt}). What actually decides it is the date the unit was first occupied for residential purposes — exempt if after ${exemptDate}. Confirm with occupancy records.`
      : `The listing gives no build year. What decides it is the date the unit was first occupied for residential purposes — exempt if after ${exemptDate}. Ask.`

  const startingRentLine =
    perspective === 'landlord'
      ? 'For a new tenancy you and the tenant agree the starting rent; the annual guideline does not limit it.'
      : 'For a new tenancy the starting rent is whatever you and the landlord agree; the guideline does not cap it.'

  // The status is inferred, so both branches are always stated — the likely
  // one first. Nothing here says "not rent-controlled".
  const controlledBranch =
    perspective === 'landlord'
      ? `If the unit is rent-controlled, increases to a sitting tenant are limited to the guideline — ${guideline} — subject to the permitted exceptions.`
      : `If the unit is rent-controlled, increases after your first year are limited to the guideline — ${guideline} — subject to the permitted exceptions.`
  const exemptBranch =
    perspective === 'landlord'
      ? `If the unit qualifies for the post-${exemptDate} exemption, there is no guideline limit on the amount of an increase.`
      : `If the unit qualifies for the post-${exemptDate} exemption, there is no guideline limit on the amount of an increase after your first year.`

  let statusLabel: string
  let tone: RentControlCopy['tone']
  let increasesLine: string
  if (rc.status === 'likely_controlled') {
    statusLabel = 'Likely rent-controlled — confirm'
    tone = perspective === 'tenant' ? 'pass' : 'caution'
    increasesLine = `${controlledBranch} ${exemptBranch}`
  } else if (rc.status === 'likely_exempt') {
    statusLabel = 'Likely exempt from the guideline — confirm'
    tone = perspective === 'tenant' ? 'caution' : 'pass'
    increasesLine = `${exemptBranch} ${controlledBranch}`
  } else {
    statusLabel = 'Rent-control status unknown — confirm'
    tone = 'caution'
    increasesLine = `${controlledBranch} ${exemptBranch}`
  }

  return { statusLabel, tone, basisLine, startingRentLine, increasesLine, timingLine, sourceLine }
}
