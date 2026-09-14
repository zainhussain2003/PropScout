/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { Icon } from '../shared/Icon'
import { ShowcaseDealScore } from './ShowcaseDealScore'
import { SectionHeader } from './SectionHeader'

// ── HowSection ────────────────────────────────────────────────────────

export function HowSection(): JSX.Element {
  const steps = [
    {
      n: '01',
      t: 'Paste any URL',
      d: 'A Realtor.ca listing link, or just the address. From a listing we read price, beds, taxes, condo fees, year built, photos — everything it exposes, structured.',
    },
    {
      n: '02',
      t: 'Tell us your angle',
      d: 'One question, two buttons. Investment or personal use. Tenant or landlord. The entire report adapts in place.',
    },
    {
      n: '03',
      t: 'Read the verdict',
      d: 'Numbers, comps, risk flags, schools, sun path, and a deterministic written verdict. Usually inside a minute.',
    },
  ]

  return (
    <section id="how" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div className="col gap-32">
        <SectionHeader tag="How it works" title={<>Three steps. Usually inside a minute.</>}>
          No exports, no spreadsheets, no hand-keying square footage. Three steps and the report is
          on your screen, ready to share.
        </SectionHeader>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 22,
          }}
        >
          {steps.map((s, i) => (
            <div key={s.n} className="card col" style={{ padding: 24, gap: 18, minHeight: 360 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span
                  className="mono"
                  style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--accent)' }}
                >
                  {s.n}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Step {i + 1} of 3
                </span>
              </div>
              <h3 className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>
                {s.t}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{s.d}</p>
              <div style={{ flex: 1 }} />
              {/* Step visual */}
              {s.n === '01' && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: 'var(--bg-elev)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 12,
                  }}
                >
                  <Icon name="link" size={14} />
                  <span style={{ color: 'var(--muted)' }}>
                    … / listing / <span style={{ color: 'var(--ink)' }}>28145902</span> /
                    vaughan-condo
                  </span>
                  <span style={{ flex: 1 }} />
                  <span
                    style={{
                      background: 'var(--ink)',
                      color: 'var(--bg)',
                      fontSize: 10,
                      padding: '4px 8px',
                      borderRadius: 6,
                      letterSpacing: '0.08em',
                    }}
                  >
                    ↵ ANALYZE
                  </span>
                </div>
              )}
              {s.n === '02' && (
                <div
                  className="col gap-8"
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: 'var(--bg-elev)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                    For-sale listing detected — what&apos;s this for?
                  </div>
                  <div className="row gap-8">
                    <button
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: 12, flex: 1 }}
                    >
                      Investment
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '8px 14px', fontSize: 12, flex: 1 }}
                    >
                      Personal use
                    </button>
                  </div>
                </div>
              )}
              {s.n === '03' && (
                <div
                  className="row gap-12"
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: 'var(--bg-elev)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <ShowcaseDealScore score={78} size={64} label="" />
                  <div className="col" style={{ gap: 4, justifyContent: 'center' }}>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                      }}
                    >
                      Verdict
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--ink)' }} className="serif">
                      Good deal — proceed with standard due diligence.
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
