/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { VerdictPill } from '../shared/VerdictPill'
import { SectionHeader } from './SectionHeader'
import { ModeStatTiles } from './ModeStatTiles'
import { ModePreview } from './ModePreview'

export function ReportsSection(): JSX.Element {
  const modes = [
    {
      who: 'Tenant',
      tag: 'For rent',
      title: "I'm looking at a rental",
      copy: "Free, no login. Flags fake bedrooms, basement units, missing parking, and overpriced asks. Tells you exactly where to negotiate to — and saves you the deposit on a unit that wasn't what it said it was.",
      stats: [
        ['Asking', '$2,150', ''] as [string, string, string],
        ['Fair range', '$1,950–2,000', 'pass'] as [string, string, string],
        ['Leverage', 'Strong', 'pass'] as [string, string, string],
      ],
      tag2: 'Free forever',
    },
    {
      who: 'Personal buyer',
      tag: 'For sale',
      title: "I'm buying a home to live in",
      copy: 'True monthly cost of ownership, walk/transit, nearby schools with EQAO scores, sun exposure. The home you can live in, not just close on.',
      stats: [
        ['Monthly cost', '$4,733', ''],
        ['Walk score', '80', 'pass'],
        ['Sun score', '87 / 100', 'pass'],
      ] as [string, string, string][],
    },
    {
      who: 'Investor',
      tag: 'For sale',
      title: "I'm running it as a rental",
      copy: 'Cap rate, cash flow, DSCR, OSFI stress test, Ontario LTT, and our 0–100 deal score — modelled for Canadian rules, not bolted on.',
      stats: [
        ['Cap rate', '4.8%', 'pass'],
        ['Cash flow', '−$1,833', 'fail'],
        ['DSCR', '0.45×', 'fail'],
      ] as [string, string, string][],
      verdict: { tone: 'fail' as const, label: 'Hard pass' },
    },
    {
      who: 'Landlord',
      tag: 'For rent',
      title: "I'm pricing out my own unit",
      copy: 'Test whether your listed rent pencils against the building, the FSA, and the trend line — before you sign a year-long lease at the wrong number.',
      stats: [
        ['Yield', '5.2%', 'pass'],
        ['Vs. market', '+ $50', 'pass'],
        ['Building supply', '24 listings', 'caution'],
      ] as [string, string, string][],
    },
  ]

  const [tenantMode, ...paidModes] = modes

  return (
    <section id="reports" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div className="col gap-32">
        <SectionHeader
          tag="One URL · the report adapts to you"
          title={<>One link. One question. Four different reports.</>}
        >
          PropScout detects whether the listing is for sale or for rent, then asks who you are. A
          tenant, a buyer, an investor, and a landlord need different answers from the same address
          — so the entire report changes shape.
        </SectionHeader>

        {/* PR10 part 6 — the page's one deliberate asymmetry: the tenant
            report (the free funnel) gets a full-width dominant card; the
            three paid modes hold a disciplined row beneath it. */}
        <div className="col" style={{ gap: 22, marginTop: 24 }}>
          <article className="card" style={{ overflow: 'hidden' }}>
            <div
              className="grid-1col-mobile"
              style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 0 }}
            >
              <div style={{ padding: 14 }}>
                <ModePreview who={tenantMode.who} large />
              </div>

              <div
                className="col gap-16"
                style={{ padding: 'clamp(24px, 3vw, 40px)', justifyContent: 'center' }}
              >
                <div className="col gap-8">
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                    }}
                  >
                    For the tenant
                  </div>
                  <h3
                    className="serif"
                    style={{ fontSize: 'clamp(30px, 2.6vw, 38px)', lineHeight: 1.05 }}
                  >
                    {tenantMode.title}
                  </h3>
                </div>
                <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 480 }}>
                  {tenantMode.copy}
                </p>
                <ModeStatTiles stats={tenantMode.stats} />
              </div>
            </div>
          </article>

          <div
            className="grid-1col-mobile"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}
          >
            {paidModes.map((m) => (
              <article
                key={m.title}
                className="card"
                style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ padding: '14px 14px 0' }}>
                  <ModePreview who={m.who} />
                </div>

                <div className="col gap-16" style={{ padding: '24px 24px 26px' }}>
                  <div className="col gap-8">
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--accent)',
                      }}
                    >
                      For the {m.who.toLowerCase()}
                    </div>
                    <h3 className="serif" style={{ fontSize: 26, lineHeight: 1.08 }}>
                      {m.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 480 }}>{m.copy}</p>

                  <ModeStatTiles stats={m.stats} />
                  {'verdict' in m && m.verdict !== undefined && (
                    <VerdictPill tone={m.verdict.tone} label={m.verdict.label} />
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
