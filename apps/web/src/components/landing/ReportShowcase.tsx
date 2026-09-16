/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { Chip } from '../shared/Chip'
import { Icon } from '../shared/Icon'
import { VerdictPill } from '../shared/VerdictPill'
import { ShowcaseDealScore } from './ShowcaseDealScore'
import { ShowcaseRentalCompsBar } from './ShowcaseRentalCompsBar'
import { ShowcaseRentDistribution } from './ShowcaseRentDistribution'
import { ShowcaseVerdictBlock } from './ShowcaseVerdictBlock'
import { ShowcaseRiskRow } from './ShowcaseRiskRow'
import { HeroStaticMap } from './HeroStaticMap'

// ── ReportShowcase ────────────────────────────────────────────────────

export function ReportShowcase(): JSX.Element {
  return (
    <div
      className="card"
      style={{
        overflow: 'hidden',
        marginTop: 20,
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-pop)',
      }}
    >
      {/* Browser-style top bar */}
      <div
        className="row"
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
          gap: 12,
          background: 'var(--bg-elev)',
        }}
      >
        {/* Faux-browser window controls — decorative chrome, so neutral ink
           shades (not verdict tokens, which are reserved for report data) and
           theme-aware via color-mix. */}
        <div className="row gap-8">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: 'color-mix(in oklab, var(--ink) 26%, transparent)',
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: 'color-mix(in oklab, var(--ink) 18%, transparent)',
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: 'color-mix(in oklab, var(--ink) 12%, transparent)',
            }}
          />
        </div>
        <div
          className="row gap-8"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            padding: '5px 12px',
            borderRadius: 8,
            maxWidth: 480,
            fontFamily: "'Geist Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--pass)' }} />
          propscout.ca / report / unit-3705-28-charles-toronto
        </div>
        <div className="row gap-8">
          <Chip accent>Sample report · Tenant view</Chip>
        </div>
      </div>

      {/* Inner report content */}
      <div style={{ padding: 'clamp(20px, 2.4vw, 32px)' }}>
        {/* Header: address + tags */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div className="col gap-12">
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <Chip accent>For rent</Chip>
              <Chip>Toronto · M4Y</Chip>
              <Chip>1+den · 620 sqft · 37th flr</Chip>
              <Chip>Heat &amp; water included</Chip>
            </div>
            <h3
              className="serif"
              style={{ fontSize: 36, lineHeight: 1.05, letterSpacing: '-0.025em' }}
            >
              Unit 3705 · 28 Charles Street East
            </h3>
            <div
              className="row gap-16"
              style={{ color: 'var(--muted)', fontSize: 14, flexWrap: 'wrap' }}
            >
              <span>
                <span className="serif tabular" style={{ color: 'var(--ink)' }}>
                  $2,150
                </span>
                /mo asking
              </span>
              <span>·</span>
              <span>1+den · 1 bath</span>
              <span>·</span>
              <span>Parking $150/mo extra</span>
              <span>·</span>
              <span>Available March 1</span>
            </div>
          </div>
          <div className="row gap-12">
            <button className="btn btn-ghost">
              <Icon name="link" size={14} /> Share link
            </button>
            <button className="btn btn-primary">
              Save report <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>

        {/* Two-column report grid */}
        <div
          className="grid-1col-mobile"
          style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 22 }}
        >
          {/* Left column */}
          <div className="col" style={{ gap: 22 }}>
            <ShowcaseVerdictBlock
              addr="Unit 3705 · 28 Charles St E, Toronto ON"
              headline={
                <>
                  Do not sign at <span style={{ color: 'var(--accent)' }}>$2,150</span>. The room
                  marketed as a second bedroom is a den with a sliding glass door — no privacy, no
                  sound barrier, and almost certainly no exterior window. You are being asked to pay
                  a 2-bedroom premium for a 1-bedroom with a study.
                </>
              }
              sub={
                <>
                  Your negotiation target is{' '}
                  <span className="tabular" style={{ color: 'var(--accent)' }}>
                    $1,950–2,000
                  </span>
                  /mo. There are 14 competing rentals in this building right now and the unit has
                  been listed for 22 days — you have leverage. Before you go back, confirm in
                  writing whether the den has a window and whether parking is included.
                </>
              }
            />

            {/* Rent positioning */}
            <div className="card col gap-20" style={{ padding: 24 }}>
              {/* Wraps on a phone: at 375px the nowrap heading and the comp
                  count collided, and the meta line broke mid-phrase beside it. */}
              <div
                className="row"
                style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}
              >
                <h4 className="serif" style={{ fontSize: 22, paddingRight: 8 }}>
                  Rent positioning
                </h4>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  14 building comps · 22 nearby · 90d
                </span>
              </div>
              <ShowcaseRentDistribution mid={1950} ask={2150} />
              <ShowcaseRentalCompsBar low={1800} mid={1950} high={2300} ask={2150} />
            </div>

            {/* Listing accuracy */}
            <div className="card col gap-4" style={{ padding: 24 }}>
              <div
                className="row"
                style={{
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                <h4 className="serif" style={{ fontSize: 22 }}>
                  Listing accuracy
                </h4>
                <VerdictPill tone="caution" label="2 flags · 1 confirmation" />
              </div>
              <ShowcaseRiskRow
                tone="red"
                label="Possible non-bedroom"
                detail="Description mentions 'sliding glass door' — may not be a private, code-compliant second bedroom"
              />
              <ShowcaseRiskRow
                tone="amber"
                label="Parking status unclear"
                detail="Listing reads 'contact manager' — confirm cost and availability before signing"
              />
              <ShowcaseRiskRow
                tone="good"
                label="Utilities · confirmed"
                detail="Heat and water included by landlord · hydro & internet are tenant-paid"
              />
            </div>
          </div>

          {/* Right column */}
          <div className="col" style={{ gap: 22 }}>
            {/* Tenant scorecard */}
            <div className="card col" style={{ padding: 24, gap: 16, alignItems: 'center' }}>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Scout tenant score
              </span>
              <ShowcaseDealScore score={58} size={196} label="Tenant score / 100" />
              <div className="divider" style={{ margin: '4px 0' }} />
              <div className="col gap-8" style={{ width: '100%' }}>
                {(
                  [
                    ['Rent vs market', '12 / 25', 0.48],
                    ['Listing honesty', '6 / 20', 0.3],
                    ['Cost transparency', '14 / 20', 0.7],
                    ['Negotiation leverage', '18 / 20', 0.9],
                    ['Building demand', '8 / 15', 0.53],
                  ] as [string, string, number][]
                ).map(([lbl, val, pct]) => (
                  <div key={lbl} className="col gap-4">
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--ink-2)' }}>{lbl}</span>
                      <span className="mono tabular" style={{ color: 'var(--muted)' }}>
                        {val}
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 999, background: 'var(--line)' }}>
                      <div
                        style={{
                          width: `${pct * 100}%`,
                          height: '100%',
                          borderRadius: 999,
                          background:
                            pct > 0.6
                              ? 'var(--pass)'
                              : pct > 0.3
                                ? 'var(--caution)'
                                : 'var(--fail)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Negotiation card */}
            <div className="card col gap-12" style={{ padding: 22 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Negotiation
                </div>
                <VerdictPill tone="pass" label="Strong leverage" />
              </div>
              <div className="serif tabular" style={{ fontSize: 26, lineHeight: 1.1 }}>
                Target $1,950–2,000
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>/mo</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Save up to{' '}
                <span className="tabular" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                  $2,400
                </span>{' '}
                over a 12-month lease.
              </div>
              <div className="divider" />
              <div className="col gap-6">
                {(
                  [
                    ['Competing in building', '14 listings'],
                    ['Days on market', '22 days'],
                    ['Price drops', '1 · −$50 last week'],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div
                    key={k}
                    className="row"
                    style={{ justifyContent: 'space-between', fontSize: 12 }}
                  >
                    <span style={{ color: 'var(--muted)' }}>{k}</span>
                    <span className="mono tabular" style={{ color: 'var(--ink)' }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated monthly cash outflow */}
            <div className="card col gap-12" style={{ padding: 22 }}>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Est. monthly cash outflow
              </div>
              <div className="col gap-8">
                {(
                  [
                    ['Rent · at asking', '$2,150', false, ''],
                    ['Hydro · est.', '$65', false, ''],
                    ['Internet', '$70', false, ''],
                    ['Parking', '$150', false, ''],
                    ['Total at asking', '$2,435', true, ''],
                    ['Total at target', '$2,235', true, 'pass'],
                  ] as [string, string, boolean, string][]
                ).map(([k, v, bold, tone]) => (
                  <div
                    key={k}
                    className="row"
                    style={{
                      justifyContent: 'space-between',
                      fontSize: bold ? 13 : 12,
                      color: tone === 'pass' ? 'var(--pass)' : 'var(--ink-2)',
                      paddingTop: bold ? 6 : 0,
                      borderTop:
                        bold && k.startsWith('Total at asking') ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        color: bold
                          ? tone === 'pass'
                            ? 'var(--pass)'
                            : 'var(--ink)'
                          : 'var(--muted)',
                        fontWeight: bold ? 500 : 400,
                      }}
                    >
                      {k}
                    </span>
                    <span className="mono tabular" style={{ fontWeight: bold ? 600 : 500 }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comps map — PR10 part 4b: real Mapbox static map, the fastest
                "this is real estate" signal in the hero. */}
            <HeroStaticMap />
          </div>
        </div>
      </div>
    </div>
  )
}
