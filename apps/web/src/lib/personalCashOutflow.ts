/**
 * The personal report's monthly cash-outflow lines, each with where its
 * figure came from (D-114).
 *
 *   listing        the listing stated it (condo fee, listed taxes)
 *   user_provided  the person typed it on the address path
 *   calculated     arithmetic on stated inputs (the mortgage payment)
 *   estimated      a PropScout model stood in for a fact (tax from the
 *                  municipal rate, insurance, utilities, maintenance)
 *
 * The modelled share is computed from the lines, never maintained by hand:
 * estimated dollars ÷ total outflow. Pure — the section only renders it.
 */

import type { PersonalMonthlyCost, PersonalProperty } from '../types/personal'
import { fmtMoney } from './investorCalc'

export type CostBasis = 'listing' | 'user_provided' | 'calculated' | 'estimated'

export const COST_BASIS_LABEL: Record<CostBasis, string> = {
  listing: 'From listing',
  user_provided: 'You entered',
  calculated: 'Calculated',
  estimated: 'Estimated',
}

export interface CashOutflowLine {
  key: string
  label: string
  /** Monthly dollars. */
  value: number
  basis: CostBasis
  /** How the figure was arrived at, one line. */
  note: string
  /** Indented sub-row (the utilities breakdown); not counted twice in totals. */
  indent?: boolean
  /** A parent row whose value is the sum of its indented children. */
  aggregate?: boolean
}

/** Property types that carry a maintenance fee even when the listing omits it. */
export function isStrataType(propertyType: string): boolean {
  return /condo|apartment|townhouse|townhome|town home|stacked|loft/i.test(propertyType)
}

/** The maintenance reserve rate and the build era it came from. */
export function maintenanceNote(yearBuilt: number): string {
  if (yearBuilt <= 0) return '1.5% of value / yr · build year unknown'
  if (yearBuilt >= 2010) return '0.5% of value / yr · 2010+ build'
  if (yearBuilt >= 1980) return '1.0% of value / yr · 1980-era build'
  return '1.5% of value / yr · pre-1980 build'
}

export function buildCashOutflowLines(
  property: PersonalProperty,
  monthly: PersonalMonthlyCost
): CashOutflowLine[] {
  const stated: CostBasis = property.factsEntered ? 'user_provided' : 'listing'
  const taxKnown = property.annualTaxesKnown !== false && property.annualTaxes > 0

  const lines: CashOutflowLine[] = [
    {
      key: 'mortgage',
      label: 'Mortgage',
      value: monthly.mortgage,
      basis: 'calculated',
      note: `${Math.round(property.defaultDownPct * 100)}% down · ${(property.defaultRate * 100).toFixed(2)}% · ${property.defaultAmort}-yr amort · principal and interest`,
    },
    {
      key: 'tax',
      label: 'Property tax',
      value: monthly.tax,
      basis: taxKnown ? stated : 'estimated',
      note:
        property.annualTaxes > 0
          ? `${fmtMoney(property.annualTaxes)}/yr · ${taxKnown ? (property.factsEntered ? 'as you entered it' : 'as listed') : 'from the municipal rate · verify'}`
          : '— · not available',
    },
  ]

  // A freehold house has no condo fee; the row stays for a condo/townhouse
  // whose fee the listing did not state, and says so.
  if (monthly.condo > 0 || isStrataType(property.propertyType)) {
    lines.push({
      key: 'condo',
      label: 'Condo fee',
      value: monthly.condo,
      basis: monthly.condo > 0 ? stated : 'estimated',
      note: monthly.condo > 0 ? 'monthly maintenance fee' : 'not listed · confirm the fee',
    })
  }

  lines.push({
    key: 'insurance',
    label: 'Insurance',
    value: monthly.insurance,
    basis: 'estimated',
    note: '0.35% of value / yr · confirm a quote',
  })

  const utilities = monthly.utilities
  lines.push(
    {
      key: 'utilities',
      label: 'Utilities',
      value: utilities.total,
      basis: 'estimated',
      note: 'hydro · gas · water · internet',
      aggregate: true,
    },
    {
      key: 'hydro',
      label: 'Hydro',
      value: utilities.hydro,
      basis: 'estimated',
      note: 'size-based estimate · confirm',
      indent: true,
    },
    {
      key: 'gas',
      label: 'Gas',
      value: utilities.gas,
      basis: 'estimated',
      note: 'size-based estimate · confirm',
      indent: true,
    },
    {
      key: 'water',
      label: 'Water',
      value: utilities.water,
      basis: 'estimated',
      note: 'estimate · confirm',
      indent: true,
    },
    {
      key: 'internet',
      label: 'Internet',
      value: utilities.internet,
      basis: 'estimated',
      note: 'estimate · confirm',
      indent: true,
    }
  )

  lines.push({
    key: 'maintenance',
    label: 'Maintenance reserve',
    value: monthly.maintenance,
    basis: 'estimated',
    note: maintenanceNote(property.yearBuilt),
  })

  return lines
}

/** Estimated dollars and their share of the total; aggregates are skipped so utilities count once. */
export function modelledShare(lines: CashOutflowLine[]): { amount: number; share: number } {
  const counted = lines.filter((l) => !l.aggregate)
  const total = counted.reduce((s, l) => s + l.value, 0)
  const amount = counted.filter((l) => l.basis === 'estimated').reduce((s, l) => s + l.value, 0)
  return { amount, share: total > 0 ? amount / total : 0 }
}
