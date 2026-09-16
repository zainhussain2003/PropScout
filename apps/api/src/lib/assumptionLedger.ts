/**
 * Assumption ledger — every modelled number behind a report, with where it
 * came from, when it was current, and how it is used (D-088).
 *
 * The landing page says "every number in the report has a source, a date and
 * a method". Until this existed that was not true of the constants: insurance
 * at 0.35% of value, a $1,500 legal fee, a per-city vacancy table documented
 * as placeholders. The ledger does not make those numbers better; it makes
 * them honest — a default is labelled a default, a live feed carries its
 * fetch time, a proxy names its formula.
 *
 * Pure: takes what the pipeline already knows and returns rows. Engine
 * constants come from the engine's own echo (`assumptions` on its response),
 * never from a copy kept here, so the ledger cannot drift from what ran.
 */

import type { AssumptionEntry, ReportMode, RentControlInfo } from '../types/analysis'
import { RENT_TO_PRICE_MONTHLY } from '../constants/valuation'
import { MARKET_DEMAND } from '../constants/thresholds'
import { CMHC_VACANCY_SURVEY } from '../constants/cmhcVacancy'
import type { MarketDemandObservation } from './marketDemand'

/** The engine's echo of what it applied (models/schemas.py AssumptionsAppliedOutput). */
export interface EngineAssumptions {
  vacancy_allowance: number
  management_fee: number
  management_fee_included: boolean
  insurance_rate: number
  maintenance_rate: number
  maintenance_basis: string
  legal_fees: number
  title_insurance: number
  home_inspection: number
  down_payment_pct: number
  mortgage_rate: number
  amortization_years: number
  cmhc_vacancy_rate: number
  cmhc_vacancy_rate_supplied: boolean
  /** The financing was an existing position, not a purchase (D-108). */
  owned?: boolean
  /** What scored the other two demand inputs; null = not observed, 0 points (D-105). */
  rental_days_on_market?: number | null
  rent_trend?: string | null
}

export interface LedgerInput {
  mode: ReportMode
  /** ISO time of the analysis — the "as of" for anything read from our tables. */
  createdAt: string
  listing: {
    city: string
    price: number | null
    rentMonthly: number | null
    annualTaxes: number | null
    condoFeeMonthly: number | null
    condoFeeKnown: boolean
    yearBuilt: number | null
    /** For the demand rows' FSA note (D-105). */
    postalCode?: string | null
  }
  engine: EngineAssumptions | null
  rate: { rate: number; source: 'live' | 'cached' | 'fallback'; fetchedAt: string | null } | null
  /** Comps behind the rent estimate; null when the rent was proxied or observed. */
  comps: { compCount: number; radiusKm: number | null; confidence: string } | null
  rentMid: number
  /** True on a for-rent listing whose value was modelled from rent. */
  priceEstimated: boolean
  /** The landlord's own value when one was entered (D-107) — outranks the model. */
  ownerValue?: {
    value: number
    enteredAt: string
    /** Balance outstanding when they own it (D-108); 0 = outright; null = purchase case. */
    mortgageBalance?: number | null
    mortgageRate?: number | null
  } | null
  annualTaxesUsed: number
  annualTaxesEstimated: boolean
  /** Whether the city had its own row in the CMHC table (else the province default). */
  cmhcCityMatched: boolean
  /** The comps-table measurement behind the engine's DOM / trend inputs (D-105). */
  demand?: MarketDemandObservation | null
  /** Ontario rent-control status inferred for the unit (D-113). */
  rentControl?: RentControlInfo | null
  /** Walk Score result, when the API returned one. */
  walkScore?: { walk: number; transit: number | null; fetchedAt?: string } | null
  /** Whether any nearby-amenity time came from the routing engine (D-096). */
  travelTimesRouted?: boolean
  /** Whether the analysis produced a sun model at all (needs coordinates). */
  hasSunScout?: boolean
}

const COMPASS: Array<[number, string]> = [
  [0, 'north'],
  [45, 'north-east'],
  [90, 'east'],
  [135, 'south-east'],
  [180, 'south'],
  [225, 'south-west'],
  [270, 'west'],
  [315, 'north-west'],
]

