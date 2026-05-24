// investor-sections-2.jsx — closing costs · OSFI · neighbourhood · sunscout · STR placeholder · checklist.

const { useState: useStateIs2 } = React;

// ══════════════════════════════════════════════════════════════════
//  Cash needed to close — LTT + closing costs + down payment
// ══════════════════════════════════════════════════════════════════
function CashToCloseSection({ property, metrics, financing }) {
  return (
    <section className="container tr-section">
      <InvSectionHead
        n="04"
        topic="Cash to close"
        question={<>What you need in the <em>bank</em> on closing day.</>}
        verdict={fmtMoney(metrics.totalCashInvested) + ' total'}
        verdictTone="pass"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22, alignItems: 'flex-start' }}>
        <LTTTable ltt={metrics.ltt} price={property.price} toronto={financing.toronto}/>

        <div className="card col" style={{ padding: 28, gap: 16 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Total cash invested</span>
            <span className="serif tabular" style={{ fontSize: 40, lineHeight: 1, color: 'var(--accent)' }}>{fmtMoney(metrics.totalCashInvested)}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtPct(metrics.totalCashInvested / property.price, 1)} of purchase price</span>
          </div>

          <div className="divider"/>

          <div className="col" style={{ gap: 10 }}>
            {[
              ['Down payment',       metrics.downPayment,    `${(financing.downPct * 100).toFixed(0)}% of ${fmtMoney(property.price)}`],
              ['Land transfer tax',  metrics.ltt.total,      financing.toronto ? 'Provincial + Toronto stacked' : 'Provincial only'],
              ['Closing costs',      metrics.closingCosts,   'Legal · title · inspection'],
            ].map(([k, v, note], i, arr) => (
              <div key={k} className="row" style={{
                justifyContent: 'space-between', alignItems: 'baseline',
                paddingBottom: i < arr.length - 1 ? 10 : 0,
                borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                gap: 12,
              }}>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>{k}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{note}</span>
                </div>
                <span className="mono tabular" style={{ fontWeight: 600 }}>{fmtMoney(v)}</span>
              </div>
            ))}
          </div>

          <div className="divider"/>

          <div className="col" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Monthly mortgage</span>
            <span className="serif tabular" style={{ fontSize: 22, lineHeight: 1 }}>{fmtMoney(metrics.monthlyMortgage)}<span style={{ fontSize: 13, color: 'var(--muted)' }}>/mo</span></span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {fmtMoney(metrics.principal)} principal · {fmtPct(financing.rate, 2)} · {financing.amort} yr amort
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  OSFI Stress Test
// ══════════════════════════════════════════════════════════════════
function OSFISection({ metrics, financing }) {
  return (
    <section className="container tr-section">
      <InvSectionHead
        n="05"
        topic="OSFI stress test"
        question={<>Will the bank actually <em>fund</em> this?</>}
        verdict={metrics.osfi.pass ? 'Qualifies at 44% GDS' : `Fails at ${fmtPct(metrics.osfi.gds, 1)} GDS`}
        verdictTone={metrics.osfi.pass ? 'pass' : 'fail'}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        <OSFICard osfi={metrics.osfi} financing={financing}/>

        <div className="card col" style={{ padding: 28, gap: 18 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            What OSFI B-20 actually does
          </div>
          <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Federally-regulated lenders (banks, big credit unions) must qualify every borrower at the higher of (a) the contract rate + 2%, or (b) the federal benchmark of 5.25%. This is called the <em>mortgage stress test</em>.
          </p>
          <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Total monthly housing cost — mortgage at qualifying rate + property tax + half the condo fee — must come in below <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>44%</span> of gross monthly income. PropScout assumes a household income of <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>$125,000</span> for the default scenario; you can override in settings.
          </p>
          <div style={{
            padding: '12px 14px', borderRadius: 12,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            fontSize: 12, color: 'var(--muted)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}><Icon name="flag" size={14}/></span>
            <span>Failing OSFI does not mean you can't finance the property — alt-lenders and private lenders price differently, but at higher rates. If you are using one of those, the deal-score numbers should be re-modelled with that rate.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Equity build section — uses EquityChart
// ══════════════════════════════════════════════════════════════════
function EquitySection({ metrics, financing }) {
  return (
    <section className="container tr-section">
      <InvSectionHead
        n="07"
        topic="Equity build"
        question={<>What <em>builds</em> over time?</>}
        verdict={`+${fmtMoney(metrics.equityCurve[20].equity - metrics.downPayment)} over 20 yr`}
        verdictTone={metrics.equityCurve[20].equity > metrics.downPayment ? 'pass' : 'fail'}
      />
      <EquityChart equityCurve={metrics.equityCurve} totalCashInvested={metrics.totalCashInvested}/>
      <p style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        Property value compounds at {fmtPct(financing.appreciation, 0)} annually (adjustable above). Equity = current value − remaining mortgage. Hover the chart for year-by-year detail. Excludes cumulative cash flow.
      </p>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Neighbourhood intelligence
// ══════════════════════════════════════════════════════════════════
function NeighbourhoodSection({ property }) {
  // Different defaults per property
  const data = {
    vaughan: {
      avgIncome: 88500,
      popGrowth5y: 0.182,
      walkScore: 72, transitScore: 85, bikeScore: 58,
      buildingPermits: 24,
      appreciation5y: 0.276,
      appreciation10y: 0.612,
      ppsqftTrend: 'Up 8.2% YoY',
      comps: [
        { addr: 'Unit 4203 · 5 Buttermill Ave',  beds: '3', sqft: 945,  sold: '$705,000', date: 'Mar 2026' },
        { addr: 'Unit 3115 · 7 Buttermill Ave',  beds: '3', sqft: 970,  sold: '$721,500', date: 'Feb 2026' },
        { addr: 'Unit 2802 · 5 Buttermill Ave',  beds: '3', sqft: 925,  sold: '$695,000', date: 'Jan 2026' },
      ],
    },
    hamilton: {
      avgIncome: 72400,
      popGrowth5y: 0.094,
      walkScore: 79, transitScore: 64, bikeScore: 71,
      buildingPermits: 8,
      appreciation5y: 0.342,
      appreciation10y: 0.748,
      ppsqftTrend: 'Up 4.6% YoY',
      comps: [
        { addr: '128 East 18th Street',  beds: '4', sqft: 1780, sold: '$432,000', date: 'Apr 2026' },
        { addr: '210 East 21st Street',  beds: '4', sqft: 1840, sold: '$455,000', date: 'Mar 2026' },
        { addr: '95 East 17th Street',   beds: '3', sqft: 1620, sold: '$418,500', date: 'Feb 2026' },
      ],
    },
  }[property.id];

  return (
    <section className="container tr-section">
      <InvSectionHead
        n="08"
        topic="Neighbourhood"
        question={<>What's the <em>market</em> doing around it?</>}
        verdict={data.appreciation5y >= 0.20 ? 'Strong appreciation' : 'Modest growth'}
        verdictTone={data.appreciation5y >= 0.20 ? 'pass' : 'caution'}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
        {[
          ['Median income (FSA)',  fmtMoney(data.avgIncome), 'StatsCan 2021'],
          ['5-year pop. growth',   fmtPct(data.popGrowth5y, 1), 'StatsCan'],
          ['Walk Score',           `${data.walkScore}`,     'Mostly walkable'],
          ['Transit Score',        `${data.transitScore}`,  data.transitScore >= 80 ? 'Excellent' : 'Some transit'],
          ['Active building permits',  `${data.buildingPermits}`, 'in 1km'],
          ['Price per sqft trend', data.ppsqftTrend,        'last 12 months'],
        ].map(([k, v, sub]) => (
          <div key={k} className="card col" style={{ padding: '18px 22px', gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{k}</span>
            <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1 }}>{v}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</span>
          </div>
        ))}
      </div>

      {/* Appreciation card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="card col" style={{ padding: 28, gap: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Comparable recent sales</span>
              <h4 className="serif" style={{ fontSize: 22 }}>What sold nearby.</h4>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{data.comps.length} verified sales</span>
          </div>

          <div className="col" style={{ gap: 0 }}>
            {data.comps.map((c, i) => (
              <div key={c.addr} className="row" style={{
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: i < data.comps.length - 1 ? '1px solid var(--line)' : 'none',
                gap: 16,
              }}>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>{c.addr}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.beds} bed · {c.sqft.toLocaleString()} sqft</span>
                </div>
                <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
                  <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1, color: 'var(--ink)' }}>{c.sold}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card col" style={{ padding: 28, gap: 18, background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>
            Appreciation
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="serif tabular" style={{ fontSize: 'clamp(36px, 4vw, 52px)', lineHeight: 1, color: 'var(--accent)' }}>
              +{fmtPct(data.appreciation5y, 1)}
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,.75)' }}>5-year median sale price</span>
          </div>

          <div className="row gap-12" style={{ marginTop: 6, alignItems: 'center', fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
            <span>10-year:</span>
            <span className="mono tabular" style={{ color: 'var(--bg)', fontWeight: 500 }}>+{fmtPct(data.appreciation10y, 1)}</span>
          </div>

          <div className="divider" style={{ background: 'rgba(255,255,255,.15)' }}/>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.55 }}>
            Numbers from Teranet HPI · public MLS · adjusted for inflation. Past appreciation is not a guarantee of future returns.
          </p>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  SunScout (compact for investor — light score affects rental demand)
// ══════════════════════════════════════════════════════════════════
function InvestorSunScoutSection({ property }) {
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const hours = property.id === 'vaughan'
    ? [62, 78, 110, 138, 168, 184, 188, 168, 132, 96, 64, 52]
    : [38, 52, 76, 100, 128, 142, 144, 128, 96, 68, 46, 36];
  const max = Math.max(...hours);
  const score = property.id === 'vaughan' ? 84 : 62;
  const subText = property.id === 'vaughan'
    ? 'South-facing · 57th floor · no obstructing buildings within 100m'
    : 'East-facing main · partial west · low-rise neighbourhood';

  return (
    <section className="container tr-section">
      <InvSectionHead
        n="09"
        topic="SunScout"
        question={<>How <em>well-lit</em> is the unit?</>}
        verdict={score >= 80 ? `Excellent · ${score}/100` : score >= 60 ? `Good · ${score}/100` : `Average · ${score}/100`}
        verdictTone={score >= 80 ? 'pass' : score >= 60 ? 'pass' : 'caution'}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
        <div className="card col" style={{ padding: 28, alignItems: 'center', textAlign: 'center', gap: 16 }}>
          <DealScore score={score} size={160} label="" showVerdict={false}/>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Light score / 100</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{subText}</div>
        </div>

        <div className="card col" style={{ padding: 28, gap: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Hours of direct sun · monthly</div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>NREL SPA · pvlib</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110 }}>
            {hours.map((h, i) => (
              <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <span className="mono tabular" style={{ fontSize: 9, color: 'var(--muted)' }}>{h}h</span>
                <div style={{
                  width: '100%',
                  height: `${(h / max) * 72}px`,
                  background: i >= 4 && i <= 7 ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 35%, transparent)',
                  borderRadius: 3,
                }}/>
                <span className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>{months[i]}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Bright units rent <span className="tabular" style={{ color: 'var(--ink)' }}>8–14%</span> faster than equivalent dim units. Demand component +3 pts factored into the deal score.
          </p>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STR vs LTR placeholder (Phase 2 — show "coming soon" pattern)
// ══════════════════════════════════════════════════════════════════
function STRPlaceholderSection({ property }) {
  // Per spec: STR legality check still runs based on municipality rules
  const cityRule =
    property.id === 'vaughan' ? { rule: 'Permitted with registration', tone: 'caution', explain: 'Vaughan permits short-term rentals subject to operator registration and zoning checks.' } :
                                 { rule: 'Permitted',                  tone: 'pass', explain: 'Hamilton currently allows short-term rentals in residential zones. Confirm at the OZ inquiry counter before listing.' };

  return (
    <section className="container tr-section">
      <InvSectionHead
        n="10"
        topic="STR vs LTR"
        question={<>Could you make <em>more</em> short-term?</>}
        verdict="Modeling · Phase 2"
        verdictTone="caution"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* Locked / coming-soon card */}
        <div className="card col" style={{ padding: 28, gap: 16, position: 'relative', overflow: 'hidden' }}>
          {/* Subtle blur overlay to suggest "locked" */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 0%, transparent 30%, color-mix(in oklab, var(--surface) 96%, transparent) 100%)',
            pointerEvents: 'none',
          }}/>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Short-term rental analysis</div>
            <span className="chip" style={{
              background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
              borderColor: 'color-mix(in oklab, var(--accent) 30%, transparent)',
              color: 'var(--accent)',
            }}>Coming Phase 2</span>
          </div>

          <h4 className="serif" style={{ fontSize: 24 }}>AirDNA revenue modeling — shipping Q3 2026.</h4>

          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            We're integrating AirDNA to project nightly rates, occupancy, seasonality, and net revenue for this exact unit against true STR comparables. Until then, the LTR baseline shown above is your reference.
          </p>

          {/* Mock numbers behind the blur */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 4, filter: 'blur(2px)', opacity: 0.55, pointerEvents: 'none' }}>
            {[
              ['Nightly ADR',   '$184'],
              ['Occupancy',     '68%'],
              ['Net rev /mo',   '$3,120'],
              ['STR – LTR',     '+ $220'],
              ['Seasonality',   '±18%'],
              ['Cleaning/turn', '$2,400/mo'],
            ].map(([k, v]) => (
              <div key={k} className="col" style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-elev)', border: '1px solid var(--line)', gap: 4 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{k}</span>
                <span className="serif tabular" style={{ fontSize: 20, lineHeight: 1 }}>{v}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginTop: 4, position: 'relative', zIndex: 2 }}>
            Notify me when STR ships <Icon name="arrow" size={13}/>
          </button>
        </div>

        {/* Legality card — works today */}
        <div className="card col" style={{ padding: 28, gap: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>STR legality · live</div>
            <span className={`verdict-pill ${cityRule.tone}`}>{cityRule.rule}</span>
          </div>

          <h4 className="serif" style={{ fontSize: 22 }}>
            {property.id === 'vaughan' ? 'Vaughan' : 'Hamilton'} rules
          </h4>

          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>{cityRule.explain}</p>

          <div className="divider"/>

          <div className="col" style={{ gap: 8 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Other Ontario cities</div>
            {[
              { city: 'Toronto',  rule: 'Principal-residence only', tone: 'fail' },
              { city: 'Ottawa',   rule: 'Permitted · registration',  tone: 'caution' },
              { city: 'Mississauga', rule: 'Principal residence',   tone: 'fail' },
              { city: 'Hamilton', rule: 'Permitted',                tone: 'pass' },
            ].map((r, i, arr) => (
              <div key={r.city} className="row" style={{
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                fontSize: 13,
              }}>
                <span style={{ color: 'var(--ink-2)' }}>{r.city}</span>
                <span className={`verdict-pill ${r.tone}`} style={{ fontSize: 11, padding: '4px 10px' }}>{r.rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Confirm-before-bidding checklist
// ══════════════════════════════════════════════════════════════════
function InvestorChecklist({ property }) {
  const items = property.id === 'vaughan'
    ? [
        { label: 'Confirm condo reserve fund status with the property manager',  critical: true },
        { label: 'Verify there are no special assessments planned',              critical: true },
        { label: 'Confirm whether the unit can legally be rented (status cert)', critical: true },
        { label: 'Pull a status certificate before any conditional offer',       critical: false },
        { label: 'Check whether parking + locker are deeded or exclusive-use',   critical: false },
        { label: 'Review the rules around short-term and medium-term rentals',   critical: false },
      ]
    : [
        { label: 'Have both units inspected separately by a structural engineer', critical: true },
        { label: 'Confirm rent-controlled lease history — what tenants currently pay', critical: true },
        { label: 'Verify electrical (knob & tube, panel age) and roof age',         critical: true },
        { label: 'Check for retrofit / fire-code compliance for the second unit',   critical: false },
        { label: 'Confirm both units have legal egress / second exits',             critical: false },
        { label: 'Review property tax assessment for two-unit classification',      critical: false },
      ];

  return (
    <section className="container tr-section">
      <InvSectionHead
        n="11"
        topic="Before you bid"
        question={<>Get these <em>answered</em> first.</>}
        verdict={`${items.length} items · ${items.filter((i) => i.critical).length} critical`}
        verdictTone="caution"
      />

      <div className="card" style={{ padding: 28 }}>
        <div className="col" style={{ gap: 4 }}>
          {items.map((it, i) => (
            <label key={i} className="row gap-14" style={{
              padding: '14px 4px',
              borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none',
              cursor: 'pointer', alignItems: 'center',
            }}>
              <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'var(--accent)', flexShrink: 0 }}/>
              <div className="col grow" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>{it.label}</span>
              </div>
              {it.critical && (
                <span className="mono" style={{
                  fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: 'var(--accent)',
                  padding: '3px 8px', borderRadius: 999,
                  border: '1px solid color-mix(in oklab, var(--accent) 35%, transparent)',
                  background: 'color-mix(in oklab, var(--accent) 8%, transparent)',
                }}>Critical</span>
              )}
            </label>
          ))}
        </div>

        <div className="row gap-12" style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-primary"><Icon name="doc" size={13}/> Export as PDF</button>
          <button className="btn btn-ghost"><Icon name="link" size={13}/> Email to my agent</button>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, {
  CashToCloseSection, OSFISection, EquitySection,
  NeighbourhoodSection, InvestorSunScoutSection,
  STRPlaceholderSection, InvestorChecklist,
});
