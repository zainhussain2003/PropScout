/**
 * Default assumption values and tooltip copy for the analysis form.
 *
 * Every assumption the user can edit has a default, a unit, and a tooltip that
 * explains where the default comes from and when to change it.
 *
 * These defaults match constants/rates.py in the calc engine — keep them in sync.
 */

export interface AssumptionField {
  /** Internal key used as the form field name */
  key: string
  /** Display label shown to the user */
  label: string
  /** Default value — pre-filled in the form */
  defaultValue: number
  /** Unit shown alongside the input ("%" or "$") */
  unit: '%' | '$'
  /** Whether the unit prefix comes before the number */
  unitPrefix: boolean
  /** Minimum allowed value */
  min: number
  /** Maximum allowed value */
  max: number
  /** Step increment for number input */
  step: number
  /** Tooltip text explaining the default and when to change it */
  tooltip: string
}

export const ASSUMPTION_FIELDS: AssumptionField[] = [
  {
    key: 'vacancyAllowance',
    label: 'Vacancy allowance',
    defaultValue: 5,
    unit: '%',
    unitPrefix: false,
    min: 0,
    max: 20,
    step: 0.5,
    tooltip:
      'CMHC national average. Tight markets like Toronto typically run 1–3%. Use local CMHC data for your city. Represents turnover time between tenants, not just chronic vacancy.',
  },
  {
    key: 'insuranceRate',
    label: 'Insurance rate',
    defaultValue: 0.35,
    unit: '%',
    unitPrefix: false,
    min: 0.1,
    max: 2.0,
    step: 0.05,
    tooltip:
      'Estimated annual landlord insurance as % of property value. Covers loss-of-rent, liability, and in-unit damage. For condos, the condo corp policy covers the building — this is your personal policy only. Get an actual quote to improve accuracy.',
  },
  {
    key: 'managementFee',
    label: 'Management fee',
    defaultValue: 8,
    unit: '%',
    unitPrefix: false,
    min: 0,
    max: 15,
    step: 0.5,
    tooltip:
      "Typical Ontario property management runs 8–12% of gross rent. Set to 0 if self-managing. Note: managers may also charge a lease-up fee (one month's rent) not modelled here.",
  },
  {
    key: 'maintenanceRate',
    label: 'Maintenance reserve',
    defaultValue: 0.5,
    unit: '%',
    unitPrefix: false,
    min: 0,
    max: 3.0,
    step: 0.1,
    tooltip:
      'Annual reserve for in-unit repairs as % of property value. Applied by build year: post-2010 = 0.5%, 1980–2009 = 1%, pre-1980 = 1.5%. For condos, building maintenance is covered by the condo fee — this covers in-unit repairs only (appliances, flooring, fixtures).',
  },
  {
    key: 'appreciationRate',
    label: 'Appreciation rate',
    defaultValue: 3,
    unit: '%',
    unitPrefix: false,
    min: 0,
    max: 10,
    step: 0.5,
    tooltip:
      'Used for equity build projections only — not used in cash flow, cap rate, DSCR, or deal score calculations. The default 3% is a long-run Ontario average. Adjust to your local market outlook.',
  },
  {
    key: 'legalFees',
    label: 'Legal fees',
    defaultValue: 1500,
    unit: '$',
    unitPrefix: true,
    min: 500,
    max: 5000,
    step: 100,
    tooltip:
      'Typical range $1,500–$2,500 in Ontario. Higher for complex transactions or Toronto deals over $1M. Includes lawyer review, title search, and registration fees. Excludes title insurance (shown separately).',
  },
  {
    key: 'mortgageRate',
    label: 'Mortgage rate',
    defaultValue: 0, // 0 = sentinel for "use live Bank of Canada rate"
    unit: '%',
    unitPrefix: false,
    min: 0, // 0 is a valid sentinel meaning "use live rate"
    max: 15,
    step: 0.05,
    tooltip:
      "Pulled weekly from Bank of Canada posted rates. Edit to model a specific rate you've been quoted by a broker. Uses Canadian semi-annual compounding as required by the Interest Act.",
  },
]

/** Map from field key to its AssumptionField definition. */
export const ASSUMPTION_MAP: Record<string, AssumptionField> = Object.fromEntries(
  ASSUMPTION_FIELDS.map((f) => [f.key, f])
)

/** Default assumption values as a plain object — use to initialise form state. */
export const DEFAULT_ASSUMPTIONS: Record<string, number> = Object.fromEntries(
  ASSUMPTION_FIELDS.map((f) => [f.key, f.defaultValue])
)

// ── Boolean assumption fields ──────────────────────────────────────────────────

export interface BooleanAssumptionField {
  /** Internal key used as the form field name */
  key: string
  /** Display label shown to the user */
  label: string
  /** Default value */
  defaultValue: boolean
  /** Tooltip text explaining the field and its implications */
  tooltip: string
}

export const BOOLEAN_ASSUMPTION_FIELDS: BooleanAssumptionField[] = [
  {
    key: 'nonResident',
    label: 'Non-resident buyer (NRST)',
    defaultValue: false,
    tooltip:
      'Check if you are not a Canadian citizen or permanent resident purchasing in Ontario. ' +
      'The Non-Resident Speculation Tax (NRST) adds 25% of the purchase price to your closing ' +
      'costs. For a $700,000 property that is an additional $175,000. Exemptions may apply ' +
      'for nominees, protected persons, and Canadian spouses — consult a lawyer.',
  },
]

/** Default boolean assumption values — use alongside DEFAULT_ASSUMPTIONS to initialise form state. */
export const DEFAULT_BOOLEAN_ASSUMPTIONS: Record<string, boolean> = Object.fromEntries(
  BOOLEAN_ASSUMPTION_FIELDS.map((f) => [f.key, f.defaultValue])
)
