/**
 * AssumptionLedgerSection — where every modelled number in the report came
 * from, when it was current, and how it is used (D-088).
 *
 * The landing page promises a source, a date and a method for every number.
 * This is that promise, kept honestly: a row is Observed (the listing said
 * so), Published (a named feed or table, with its date), an Estimate (a
 * stated PropScout formula) or a Default (a starting constant with nothing
 * behind it). The verdict counts the defaults so nobody has to hunt for them.
 *
 * Rows come from the API (`analysis.assumptions`); this component adds no
 * numbers of its own. Null entries — a report saved before the ledger
 * shipped — render nothing rather than an empty table.
 */

import type { AssumptionBasis, AssumptionEntry } from '../../types/analysis'
import { SectionHead } from '../shared/SectionHead'

interface AssumptionLedgerSectionProps {
  entries: AssumptionEntry[] | null | undefined
  /** Two-digit section number; "12" on the investor report. */
  sectionNumber?: string
}

const BASIS_LABEL: Record<AssumptionBasis, string> = {
  observed: 'Observed',
  published: 'Published',
  estimate: 'Estimate',
  default: 'Default',
}

const BASIS_COLOR: Record<AssumptionBasis, string> = {
  observed: 'var(--pass)',
  published: 'var(--accent)',
  estimate: 'var(--caution)',
  default: 'var(--muted)',
}

/** "2026-09-12T14:00:00.000Z" → "12 Sep 2026"; a bare year stays a year. */
function formatAsOf(iso: string): string {
  if (/^\d{4}$/.test(iso)) return iso
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function AssumptionLedgerSection({
  entries,
  sectionNumber = '12',
}: AssumptionLedgerSectionProps): JSX.Element | null {
  if (!entries || entries.length === 0) return null

  const defaults = entries.filter((e) => e.basis === 'default').length
  const total = entries.length

  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead
        n={sectionNumber}
        topic="Sources"
        question={
          <>
            Where do the numbers <em>come from</em>?
          </>
        }
        verdict={`${defaults} of ${total} are defaults`}
        tone={defaults === 0 ? 'pass' : defaults * 2 > total ? 'caution' : 'pass'}
      />

      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: 680 }}>
        Every modelled figure behind this report, with what it rests on. A{' '}
        <strong style={{ color: 'var(--ink)' }}>Default</strong> is a starting constant with no
        external source — replace it with a quote or a bill and the report gets better.
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13.5,
              minWidth: 640,
            }}
          >
            <thead>
              <tr
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  Number
                </th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  Value
                </th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  Basis
                </th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  Source · method
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.key} style={{ verticalAlign: 'top' }}>
                  <td
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--line)',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {e.label}
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--line)',
                      whiteSpace: 'nowrap',
                      color: 'var(--ink)',
                    }}
                  >
                    {e.value}
                  </td>
                  <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                    <span
                      className="mono"
                      style={{
                        display: 'inline-block',
                        fontSize: 10.5,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: 999,
                        color: BASIS_COLOR[e.basis],
                        border: `1px solid color-mix(in oklab, ${BASIS_COLOR[e.basis]} 45%, transparent)`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {BASIS_LABEL[e.basis]}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--line)',
                      color: 'var(--ink-2)',
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ color: 'var(--ink)' }}>
                      {e.source}
                      {e.asOf != null && (
                        <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          {' '}
                          · as of {formatAsOf(e.asOf)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13 }}>{e.method}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
