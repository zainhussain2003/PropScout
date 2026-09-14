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

import type { AssumptionEntry, ReportMode } from '../types/analysis'
import { RENT_TO_PRICE_MONTHLY } from '../constants/valuation'

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
  }
  engine: EngineAssumptions | null
  rate: { rate: number; source: 'live' | 'cached' | 'fallback'; fetchedAt: string | null } | null
  /** Comps behind the rent estimate; null when the rent was proxied or observed. */
  comps: { compCount: number; radiusKm: number | null; confidence: string } | null
  rentMid: number
  /** True on a for-rent listing whose value was modelled from rent. */
  priceEstimated: boolean
  annualTaxesUsed: number
  annualTaxesEstimated: boolean
  /** Whether the city had its own row in the CMHC table (else the province default). */
  cmhcCityMatched: boolean
  /** Walk Score result, when the API returned one. */
  walkScore?: { walk: number; transit: number | null; fetchedAt?: string } | null
}

/** Year the municipal tax-rate table was last refreshed (constants/propertyTaxRates.ts). */
const TAX_RATE_TABLE_YEAR = '2025'

const PROPSCOUT_DEFAULT = 'PropScout default — no external source'

/** Fixed decimals so "5.20%" reads as a quoted rate, not "5.2". */
function pct(v: number, digits = 2): string {
  return `${(v * 100).toFixed(digits)}%`
}
/** Trailing zeros dropped: 0.005 → "0.5%". */
function pctShort(v: number): string {
  return `${parseFloat((v * 100).toFixed(2))}%`
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
  const purchase = mode === 'investor' || mode === 'personal'
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
        `Median of asking rents within ${comps.radiusKm ?? '—'} km with outliers removed; ` +
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
  if (input.priceEstimated) {
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
  if (purchase && engine != null) {
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
    rows.push({
      key: 'vacancy_market',
      label: 'Market vacancy rate',
      value: pct(engine.cmhc_vacancy_rate, 1),
      // The per-city table is documented as placeholder values, and the engine's
      // own fallback has no source at all — neither is "published" yet.
      basis: 'default',
      source: engine.cmhc_vacancy_rate_supplied
        ? 'PropScout table keyed to the CMHC Rental Market Survey — placeholder values pending a refresh from the survey'
        : PROPSCOUT_DEFAULT,
      asOf: null,
      method: engine.cmhc_vacancy_rate_supplied
        ? input.cmhcCityMatched
          ? `${listing.city} row of the table. Feeds the demand part of the score.`
          : `${listing.city} has no CMHC figure on file, so the province-wide default applied. Feeds the demand part of the score.`
        : 'The engine default applied. Feeds the demand part of the score.',
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