function compassLabel(bearing: number): string {
  const b = ((bearing % 360) + 360) % 360
  let best = COMPASS[0]!
  for (const c of COMPASS) {
    const d = Math.min(Math.abs(c[0] - b), 360 - Math.abs(c[0] - b))
    const bd = Math.min(Math.abs(best[0] - b), 360 - Math.abs(best[0] - b))
    if (d < bd) best = c
  }
  return best[1]
}

/** The Sources row for the facade the sun model used (D-098). */
export function facadeRow(bearing: number | null): AssumptionEntry {
  return bearing == null
    ? {
        key: 'facade',
        label: 'Primary facade',
        value: 'south (assumed)',
        basis: 'default',
        source: PROPSCOUT_DEFAULT,
        asOf: null,
        method:
          'The sun model assumes the main windows face south until you set the facade in the SunScout section.',
      }
    : {
        key: 'facade',
        label: 'Primary facade',
        value: compassLabel(bearing),
        basis: 'observed',
        source: 'You — set in the SunScout section',
        asOf: null,
        method: 'The sun figures were recomputed for this facade.',
      }
}

/** Replace (or add) the facade row after the user sets the facade. */
export function withFacadeRow(
  rows: AssumptionEntry[] | null | undefined,
  bearing: number
): AssumptionEntry[] | null {
  if (rows == null) return null
  const next = rows.filter((r) => r.key !== 'facade')
  const at = rows.findIndex((r) => r.key === 'facade')
  const row = facadeRow(bearing)
  if (at >= 0) next.splice(at, 0, row)
  else next.push(row)
  return next
}

/** Year the municipal tax-rate table was last refreshed (constants/propertyTaxRates.ts). */
const TAX_RATE_TABLE_YEAR = '2025'

const PROPSCOUT_DEFAULT = 'PropScout default — no external source'
const NIGHTLY_COMPS = 'PropScout nightly rental comps (Rentals.ca, Kijiji, PadMapper)'

/** Fixed decimals so "5.20%" reads as a quoted rate, not "5.2". */
function pct(v: number, digits = 2): string {
  return `${(v * 100).toFixed(digits)}%`
}
/** Trailing zeros dropped: 0.005 → "0.5%". */
function pctShort(v: number): string {
  return `${parseFloat((v * 100).toFixed(2))}%`
}
/** Signed, one decimal: 0.034 → "+3.4%". */
function pctSigned(v: number): string {
  const n = parseFloat((v * 100).toFixed(1))
  return `${n > 0 ? '+' : ''}${n}%`
}
function cad(v: number): string {
  return `$${Math.round(v).toLocaleString('en-CA')}`
}

const MAINTENANCE_BAND: Record<string, string> = {
  post_2010: 'built 2010 or later',
  '1980_2010': 'built 1980–2009',
  pre_1980: 'built before 1980',
  year_unknown: 'build year unknown, so the middle band is used',
}

