/**
 * PBCashOutflowSection — §01 Estimated monthly cash outflow (D-114).
 *
 * An itemised table of every monthly dollar out — mortgage payment (principal
 * and interest), taxes, condo fee, insurance, utilities, maintenance reserve —
 * each row saying where its figure came from, a highlighted total with the
 * modelled share, plus a right-side column with the "mortgage vs. everything
 * else" split and an affordability-income check. The lines and the share come
 * from lib/personalCashOutflow; this file only renders them.
 *
 * "Cash outflow", not "cost": the mortgage payment includes principal, which
 * is money moved, not money spent. "Estimated", not "true": a quarter of it
 * is modelled, and the rows say which.
 *
 * Design source: personal-sections.jsx > PBTrueCostSection
 */

import type { PersonalProperty, PersonalMonthlyCost } from '../../types/personal'
import { SectionHead } from '../shared/SectionHead'
import { fmtMoney, fmtPct } from '../../lib/investorCalc'
import {
  buildCashOutflowLines,
  modelledShare,
  COST_BASIS_LABEL,
  isStrataType,
  maintenanceNote,
} from '../../lib/personalCashOutflow'

// Re-exported for existing tests and callers.
export { isStrataType, maintenanceNote }

interface PBCashOutflowSectionProps {
  property: PersonalProperty
  monthly: PersonalMonthlyCost
}

export function PBCashOutflowSection({
  property,
  monthly,
}: PBCashOutflowSectionProps): JSX.Element {
  const allLines = buildCashOutflowLines(property, monthly)
  const modelled = modelledShare(allLines)

  const everythingElse = monthly.total - monthly.mortgage
  const impliedIncome = (monthly.total * 12) / 0.32

  return (
    <section className="container tr-section">
      <SectionHead
        n="01"
        topic="Estimated monthly cash outflow"
        question={
          <>
            What goes <em>out</em> every month to live here?
          </>
        }
        verdict={`${fmtMoney(monthly.total)}/mo · all-in estimate`}
        tone="pass"
      />

      <div
        className="grid-1col-mobile"
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
              key={l.key}
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
                  {l.label}
                </span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  <span
                    data-basis={l.basis}
                    style={{
                      color: l.basis === 'estimated' ? 'var(--caution)' : 'var(--muted)',
                    }}
                  >
                    {COST_BASIS_LABEL[l.basis]}
                  </span>
                  {' · '}
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
                {fmtMoney(l.value, { decimals: 0 })}
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
                Estimated monthly cash outflow
              </span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }} data-testid="modelled-share">
                {fmtMoney(modelled.amount, { decimals: 0 })} ({fmtPct(modelled.share, 0)}) based on
                modelled assumptions
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
            {/* "Adjust assumptions" used to sit here with no handler and no
                controls behind it; the personal report has no financing
                sliders yet (BACKLOG). */}
          </div>
        </div>
      </div>
    </section>
  )
}
