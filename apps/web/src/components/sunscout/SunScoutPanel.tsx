/**
 * SunScoutPanel — §09 SunScout section for all 4 report types.
 *
 * Shows real solar data when analysis.sunScout is populated (geocoding succeeded).
 * Falls back to the Phase 2 placeholder when sunScout is null.
 */

import { useEffect, useState, type ReactNode } from 'react'
import type { SunScoutResult } from '../../types/analysis'
import { DealScore } from '../analysis/DealScore'
import { SectionHead } from '../shared/SectionHead'
import { Chip } from '../shared/Chip'
import { Icon } from '../shared/Icon'
import { recalculateSunScout } from '../../lib/services/sunScoutService'

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

// Compass point → facade bearing in degrees. 180 (south) is the pipeline's
// default assumption — the selector exists to turn that assumption into input.
const FACADE_OPTIONS: Array<{ label: string; bearing: number }> = [
  { label: 'North', bearing: 0 },
  { label: 'North-east', bearing: 45 },
  { label: 'East', bearing: 90 },
  { label: 'South-east', bearing: 135 },
  { label: 'South', bearing: 180 },
  { label: 'South-west', bearing: 225 },
  { label: 'West', bearing: 270 },
  { label: 'North-west', bearing: 315 },
]

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

function SunScoutPlaceholder({
  sectionNumber,
  question,
}: {
  sectionNumber: string
  question: ReactNode
}): JSX.Element {
  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead
        n={sectionNumber}
        topic="SunScout"
        question={question}
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
  /** Live analysis token — enables the facade-direction recalc input.
   * Demo pages pass nothing (there is no analysis to recalculate against). */
  token?: string | null
  /** Mode-specific section question — each report type words it differently
   * in the designs (investor "How well-lit…", tenant "How much light…"). */
  question?: ReactNode
}

const DEFAULT_QUESTION = (
  <>
    How <em>well-lit</em> is the unit?
  </>
)

export function SunScoutPanel({
  sunScout,
  sectionNumber = '09',
  token,
  question = DEFAULT_QUESTION,
}: Props): JSX.Element {
  // Local copy so a facade-direction recalc updates the panel in place.
  const [current, setCurrent] = useState<SunScoutResult | null>(sunScout)
  const [bearing, setBearing] = useState(180)
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    setCurrent(sunScout)
  }, [sunScout])

  if (!current) {
    return <SunScoutPlaceholder sectionNumber={sectionNumber} question={question} />
  }
  const sunScoutData = current

  const handleBearingChange = (next: number): void => {
    setBearing(next)
    if (!token) return
    setRecalculating(true)
    void recalculateSunScout(token, next)
      .then((result) => {
        // On failure keep the current data — never blank the section.
        if (result != null) setCurrent(result)
      })
      .finally(() => setRecalculating(false))
  }

  const max = Math.max(...sunScoutData.monthlyHours, 1)

  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead
        n={sectionNumber}
        topic="SunScout"
        question={question}
        verdict={`${verdictLabel(sunScoutData.verdict)} · ${sunScoutData.sunScore.toFixed(0)}/100`}
        tone={verdictTone(sunScoutData.verdict)}
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
          <DealScore
            score={sunScoutData.sunScore}
            max={100}
            size="lg"
            label=""
            showVerdict={false}
          />
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
            {sunScoutData.summerDailyHours.toFixed(1)}h/day summer ·{' '}
            {sunScoutData.winterDailyHours.toFixed(1)}h/day winter
          </div>

          {token ? (
            // The sun model needs a facade direction; default is the pipeline's
            // south assumption. Letting the user set it turns assumption → input.
            <label
              className="col"
              style={{
                gap: 6,
                width: '100%',
                alignItems: 'center',
                opacity: recalculating ? 0.6 : 1,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Primary facade faces
              </span>
              <select
                value={String(bearing)}
                disabled={recalculating}
                onChange={(e) => handleBearingChange(Number(e.target.value))}
                style={{
                  font: "500 13px/1.2 'Geist', sans-serif",
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--line-strong)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                {FACADE_OPTIONS.map((o) => (
                  <option key={o.bearing} value={String(o.bearing)}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
              Assumes south-facing primary facade
            </div>
          )}
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
            {sunScoutData.monthlyHours.map((h, i) => (
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
            {sunScoutData.annualPeakSunHours.toFixed(0)} estimated annual peak sun hours (primary
            window). Bright units rent 8–14% faster than comparable dim units.
          </p>
        </div>
      </div>
    </section>
  )
}