export function buildAssumptionLedger(input: LedgerInput): AssumptionEntry[] {
  const { mode, listing, engine, rate, comps } = input
  const rows: AssumptionEntry[] = []
  // A landlord report scored on the landlord's own value is a purchase model
  // too (D-107); before a value is entered it is an operating view.
  const purchase =
    mode === 'investor' || mode === 'personal' || (mode === 'landlord' && input.ownerValue != null)
  const operating = mode === 'investor' || mode === 'landlord'

  // ── Rent ──────────────────────────────────────────────────────────────────
  if (comps != null && comps.compCount > 0) {
    rows.push({
      key: 'rent',
      label: 'Market rent',
      value: `${cad(input.rentMid)}/mo`,
      basis: 'published',
      source: `${comps.compCount} asking rents from the PropScout nightly comps table`,
      asOf: input.createdAt,
      method:
        `Weighted median of asking rents ${comps.radiusKm != null ? `within ${comps.radiusKm} km` : 'in the same FSA'} with outliers removed — ` +
        `each comp weighted by distance, how recently it was seen, size and bedroom match (D-109); ` +
        `${comps.confidence} confidence. Asking rents, not signed leases.`,
    })
  } else if (listing.rentMonthly != null && listing.rentMonthly > 0) {
    rows.push({
      key: 'rent',
      label: 'Rent',
      value: `${cad(input.rentMid)}/mo`,
      basis: 'observed',
      source: 'The listing',
      asOf: input.createdAt,
      method: 'The asking rent as listed; no comparable rentals were found to test it against.',
    })
  } else {
    rows.push({
      key: 'rent',
      label: 'Rent (proxy)',
      value: `${cad(input.rentMid)}/mo`,
      basis: 'estimate',
      source: PROPSCOUT_DEFAULT,
      asOf: null,
      method: `${pctShort(RENT_TO_PRICE_MONTHLY)} of the asking price per month (about a 6% gross yield); no comparable rentals were found.`,
    })
  }

  // ── Value (for-rent listings only) ───────────────────────────────────────
  if (input.ownerValue != null) {
    rows.push({
      key: 'value_owner',
      label: 'Property value',
      value: cad(input.ownerValue.value),
      basis: 'observed',
      source: 'You entered it',
      asOf: input.ownerValue.enteredAt.slice(0, 10),
      method:
        "The listing states no value. Every price-dependent figure — score, cash flow, cap rate, DSCR, cash to close, equity — is run on this number as a purchase at today's financing; change it in the hero to re-run.",
    })
  } else if (input.priceEstimated) {
    rows.push({
      key: 'value_estimate',
      label: 'Property value',
      value: listing.price != null ? cad(listing.price) : 'modelled',
      basis: 'estimate',
      source: 'PropScout cap-rate model (constants/marketCapRates.ts — placeholder rates)',
      asOf: null,
      method:
        'Rent less a residual expense ratio, capitalised at a per-city cap rate. ' +
        'Used only so the engine can score; not an appraisal.',
    })
  }

  // ── Financing ─────────────────────────────────────────────────────────────
  const owner = input.ownerValue ?? null
  const ownedOutright = owner?.mortgageBalance === 0
  const ownedWithMortgage = owner?.mortgageBalance != null && owner.mortgageBalance > 0
  if (purchase && engine != null && (ownedOutright || ownedWithMortgage) && owner != null) {
    // The landlord's existing position (D-108): their balance and rate are
    // observed; the equity share is arithmetic on two numbers they gave.
    const enteredOn = owner.enteredAt.slice(0, 10)
    rows.push({
      key: 'mortgage_balance',
      label: ownedOutright ? 'Mortgage' : 'Mortgage balance',
      value: ownedOutright ? 'none — owned outright' : cad(owner.mortgageBalance as number),
      basis: 'observed',
      source: 'You entered it',
      asOf: enteredOn,
      method: ownedOutright
        ? 'No debt service: cash flow is the operating income, DSCR does not apply and scores its maximum, and cash-on-cash is measured on the full value.'
        : `Equity share = (value − balance) / value = ${pct(engine.down_payment_pct, 0)}${engine.down_payment_pct <= 0.05 ? ' (clamped at the 5% floor the model needs)' : ''}. No land-transfer tax or closing costs are charged to keep holding it.`,
    })
    if (!ownedOutright) {
      rows.push({
        key: 'mortgage_rate',
        label: 'Mortgage rate',
        value: pct(engine.mortgage_rate),
        basis:
          owner.mortgageRate != null
            ? 'observed'
            : rate?.source === 'fallback' || rate == null
              ? 'default'
              : 'published',
        source:
          owner.mortgageRate != null
            ? 'You entered it'
            : rate != null && rate.source !== 'fallback'
              ? 'Bank of Canada Valet — prime business rate (series V80691311)'
              : PROPSCOUT_DEFAULT,
        asOf: owner.mortgageRate != null ? enteredOn : (rate?.fetchedAt ?? null),
        method:
          owner.mortgageRate != null
            ? 'Your contract rate, applied over the default amortization; use the slider for a renewal scenario.'
            : 'No rate was entered, so the current prime rate stands in for your contract rate. Use the slider.',
      })
      rows.push({
        key: 'amortization',
        label: 'Amortization',
        value: `${engine.amortization_years} years`,
        basis: 'default',
        source: PROPSCOUT_DEFAULT,
        asOf: null,
        method:
          'Remaining amortization was not entered; the starting case applies. Adjustable in the financing section.',
      })
    }
  } else if (purchase && engine != null) {
    const r = rate ?? { rate: engine.mortgage_rate, source: 'fallback' as const, fetchedAt: null }
    rows.push({
      key: 'mortgage_rate',
      label: 'Mortgage rate',
      value: pct(engine.mortgage_rate),
      basis: r.source === 'fallback' ? 'default' : 'published',
      source:
        r.source === 'fallback'
          ? PROPSCOUT_DEFAULT
          : 'Bank of Canada Valet — prime business rate (series V80691311)',
      asOf: r.fetchedAt,
      method:
        r.source === 'live'
          ? 'Prime rate at the time of analysis. A quoted mortgage rate will differ; use the slider.'
          : r.source === 'cached'
            ? 'Prime rate from the last successful fetch (cached up to 7 days). A quoted rate will differ; use the slider.'
            : 'The Bank of Canada feed was unavailable, so the mid-cycle default applied. Use the slider.',
    })
    rows.push({
      key: 'down_payment',
      label: 'Down payment',
      value: pct(engine.down_payment_pct, 0),
      basis: 'default',
      source: PROPSCOUT_DEFAULT,
      asOf: null,
      method:
        'Starting case for the headline numbers; every metric recomputes when the slider moves.',
    })
    rows.push({
      key: 'amortization',
      label: 'Amortization',
      value: `${engine.amortization_years} years`,
      basis: 'default',
      source: PROPSCOUT_DEFAULT,
      asOf: null,
      method: 'Starting case; adjustable in the financing section.',
    })
  }

  // ── Carrying costs ────────────────────────────────────────────────────────
  if (input.annualTaxesEstimated) {
    rows.push({
      key: 'property_tax',
      label: 'Property tax',
      value: `${cad(input.annualTaxesUsed)}/yr`,
      basis: 'estimate',
      source: `Ontario municipal tax-rate table (${TAX_RATE_TABLE_YEAR} budgets)`,
      asOf: TAX_RATE_TABLE_YEAR,
      method: `Asking price × the ${listing.city} residential rate. The listing did not publish a tax figure; confirm with the MPAC assessment.`,
    })
  } else if (input.annualTaxesUsed > 0) {
    rows.push({
      key: 'property_tax',
      label: 'Property tax',
      value: `${cad(input.annualTaxesUsed)}/yr`,
      basis: 'observed',
      source: 'The listing',
      asOf: input.createdAt,
      method: 'As published on the listing.',
    })
  }

  if (listing.condoFeeKnown && listing.condoFeeMonthly != null) {
    rows.push({
      key: 'condo_fee',
      label: 'Condo fee',
      value: `${cad(listing.condoFeeMonthly)}/mo`,
      basis: 'observed',
      source: 'The listing',
      asOf: input.createdAt,
      method: 'As published on the listing.',
    })
  }

  if (engine != null && (purchase || operating)) {
    rows.push({
      key: 'insurance',
      label: 'Insurance',
      value: `${pct(engine.insurance_rate)} of value`,
      basis: 'default',
      source: PROPSCOUT_DEFAULT,
      asOf: null,
      method:
        'Annual premium modelled as a share of the property value. Get a quote to replace it.',
    })
    rows.push({
      key: 'maintenance',
      label: 'Maintenance reserve',
      value: `${pct(engine.maintenance_rate, 1)} of value`,
      basis: 'default',
      source: PROPSCOUT_DEFAULT,
      asOf: null,
      method: `Annual reserve by build year — ${MAINTENANCE_BAND[engine.maintenance_basis] ?? engine.maintenance_basis}. In-unit repairs only for a condo.`,
    })
  }

  if (engine != null && operating) {
    rows.push({
      key: 'vacancy',
      label: 'Vacancy allowance',
      value: `${pctShort(engine.vacancy_allowance)} of rent`,
      basis: 'default',
      source: PROPSCOUT_DEFAULT,
      asOf: null,
      method:
        'Deducted from gross rent for turnover between tenants; the CMHC market rate below is separate and feeds the score.',
    })
    rows.push({
      key: 'management_fee',
      label: 'Management fee',
      value: `${pctShort(engine.management_fee)} of rent`,
      basis: 'default',
      source: PROPSCOUT_DEFAULT,
      asOf: null,
      method: engine.management_fee_included
        ? 'Included in NOI and cash flow (the toggle is on).'
        : 'Not included in NOI or cash flow — self-managed is the starting case; the toggle adds it.',
    })
  }

  if (engine != null) {
    // The city table is copied from the CMHC survey's own data table with
    // its survey month (D-106); a city without a row gets the published
    // Ontario aggregate from the same table — still published, said plainly.
    rows.push({
      key: 'vacancy_market',
      label: 'Market vacancy rate',
      value: pct(engine.cmhc_vacancy_rate, 1),
      basis: engine.cmhc_vacancy_rate_supplied ? 'published' : 'default',
      source: engine.cmhc_vacancy_rate_supplied
        ? `CMHC Rental Market Survey, ${CMHC_VACANCY_SURVEY.survey} (${CMHC_VACANCY_SURVEY.table})`
        : PROPSCOUT_DEFAULT,
      asOf: engine.cmhc_vacancy_rate_supplied ? CMHC_VACANCY_SURVEY.published : null,
      method: engine.cmhc_vacancy_rate_supplied
        ? input.cmhcCityMatched
          ? `Purpose-built rental apartment vacancy, all bedroom types, for the CMHC survey area ${listing.city} belongs to. Feeds the demand part of the score.`
          : `${listing.city} has no row in the survey table, so the Ontario-wide aggregate (Ontario 10,000+) applied. Feeds the demand part of the score.`
        : 'The engine default applied. Feeds the demand part of the score.',
    })

    // Days on market and rent trend: measured from the nightly comps table or
    // not observed at all (0 points). There is no default row to label (D-105).
    const d = input.demand ?? null
    const fsaNote = `${input.listing.postalCode ? input.listing.postalCode.slice(0, 3).toUpperCase() : 'the'} FSA`
    rows.push({
      key: 'rental_dom',
      label: 'Rental days on market',
      value:
        engine.rental_days_on_market != null
          ? `${engine.rental_days_on_market} days`
          : 'not observed · 0 of 3 points',
      basis: engine.rental_days_on_market != null ? 'observed' : 'default',
      source: NIGHTLY_COMPS,
      asOf: engine.rental_days_on_market != null ? input.createdAt.slice(0, 10) : null,
      method:
        engine.rental_days_on_market != null
          ? `Median days from first to last seen across ${d?.domSample ?? 0} listings in ${fsaNote} that left the market in the last ${MARKET_DEMAND.WINDOW_DAYS} days. Feeds the demand part of the score.`
          : `Fewer than ${MARKET_DEMAND.MIN_SAMPLE} listings in ${fsaNote} left the market in the last ${MARKET_DEMAND.WINDOW_DAYS} days (${d?.domSample ?? 0} did), so this input was not scored rather than assumed.`,
    })
    rows.push({
      key: 'rent_trend',
      label: 'Rent trend',
      value:
        engine.rent_trend != null
          ? `${engine.rent_trend}${d?.trendChangePct != null ? ` · ${pctSigned(d.trendChangePct)}` : ''}`
          : 'not observed · 0 of 3 points',
      basis: engine.rent_trend != null ? 'observed' : 'default',
      source: NIGHTLY_COMPS,
      asOf: engine.rent_trend != null ? input.createdAt.slice(0, 10) : null,
      method:
        engine.rent_trend != null
          ? `Median asking rent of the ${d?.recentSample ?? 0} listings first seen in the last ${MARKET_DEMAND.RECENT_DAYS} days against the ${d?.priorSample ?? 0} seen in the ${MARKET_DEMAND.WINDOW_DAYS - MARKET_DEMAND.RECENT_DAYS} days before, same bedroom count in ${fsaNote}; within ±${pctShort(MARKET_DEMAND.TREND_FLAT_BAND)} is flat. Feeds the demand part of the score.`
          : `Needs ${MARKET_DEMAND.MIN_SAMPLE} listings in each of the last ${MARKET_DEMAND.RECENT_DAYS} days and the ${MARKET_DEMAND.WINDOW_DAYS - MARKET_DEMAND.RECENT_DAYS} before (${d?.recentSample ?? 0} and ${d?.priorSample ?? 0} in ${fsaNote}), so this input was not scored rather than assumed.`,
    })
  }

  // ── Rent control (D-113) ──────────────────────────────────────────────────
  // Inferred from the build year, never from the first-occupancy date the law
  // actually turns on — so it is an estimate that says so, with the source.
  if (input.rentControl != null) {
    const rc = input.rentControl
    const label =
      rc.status === 'likely_controlled'
        ? 'likely rent-controlled'
        : rc.status === 'likely_exempt'
          ? 'likely exempt from the guideline'
          : 'unknown'
    const guide = rc.guidelines.map((g) => `${pctShort(g.rate)} for ${g.year}`).join(', ')
    rows.push({
      key: 'rent_control',
      label: 'Rent control',
      value: `${label} · confirm`,
      basis: 'estimate',
      source: `${rc.sourceTitle} (${rc.source}) · page updated ${rc.sourceUpdatedAt}`,
      asOf: rc.checkedAt,
      method:
        rc.basis === 'listing_build_year'
          ? `Inferred from the listed build year (${rc.yearBuilt}); the law turns on the date the unit was first occupied for residential purposes (exempt if after ${rc.exemptionFirstOccupancyAfter}). Guideline ${guide} by the year an increase takes effect; ${rc.minMonthsBetweenIncreases}-month spacing and ${rc.noticeDays} days' notice apply either way. Not a score input while inferred.`
          : `No build year on the listing, so nothing to infer from. Guideline ${guide} by the year an increase takes effect. Not a score input.`,
    })
  }

  // ── Location scores ───────────────────────────────────────────────────────
  if (input.walkScore != null) {
    rows.push({
      key: 'walk_score',
      label: 'Walk / Transit Score',
      value:
        input.walkScore.transit != null
          ? `${input.walkScore.walk} / ${input.walkScore.transit}`
          : `${input.walkScore.walk} / —`,
      basis: 'published',
      source: 'Walk Score API',
      asOf: input.walkScore.fetchedAt ?? input.createdAt,
      method: 'Fetched for the geocoded address at analysis time; not recomputed on later views.',
    })
  }

  if (input.travelTimesRouted != null) {
    rows.push(
      input.travelTimesRouted
        ? {
            key: 'travel_times',
            label: 'Travel times',
            value: 'routed',
            basis: 'published',
            source: 'Mapbox Directions (walking and driving profiles)',
            asOf: input.createdAt,
            method:
              'Door-to-door on the road and footpath network at analysis time; typical conditions, no live traffic.',
          }
        : {
            key: 'travel_times',
            label: 'Travel times',
            value: 'estimated',
            basis: 'estimate',
            source: PROPSCOUT_DEFAULT,
            asOf: null,
            method:
              'Straight-line distance at 30 km/h; the routing engine did not answer for this address.',
          }
    )
  }

  if (input.hasSunScout) rows.push(facadeRow(null))

  // ── Closing costs ─────────────────────────────────────────────────────────
  if (purchase && engine != null) {
    rows.push(
      {
        key: 'legal_fees',
        label: 'Legal fees',
        value: cad(engine.legal_fees),
        basis: 'default',
        source: PROPSCOUT_DEFAULT,
        asOf: null,
        method: 'Flat estimate in cash to close; Ontario quotes typically run $1,500–$2,500.',
      },
      {
        key: 'title_insurance',
        label: 'Title insurance',
        value: cad(engine.title_insurance),
        basis: 'default',
        source: PROPSCOUT_DEFAULT,
        asOf: null,
        method: 'Flat estimate in cash to close.',
      },
      {
        key: 'home_inspection',
        label: 'Home inspection',
        value: cad(engine.home_inspection),
        basis: 'default',
        source: PROPSCOUT_DEFAULT,
        asOf: null,
        method:
          'Flat estimate in cash to close; a condo status-certificate review is usually cheaper.',
      }
    )
  }

  return rows
}
