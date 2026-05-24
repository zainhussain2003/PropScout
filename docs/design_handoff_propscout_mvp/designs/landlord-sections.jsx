// landlord-sections.jsx — landlord-specific components (nav, hero, verdict, rent positioning).

const { useState: useStateLs } = React;

// ── Section head (same pattern) ─────────────────────────────────
function LLSectionHead({ n, topic, question, verdict, verdictTone = 'pass' }) {
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
//  Landlord Nav
// ══════════════════════════════════════════════════════════════════
function LandlordNav({ dark, onToggleDark, onSignIn, slug }) {
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
            <span>Landlord report</span>
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
//  Landlord Property Hero (rent-first framing)
// ══════════════════════════════════════════════════════════════════
function LandlordPropertyHero({ property, askingRent, metrics, score, positioning }) {
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
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Report · Landlord view</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }} className="live-dot"/>
          You own this unit · listed {property.ownership.daysOnMarket} days ago
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'clamp(28px, 3.5vw, 52px)', alignItems: 'flex-start' }}>
        {/* LEFT — photos + property meta */}
        <div className="col" style={{ gap: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>
            <div className="photo-ph" style={{ borderRadius: 18, height: '100%' }}>
              <span>your unit · skyline view</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}><span>living</span></div>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}><span>den</span></div>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1, position: 'relative' }}>
                <span>bedroom</span>
                <div className="mono" style={{
                  position: 'absolute', right: 10, bottom: 10,
                  fontSize: 10, letterSpacing: '0.1em', padding: '3px 8px',
                  background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
                  borderRadius: 999, color: 'var(--ink)', backdropFilter: 'blur(4px)',
                }}>+ 18 more</div>
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
              <span className="row gap-8"><Icon name="house" size={14}/> {property.beds} · {property.baths} bath</span>
              <span className="row gap-8"><Icon name="dot" size={10}/> {property.sqft} sqft</span>
              <span className="row gap-8"><Icon name="key" size={14}/> {property.parking}</span>
              <span className="row gap-8"><Icon name="chart" size={14}/> Built {property.yearBuilt}</span>
            </div>

            {/* Ownership context strip */}
            <div className="row gap-12" style={{
              marginTop: 16, padding: '14px 18px',
              borderRadius: 14,
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              flexWrap: 'wrap',
            }}>
              <div className="col" style={{ gap: 2, minWidth: 130 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Purchased</span>
                <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1 }}>{fmtMoney(property.purchasedFor)}<span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}> · {property.purchasedYear}</span></span>
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }}/>
              <div className="col" style={{ gap: 2, minWidth: 130 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Current value</span>
                <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1 }}>{fmtMoney(property.price)}<span className="mono" style={{ fontSize: 11, color: 'var(--pass)' }}> · +{fmtPct(property.appreciation, 1)}</span></span>
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }}/>
              <div className="col" style={{ gap: 2, minWidth: 130 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Mortgage balance</span>
                <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1 }}>{fmtMoney(property.ownership.mortgageBalance)}<span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}> · {fmtPct(property.ownership.contractRate, 2)}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — sticky landlord score card */}
        <div className="card col" style={{ padding: 32, gap: 24, position: 'sticky', top: 84 }}>
          <div className="col" style={{ alignItems: 'center', gap: 8 }}>
            <DealScore score={score.total} size={180} label="Landlord score / 100"/>
          </div>

          <div className="col" style={{ textAlign: 'center', alignItems: 'center', gap: 8 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: verdictColor }}>{score.verdict.label}</div>
            <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, textWrap: 'balance' }}>
              {score.verdict.tagline}
            </div>
          </div>

          <div className="divider"/>

          {/* Headline: asking rent + position */}
          <div className="col" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Your asking rent</span>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>{fmtMoney(askingRent)}<span style={{ fontSize: 13, color: 'var(--muted)' }}>/mo</span></span>
            </div>
            <div className="row" style={{
              justifyContent: 'space-between', alignItems: 'baseline',
              padding: '12px 14px', borderRadius: 12,
              background: `color-mix(in oklab, ${positioning.tone === 'pass' ? 'var(--pass)' : positioning.tone === 'caution' ? 'var(--caution)' : 'var(--fail)'} 8%, transparent)`,
              border: `1px solid color-mix(in oklab, ${positioning.tone === 'pass' ? 'var(--pass)' : positioning.tone === 'caution' ? 'var(--caution)' : 'var(--fail)'} 25%, transparent)`,
            }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: positioning.tone === 'pass' ? 'var(--pass)' : positioning.tone === 'caution' ? 'var(--caution)' : 'var(--fail)' }}>{positioning.label}</span>
              <span className="serif tabular" style={{ fontSize: 22, lineHeight: 1, color: positioning.tone === 'pass' ? 'var(--pass)' : positioning.tone === 'caution' ? 'var(--caution)' : 'var(--fail)' }}>
                {positioning.gap >= 0 ? '+' : '−'}{fmtMoney(Math.abs(positioning.gap), { decimals: 0, sign: false })}
              </span>
            </div>
          </div>

          <div className="divider"/>

          {/* Cash flow + cap */}
          <div className="col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
              <span>Net cash flow</span>
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
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
              <span>Days on market</span>
              <span className="mono tabular" style={{
                fontWeight: 600,
                color: property.ownership.daysOnMarket > 30 ? 'var(--fail)' : property.ownership.daysOnMarket > 14 ? 'var(--caution)' : 'var(--pass)',
              }}>{property.ownership.daysOnMarket} days</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Landlord AI Verdict
