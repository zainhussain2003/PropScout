/**
 * Ontario residential rent-increase rules (D-113).
 *
 * Source: Government of Ontario, "Residential rent increases" —
 * https://www.ontario.ca/page/residential-rent-increases (page last
 * updated 2026-06-23; read 2026-09-16). Timing rules for exempt units:
 * Tribunals Ontario, Landlord and Tenant Board.
 *
 * Nothing here is paraphrased from memory: every figure and date is the
 * page's own, and `checkedAt` says when it was last read against it.
 * Refresh when Ontario publishes the next year's guideline (usually in
 * the summer for the following calendar year).
 */

export const ONTARIO_RENT_RULES = {
  source: 'https://www.ontario.ca/page/residential-rent-increases',
  sourceTitle: 'Ontario — Residential rent increases',
  sourceUpdatedAt: '2026-06-23',
  checkedAt: '2026-09-16',
  timingSource: 'https://tribunalsontario.ca/ltb/',
  /**
   * Units first occupied for residential purposes after this date (new
   * buildings, additions to existing buildings, most new basement
   * apartments) are exempt from the guideline cap on the AMOUNT of an
   * increase. The 12-month and 90-day rules still apply to them.
   */
  exemptionFirstOccupancyAfter: '2018-11-15',
  /** Written notice on the proper form, at least this many days before the increase. */
  noticeDays: 90,
  /** At least this long since the last increase or the start of the tenancy. */
  minMonthsBetweenIncreases: 12,
  /**
   * Guideline by the calendar year the increase TAKES EFFECT in — not the
   * year the tenancy started. A tenancy from June 2026 gets its first
   * increase in June 2027 under the 2027 figure.
   */
  guidelinesByYear: {
    2025: 0.025,
    2026: 0.021,
    2027: 0.019,
  } as Record<number, number>,
} as const
