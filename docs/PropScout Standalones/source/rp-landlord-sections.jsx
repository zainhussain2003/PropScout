// rp-landlord-sections.jsx — Landlord report sections, ported from
// apps/web/src/components/landlord/* + investor/NeighbourhoodSection +
// investor/STRPlaceholderSection + LandlordPage.tsx's checklist.

const { useState: useStateLl } = React;

// ── LandlordPropertyHero (landlord/LandlordPropertyHero.tsx) ──────────────────

function LandlordPropertyHero({ property, askingRent, metrics, score, positioning }) {
  const verdictColor = score.tone === 'pass' ? 'var(--pass)' : score.tone === 'caution' ? 'var(--caution)' : 'var(--fail)';
  const positioningColor = positioning.tone === 'pass' ? 'var(--pass)' : positioning.tone === 'caution' ? 'var(--caution)' : 'var(--fail)';
  const domColor = property.ownership.daysOnMarket > 30 ? 'var(--fail)' : property.ownership.daysOnMarket > 14 ? 'var(--caution)' : 'var(--pass)';

  return (
    <section className="container" style={{ paddingTop: 56, paddingBottom: 48 }}>
      <div className="row gap-12" style={{ marginBottom: 28, color: 'var(--muted)', fontSize: 13, flexWrap: 'wrap' }}>
        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={13} /></span>
          Analyze another listing
        </a>
        <span style={{ opacity: 0.4 }}>·</span>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Report · Landlord view</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }}></span>
          You own this unit · listed {property.ownership.daysOnMarket} days ago
        </span>
      </div>

      <div className="grid-1col-mobile hero-score-first" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'clamp(28px, 3.5vw, 52px)', alignItems: 'flex-start' }}>
        {/* LEFT — photos + property meta */}
        <div className="col" style={{ gap: 28 }}>
          {/* CAPTURE: the landlord's own unit photos — skyline hero + living/den/bedroom */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>
            <div className="photo-ph" style={{ borderRadius: 'var(--r-lg)', height: '100%' }}>
              <span>your unit · skyline view</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="photo-ph" style={{ borderRadius: 'var(--r)', flex: 1 }}><span>living</span></div>
              <div className="photo-ph" style={{ borderRadius: 'var(--r)', flex: 1 }}><span>second bedroom</span></div>
              <div className="photo-ph" style={{ borderRadius: 'var(--r)', flex: 1, position: 'relative' }}>
                <span>bedroom</span>
                <div className="mono" style={{ position: 'absolute', right: 10, bottom: 10, fontSize: 10, letterSpacing: '0.1em', padding: '3px 8px', background: 'color-mix(in oklab, var(--surface) 90%, transparent)', borderRadius: 999, color: 'var(--ink)', backdropFilter: 'blur(4px)' }}>
                  + 18 more
                </div>
              </div>
            </div>
          </div>

          <div className="col" style={{ gap: 18 }}>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {property.chips.map((c, i) => <Chip key={i}>{c}</Chip>)}
            </div>
            <h1 className="serif" style={{ textWrap: 'balance', letterSpacing: '-0.035em', marginTop: 4 }}>{property.addressLine1}</h1>
            <div style={{ fontSize: 16, color: 'var(--muted)' }}>{property.addressLine2}</div>

            <div className="row gap-20" style={{ flexWrap: 'wrap', marginTop: 8, fontSize: 14, color: 'var(--ink-2)', gap: 20 }}>
              <span className="row gap-8"><Icon name="house" size={14} /> {property.beds} bed · {property.baths} bath</span>
              <span className="row gap-8"><Icon name="dot" size={10} /> {property.sqft.toLocaleString()} sqft</span>
              <span className="row gap-8"><Icon name="key" size={14} /> {property.parking}</span>
              <span className="row gap-8"><Icon name="chart" size={14} /> Built {property.yearBuilt}</span>
            </div>

            {/* Ownership context strip — landlord-entered figures */}
            <div className="row gap-12" style={{ marginTop: 16, padding: '14px 18px', borderRadius: 'var(--r)', background: 'var(--bg-elev)', border: '1px solid var(--line)', flexWrap: 'wrap' }}>
              <div className="col" style={{ gap: 2, minWidth: 130 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Purchased</span>
                <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1 }}>
                  {fmtMoney(property.purchasedFor)}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}> · {property.purchasedYear}</span>
                </span>
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }}></div>
              <div className="col" style={{ gap: 2, minWidth: 130 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Your value estimate</span>
                <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1 }}>
                  {fmtMoney(property.price)}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--pass)' }}> · +{fmtPct(property.appreciation, 1)}</span>
                </span>
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }}></div>
              <div className="col" style={{ gap: 2, minWidth: 130 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Mortgage balance</span>
                <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1 }}>
                  {fmtMoney(property.ownership.mortgageBalance)}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}> · {fmtPct(property.ownership.contractRate, 2)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — sticky landlord score card */}
        <div className="card col" style={{ padding: 32, gap: 24, position: 'sticky', top: 84 }}>
          <div className="col" style={{ alignItems: 'center', gap: 8 }}>
            <DealScore
              score={score.displayTotal}
              max={100}
              tone={score.tone}
              size="lg"
              label="Landlord score / 100"
              showVerdict
              verdictLabel={score.label}
              animate
            />
          </div>

          <div className="col" style={{ textAlign: 'center', alignItems: 'center', gap: 8 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: verdictColor }}>{score.label}</div>
            <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, textWrap: 'balance' }}>{score.tagline}</div>
          </div>

          <div className="divider"></div>

          <div className="col" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Your asking rent</span>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>
                {fmtMoney(askingRent)}<span style={{ fontSize: 13, color: 'var(--muted)' }}>/mo</span>
              </span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 14px', borderRadius: 'var(--r)', background: `color-mix(in oklab, ${positioningColor} 8%, transparent)`, border: `1px solid color-mix(in oklab, ${positioningColor} 25%, transparent)` }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: positioningColor }}>{positioning.label}</span>
              <span className="serif tabular" style={{ fontSize: 22, lineHeight: 1, color: positioningColor }}>
                {positioning.gap >= 0 ? '+' : '\u2212'}{fmtMoney(Math.abs(positioning.gap), { decimals: 0 })}
              </span>
            </div>
          </div>

          <div className="divider"></div>

          <div className="col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
              <span>Net cash flow</span>
              <span className="mono tabular" style={{ fontWeight: 600, color: metrics.cashFlowMonthly >= 0 ? 'var(--pass)' : 'var(--fail)' }}>{fmtMoney(metrics.cashFlowMonthly)}/mo</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
              <span>Cap rate</span>
              <span className="mono tabular" style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmtPct(metrics.capRate)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
              <span>DSCR</span>
              <span className="mono tabular" style={{ fontWeight: 600, color: 'var(--ink)' }}>{metrics.dscr.toFixed(2)}&times;</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
              <span>Days on market</span>
              <span className="mono tabular" style={{ fontWeight: 600, color: domColor }}>{property.ownership.daysOnMarket} days</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── LandlordVerdictHero (landlord/LandlordVerdictHero.tsx) ────────────────────