// ══════════════════════════════════════════════════════════════════
function LandlordVerdictHero({ property, askingRent, positioning, metrics }) {
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
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Scout AI · landlord verdict</span>
          <span style={{ flex: 1 }}/>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>claude · sonnet 4.6</span>
        </div>

        <div className="serif" style={{
          fontSize: 'clamp(26px, 3.4vw, 42px)', lineHeight: 1.1, letterSpacing: '-0.025em',
          color: 'var(--bg)', textWrap: 'balance', maxWidth: 920,
          position: 'relative', zIndex: 1,
        }}>
          You're <span style={{ color: 'var(--accent)' }}>{fmtMoney(positioning.gap, { decimals: 0 })}</span> above the building median, and {property.ownership.daysOnMarket} days on market is telling you exactly what the tenants think of it.
        </div>

        <div className="serif" style={{
          fontSize: 'clamp(17px, 1.7vw, 21px)', lineHeight: 1.5,
          color: 'rgba(255,255,255,0.78)',
          marginTop: 22, maxWidth: 880,
          position: 'relative', zIndex: 1,
        }}>
          Two comparable 1+1 units in your building rented inside 11 days at <span className="tabular">$3,050</span> and <span className="tabular">$3,100</span>. Dropping your ask to <span style={{ color: 'var(--accent)' }} className="tabular">$3,150</span> puts you at the top of the range and probably fills the unit inside two weeks. Holding at <span className="tabular">${askingRent.toLocaleString()}</span> costs you roughly <span style={{ color: 'var(--accent)' }} className="tabular">{fmtMoney(askingRent / 30, { decimals: 0 })}</span> in lost rent every day the unit sits empty.
        </div>

        <div className="row gap-16" style={{ marginTop: 28, color: 'rgba(255,255,255,0.5)', fontSize: 12, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <span className="row gap-6"><Icon name="check" size={12}/> {property.compCount} building comps · last 60 days</span>
          <span className="row gap-6"><Icon name="check" size={12}/> Drop the rent slider below to model alternatives</span>
          <span className="row gap-6"><Icon name="check" size={12}/> Cap rate at current rent: {fmtPct(metrics.capRate)}</span>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Rent Positioning Section (with rent slider)
// ══════════════════════════════════════════════════════════════════
function LandlordRentPositioningSection({ property, askingRent, onRentChange, positioning, comps }) {
  const min = 2500;
  const max = 3800;
  const range = max - min;
  const positionPct = ((askingRent - min) / range) * 100;
  const p25Pct = ((comps.buildingP25 - min) / range) * 100;
  const p50Pct = ((comps.buildingP50 - min) / range) * 100;
  const p75Pct = ((comps.buildingP75 - min) / range) * 100;

  return (
    <section className="container tr-section">
      <LLSectionHead
        n="01"
        topic="Rent positioning"
        question={<>Is your rent <em>where the market is</em>?</>}
        verdict={positioning.label}
        verdictTone={positioning.tone}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22, alignItems: 'flex-start' }}>
        {/* LEFT — slider + bar */}
        <div className="card col gap-24" style={{ padding: 28 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Drag to model alternatives</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span className="serif tabular" style={{ fontSize: 40, lineHeight: 1, color: positioning.tone === 'pass' ? 'var(--pass)' : positioning.tone === 'caution' ? 'var(--caution)' : 'var(--fail)' }}>
                {fmtMoney(askingRent)}
              </span>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>/mo</span>
            </div>
          </div>

          {/* Bar with building P25/P50/P75 markers */}
          <div style={{ position: 'relative', height: 36, marginTop: 12 }}>
            {/* track */}
            <div style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              left: 0, right: 0, height: 6, borderRadius: 999,
              background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent) 18%, var(--bg-elev)), color-mix(in oklab, var(--accent) 55%, transparent), color-mix(in oklab, var(--accent) 18%, var(--bg-elev)))',
            }}/>
            {/* P25 / P50 / P75 ticks (building) */}
            {[
              { pct: p25Pct, lbl: 'P25', val: fmtMoney(comps.buildingP25) },
              { pct: p50Pct, lbl: 'P50', val: fmtMoney(comps.buildingP50) },
              { pct: p75Pct, lbl: 'P75', val: fmtMoney(comps.buildingP75) },
            ].map((t) => (
              <div key={t.lbl} style={{
                position: 'absolute', left: `${t.pct}%`, top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 1.5, height: 16, background: 'var(--ink)',
                opacity: t.lbl === 'P50' ? 0.55 : 0.2,
              }}/>
            ))}
            {/* ask marker — bigger so it stands out */}
            <div style={{
              position: 'absolute', left: `${positionPct}%`, top: '50%',
              transform: 'translate(-50%, -50%)',
            }}>
              <div style={{
                width: 22, height: 22,
                background: positioning.tone === 'pass' ? 'var(--pass)' : positioning.tone === 'caution' ? 'var(--caution)' : 'var(--fail)',
                borderRadius: 5,
                transform: 'rotate(45deg)',
                border: '3px solid var(--surface)',
                boxShadow: '0 6px 14px rgba(14,19,32,0.22)',
              }}/>
            </div>
          </div>

          {/* P25/P50/P75 labels */}
          <div className="row" style={{ justifyContent: 'space-between', marginTop: -8 }}>
            {[
              { lbl: 'P25 · low',    val: fmtMoney(comps.buildingP25) },
              { lbl: 'P50 · median', val: fmtMoney(comps.buildingP50) },
              { lbl: 'P75 · high',   val: fmtMoney(comps.buildingP75) },
            ].map((t) => (
              <div key={t.lbl} className="col" style={{ alignItems: t.lbl === 'P50 · median' ? 'center' : t.lbl === 'P25 · low' ? 'flex-start' : 'flex-end', gap: 2 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>{t.lbl}</div>
                <div className="mono tabular" style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{t.val}</div>
              </div>
            ))}
          </div>

          {/* The rent slider */}
          <input
            type="range"
            className="scout-slider"
            min={min} max={max} step={25}
            value={askingRent}
            onChange={(e) => onRentChange(parseFloat(e.target.value))}
          />

          <div className="row" style={{ justifyContent: 'space-between', marginTop: -8 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>${min.toLocaleString()}</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>${max.toLocaleString()}</span>
          </div>

          {/* Quick reset to median CTA */}
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            <button onClick={() => onRentChange(comps.buildingP50)} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>
              Snap to median · {fmtMoney(comps.buildingP50)}
            </button>
            <button onClick={() => onRentChange(comps.buildingP25)} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>
              Aggressive · {fmtMoney(comps.buildingP25)}
            </button>
            <button onClick={() => onRentChange(comps.buildingP75)} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>
              Top of range · {fmtMoney(comps.buildingP75)}
            </button>
          </div>
        </div>

        {/* RIGHT — live building listings */}
        <div className="card col" style={{ padding: 24, gap: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Your building · live</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{comps.liveListings.length} units</span>
          </div>

          <div className="col">
            {comps.liveListings.map((l, i, arr) => (
              <div key={l.unit} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                padding: '12px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                alignItems: 'center', gap: 12,
              }}>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{l.unit}<span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>· {l.beds}</span></span>
                  <span className="mono" style={{ fontSize: 11, color: l.tone === 'pass' ? 'var(--pass)' : l.tone === 'caution' ? 'var(--caution)' : 'var(--fail)' }}>{l.status}</span>
                </div>
                <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
                  <span className="serif tabular" style={{ fontSize: 16, lineHeight: 1 }}>{fmtMoney(l.askedAt)}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{l.sqft} sqft</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 18, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        Every metric on this page recalculates from your slider above. P25/P50/P75 are the last 60 days of <span className="tabular">{property.compCount}</span> verified rentals in this building. Confidence: {property.compConfidence}.
      </p>
    </section>
  );
}

Object.assign(window, {
  LLSectionHead, LandlordNav, LandlordPropertyHero, LandlordVerdictHero, LandlordRentPositioningSection,
});
