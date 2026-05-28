/**
 * LocationCommuteSection — §07 of the tenant report.
 *
 * Two-column layout:
 *   Left  — mobility scores (Walk / Transit / Bike) with progress bars
 *   Right — "From this address" distance table
 *
 * Each mobility score includes a coloured numeric value, a filled bar
 * showing the percentage, and a short description.
 *
 * Distance rows are coloured by tone: pass (normal ink) or caution (amber).
 */

import type { TenantMobilityScore, TenantDistanceRow } from '../../types/analysis'
import { SectionHead } from '../shared/SectionHead'

interface LocationCommuteSectionProps {
  mobilityScores: TenantMobilityScore[]
  distances: TenantDistanceRow[]
  /** Verdict text for the section header, e.g. "Excellent transit · limited walk" */
  verdict?: string
}

export function LocationCommuteSection({
  mobilityScores,
  distances,
  verdict = 'Excellent transit · limited walk',
}: LocationCommuteSectionProps): JSX.Element {
  // Overall tone: pass if at least one score is pass, caution otherwise
  const overallTone = mobilityScores.some((s) => s.tone === 'pass') ? 'pass' : 'caution'

  return (
    <section className="container tr-section" data-section="07">
      <SectionHead
        n="07"
        topic="Location & commute"
        question={
          <>
            What's it like to <em>live there</em>?
          </>
        }
        verdict={verdict}
        tone={overallTone}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* LEFT — mobility scores */}
        <div className="card col" style={{ padding: 28, gap: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Mobility scores
            </span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              via Walk Score · Mapbox
            </span>
          </div>

          <div className="col" style={{ gap: 20 }}>
            {mobilityScores.map((s) => (
              <div key={s.label} className="col" style={{ gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
                    {s.label}
                  </span>
                  <span
                    className="serif tabular"
                    style={{
                      fontSize: 28,
                      lineHeight: 1,
                      color: s.tone === 'pass' ? 'var(--pass)' : 'var(--caution)',
                    }}
                    aria-label={`${s.label}: ${s.val} out of 100`}
                  >
                    {s.val}
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>/100</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: 'var(--line)',
                    overflow: 'hidden',
                  }}
                  aria-hidden="true"
                >
                  <div
                    style={{
                      width: `${s.val}%`,
                      height: '100%',
                      background: s.tone === 'pass' ? 'var(--pass)' : 'var(--caution)',
                      borderRadius: 999,
                    }}
                  />
                </div>

                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — distance table */}
        <div className="card col" style={{ padding: 28, gap: 16 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            From this address
          </span>

          {distances.map((d, i) => (
            <div
              key={d.k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '13px 0',
                borderBottom: i < distances.length - 1 ? '1px solid var(--line)' : 'none',
                fontSize: 13,
                gap: 12,
              }}
            >
              <span style={{ color: 'var(--ink-2)' }}>{d.k}</span>
              <span
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <span
                  className="mono tabular"
                  style={{
                    color: d.tone === 'pass' ? 'var(--ink)' : 'var(--caution)',
                    fontWeight: 500,
                    fontSize: 13,
                  }}
                >
                  {d.v}
                </span>
                {d.unit && <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {d.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
