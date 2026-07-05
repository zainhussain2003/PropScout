// rp-personal-sections.jsx — Personal Buyer report, part 1:
// computeMonthlyCost / computeHomeScore (data/personalBuyerData.ts),
// PersonalPropertyHero (with the honest suppressed-gauge state),
// PersonalVerdictHero (real-report provenance strip),
// §01 PBTrueCostSection, §02 PBFMVSection.

const { useState: useStatePs, useEffect: useEffectPs } = React;

// ── computeMonthlyCost (personalBuyerData.ts) ─────────────────────────────────

function personalMaintenanceRate(yearBuilt) {
  if (yearBuilt >= 2010) return 0.005;
  if (yearBuilt >= 1980) return 0.01;
  return 0.015;
}

function computeMonthlyCost(property, financing) {
  const { price, annualTaxes, condoFeeMonthly, utilityEstMonthly, insuranceMonthlyEst, yearBuilt } = property;
  const { downPct, rate, amort } = financing;
  const principal = price * (1 - downPct);
  const mortgage = computeMonthlyPayment(principal, rate, amort);
  const maintenanceMonthly = (price * personalMaintenanceRate(yearBuilt)) / 12;
  const utilTotal = utilityEstMonthly.hydro + utilityEstMonthly.gas + utilityEstMonthly.water + utilityEstMonthly.internet;
  const tax = annualTaxes / 12;
  const total = mortgage + tax + condoFeeMonthly + insuranceMonthlyEst + utilTotal + maintenanceMonthly;
  return { mortgage, tax, condo: condoFeeMonthly, insurance: insuranceMonthlyEst, utilities: { ...utilityEstMonthly, total: utilTotal }, maintenance: maintenanceMonthly, total, principal };
}

// ── computeHomeScore (personalBuyerData.ts — severe gate + floor) ─────────────

const HOME_SCORE = { RISK_MAX: 10, RED_FLAG_DEDUCTION: 5, SEVERE_CEILINGS: [34, 20, 10], FLOOR: 5 };

function computeHomeScore(property, schools, neigh, lightScore, flags) {
  const askVsMid = (property.price - property.fmv.mid) / property.fmv.mid;
  let pricing = 0;
  if (askVsMid <= -0.05) pricing = 25;
  else if (askVsMid <= -0.02) pricing = 22;
  else if (askVsMid <= 0.0) pricing = 18;
  else if (askVsMid <= 0.03) pricing = 14;
  else if (askVsMid <= 0.06) pricing = 8;

  const allSchools = [...schools.elementary, ...schools.middle, ...schools.high];
  const inCatch = allSchools.filter((s) => s.inCatchment);
  const scored = allSchools.filter((s) => s.eqao > 0);
  let schoolPts = 0;
  let avgEqao = 0;
  if (allSchools.length > 0) {
    avgEqao = inCatch.length
      ? inCatch.reduce((s, x) => s + x.eqao, 0) / inCatch.length
      : scored.length
        ? scored.reduce((s, x) => s + x.eqao, 0) / scored.length
        : 7.5;
    if (avgEqao >= 9.0) schoolPts = 20;
    else if (avgEqao >= 8.5) schoolPts = 17;
    else if (avgEqao >= 8.0) schoolPts = 14;
    else if (avgEqao >= 7.0) schoolPts = 10;
    else schoolPts = 5;
  }

  let lightPts = 0;
  if (lightScore >= 80) lightPts = 15;
  else if (lightScore >= 60) lightPts = 12;
  else if (lightScore >= 40) lightPts = 8;
  else lightPts = 4;

  const wt = (neigh.walkScore + neigh.transitScore) / 2;
  let walkPts = 0;
  if (wt >= 80) walkPts = 15;
  else if (wt >= 65) walkPts = 12;
  else if (wt >= 50) walkPts = 9;
  else if (wt >= 35) walkPts = 5;
  else walkPts = 2;

  const lotPts = 8;

  const reds = (flags || []).filter((f) => f.severity === 'red');
  const severeCount = reds.filter((f) => f.tier === 'severe').length;
  const standardRedCount = reds.length - severeCount;
  const riskPts = Math.max(0, HOME_SCORE.RISK_MAX - standardRedCount * HOME_SCORE.RED_FLAG_DEDUCTION);

  let total = Math.min(100, pricing + schoolPts + lightPts + walkPts + lotPts + riskPts);
  if (severeCount > 0) {
    const ceiling = HOME_SCORE.SEVERE_CEILINGS[Math.min(severeCount, HOME_SCORE.SEVERE_CEILINGS.length) - 1] || HOME_SCORE.FLOOR;
    total = Math.min(total, ceiling);
  }
  total = Math.max(HOME_SCORE.FLOOR, total);

  const verdict =
    total >= 80 ? { label: 'Make an offer', tone: 'pass', tagline: 'Strong fit — proceed with confidence.' }
    : total >= 65 ? { label: 'Worth pursuing', tone: 'pass', tagline: 'Solid home — standard due diligence applies.' }
    : total >= 50 ? { label: 'Negotiate first', tone: 'caution', tagline: 'A few concerns — bring them up before bidding.' }
    : total >= 35 ? { label: 'Look further', tone: 'caution', tagline: 'Mixed signals — explore alternatives.' }
    : { label: 'Probably not', tone: 'fail', tagline: 'Significant headwinds for personal use.' };

  return {
    components: { pricing, schoolPts, lightPts, walkPts, lotPts, riskPts },
    componentMaxes: { pricing: 25, schoolPts: 20, lightPts: 15, walkPts: 15, lotPts: 15, riskPts: 10 },
    total, verdict, avgEqao, askVsMid,
  };
}

