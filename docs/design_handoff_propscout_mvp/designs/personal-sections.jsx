// personal-sections.jsx — nav · hero · AI verdict · §01 true cost · §02 FMV · §03 sales

const { useState: useStatePs, useMemo: useMemoPs } = React;

// ── Reusable section header ─────────────────────────────────────
function PBSectionHead({ n, topic, question, verdict, verdictTone = 'pass' }) {
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
//  Nav
// ══════════════════════════════════════════════════════════════════
function PBNav({ dark, onToggleDark, onSignIn, slug }) {
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
            <span>Personal buyer report</span>
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
          <button className="btn btn-primary" onClick={onSignIn}>Save report <Icon name="arrow" size={13}/></button>
        </div>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Property hero — personal-buyer view (home score + monthly cost)
// ══════════════════════════════════════════════════════════════════
function PBPropertyHero({ property, score, monthly }) {
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
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Report · Personal view</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }} className="live-dot"/>
          Listed {property.daysOnMarket} days ago
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'clamp(28px, 3.5vw, 52px)', alignItems: 'flex-start' }}>
        {/* LEFT — photos + chips + address */}
        <div className="col" style={{ gap: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>
            <div className="photo-ph" style={{ borderRadius: 18, height: '100%' }}>
              <span>front · curb view</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}><span>living room</span></div>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}><span>kitchen</span></div>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1, position: 'relative' }}>
                <span>backyard</span>
                <div className="mono" style={{
                  position: 'absolute', right: 10, bottom: 10,
                  fontSize: 10, letterSpacing: '0.1em', padding: '3px 8px',
                  background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
                  borderRadius: 999, color: 'var(--ink)', backdropFilter: 'blur(4px)',
                }}>+ 28 more</div>
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
              <span className="row gap-8"><Icon name="key" size={14}/> {property.parking}</span>
              <span className="row gap-8"><Icon name="chart" size={14}/> Built {property.yearBuilt}</span>
              <span className="row gap-8"><Icon name="dot" size={10}/> {property.lotSize}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — sticky home-score card */}
        <div className="card col" style={{ padding: 32, gap: 24, position: 'sticky', top: 84 }}>
          <div className="col" style={{ alignItems: 'center', gap: 8 }}>
            <DealScore score={score.total} size={180} label="Home score / 100"/>
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

          {/* Headline: asking + true monthly cost */}
          <div className="col" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Asking</span>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>{fmtMoney(property.price)}</span>
            </div>
            <div className="row" style={{
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'color-mix(in oklab, var(--accent) 6%, transparent)',
              border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
            }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>True monthly cost</span>
              <span className="serif tabular" style={{ fontSize: 24, lineHeight: 1, color: 'var(--accent)' }}>{fmtMoney(monthly.total)}<span style={{ fontSize: 12, color: 'var(--muted)' }}>/mo</span></span>
            </div>
          </div>

          <div className="divider"/>

          {/* Score component breakdown */}
          <div className="col" style={{ gap: 10 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Score breakdown
            </div>
            {[
              ['Pricing vs FMV', score.components.pricing,  25],
              ['Schools',        score.components.schoolPts, 20],
              ['Light',          score.components.lightPts,  15],
              ['Walk + transit', score.components.walkPts,   15],
              ['Lot value-add',  score.components.lotPts,    15],
              ['Risk',           score.components.riskPts,   10],
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
                    background: v / max > 0.65 ? 'var(--pass)' : v / max > 0.35 ? 'var(--caution)' : 'var(--fail)',
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  AI verdict — personal voice
// ══════════════════════════════════════════════════════════════════
function PBVerdictHero({ property, score, monthly }) {
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
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Scout AI · home buyer verdict</span>
          <span style={{ flex: 1 }}/>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>claude · sonnet 4.6</span>
        </div>

        <div className="serif" style={{
          fontSize: 'clamp(26px, 3.4vw, 42px)', lineHeight: 1.1, letterSpacing: '-0.025em',
          color: 'var(--bg)', textWrap: 'balance', maxWidth: 920,
          position: 'relative', zIndex: 1,
        }}>
          This is <span style={{ color: 'var(--accent)' }}>fairly priced</span> for what it is — and the school catchment alone is reason enough to consider it seriously.
        </div>

        <div className="serif" style={{
          fontSize: 'clamp(17px, 1.7vw, 21px)', lineHeight: 1.5,
          color: 'rgba(255,255,255,0.78)',
          marginTop: 22, maxWidth: 880,
          position: 'relative', zIndex: 1,
        }}>
          At <span className="tabular">${property.price.toLocaleString()}</span> the asking is sitting almost exactly at the local median for a 3-bed semi on this lot size. Your true monthly carry comes to <span className="tabular" style={{ color: 'var(--accent)' }}>{fmtMoney(monthly.total)}</span> — about <span className="tabular">${Math.round(monthly.total - monthly.mortgage).toLocaleString()}</span> more than the mortgage payment alone. The Tom Thomson catchment is the upside; the 1972 build and a Walk Score of 64 are the trade-offs to consider.
        </div>

        <div className="row gap-16" style={{ marginTop: 28, color: 'rgba(255,255,255,0.5)', fontSize: 12, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <span className="row gap-6"><Icon name="check" size={12}/> 8 verified comparable sales · last 6 months</span>
          <span className="row gap-6"><Icon name="check" size={12}/> School data · EQAO 2024 + Fraser 2025</span>
          <span className="row gap-6"><Icon name="check" size={12}/> Walk/Transit/Bike via Walk Score</span>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  § 01 · True monthly cost of ownership
// ══════════════════════════════════════════════════════════════════
function PBTrueCostSection({ property, monthly }) {
  const lines = [
    { k: 'Mortgage payment',     v: monthly.mortgage,       note: `20% down · 4.79% · ${property.defaultAmort}-yr amort` },
    { k: 'Property taxes',       v: monthly.tax,            note: `${fmtMoney(property.annualTaxes)}/yr` },
    { k: 'Home insurance (est.)', v: monthly.insurance,      note: 'detached / semi estimate' },
    { k: 'Hydro (est.)',         v: monthly.utilities.hydro, note: '11¢/kWh · avg consumption' },
    { k: 'Gas (est.)',           v: monthly.utilities.gas,   note: 'forced-air heating' },
    { k: 'Water (est.)',         v: monthly.utilities.water, note: 'metered · municipal' },
    { k: 'Internet',             v: monthly.utilities.internet, note: '1 Gbps · Rogers / Bell' },
    { k: 'Maintenance reserve',  v: monthly.maintenance,    note: `1.0% of value / yr · 1980-era build` },
  ];

  // Headline split: mortgage vs everything else
  const everythingElse = monthly.total - monthly.mortgage;

  return (
    <section className="container tr-section">
      <PBSectionHead
        n="01"
        topic="True monthly cost"
        question={<>What will it <em>really</em> cost to live here?</>}
        verdict={`${fmtMoney(monthly.total)}/mo · all-in`}
        verdictTone="pass"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 22, alignItems: 'flex-start' }}>
        {/* Itemized table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {lines.map((l, i) => (
            <div key={l.k} style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr',
              padding: '14px 22px',
              borderBottom: i < lines.length - 1 ? '1px solid var(--line)' : 'none',
              alignItems: 'center',
            }}>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 500 }}>{l.k}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{l.note}</span>
              </div>
              <span className="mono tabular" style={{ textAlign: 'right', fontSize: 16, fontWeight: 500 }}>{fmtMoney(l.v, { decimals: 0 })}</span>
            </div>
          ))}
          {/* Total row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr',
            padding: '20px 22px',
            background: 'color-mix(in oklab, var(--accent) 6%, var(--bg-elev))',
            alignItems: 'center',
          }}>
            <div className="col" style={{ gap: 2 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>True monthly cost</span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Including everything you pay to keep the keys</span>
            </div>
            <span className="serif tabular" style={{ textAlign: 'right', fontSize: 30, lineHeight: 1, color: 'var(--accent)' }}>{fmtMoney(monthly.total)}<span style={{ fontSize: 13, color: 'var(--muted)' }}>/mo</span></span>
          </div>
        </div>

        {/* Right column — headlines + insurance/utility context */}
        <div className="col" style={{ gap: 16 }}>
          <div className="card col" style={{ padding: 24, gap: 6 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Mortgage vs. the rest</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>{fmtMoney(monthly.mortgage)}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>mortgage</span>
            </div>
            <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 8 }}>
              <span className="serif tabular" style={{ fontSize: 24, lineHeight: 1, color: 'var(--accent)' }}>+ {fmtMoney(everythingElse)}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>everything else</span>
            </div>
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              The number that catches first-time buyers off-guard. Taxes, insurance, utilities, and a real maintenance reserve add roughly <span className="tabular" style={{ color: 'var(--ink)' }}>{fmtPct(everythingElse / monthly.total, 0)}</span> on top of the mortgage every single month.
            </p>
          </div>

          <div className="card col" style={{ padding: 24, gap: 12 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Affordability check</span>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Lenders want shelter costs under <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>32%</span> of gross income. At {fmtMoney(monthly.total)}/mo, that implies a household income of at least <span className="tabular" style={{ color: 'var(--accent)', fontWeight: 500 }}>{fmtMoney(monthly.total * 12 / 0.32, { decimals: 0 })}</span>.
            </p>
            <div className="row gap-12" style={{ marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>Adjust assumptions</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { PBSectionHead, PBNav, PBPropertyHero, PBVerdictHero, PBTrueCostSection });
