/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { Chip } from '../shared/Chip'
import { ShowcaseDealScore } from './ShowcaseDealScore'

// ── SunScoutSection ───────────────────────────────────────────────────

export function LandingSunScoutSection(): JSX.Element {
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const hours = [62, 78, 110, 138, 168, 184, 188, 168, 132, 96, 64, 52]
  const maxH = Math.max(...hours)

  return (
    <section id="sunscout" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div
        className="grid-1col-mobile"
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(36px, 5vw, 64px)',
          display: 'grid',
          gridTemplateColumns: '1.05fr 1fr',
          gap: 'clamp(32px, 5vw, 72px)',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="section-tag" style={{ marginBottom: 24 }}>
            SunScout™
          </span>
          <h2
            className="serif"
            style={{ textWrap: 'balance', marginBottom: 24 } as React.CSSProperties}
          >
            How much direct sun each window gets, by hour and by month.
          </h2>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', marginBottom: 28 }}>
            We run NREL&apos;s solar position algorithm against the property&apos;s coordinates,
            then weight by window orientation and surrounding obstructions. The result is a single
            light score, plus a seasonal arc you can show a tenant before they sign.
          </p>
          <div className="row gap-16" style={{ flexWrap: 'wrap' }}>
            <Chip accent>South-facing · 6.2hr/day avg</Chip>
            <Chip>14th floor</Chip>
            <Chip>No tall neighbours within 100m</Chip>
          </div>
        </div>

        <div className="col gap-16">
          {/* Light score gauge */}
          <div
            className="card sun-score-summary"
            style={{
              padding: 24,
              display: 'grid',
              gridTemplateColumns: 'minmax(130px, 0.7fr) minmax(0, 1fr)',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <div className="col gap-8" style={{ alignItems: 'center', minWidth: 0 }}>
              <ShowcaseDealScore score={84} size={130} label="" />
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  textAlign: 'center',
                  overflowWrap: 'anywhere',
                }}
              >
                Light score / 100
              </div>
            </div>
            <div className="col gap-12" style={{ minWidth: 0 }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Annual direct sun · weighted
              </div>
              <div
                className="serif tabular"
                style={{
                  fontSize: 'clamp(28px, 3.2vw, 36px)',
                  lineHeight: 1,
                  overflowWrap: 'anywhere',
                }}
              >
                1,512 <span style={{ color: 'var(--muted)', fontSize: 16 }}> hrs / yr</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Bedroom (S){' '}
                <span className="mono tabular" style={{ marginLeft: 8 }}>
                  1,140h
                </span>{' '}
                · Living (W){' '}
                <span className="mono tabular" style={{ marginLeft: 8 }}>
                  720h
                </span>
              </div>
            </div>
          </div>

          {/* Seasonal bar chart */}
          <div className="card col gap-16" style={{ padding: 24 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Hours of direct sun · 2026
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>
                S · 180°
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
              {hours.map((h, i) => (
                <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${(h / maxH) * 64}px`,
                      background:
                        i >= 4 && i <= 7
                          ? 'var(--accent)'
                          : 'color-mix(in oklab, var(--accent) 35%, transparent)',
                      borderRadius: 3,
                    }}
                  />
                  <span className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>
                    {months[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