// ── PersonalPropertyHero (PersonalBuyerPage.tsx) ──────────────────────────────

function PersonalPropertyHero({ property, score, monthly, scoreSuppressed = false }) {
  const verdictColor = score.verdict.tone === 'pass' ? 'var(--pass)' : score.verdict.tone === 'caution' ? 'var(--caution)' : 'var(--fail)';

  return (
    <section className="container" style={{ paddingTop: 56, paddingBottom: 48 }}>
      <div className="row gap-12" style={{ marginBottom: 28, color: 'var(--muted)', fontSize: 13, flexWrap: 'wrap' }}>
        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={13} /></span>
          Analyze another listing
        </a>
        <span style={{ opacity: 0.4 }}>·</span>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Report · Personal view</span>
        {property.daysOnMarket > 0 && (
          <React.Fragment>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="live-dot" style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }}></span>
              Listed {property.daysOnMarket} days ago
            </span>
          </React.Fragment>
        )}
      </div>

      <div className="grid-1col-mobile hero-score-first" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'clamp(28px, 3.5vw, 52px)', alignItems: 'flex-start' }}>
        {/* LEFT — photos + chips + address + meta */}
        <div className="col" style={{ gap: 28 }}>
          {/* CAPTURE: scraped listing photos — exterior hero + living/kitchen/balcony */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>
            <div className="photo-ph" style={{ borderRadius: 'var(--r-lg)', height: '100%' }}>
              <span>exterior · tower view</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="photo-ph" style={{ borderRadius: 'var(--r)', flex: 1 }}><span>living room</span></div>
              <div className="photo-ph" style={{ borderRadius: 'var(--r)', flex: 1 }}><span>kitchen</span></div>
              <div className="photo-ph" style={{ borderRadius: 'var(--r)', flex: 1, position: 'relative' }}>
                <span>balcony</span>
                <div className="mono" style={{ position: 'absolute', right: 10, bottom: 10, fontSize: 10, letterSpacing: '0.1em', padding: '3px 8px', background: 'color-mix(in oklab, var(--surface) 90%, transparent)', borderRadius: 999, color: 'var(--ink)', backdropFilter: 'blur(4px)' }}>
                  + more
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
              {property.yearBuilt > 0 && (
                <span className="row gap-8"><Icon name="chart" size={14} /> Built {property.yearBuilt}</span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — sticky home-score card */}
        <div className="card col" style={{ padding: 32, gap: 24, position: 'sticky', top: 84 }}>
          {scoreSuppressed ? (
            // Inputs are mostly placeholder (FMV pinned to asking, schools/light
            // pending) — an aggregate number would imply confidence we don't have.
            <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: '8px 4px' }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>Overall score paused</div>
              <div className="serif" style={{ fontSize: 19, lineHeight: 1.25 }}>Pricing &amp; schools data pending</div>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 280 }}>
                We don't yet have comparable-sales or school data for this address, so a single home score would overstate what we know. The sections below show what we can verify — cost, location, and risk flags.
              </p>
            </div>
          ) : (
            <React.Fragment>
              <div className="col" style={{ alignItems: 'center', gap: 8 }}>
                <DealScore score={score.total} max={100} size="lg" label="Home score / 100" tone={score.verdict.tone} showVerdict verdictLabel={score.verdict.label} animate />
              </div>
              <div className="col" style={{ textAlign: 'center', alignItems: 'center', gap: 8 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: verdictColor }}>{score.verdict.label}</div>
                <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, textWrap: 'balance' }}>{score.verdict.tagline}</div>
              </div>
            </React.Fragment>
          )}

          <div className="divider"></div>

          <div className="col" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Asking</span>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>{fmtMoney(property.price)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 14px', borderRadius: 'var(--r)', background: 'color-mix(in oklab, var(--accent) 6%, transparent)', border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>True monthly cost</span>
              <span className="serif tabular" style={{ fontSize: 24, lineHeight: 1, color: 'var(--accent)' }}>
                {fmtMoney(monthly.total)}<span style={{ fontSize: 12, color: 'var(--muted)' }}>/mo</span>
              </span>
            </div>
          </div>

          <div className="divider"></div>

          <div className="col" style={{ gap: 10 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Score breakdown</div>
            {[
              ['Pricing vs FMV', score.components.pricing, 25],
              ['Schools', score.components.schoolPts, 20],
              ['Light', score.components.lightPts, 15],
              ['Walk + transit', score.components.walkPts, 15],
              ['Lot value-add', score.components.lotPts, 15],
              ['Risk', score.components.riskPts, 10],
            ].map(([lbl, v, max]) => (
              <div key={lbl} className="col" style={{ gap: 4 }}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink-2)' }}>{lbl}</span>
                  <span className="mono tabular" style={{ color: 'var(--muted)' }}>{v} / {max}</span>
                </div>
                <div style={{ height: 3, borderRadius: 999, background: 'var(--line)' }}>
                  <div style={{ width: `${(v / max) * 100}%`, height: '100%', borderRadius: 999, background: v / max > 0.65 ? 'var(--pass)' : v / max > 0.35 ? 'var(--caution)' : 'var(--fail)' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── PersonalVerdictHero — real-report path (PersonalBuyerPage.tsx) ────────────

function PersonalVerdictHero({ narrative }) {
  const [expanded, setExpanded] = useStatePs(false);
  const [isMobile, setIsMobile] = useStatePs(window.innerWidth <= 480);

  useEffectPs(() => {
    const handler = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const first = narrative.split('. ')[0] + '.';
  const rest = narrative.split('. ').slice(1).join('. ');

  return (
    <section className="container" style={{ marginTop: 24, marginBottom: 16 }}>
      <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 'var(--r-lg)', padding: 'clamp(36px, 4vw, 56px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -80, top: -40, opacity: 0.06, color: 'var(--accent)' }}>
          <ScoutMark size={520} color="var(--accent)" />
        </div>

        <div className="row gap-8" style={{ color: 'color-mix(in oklab, var(--bg) 55%, transparent)', marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <span className="live-dot" style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)' }}></span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Scout AI · home buyer verdict</span>
          <span style={{ flex: 1 }}></span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'color-mix(in oklab, var(--bg) 40%, transparent)' }}>claude · sonnet 4.6</span>
        </div>

        <div className="serif" style={{ fontSize: 'clamp(26px, 3.4vw, 42px)', lineHeight: 1.1, letterSpacing: '-0.025em', color: 'var(--bg)', textWrap: 'balance', maxWidth: 920, position: 'relative', zIndex: 1 }}>
          {first}
        </div>

        {(!isMobile || expanded) && (
          <div className="serif" style={{ fontSize: 'clamp(17px, 1.7vw, 21px)', lineHeight: 1.5, color: 'color-mix(in oklab, var(--bg) 78%, transparent)', marginTop: 22, maxWidth: 880, position: 'relative', zIndex: 1 }}>
            {rest}
          </div>
        )}

        {isMobile && (
          <button onClick={() => setExpanded(!expanded)} style={{ marginTop: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: 0, position: 'relative', zIndex: 1 }}>
            {expanded ? 'Show less' : 'Read full verdict →'}
          </button>
        )}

        {/* Provenance strip — only claim sources we actually have */}
        <div className="row gap-16" style={{ marginTop: 28, color: 'color-mix(in oklab, var(--bg) 50%, transparent)', fontSize: 12, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <span className="row gap-6"><Icon name="flag" size={12} /> Comparable sales · no source yet (value estimated)</span>
          <span className="row gap-6"><Icon name="flag" size={12} /> School data · pending dataset load</span>
          <span className="row gap-6"><Icon name="check" size={12} /> Walk/Transit via Walk Score</span>
        </div>
      </div>
    </section>
  );
}

// ── §01 PBTrueCostSection (personal/PBTrueCostSection.tsx) ────────────────────

function pbMaintenanceNote(yearBuilt) {
  if (yearBuilt >= 2010) return '0.5% of value / yr · 2010+ build';
  if (yearBuilt >= 1980) return '1.0% of value / yr · 1980-era build';
  return '1.5% of value / yr · pre-1980 build';
}

function PBTrueCostSection({ property, monthly }) {
  const utilitiesTotal = monthly.utilities.hydro + monthly.utilities.gas + monthly.utilities.water + monthly.utilities.internet;

  const topLines = [
    { k: 'Mortgage', v: monthly.mortgage, note: `${Math.round(property.defaultDownPct * 100)}% down · ${(property.defaultRate * 100).toFixed(2)}% · ${property.defaultAmort}-yr amort` },
    { k: 'Property tax', v: monthly.tax, note: `${fmtMoney(property.annualTaxes)}/yr` },
    { k: 'Condo fee', v: monthly.condo, note: 'monthly maintenance fee' },
    { k: 'Insurance', v: monthly.insurance, note: 'condo estimate · 0.35% of value' },
  ];

  const utilitiesSubRows = [
    { k: 'Hydro', v: monthly.utilities.hydro, note: '11¢/kWh · avg consumption', indent: true },
    { k: 'Gas', v: monthly.utilities.gas, note: 'building heating share', indent: true },
    { k: 'Water', v: monthly.utilities.water, note: 'metered · municipal', indent: true },
    { k: 'Internet', v: monthly.utilities.internet, note: '1 Gbps · Rogers / Bell', indent: true },
  ];

  const allLines = [
    ...topLines,
    { k: 'Utilities', v: utilitiesTotal, note: 'hydro · gas · water · internet' },
    ...utilitiesSubRows,
    { k: 'Maintenance reserve', v: monthly.maintenance, note: pbMaintenanceNote(property.yearBuilt) },
  ];

  const everythingElse = monthly.total - monthly.mortgage;
  const impliedIncome = (monthly.total * 12) / 0.32;

  return (
    <section className="container tr-section" data-section="01">
      <SectionHead
        n="01"
        topic="True monthly cost"
        question={<React.Fragment>What will it <em>really</em> cost to live here?</React.Fragment>}
        verdict={`${fmtMoney(monthly.total)}/mo · all-in`}
        tone="pass"
      />

      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 22, alignItems: 'flex-start' }}>
        {/* Itemised table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {allLines.map((l, i) => (
            <div key={l.k} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', padding: l.indent ? '8px 22px 8px 38px' : '14px 22px', borderBottom: i < allLines.length - 1 ? '1px solid var(--line)' : 'none', alignItems: 'center', background: l.indent ? 'color-mix(in oklab, var(--bg-elev) 60%, var(--surface))' : 'transparent' }}>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: l.indent ? 13 : 14.5, color: l.indent ? 'var(--ink-2)' : 'var(--ink)', fontWeight: 500 }}>{l.k}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{l.note}</span>
              </div>
              <span className="mono tabular" style={{ textAlign: 'right', fontSize: l.indent ? 13 : 16, fontWeight: 500, color: l.indent ? 'var(--ink-2)' : 'var(--ink)' }}>
                {fmtMoney(l.v, { decimals: 0 })}
              </span>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', padding: '20px 22px', background: 'color-mix(in oklab, var(--accent) 6%, var(--bg-elev))', alignItems: 'center' }}>
            <div className="col" style={{ gap: 2 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>True monthly cost</span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Including everything you pay to keep the keys</span>
            </div>
            <span className="serif tabular" style={{ textAlign: 'right', fontSize: 30, lineHeight: 1, color: 'var(--accent)' }}>
              {fmtMoney(monthly.total)}<span style={{ fontSize: 13, color: 'var(--muted)' }}>/mo</span>
            </span>
          </div>
        </div>

        {/* Right column */}
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
              The number that catches first-time buyers off-guard. Taxes, condo fee, insurance, utilities, and a real maintenance reserve add roughly{' '}
              <span className="tabular" style={{ color: 'var(--ink)' }}>{fmtPct(everythingElse / monthly.total, 0)}</span>{' '}
              on top of the mortgage every single month.
            </p>
          </div>

          <div className="card col" style={{ padding: 24, gap: 12 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Affordability check</span>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Lenders want shelter costs under{' '}
              <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>32%</span>{' '}
              of gross income. At {fmtMoney(monthly.total)}/mo, that implies a household income of at least{' '}
              <span className="tabular" style={{ color: 'var(--accent)', fontWeight: 500 }}>{fmtMoney(impliedIncome, { decimals: 0 })}</span>.
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

// ── §02 PBFMVSection (personal/PBFMVSection.tsx) ──────────────────────────────

function pbGetFMVVerdict(price, fmv) {
  if (price <= fmv.low + (fmv.mid - fmv.low) * 0.3) return { label: 'Below market', tone: 'pass' };
  if (price <= fmv.mid + (fmv.high - fmv.mid) * 0.3) return { label: 'At market', tone: 'pass' };
  return { label: 'Above market', tone: 'caution' };
}

function PBFMVSection({ property, score, compCount, avgDOM, medianPPSqft, isEstimated = false }) {
  const { fmv } = property;
  const range = fmv.high - fmv.low;
  const askPos = range > 0 ? Math.min(100, Math.max(0, ((property.price - fmv.low) / range) * 100)) : 50;
  const { label: verdictLabel, tone: verdictTone } = pbGetFMVVerdict(property.price, fmv);
  const thisPPSqft = Math.round(property.price / property.sqft);
  const medianPP = medianPPSqft != null ? medianPPSqft : thisPPSqft;

  return (
    <section className="container tr-section" data-section="02">
      <SectionHead
        n="02"
        topic="Fair market value"
        question={<React.Fragment>Is it priced <em>fairly</em>?</React.Fragment>}
        verdict={verdictLabel}
        tone={verdictTone}
      />

      {isEstimated && (
        <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: 16 }}>
          Estimated range · real comps in Phase 2
        </p>
      )}

      <div className="card" style={{ padding: 28 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Asking</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>{fmtMoney(property.price)}</span>
              <span className="mono" style={{ fontSize: 12, color: score.askVsMid <= 0 ? 'var(--pass)' : 'var(--caution)' }}>
                {score.askVsMid >= 0 ? '+' : '\u2212'}{Math.abs(score.askVsMid * 100).toFixed(1)}% vs P50
              </span>
            </div>
          </div>
          <VerdictPill tone={verdictTone} label={verdictLabel} />
        </div>

        <div role="img" aria-label={`Fair market value range: $${fmv.low.toLocaleString()} to $${fmv.high.toLocaleString()}, median $${fmv.mid.toLocaleString()}, asking $${property.price.toLocaleString()}`} style={{ position: 'relative', height: 32, marginTop: 10, marginBottom: 18 }}>
          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: 12, borderRadius: 999, background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent) 18%, var(--bg-elev)), color-mix(in oklab, var(--accent) 55%, transparent), color-mix(in oklab, var(--accent) 18%, var(--bg-elev)))' }}></div>
          {[0, 50, 100].map((p) => (
            <div key={p} style={{ position: 'absolute', left: `${p}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 1.5, height: 14, background: 'var(--ink)', opacity: p === 50 ? 0.4 : 0.18 }}></div>
          ))}
          <div style={{ position: 'absolute', left: `${askPos}%`, top: '50%', transform: 'translate(-50%, -50%)' }}>
            <div style={{ width: 18, height: 18, background: 'var(--ink)', borderRadius: 4, transform: 'rotate(45deg)', border: '3px solid var(--surface)', boxShadow: 'var(--shadow-card)' }}></div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
          {[
            { lbl: 'P25 · low', val: fmv.low, align: 'flex-start' },
            { lbl: 'P50 · median', val: fmv.mid, align: 'center' },
            { lbl: 'P75 · high', val: fmv.high, align: 'flex-end' },
          ].map((t) => (
            <div key={t.lbl} className="col" style={{ alignItems: t.align, gap: 2 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>{t.lbl}</div>
              <div className="mono tabular" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                {isEstimated ? '~' : ''}{fmtMoney(t.val)}
              </div>
            </div>
          ))}
        </div>

        <div className="divider" style={{ marginBottom: 16 }}></div>

        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 13, color: 'var(--muted)' }}>
          <span className="row gap-8">
            <span>Comparable sales considered</span>
            <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              {compCount != null ? `${compCount} verified` : 'no source yet'}
            </span>
          </span>
          {avgDOM != null && (
            <span className="row gap-8">
              <span>Average days on market</span>
              <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>{avgDOM} days</span>
            </span>
          )}
          {medianPPSqft != null && (
            <span className="row gap-8">
              <span>Median $/sqft</span>
              <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>${medianPP}</span>
            </span>
          )}
          <span className="row gap-8">
            <span>This listing $/sqft</span>
            <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>${thisPPSqft}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, {
  computeMonthlyCost, computeHomeScore,
  PersonalPropertyHero, PersonalVerdictHero, PBTrueCostSection, PBFMVSection,
});
