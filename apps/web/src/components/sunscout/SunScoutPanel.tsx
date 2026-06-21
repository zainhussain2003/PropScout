/**
 * SunScoutPanel — §09 SunScout section for all 4 report types.
 *
 * Shows real solar data when analysis.sunScout is populated (geocoding succeeded).
 * Falls back to the Phase 2 placeholder when sunScout is null.
 */

import type { SunScoutResult } from '../../types/analysis'
import { DealScore } from '../analysis/DealScore'
import { SectionHead } from '../shared/SectionHead'
import { Chip } from '../shared/Chip'
import { Icon } from '../shared/Icon'

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

// Summer months (June=5, July=6, August=7) get full accent colour
const SUMMER_INDICES = new Set([5, 6, 7])

function verdictLabel(v: SunScoutResult['verdict']): string {
  const MAP: Record<SunScoutResult['verdict'], string> = {
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    below_average: 'Below average',
    poor: 'Poor',
  }
  return MAP[v]
}

function verdictTone(v: SunScoutResult['verdict']): 'pass' | 'caution' | 'fail' {
  if (v === 'excellent' || v === 'good') return 'pass'
  if (v === 'below_average' || v === 'poor') return 'fail'
  return 'caution'
}

// ── Placeholder (shown when lat/lng unavailable) ──────────────────────────────

function SunScoutPlaceholder({ sectionNumber }: { sectionNumber: string }): JSX.Element {
  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead
        n={sectionNumber}
        topic="SunScout"
        question={
          <>
            How <em>well-lit</em> is the unit?
          </>
        }
        verdict="Modeling · Phase 2"
        tone="caution"
      />

      <div
        className="card col"
        style={{ padding: 40, gap: 20, alignItems: 'center', textAlign: 'center' }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            background: 'color-mix(in oklab, var(--caution) 14%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="sun" size={28} />
        </div>

        <div className="col" style={{ gap: 8, maxWidth: 560 }}>
          <Chip>Coming Phase 2</Chip>
          <h4 className="serif" style={{ fontSize: 24 }}>
            Solar path analysis — shipping Q3 2026.
          </h4>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            SunScout uses NASA NREL sun-path data to show peak sun hours by season and window
            orientation. Available once address geocoding is confirmed for this property.
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Live section (shown when sunScout data is present) ────────────────────────

interface Props {
  sunScout: SunScoutResult | null
  sectionNumber?: string
}

export function SunScoutPanel({ sunScout, sectionNumber = '09' }: Props): JSX.Element {
  if (!sunScout) {
    return <SunScoutPlaceholder sectionNumber={sectionNumber} />
  }

  const max = Math.max(...sunScout.monthlyHours, 1)

  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead
        n={sectionNumber}
        topic="SunScout"
        question={
          <>
            How <em>well-lit</em> is the unit?
          </>
        }
        verdict={`${verdictLabel(sunScout.verdict)} · ${sunScout.sunScore.toFixed(0)}/100`}
        tone={verdictTone(sunScout.verdict)}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: 16,
        }}
      >
        {/* Left: light score gauge */}
        <div
          className="card col"
          style={{ padding: 28, alignItems: 'center', textAlign: 'center', gap: 16 }}
        >
          <DealScore score={sunScout.sunScore} size="md" label="" showVerdict={false} />
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Light score / 100
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
            {sunScout.summerDailyHours.toFixed(1)}h/day summer ·{' '}
            {sunScout.winterDailyHours.toFixed(1)}h/day winter
          </div>
        </div>

        {/* Right: 12-month bar chart */}
        <div className="card col" style={{ padding: 28, gap: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Hours of direct sun · monthly
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              NREL SPA · pvlib
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
            {sunScout.monthlyHours.map((h, i) => (
              <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <span
                  className="mono tabular"
                  style={{ fontSize: 9, color: 'var(--muted)', lineHeight: 1 }}
                >
                  {Math.round(h)}
                </span>
                <div
                  style={{
                    width: '100%',
                    height: `${(h / max) * 72}px`,
                    minHeight: 2,
                    background: SUMMER_INDICES.has(i)
                      ? 'var(--accent)'
                      : 'color-mix(in oklab, var(--accent) 35%, transparent)',
                    borderRadius: 3,
                  }}
                />
                <span className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>
                  {MONTH_LABELS[i]}
                </span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            {sunScout.annualPeakSunHours.toFixed(0)} estimated annual peak sun hours (primary
            window). Bright units rent 8–14% faster than comparable dim units.
          </p>
        </div>
      </div>
    </section>
  )
}
