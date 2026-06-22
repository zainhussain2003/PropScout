/**
 * OSFI income-input UI constants.
 *
 * NOTE: DEFAULT_HOUSEHOLD_INCOME is a placeholder, not a sourced figure — it
 * exists so the OSFI section renders something before the user sets their own
 * number. See NIGHT_NOTES "Unsourced / assumed values" for the validation path
 * (StatsCan Ontario median household income for the buyer demographic).
 */

/** Default gross household income used until the user moves the slider. */
export const DEFAULT_HOUSEHOLD_INCOME = 125_000

/** Bounds + step for the on-report income slider. */
export const INCOME_SLIDER = {
  min: 40_000,
  max: 400_000,
  step: 5_000,
} as const
