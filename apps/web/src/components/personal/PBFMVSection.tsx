/**
 * PBFMVSection — §02 Fair market value positioning.
 *
 * Shows the asking price pinned on a gradient bar between the FMV low/mid/high
 * range, with a verdict pill (Below market / At market / Above market) and
 * quick summary stats (comp count, avg DOM, median $/sqft, this listing $/sqft).
 *
 * Design source: personal-sections-2.jsx > PBFMVSection
 */

import type { PersonalProperty } from '../../types/personal'
import type { HomeScore } from '../../types/personal'
import { SectionHead } from '../shared/SectionHead'
import { VerdictPill } from '../shared/VerdictPill'
import { fmtMoney } from '../../lib/investorCalc'

interface PBFMVSectionProps {
  property: PersonalProperty
  score: HomeScore
  /** Number of verified comparable sales (shown in summary stats row). Default 8. */
  compCount?: number
  /** Average days on market for comps. Default 12. */
  avgDOM?: number
  /** Median $/sqft from comps. Default computed from property price / sqft. */
  medianPPSqft?: number
  /**
   * When true, FMV values are ±5% estimates rather than comp-derived.
   * Renders ~ prefix on all three values and an "Estimated range" footnote.
   */
  isEstimated?: boolean
}

function getFMVVerdict(
  price: number,
  fmv: PersonalProperty['fmv']
): { label: string; tone: 'pass' | 'caution' | 'fail' } {
  if (price <= fmv.low + (fmv.mid - fmv.low) * 0.3) {
    return { label: 'Below market', tone: 'pass' }
  }
  if (price <= fmv.mid + (fmv.high - fmv.mid) * 0.3) {
    return { label: 'At market', tone: 'pass' }
  }
  return { label: 'Above market', tone: 'caution' }
}

export function PBFMVSection({
  property,
  score,
  compCount = 8,
  avgDOM = 12,
  medianPPSqft,
  isEstimated = false,
}: PBFMVSectionProps): JSX.Element {
  const { fmv } = property
  const range = fmv.high - fmv.low
  const askPos =
    range > 0 ? Math.min(100, Math.max(0, ((property.price - fmv.low) / range) * 100)) : 50
  const { label: verdictLabel, tone: verdictTone } = getFMVVerdict(property.price, fmv)
  const thisPPSqft = Math.round(property.price / property.sqft)
  const medianPP = medianPPSqft ?? thisPPSqft

  return (
    <section className="container tr-section">
      <SectionHead
        n="02"
        topic="Fair market value"
        question={
          <>
            Is it priced <em>fairly</em>?
          </>
        }
        verdict={verdictLabel}
        tone={verdictTone}
      />

      {isEstimated && (
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '0.12em',
            marginBottom: 16,
          }}
        >
          Estimated range · real comps in Phase 2
        </p>
      )}

      <div className="card" style={{ padding: 28 }}>
        {/* Header row — asking price + % vs P50 */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 18,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div className="col" style={{ gap: 4 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Asking
            </span>
            <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>
                {fmtMoney(property.price)}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 12,
                  color: score.askVsMid <= 0 ? 'var(--pass)' : 'var(--caution)',
                }}
              >
                {score.askVsMid >= 0 ? '+' : '−'}
                {Math.abs(score.askVsMid * 100).toFixed(1)}% vs P50
              </span>
            </div>
          </div>
          <VerdictPill tone={verdictTone} label={verdictLabel} />
        </div>

        {/* Range bar */}
        <div
          role="img"
          aria-label={`Fair market value range: $${fmv.low.toLocaleString()} to $${fmv.high.toLocaleString()}, median $${fmv.mid.toLocaleString()}, asking $${property.price.toLocaleString()}`}
          style={{ position: 'relative', height: 32, marginTop: 10, marginBottom: 18 }}
        >
          {/* Gradient track */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              left: 0,
              right: 0,
              height: 12,
              borderRadius: 999,
              background:
                'linear-gradient(90deg, color-mix(in oklab, var(--accent) 18%, var(--bg-elev)), color-mix(in oklab, var(--accent) 55%, transparent), color-mix(in oklab, var(--accent) 18%, var(--bg-elev)))',
            }}
          />
          {/* P25 / P50 / P75 ticks */}
          {[0, 50, 100].map((p) => (
            <div
              key={p}
              style={{
                position: 'absolute',
                left: `${p}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 1.5,
                height: 14,
                background: 'var(--ink)',
                opacity: p === 50 ? 0.4 : 0.18,
              }}
            />
          ))}
          {/* Ask marker */}
          <div
            style={{
              position: 'absolute',
              left: `${askPos}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                background: 'var(--ink)',
                borderRadius: 4,
                transform: 'rotate(45deg)',
                border: '3px solid var(--surface)',
                boxShadow: '0 4px 10px rgba(14,19,32,0.2)',
              }}
            />
          </div>
        </div>

        {/* Percentile labels */}
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
          {(
            [
              { lbl: 'P25 · low', val: fmv.low, align: 'flex-start' },
              { lbl: 'P50 · median', val: fmv.mid, align: 'center' },
              { lbl: 'P75 · high', val: fmv.high, align: 'flex-end' },
            ] as const
          ).map((t) => (
            <div key={t.lbl} className="col" style={{ alignItems: t.align, gap: 2 }}>
              <div
                className="mono"
                style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}
              >
                {t.lbl}
              </div>
              <div
                className="mono tabular"
                style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}
              >
                {isEstimated ? '~' : ''}
                {fmtMoney(t.val)}
              </div>
            </div>
          ))}
        </div>

        <div className="divider" style={{ marginBottom: 16 }} />

        {/* Quick stats */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 13,
            color: 'var(--muted)',
          }}
        >
          <span className="row gap-8">
            <span>Comparable sales considered</span>
            <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              {compCount} verified
            </span>
          </span>
          <span className="row gap-8">
            <span>Average days on market</span>
            <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              {avgDOM} days
            </span>
          </span>
          <span className="row gap-8">
            <span>Median $/sqft</span>
            <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              ${medianPP}
            </span>
          </span>
          <span className="row gap-8">
            <span>This listing $/sqft</span>
            <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              ${thisPPSqft}
            </span>
          </span>
        </div>
      </div>
    </section>
  )
}
