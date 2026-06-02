export const FINANCING_DEFAULTS = {
  DOWN_PAYMENT_PCT: 0.2,
  MORTGAGE_RATE: 0.0479,
  AMORTIZATION_YEARS: 25,
} as const

export const PROPERTY_COST_ESTIMATES = {
  HYDRO_PER_SQFT: 0.08, // scales with sqft — may double-count if
  // condo fee includes heat/water
  GAS_PER_SQFT: 0.06, // same caveat as hydro for condos
  WATER_MONTHLY: 60,
  INTERNET_MONTHLY: 65,
  SQFT_FALLBACK: 800, // used when listing.sqft is null
  INSURANCE_RATE_ANNUAL: 0.0035, // mirrors INSURANCE_RATE in Python
  // calc engine — keep in sync if
  // calibration changes
} as const

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  detached: 'Detached',
  'semi-detached': 'Semi-Detached',
  townhouse: 'Townhouse',
  condo: 'Condo',
  duplex: 'Duplex',
  triplex: 'Triplex',
  fourplex: 'Fourplex',
  multiplex: 'Multiplex',
  commercial: 'Commercial',
  cottage: 'Cottage',
  farm: 'Farm',
  'vacant-land': 'Vacant Land',
  other: 'Other',
}

// Fallback: title-case any value not in the map
export function formatPropertyType(raw: string): string {
  return (
    PROPERTY_TYPE_LABELS[raw] ?? raw.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}
