// investor-sections.jsx — page sections for the Investor Report.
// Reuses MiniMap, RentalCompsBar, DealScore, Icon, Chip, SectionHead from prior files.

const { useState: useStateIs } = React;

// Section header reused (same pattern as tenant report)
function InvSectionHead({ n, topic, question, verdict, verdictTone = 'pass' }) {
  return (
    <div className="tr-section-head">
      <div className="col gap-12" style={{ maxWidth: 760 }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          <span style={{ color: 'var(--accent)' }}>§ {n}</span>
          <span style={{ marginLeft: 12, color: 'var(--muted)' }}>{topic}</span>
        </span>
        <h2 className="serif" style={{ textWrap: 'balance' }}>{question}</h2>
      </div>
      {verdict && <span className={`verdict-pill ${verdictTone}`}>{verdict}</span>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Investor Nav (variant of ReportNav from tenant)
// ══════════════════════════════════════════════════════════════════
function InvestorNav({ dark, onToggleDark, onSignIn, slug }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'saturate(180%) blur(14px)',
      WebkitBackdropFilter: 'saturate(180%) blur(14px)',
      background: 'color-mix(in oklab, var(--bg) 84%, transparent)',
      borderBottom: '1px solid var(--line)',
    }}>
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        <div className="row gap-16">
          <Wordmark height={22}/>
          <div className="row gap-8" style={{ color: 'var(--muted)', fontSize: 13 }}>
            <span style={{ opacity: 0.55 }}>/</span>
            <span>Investor report</span>
            <span style={{ opacity: 0.55 }}>/</span>
            <span style={{ color: 'var(--ink)', fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>{slug}</span>
          </div>
        </div>
        <div className="row gap-12">
          <button className="btn btn-ghost" onClick={onToggleDark} aria-label="Toggle theme" style={{ padding: '10px 12px' }}>
            <Icon name={dark ? 'sun' : 'moon'} size={15}/>
          </button>
          <button className="btn btn-ghost" style={{ padding: '10px 14px' }}><Icon name="link" size={13}/> Share link</button>
          <button className="btn btn-ghost" style={{ padding: '10px 14px' }}><Icon name="doc" size={13}/> Export PDF</button>
          <button className="btn btn-primary" onClick={onSignIn}>Save analysis <Icon name="arrow" size={13}/></button>
        </div>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Property hero — investor view (deal score + headline metrics)
// ══════════════════════════════════════════════════════════════════
function InvestorPropertyHero({ property, metrics, score }) {
  const verdictColor =
    score.verdict.tone === 'pass'    ? 'var(--pass)' :
    score.verdict.tone === 'caution' ? 'var(--caution)' :
                                       'var(--fail)';
  return (
    <section className="container" style={{ paddingTop: 56, paddingBottom: 48 }}>
      <div className="row gap-12" style={{ marginBottom: 28, color: 'var(--muted)', fontSize: 13 }}>
        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={13}/></span>
          Analyze another listing
        </a>
        <span style={{ opacity: 0.4 }}>·</span>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Report · Investor view</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }} className="live-dot"/>
          Live recalc · sliders below
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'clamp(28px, 3.5vw, 52px)', alignItems: 'flex-start' }}>
        {/* LEFT — photos + chips + address */}
        <div className="col" style={{ gap: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>
            <div className="photo-ph" style={{ borderRadius: 18, height: '100%' }}>
              <span>exterior · {property.propertyType.toLowerCase()}</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}><span>living</span></div>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}><span>kitchen</span></div>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1, position: 'relative' }}>
                <span>floorplan</span>
                <div className="mono" style={{
                  position: 'absolute', right: 10, bottom: 10,
                  fontSize: 10, letterSpacing: '0.1em', padding: '3px 8px',
                  background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
                  borderRadius: 999,
                  color: 'var(--ink)',
                  backdropFilter: 'blur(4px)',
                }}>+ 22 more</div>
              </div>
            </div>
          </div>

          <div className="col" style={{ gap: 18 }}>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {property.chips.map((c, i) => <Chip key={i}>{c}</Chip>)}
            </div>

            <h1 className="serif" style={{ textWrap: 'balance', letterSpacing: '-0.035em', marginTop: 4 }}>
              {property.addressLine1}
            </h1>
            <div style={{ fontSize: 16, color: 'var(--muted)' }}>{property.addressLine2}</div>

            <div className="row gap-20" style={{ flexWrap: 'wrap', marginTop: 8, fontSize: 14, color: 'var(--ink-2)' }}>
              <span className="row gap-8"><Icon name="house" size={14}/> {property.beds} bed · {property.baths} bath</span>
              <span className="row gap-8"><Icon name="dot" size={10}/> {property.sqft.toLocaleString()} sqft</span>
              <span className="row gap-8"><Icon name="key" size={14}/> {property.parking} parking</span>
              <span className="row gap-8"><Icon name="chart" size={14}/> Built {property.yearBuilt}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — sticky score card */}
        <div className="card col" style={{ padding: 32, gap: 24, position: 'sticky', top: 84 }}>
          <div className="col" style={{ alignItems: 'center', gap: 8 }}>
            <DealScore score={score.total} size={180} label="Deal score / 100"/>
          </div>

          <div className="col" style={{ textAlign: 'center', alignItems: 'center', gap: 8 }}>
            <div className="mono" style={{
              fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: verdictColor,
            }}>{score.verdict.label}</div>
            <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, textWrap: 'balance' }}>
              {score.verdict.tagline}
            </div>
          </div>

          <div className="divider"/>

          {/* Score component breakdown */}
          <div className="col" style={{ gap: 10 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Score breakdown
            </div>
            {[
              ['Cap rate',    score.components.cap,    25],
              ['Cash flow',   score.components.cf,     25],
              ['CoC return',  score.components.coc,    20],
              ['DSCR',        score.components.dscr,   15],
              ['Demand',      score.components.demand, 10],
            ].map(([lbl, v, max]) => (
              <div key={lbl} className="col" style={{ gap: 4 }}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink-2)' }}>{lbl}</span>
                  <span className="mono tabular" style={{ color: 'var(--muted)' }}>{v} / {max}</span>
                </div>
                <div style={{ height: 3, borderRadius: 999, background: 'var(--line)' }}>
                  <div style={{
                    width: `${(v / max) * 100}%`,
                    height: '100%', borderRadius: 999,
                    background: v / max > 0.6 ? 'var(--pass)' : v / max > 0.2 ? 'var(--caution)' : 'var(--fail)',
                  }}/>
                </div>
              </div>
            ))}
            {score.deductions > 0 && (
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: 'var(--ink-2)' }}>Risk deductions</span>
                <span className="mono tabular" style={{ color: 'var(--fail)' }}>−{score.deductions}</span>
              </div>
            )}
          </div>

          <div className="divider"/>

          {/* Headline price block */}
          <div className="col" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Asking</span>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>{fmtMoney(property.price)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
              <span>Cash flow</span>
              <span className="mono tabular" style={{
                fontWeight: 600,
                color: metrics.monthlyCashFlow >= 0 ? 'var(--pass)' : 'var(--fail)',
              }}>{fmtMoney(metrics.monthlyCashFlow)}/mo</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
              <span>Cap rate</span>
              <span className="mono tabular" style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmtPct(metrics.capRate)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
              <span>DSCR</span>
              <span className="mono tabular" style={{ fontWeight: 600, color: 'var(--ink)' }}>{metrics.dscr.toFixed(2)}×</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  AI Verdict (investor voice)
// ══════════════════════════════════════════════════════════════════
function InvestorVerdictHero({ property, metrics, score }) {
  const headlineByProperty = {
    vaughan: <>
      The <span style={{ color: 'var(--accent)' }}>${property.condoFeeMonthly}/mo condo fee</span> is what ends this deal before it starts. At ${(property.condoFeeMonthly * 12).toLocaleString()}/yr it consumes 26% of the gross rent this unit can realistically earn — before the mortgage, taxes, or insurance are touched.
    </>,
    hamilton: <>
      The numbers <span style={{ color: 'var(--accent)' }}>actually pencil</span>. At {fmtPct(metrics.capRate)} cap and {metrics.dscr.toFixed(2)}× DSCR, you are looking at a building that pays its own way from day one — with rent control as the main long-term constraint.
    </>,
  };

  const subByProperty = {
    vaughan: <>
      Run the numbers at current rates and you are looking at <span className="tabular">{fmtMoney(-(metrics.annualCashFlow / 12 - metrics.expenses.total / 12))}</span> going out every month against roughly <span className="tabular">${property.rentEstimate.toLocaleString()}</span> coming in — a <span style={{ color: 'var(--accent)' }}>{fmtMoney(metrics.monthlyCashFlow)}</span> shortfall every single month before a single vacancy or repair.
    </>,
    hamilton: <>
      With <span className="tabular">${property.rentEstimate.toLocaleString()}</span> in expected rent against <span className="tabular">{fmtMoney(metrics.annualDebtService / 12)}</span> in monthly debt service, this property delivers roughly <span style={{ color: 'var(--accent)' }}>{fmtMoney(metrics.monthlyCashFlow)}</span> in positive cash flow each month — and crosses the OSFI stress test {metrics.osfi.pass ? 'cleanly' : 'narrowly'}.
    </>,
  };

  return (
    <section className="container" style={{ marginTop: 24, marginBottom: 16 }}>
      <div style={{
        background: 'var(--ink)', color: 'var(--bg)',
        borderRadius: 24,
        padding: 'clamp(36px, 4vw, 56px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -80, top: -40, opacity: 0.06, color: 'var(--accent)' }}>
          <ScoutMark size={520} color="var(--accent)"/>
        </div>

        <div className="row gap-8" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)' }} className="live-dot"/>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Scout AI · investor verdict</span>
          <span style={{ flex: 1 }}/>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>claude · sonnet 4.6</span>
        </div>

        <div className="serif" style={{
          fontSize: 'clamp(26px, 3.4vw, 42px)', lineHeight: 1.1, letterSpacing: '-0.025em',
          color: 'var(--bg)', textWrap: 'balance', maxWidth: 920,
          position: 'relative', zIndex: 1,
        }}>
          {headlineByProperty[property.id]}
        </div>

        <div className="serif" style={{
          fontSize: 'clamp(17px, 1.7vw, 21px)', lineHeight: 1.5,
          color: 'rgba(255,255,255,0.78)',
          marginTop: 22, maxWidth: 880,
          position: 'relative', zIndex: 1,
        }}>
          {subByProperty[property.id]}
        </div>

        <div className="row gap-16" style={{ marginTop: 28, color: 'rgba(255,255,255,0.5)', fontSize: 12, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <span className="row gap-6"><Icon name="check" size={12}/> {property.compCount} comps · {property.compConfidence} confidence</span>
          <span className="row gap-6"><Icon name="check" size={12}/> OSFI {metrics.osfi.pass ? 'passes' : 'fails'} at qualifying {fmtPct(metrics.osfi.qualifyingRate)}</span>
          <span className="row gap-6"><Icon name="check" size={12}/> Live recalc · sliders adjust everything</span>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Investment metrics — large headline grid
// ══════════════════════════════════════════════════════════════════
function InvestmentMetricsSection({ metrics, property }) {
  const tone = (good, val) => good(val) ? 'pass' : 'fail';

  const tiles = [
    { lbl: 'Cap rate',       val: fmtPct(metrics.capRate),                  sub: metrics.capRate >= 0.05 ? 'Above 5% threshold' : metrics.capRate >= 0.03 ? '3–5% range' : 'Below 3% threshold',  tone: metrics.capRate >= 0.05 ? 'pass' : metrics.capRate >= 0.03 ? 'caution' : 'fail' },
    { lbl: 'Monthly cash flow', val: fmtMoney(metrics.monthlyCashFlow),     sub: 'per month',     tone: metrics.monthlyCashFlow >= 200 ? 'pass' : metrics.monthlyCashFlow >= 0 ? 'caution' : 'fail' },
    { lbl: 'Cash-on-cash',   val: fmtPct(metrics.coc),                       sub: `On ${fmtMoney(metrics.totalCashInvested)} invested`, tone: metrics.coc >= 0.05 ? 'pass' : metrics.coc >= 0.03 ? 'caution' : 'fail' },
    { lbl: 'DSCR',           val: `${metrics.dscr.toFixed(2)}×`,             sub: metrics.dscr >= 1.10 ? 'Investment-grade' : metrics.dscr >= 1.0 ? 'Marginal' : 'Will not qualify', tone: metrics.dscr >= 1.10 ? 'pass' : metrics.dscr >= 1.0 ? 'caution' : 'fail' },
    { lbl: 'NOI',            val: fmtMoney(metrics.noi),                     sub: 'annual' },
    { lbl: 'GRM',            val: metrics.grm.toFixed(1),                    sub: 'Gross Rent Multiplier' },
    { lbl: 'Break-even rent', val: fmtMoney(metrics.breakEvenRent),          sub: 'to cover all costs',  tone: metrics.breakEvenRent <= property.rentEstimate ? 'pass' : 'fail' },
    { lbl: 'Gross yield',    val: fmtPct(metrics.grossRentAnnual / property.price), sub: 'before expenses' },
  ];

  return (
    <section className="container tr-section">
      <InvSectionHead
        n="01"
        topic="Investment metrics"
        question={<>Does the deal <em>pencil</em>?</>}
        verdict={metrics.dscr >= 1.10 ? 'Passes thresholds' : metrics.dscr >= 1.0 ? '2 below threshold' : '4 below threshold'}
        verdictTone={metrics.dscr >= 1.10 ? 'pass' : metrics.dscr >= 1.0 ? 'caution' : 'fail'}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {tiles.map((t) => (
          <div key={t.lbl} className="col" style={{
            padding: '18px 20px', borderRadius: 14,
            background: 'var(--surface)', border: '1px solid var(--line)',
            gap: 6,
            boxShadow: 'var(--shadow-card)',
          }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{t.lbl}</div>
            <div className="serif tabular" style={{
              fontSize: 30, lineHeight: 1,
              color: t.tone === 'pass' ? 'var(--pass)' : t.tone === 'caution' ? 'var(--caution)' : t.tone === 'fail' ? 'var(--fail)' : 'var(--ink)',
            }}>{t.val}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Expense breakdown — collapsible card */}
      <div className="card" style={{ marginTop: 22, padding: 28 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18, alignItems: 'baseline' }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Operating expenses · annual</span>
            <h4 className="serif" style={{ fontSize: 22 }}>Where the money goes.</h4>
          </div>
          <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1, color: 'var(--accent)' }}>{fmtMoney(metrics.expenses.total)}<span style={{ fontSize: 13, color: 'var(--muted)' }}>/yr</span></span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            ['Property taxes',        metrics.expenses.taxes,       'as listed'],
            ['Insurance (0.35%)',     metrics.expenses.insurance,   'of value'],
            ['Maintenance reserve',   metrics.expenses.maintenance, `${(metrics.expenses.maintenance / property.price * 100).toFixed(2)}% of value`],
            ['Vacancy allowance (5%)', metrics.expenses.vacancy,    'of gross rent'],
            ['Condo fee',             metrics.expenses.condo,       property.condoFeeMonthly > 0 ? `${fmtMoney(property.condoFeeMonthly)}/mo` : 'N/A'],
            ['Property management',   metrics.expenses.management,  metrics.expenses.management > 0 ? '8% of gross rent' : 'not included'],
          ].map(([k, v, note], i) => (
            <div key={k} style={{
              padding: '12px 0',
              borderBottom: i < 4 ? '1px solid var(--line)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
              paddingRight: i % 2 === 0 ? 24 : 0,
              paddingLeft: i % 2 === 1 ? 24 : 0,
              borderLeft: i % 2 === 1 ? '1px solid var(--line)' : 'none',
            }}>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>{k}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{note}</span>
              </div>
              <span className="mono tabular" style={{ fontWeight: 500, color: v > 0 ? 'var(--ink)' : 'var(--muted)' }}>{v > 0 ? fmtMoney(v) : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Rental comps section
// ══════════════════════════════════════════════════════════════════
function InvestorCompsSection({ property }) {
  return (
    <section className="container tr-section">
      <InvSectionHead
        n="03"
        topic="Rental comps"
        question={<>What can it <em>realistically</em> rent for?</>}
        verdict={`${property.compCount} comps · ${property.compConfidence}`}
        verdictTone="pass"
      />

      <div className="card col gap-20" style={{ padding: 28 }}>
        <MiniMap
          height={300}
          address={`${property.addressLine2.split('·')[0].trim()} · ${property.postal.split(' ')[0]} · 1km`}
          pins={[
            { x: 22, y: 30, n: fmtMoney(property.rentLow + 100) },
            { x: 70, y: 22, n: fmtMoney(property.rentHigh - 100) },
            { x: 36, y: 64, n: fmtMoney(property.rentLow + 50) },
            { x: 76, y: 68, n: fmtMoney(property.rentHigh) },
            { x: 58, y: 78, n: fmtMoney(property.rentEstimate) },
          ]}
        />
        <RentalCompsBar
          low={property.rentLow}
          mid={property.rentEstimate}
          high={property.rentHigh}
          ask={property.rentEstimate}
        />
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Risk Analysis
// ══════════════════════════════════════════════════════════════════
function InvestorRiskSection({ property, score }) {
  return (
    <section className="container tr-section">
      <InvSectionHead
        n="06"
        topic="Risk analysis"
        question={<>What could <em>break</em> this thesis?</>}
        verdict={`${property.riskFlags.length} flag${property.riskFlags.length === 1 ? '' : 's'} · −${score.deductions} pts applied`}
        verdictTone={score.deductions >= 5 ? 'fail' : score.deductions >= 3 ? 'caution' : 'pass'}
      />

      <div className="col gap-12">
        {property.riskFlags.map((f) => (
          <RiskRow key={f.id} tone={f.tone} label={f.label} detail={f.detail}/>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, {
  InvSectionHead, InvestorNav, InvestorPropertyHero, InvestorVerdictHero,
  InvestmentMetricsSection, InvestorCompsSection, InvestorRiskSection,
});