function LandlordVerdictHero({ property, askingRent, positioning, metrics, comps }) {
  const dailyVacancyCost = Math.round(askingRent / 30);
  const rented = comps.liveListings.filter((l) => l.status.startsWith('rented'));

  return (
    <section className="container" style={{ marginTop: 24, marginBottom: 16 }}>
      <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 'var(--r-lg)', padding: 'clamp(36px, 4vw, 56px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -80, top: -40, opacity: 0.06, color: 'var(--accent)' }}>
          <ScoutMark size={520} color="var(--accent)" />
        </div>

        <div className="row gap-8" style={{ color: 'color-mix(in oklab, var(--bg) 55%, transparent)', marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <span className="live-dot" style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)' }}></span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Scout AI · landlord verdict</span>
          <span style={{ flex: 1 }}></span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'color-mix(in oklab, var(--bg) 40%, transparent)' }}>claude · sonnet 4.6</span>
        </div>

        <div className="serif" style={{ fontSize: 'clamp(26px, 3.4vw, 42px)', lineHeight: 1.1, letterSpacing: '-0.025em', color: 'var(--bg)', textWrap: 'balance', maxWidth: 920, position: 'relative', zIndex: 1 }}>
          You're <span style={{ color: 'var(--accent)' }}>{fmtMoney(Math.abs(positioning.gap), { decimals: 0 })}</span> above the building median, and {property.ownership.daysOnMarket} days on market is telling you exactly what the tenants think of it.
        </div>

        <div className="serif" style={{ fontSize: 'clamp(17px, 1.7vw, 21px)', lineHeight: 1.5, color: 'color-mix(in oklab, var(--bg) 78%, transparent)', marginTop: 22, maxWidth: 880, position: 'relative', zIndex: 1 }}>
          Two comparable 2-bed units in your building rented inside 10 days at{' '}
          <span className="tabular">{fmtMoney(rented[0].askedAt)}</span> and <span className="tabular">{fmtMoney(rented[1].askedAt)}</span>.
          Dropping your ask to{' '}
          <span style={{ color: 'var(--accent)' }} className="tabular">{fmtMoney(comps.buildingP75)}</span>{' '}
          puts you at the top of the range and probably fills the unit inside two weeks. Holding at{' '}
          <span className="tabular">${askingRent.toLocaleString()}</span> costs you roughly{' '}
          <span style={{ color: 'var(--accent)' }} className="tabular">{fmtMoney(dailyVacancyCost, { decimals: 0 })}</span>{' '}
          in lost rent every day the unit sits empty.
        </div>

        <div className="row gap-16" style={{ marginTop: 28, color: 'color-mix(in oklab, var(--bg) 50%, transparent)', fontSize: 12, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <span className="row gap-6"><Icon name="check" size={12} /> {property.compCount} building comps · last 60 days</span>
          <span className="row gap-6"><Icon name="check" size={12} /> Drop the rent slider below to model alternatives</span>
          <span className="row gap-6"><Icon name="check" size={12} /> Cap rate at current rent: {fmtPct(metrics.capRate)}</span>
        </div>
      </div>
    </section>
  );
}

// ── §01 LandlordRentPositioningSection ────────────────────────────────────────

const LL_SLIDER_MIN = 2200;
const LL_SLIDER_MAX = 2900;

function LandlordRentPositioningSection({ property, askingRent, onRentChange, positioning, comps }) {
  const positioningColor = positioning.tone === 'pass' ? 'var(--pass)' : positioning.tone === 'caution' ? 'var(--caution)' : 'var(--fail)';
  const toneLabel = (tone) => (tone === 'pass' ? 'var(--pass)' : tone === 'caution' ? 'var(--caution)' : 'var(--fail)');

  return (
    <section className="container tr-section" data-section="01">
      <SectionHead
        n="01"
        topic="Rent positioning"
        question={<React.Fragment>Is your rent <em>where the market is</em>?</React.Fragment>}
        verdict={positioning.label}
        tone={positioning.tone}
      />

      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22, alignItems: 'flex-start' }}>
        {/* LEFT — slider + bar */}
        <div className="card col gap-24" style={{ padding: 28 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Drag to model alternatives</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span className="serif tabular" style={{ fontSize: 40, lineHeight: 1, color: positioningColor }}>{fmtMoney(askingRent)}</span>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>/mo</span>
            </div>
          </div>

          <RentalCompsBar low={comps.buildingP25} mid={comps.buildingP50} high={comps.buildingP75} ask={askingRent} />

          <input
            type="range"
            className="scout-slider"
            min={LL_SLIDER_MIN}
            max={LL_SLIDER_MAX}
            step={25}
            value={askingRent}
            onChange={(e) => onRentChange(parseFloat(e.target.value))}
            aria-label="Asking rent"
          />

          <div className="row" style={{ justifyContent: 'space-between', marginTop: -8 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>${LL_SLIDER_MIN.toLocaleString()}</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>${LL_SLIDER_MAX.toLocaleString()}</span>
          </div>

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
              <div key={l.unit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', alignItems: 'center', gap: 12 }}>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {l.unit}
                    <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>· {l.beds}</span>
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: toneLabel(l.tone) }}>{l.status}</span>
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
        Every metric on this page recalculates from your slider above. P25/P50/P75 are the last 60 days of{' '}
        <span className="tabular">{property.compCount}</span> verified rentals in this building. Confidence: {property.compConfidence}.
      </p>
    </section>
  );
}

// ── §09 NeighbourhoodSection (investor/NeighbourhoodSection.tsx) ──────────────
// Honest shim behaviour: Walk Score is live; StatsCan / permits / comps / HPI
// have no source yet and render as em-dashes rather than invented values.

function NeighbourhoodSection({ neighbourhood, sectionNumber = '08' }) {
  const n = neighbourhood;

  const statTiles = [
    ['Median income (FSA)', n.avgIncome > 0 ? fmtMoney(n.avgIncome) : '—', 'StatsCan 2021'],
    ['5-year pop. growth', n.popGrowth5y !== 0 ? fmtPct(n.popGrowth5y, 1) : '—', 'StatsCan'],
    ['Walk Score', n.walkScore > 0 ? String(n.walkScore) : '—', n.walkScore >= 80 ? 'Very walkable' : 'Mostly walkable'],
    ['Transit Score', n.transitScore > 0 ? String(n.transitScore) : '—', n.transitScore >= 80 ? 'Excellent' : 'Some transit'],
    ['Active building permits', n.buildingPermits > 0 ? String(n.buildingPermits) : '—', 'in 1km radius'],
    ['Price per sqft trend', n.ppsqftTrend !== 'N/A' ? n.ppsqftTrend : '—', 'last 12 months'],
  ];

  const verdictLabel = n.walkScore >= 80 ? `Walk ${n.walkScore} · Transit ${n.transitScore}` : 'Modest growth';

  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead
        n={sectionNumber}
        topic="Neighbourhood"
        question={<React.Fragment>What's the <em>market</em> doing around it?</React.Fragment>}
        verdict={verdictLabel}
        tone="pass"
      />

      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        {statTiles.map(([label, value, sub]) => (
          <div key={label} className="card col" style={{ padding: '18px 22px', gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
            <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1 }}>{value}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</span>
          </div>
        ))}
      </div>

      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="card col" style={{ padding: 28, gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Comparable recent sales</span>
              <h3 className="serif" style={{ fontSize: 22 }}>What sold nearby.</h3>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {n.comps.length > 0 ? `${n.comps.length} verified sales` : 'no source yet'}
            </span>
          </div>

          {n.comps.length === 0 ? (
            <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em' }}>
              Sales comps · available in Phase 2
            </p>
          ) : (
            <div className="col" style={{ gap: 0 }}>
              {n.comps.map((comp, i) => (
                <div key={comp.addr} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < n.comps.length - 1 ? '1px solid var(--line)' : 'none', gap: 16, alignItems: 'flex-start' }}>
                  <div className="col" style={{ gap: 2 }}>
                    <span style={{ fontSize: 14, color: 'var(--ink)' }}>{comp.addr}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{comp.beds} bed · {comp.sqft.toLocaleString('en-CA')} sqft</span>
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                    <span className="serif tabular" style={{ fontSize: 18, lineHeight: 1, color: 'var(--ink)' }}>{comp.sold}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{comp.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card col" style={{ padding: 28, gap: 18, background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--bg) 55%, transparent)' }}>Appreciation</div>

          <div className="col" style={{ gap: 4 }}>
            <span className="serif tabular" style={{ fontSize: 'clamp(36px, 4vw, 52px)', lineHeight: 1, color: 'var(--accent)' }}>
              {n.appreciation5y !== 0 ? `+${fmtPct(n.appreciation5y, 1)}` : '—'}
            </span>
            <span style={{ fontSize: 14, color: 'color-mix(in oklab, var(--bg) 75%, transparent)' }}>5-year median sale price</span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center', fontSize: 13, color: 'color-mix(in oklab, var(--bg) 70%, transparent)' }}>
            <span>10-year:</span>
            <span className="mono tabular" style={{ color: 'var(--bg)', fontWeight: 500 }}>
              {n.appreciation10y !== 0 ? `+${fmtPct(n.appreciation10y, 1)}` : '—'}
            </span>
          </div>

          <div style={{ height: 1, background: 'color-mix(in oklab, var(--bg) 15%, transparent)', margin: '4px 0' }}></div>

          <p style={{ fontSize: 13, color: 'color-mix(in oklab, var(--bg) 70%, transparent)', lineHeight: 1.55 }}>
            Teranet HPI and public MLS integrations land in Phase 2 — until then this card shows only what we can verify.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── §11 STRPlaceholderSection (investor/STRPlaceholderSection.tsx) ────────────

const STR_OTHER_CITIES = [
  { city: 'Ottawa', rule: 'Permitted · registration', tone: 'caution' },
  { city: 'Mississauga', rule: 'Principal residence', tone: 'fail' },
  { city: 'Hamilton', rule: 'Permitted', tone: 'pass' },
  { city: 'Vaughan', rule: 'Permitted · registration', tone: 'caution' },
];

function STRPlaceholderSection({ cityName = 'Toronto', cityRule, sectionNumber = '10' }) {
  const rule = cityRule || {
    rule: 'Principal-residence only',
    tone: 'fail',
    explain: 'Toronto requires operators to live in the unit being rented short-term.',
  };

  const mockNumbers = [
    ['Nightly ADR', '$184'], ['Occupancy', '68%'], ['Net rev /mo', '$3,120'],
    ['STR – LTR', '+ $220'], ['Seasonality', '±18%'], ['Cleaning/turn', '$2,400/mo'],
  ];

  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead
        n={sectionNumber}
        topic="STR vs LTR"
        question={<React.Fragment>Could you make <em>more</em> short-term?</React.Fragment>}
        verdict="Modeling · Phase 2"
        tone="caution"
      />

      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <div className="card col" style={{ padding: 28, gap: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, transparent 30%, color-mix(in oklab, var(--surface) 96%, transparent) 100%)', pointerEvents: 'none', zIndex: 1 }} aria-hidden="true"></div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Short-term rental analysis</span>
            <Chip>Coming Phase 2</Chip>
          </div>

          <h3 className="serif" style={{ fontSize: 24, position: 'relative', zIndex: 2 }}>AirDNA revenue modeling — shipping Q3 2026.</h3>

          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, position: 'relative', zIndex: 2 }}>
            We're integrating AirDNA to project nightly rates, occupancy, seasonality, and net revenue for this exact unit against true STR comparables. Until then, the LTR baseline shown above is your reference.
          </p>

          <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 4, filter: 'blur(2px)', opacity: 0.55, pointerEvents: 'none', position: 'relative', zIndex: 0 }} aria-hidden="true">
            {mockNumbers.map(([label, value]) => (
              <div key={label} className="col" style={{ padding: '14px 16px', borderRadius: 'var(--r)', background: 'var(--bg-elev)', border: '1px solid var(--line)', gap: 4 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
                <span className="serif tabular" style={{ fontSize: 20, lineHeight: 1 }}>{value}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginTop: 4, position: 'relative', zIndex: 2 }}>
            Notify me when STR ships <Icon name="arrow" size={13} />
          </button>
        </div>

        <div className="card col" style={{ padding: 28, gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>STR legality · live</span>
            <VerdictPill tone={rule.tone} label={rule.rule} />
          </div>

          <h3 className="serif" style={{ fontSize: 22 }}>{cityName} rules</h3>

          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>{rule.explain}</p>

          <div style={{ height: 1, background: 'var(--line)' }}></div>

          <div className="col" style={{ gap: 8 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Other Ontario cities</div>
            {STR_OTHER_CITIES.map((r, i) => (
              <div key={r.city} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < STR_OTHER_CITIES.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 13, alignItems: 'center' }}>
                <span style={{ color: 'var(--ink-2)' }}>{r.city}</span>
                <VerdictPill tone={r.tone} label={r.rule} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── §11 LandlordChecklistSection (LandlordPage.tsx) ───────────────────────────

const LANDLORD_CHECKLIST = [
  { label: 'Confirm rent is at or below the market range before re-listing', critical: true },
  { label: 'Screen all prospective tenants under HRTO and RTA guidelines', critical: true },
  { label: 'Use the OREA Standard Form lease — custom clauses must be addenda', critical: true },
  { label: "Run a full credit + reference check — don't rely on email alone", critical: true },
  { label: 'File N1 within 90 days if planning a guideline increase this year', critical: false },
  { label: 'Document property condition with a time-stamped walkthrough video', critical: false },
  { label: 'Review condo rules on tenant move-in/out procedures and elevator booking', critical: false },
  { label: 'Confirm building rental ratio and verify CMHC vacancy allowance', critical: false },
];

function LandlordChecklistSection() {
  const [checked, setChecked] = useStateLl(new Set());

  const toggle = (i) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const criticalCount = LANDLORD_CHECKLIST.filter((i) => i.critical).length;

  return (
    <section className="container tr-section" data-section="12">
      <SectionHead
        n="12"
        topic="Landlord checklist"
        question={<React.Fragment>Do these <em>before</em> you list.</React.Fragment>}
        verdict={`${LANDLORD_CHECKLIST.length} items · ${criticalCount} critical`}
        tone="caution"
      />

      <div className="card" style={{ padding: 28 }}>
        <div className="col">
          {LANDLORD_CHECKLIST.map((it, i) => {
            const done = checked.has(i);
            return (
              <label key={i} className="row gap-14" style={{ padding: '14px 4px', borderBottom: i < LANDLORD_CHECKLIST.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer', alignItems: 'center', gap: 14 }}>
                <input type="checkbox" checked={done} onChange={() => toggle(i)} style={{ width: 18, height: 18, accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }} />
                <div className="col grow" style={{ gap: 2, color: done ? 'var(--muted)' : 'var(--ink)', textDecoration: done ? 'line-through' : 'none' }}>
                  <span style={{ fontSize: 15 }}>{it.label}</span>
                </div>
                {it.critical && (
                  <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', padding: '3px 8px', borderRadius: 999, border: '1px solid color-mix(in oklab, var(--accent) 35%, transparent)', background: 'color-mix(in oklab, var(--accent) 8%, transparent)', flexShrink: 0 }}>
                    Critical
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div className="row gap-12" style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary"><Icon name="doc" size={13} /> Export as PDF</button>
          <button className="btn btn-ghost"><Icon name="link" size={13} /> Share with tenant agent</button>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, {
  LandlordPropertyHero, LandlordVerdictHero, LandlordRentPositioningSection,
  NeighbourhoodSection, STRPlaceholderSection, LandlordChecklistSection,
});
