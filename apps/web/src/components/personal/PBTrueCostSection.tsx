/**
 * PBTrueCostSection — §01 True monthly cost of ownership.
 *
 * Shows an itemised table of every monthly cost (mortgage, taxes, insurance,
 * utilities, maintenance) with a highlighted total row, plus a right-side column
 * with the "mortgage vs. everything else" split and an affordability-income check.
 *
 * Design source: personal-sections.jsx > PBTrueCostSection
 */

import type { PersonalProperty, PersonalMonthlyCost } from '../../types/personal'
import { SectionHead } from '../shared/SectionHead'
import { fmtMoney, fmtPct } from '../../lib/investorCalc'

interface PBTrueCostSectionProps {
  property: PersonalProperty
  monthly: PersonalMonthlyCost
}

function maintenanceNote(yearBuilt: number): string {
  if (yearBuilt >= 2010) return '0.5% of value / yr · 2010+ build'
  if (yearBuilt >= 1980) return '1.0% of value / yr · 1980-era build'
  return '1.5% of value / yr · pre-1980 build'
}

export function PBTrueCostSection({ property, monthly }: PBTrueCostSectionProps): JSX.Element {
  const utilitiesTotal =
    monthly.utilities.hydro +
    monthly.utilities.gas +
    monthly.utilities.water +
    monthly.utilities.internet

  interface CostLine {
    k: string
    v: number
    note: string
    indent?: boolean
  }

  const topLines: CostLine[] = [
    {
      k: 'Mortgage',
      v: monthly.mortgage,
      note: `${Math.round(property.defaultDownPct * 100)}% down · ${(property.defaultRate * 100).toFixed(2)}% · ${property.defaultAmort}-yr amort`,
    },
    {
      k: 'Property tax',
      v: monthly.tax,
      note: `${fmtMoney(property.annualTaxes)}/yr`,
    },
    {
      k: 'Condo fee',
      v: monthly.condo,
      note: 'monthly maintenance fee',
    },
    {
      k: 'Insurance',
      v: monthly.insurance,
      note: 'detached / semi estimate',
    },
  ]

  const utilitiesSubRows: CostLine[] = [
    { k: 'Hydro', v: monthly.utilities.hydro, note: '11¢/kWh · avg consumption', indent: true },
    { k: 'Gas', v: monthly.utilities.gas, note: 'forced-air heating', indent: true },
    { k: 'Water', v: monthly.utilities.water, note: 'metered · municipal', indent: true },
    { k: 'Internet', v: monthly.utilities.internet, note: '1 Gbps · Rogers / Bell', indent: true },
  ]

  const bottomLines: CostLine[] = [
    {
      k: 'Maintenance reserve',
      v: monthly.maintenance,
      note: maintenanceNote(property.yearBuilt),
    },
  ]

  const allLines: CostLine[] = [
    ...topLines,
    { k: 'Utilities', v: utilitiesTotal, note: 'hydro · gas · water · internet' },
    ...utilitiesSubRows,
    ...bottomLines,
  ]

  const everythingElse = monthly.total - monthly.mortgage
  const impliedIncome = (monthly.total * 12) / 0.32

  return (
    <section className="container tr-section">
      <SectionHead
        n="01"
        topic="True monthly cost"
        question={
          <>
            What will it <em>really</em> cost to live here?
          </>
        }
        verdict={`${fmtMoney(monthly.total)}/mo · all-in`}
        tone="pass"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.3fr 1fr',
          gap: 22,
          alignItems: 'flex-start',
        }}
      >
        {/* Itemised table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {allLines.map((l, i) => (
            <div
              key={l.k}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr',
                padding: l.indent ? '8px 22px 8px 38px' : '14px 22px',
                borderBottom: i < allLines.length - 1 ? '1px solid var(--line)' : 'none',
                alignItems: 'center',
                background: l.indent
                  ? 'color-mix(in oklab, var(--bg-elev) 60%, var(--surface))'
                  : 'transparent',
              }}
            >
              <div className="col" style={{ gap: 2 }}>
                <span
                  style={{
                    fontSize: l.indent ? 13 : 14.5,
                    color: l.indent ? 'var(--ink-2)' : 'var(--ink)',
                    fontWeight: 500,
                  }}
                >
                  {l.k}
                </span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {l.note}
                </span>
              </div>
              <span
                className="mono tabular"
                style={{
                  textAlign: 'right',
                  fontSize: l.indent ? 13 : 16,
                  fontWeight: 500,
                  color: l.indent ? 'var(--ink-2)' : 'var(--ink)',
                }}
              >
                {fmtMoney(l.v, { decimals: 0 })}
              </span>
            </div>
          ))}

          {/* Total row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr',
              padding: '20px 22px',
              background: 'color-mix(in oklab, var(--accent) 6%, var(--bg-elev))',
              alignItems: 'center',
            }}
          >
            <div className="col" style={{ gap: 2 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                True monthly cost
              </span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Including everything you pay to keep the keys
              </span>
            </div>
            <span
              className="serif tabular"
              style={{ textAlign: 'right', fontSize: 30, lineHeight: 1, color: 'var(--accent)' }}
            >
              {fmtMoney(monthly.total)}
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>/mo</span>
            </span>
          </div>
        </div>

        {/* Right column */}
        <div className="col" style={{ gap: 16 }}>
          {/* Mortgage vs everything else */}
          <div className="card col" style={{ padding: 24, gap: 6 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Mortgage vs. the rest
            </span>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>
                {fmtMoney(monthly.mortgage)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>mortgage</span>
            </div>
            <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 8 }}>
              <span
                className="serif tabular"
                style={{ fontSize: 24, lineHeight: 1, color: 'var(--accent)' }}
              >
                + {fmtMoney(everythingElse)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>everything else</span>
            </div>
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              The number that catches first-time buyers off-guard. Taxes, insurance, utilities, and
              a real maintenance reserve add roughly{' '}
              <span className="tabular" style={{ color: 'var(--ink)' }}>
                {fmtPct(everythingElse / monthly.total, 0)}
              </span>{' '}
              on top of the mortgage every single month.
            </p>
          </div>

          {/* Affordability check */}
          <div className="card col" style={{ padding: 24, gap: 12 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Affordability check
            </span>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Lenders want shelter costs under{' '}
              <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                32%
              </span>{' '}
              of gross income. At {fmtMoney(monthly.total)}/mo, that implies a household income of
              at least{' '}
              <span className="tabular" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                {fmtMoney(impliedIncome, { decimals: 0 })}
              </span>
              .
            </p>
            <div className="row gap-12" style={{ marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>
                Adjust assumptions
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
