// personal-sections-3.jsx — §05 Neighbourhood · §06 SunScout · §07 Risks · §08 Map · §09 Checklist · Conversion

// ══════════════════════════════════════════════════════════════════
//  § 05 · Neighbourhood
// ══════════════════════════════════════════════════════════════════
function PBNeighbourhoodSection({ neigh }) {
  return (
    <section className="container tr-section">
      <PBSectionHead
        n="05"
        topic="Neighbourhood"
        question={<>What's it like to <em>live</em> here?</>}
        verdict="Quiet · GO-connected"
        verdictTone="pass"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Mobility scores */}
        <div className="card col" style={{ padding: 28, gap: 22 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Mobility scores
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>via Walk Score · Mapbox</span>
          </div>

          {[
            { label: 'Walk Score',    val: neigh.walkScore,    sub: neigh.walkSub,    tone: neigh.walkScore >= 70 ? 'pass' : 'caution' },
            { label: 'Transit Score', val: neigh.transitScore, sub: neigh.transitSub, tone: neigh.transitScore >= 70 ? 'pass' : 'caution' },
            { label: 'Bike Score',    val: neigh.bikeScore,    sub: neigh.bikeSub,    tone: neigh.bikeScore >= 70 ? 'pass' : 'caution' },
          ].map((s) => (
            <div key={s.label} className="col gap-8">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{s.label}</span>
                <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1, color: s.tone === 'pass' ? 'var(--pass)' : 'var(--caution)' }}>
                  {s.val}<span style={{ fontSize: 12, color: 'var(--muted)' }}>/100</span>
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                <div style={{ width: `${s.val}%`, height: '100%', background: s.tone === 'pass' ? 'var(--pass)' : 'var(--caution)', borderRadius: 999 }}/>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.sub}</span>
            </div>
          ))}
        </div>

        {/* Distances */}
        <div className="card col gap-16" style={{ padding: 28 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            From this address
          </div>
          {neigh.distances.map((d, i, arr) => (
            <div key={d.k} className="row" style={{
              justifyContent: 'space-between',
              padding: '13px 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
              fontSize: 13,
              gap: 12,
            }}>
              <span style={{ color: 'var(--ink-2)' }}>{d.k}</span>
              <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
                <span className="mono tabular" style={{
                  color: d.tone === 'pass' ? 'var(--ink)' : 'var(--caution)',
                  fontWeight: 500, fontSize: 13,
                }}>{d.v}</span>
                {d.unit && <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {d.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Demographic + appreciation strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 16 }}>
        {[
          ['Median household income', fmtMoney(neigh.avgIncome), 'StatsCan 2021'],
          ['5-year population growth', fmtPct(neigh.popGrowth5y, 1), 'StatsCan'],
          ['Price per sqft trend',     neigh.ppsqftTrend, 'last 12 months'],
          ['5-year price appreciation', '+' + fmtPct(neigh.appreciation5y, 1), 'Teranet HPI'],
        ].map(([k, v, sub]) => (
          <div key={k} className="card col" style={{ padding: '18px 22px', gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{k}</span>
            <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1 }}>{v}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  § 06 · SunScout (especially relevant for personal living)
// ══════════════════════════════════════════════════════════════════
function PBSunScoutSection() {
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const hours  = [54, 72, 102, 132, 162, 178, 184, 162, 124, 92, 60, 48];
  const max = Math.max(...hours);

  return (
    <section className="container tr-section">
      <PBSectionHead
        n="06"
        topic="SunScout"
        question={<>Which rooms will the <em>light</em> reach?</>}
        verdict="Good · 76/100"
        verdictTone="pass"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
        <div className="card col" style={{ padding: 28, alignItems: 'center', textAlign: 'center', gap: 16 }}>
          <DealScore score={76} size={160} label="" showVerdict={false}/>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Light score / 100</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 220 }}>South-facing rear · main bedroom faces east · two-storey with low neighbours</div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card col gap-16" style={{ padding: 28 }}>
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
          </div>

          <div className="card col" style={{ padding: 24, gap: 12 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Room by room</div>
            {[
              { lbl: 'Living room · S',   hrs: '1,180 h/yr', bar: 0.78 },
              { lbl: 'Main bedroom · E',  hrs: '820 h/yr',   bar: 0.62 },
              { lbl: 'Kitchen · N',       hrs: '180 h/yr',   bar: 0.15 },
              { lbl: 'Backyard',          hrs: '1,520 h/yr', bar: 0.92 },
            ].map((w) => (
              <div key={w.lbl} className="row gap-16" style={{ alignItems: 'center' }}>
                <div className="col" style={{ width: 150 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{w.lbl}</span>
                </div>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ width: `${w.bar * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }}/>
                </div>
                <span className="mono tabular" style={{ fontSize: 13, fontWeight: 500, width: 90, textAlign: 'right' }}>{w.hrs}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  § 07 · Risks & conditions (what to inspect / pull before offer)
// ══════════════════════════════════════════════════════════════════
function PBRisksSection({ property }) {
  const flags = [
    {
      tone: 'amber',
      label: 'Pre-1980 build — knob & tube risk',
      detail: 'Built 1972. Many homes from this era have legacy aluminum wiring or knob & tube remnants. Insurance companies often require replacement before binding policy.',
      ask: 'Schedule a Certified Master Electrician inspection during the conditional period.',
    },
    {
      tone: 'amber',
      label: 'Roof age unknown',
      detail: 'Listing description doesn\'t mention roof replacement. Asphalt shingles in this climate last 18–22 years — at minimum, ask for the most recent roofing receipt.',
      ask: 'Request roof age + most recent inspection report from listing agent.',
    },
    {
      tone: 'good',
      label: 'No flood zone overlay',
      detail: 'Address is outside the Conservation Halton regulated floodplain. No special insurance riders needed.',
    },
    {
      tone: 'good',
      label: 'No active conservation easement',
      detail: 'No environmental restrictions on the lot that would limit additions, garages, or accessory dwellings.',
    },
  ];

  return (
    <section className="container tr-section">
      <PBSectionHead
        n="07"
        topic="Risks & conditions"
        question={<>What should the <em>inspector</em> look at?</>}
        verdict="2 to verify · 2 clear"
        verdictTone="caution"
      />

      <div className="col gap-12">
        {flags.map((f) => <RiskRow key={f.label} tone={f.tone === 'good' ? 'good' : f.tone} label={f.label} detail={f.detail}/>)}
      </div>

      <p style={{ marginTop: 22, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        Risks above come from listing description parsing, municipal open data (flood overlays, conservation), and PropScout's pre-1980 build heuristics. Use them to scope your inspection and your conditional period — not as a final word.
      </p>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  § 08 · Comps map (sales pins, not rentals)
// ══════════════════════════════════════════════════════════════════
function PBMapSection({ comps }) {
  return (
    <section className="container tr-section">
      <PBSectionHead
        n="08"
        topic="Where they sold"
        question={<>The block in <em>one</em> view.</>}
        verdict={`${comps.length} verified sales`}
        verdictTone="pass"
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <MiniMap
          height={420}
          address="Burlington · L7N · 1km radius"
          pins={[
            { x: 14, y: 42, n: fmtMoney(comps[0].sold) },
            { x: 70, y: 24, n: fmtMoney(comps[1].sold) },
            { x: 34, y: 64, n: fmtMoney(comps[2].sold) },
            { x: 76, y: 68, n: fmtMoney(comps[3].sold) },
            { x: 58, y: 78, n: fmtMoney(comps[4].sold) },
            { x: 22, y: 78, n: fmtMoney(comps[5].sold) },
            { x: 88, y: 42, n: fmtMoney(comps[6].sold) },
          ]}
        />
        <div className="row" style={{ padding: '16px 24px', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--line)' }}>
          <div className="row gap-16" style={{ flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
            <span className="row gap-8">
              <span style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--accent)', border: '2px solid var(--surface)', boxShadow: '0 0 0 1px var(--line-strong)' }}/>
              This listing
            </span>
            <span className="row gap-8">
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--ink)' }}/>
              Recent sold price
            </span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            Sale prices from MLS public records · refreshed daily · © Mapbox · OSM
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  § 09 · Before-you-bid checklist
// ══════════════════════════════════════════════════════════════════
function PBChecklist() {
  const items = [
    { label: 'Book a home inspection before any firm offer',          critical: true },
    { label: 'Pull a status certificate (condo) or title search (freehold)', critical: true },
    { label: 'Confirm school catchment with the board directly',      critical: true },
    { label: 'Get insurance quoted on the actual address',            critical: false },
    { label: 'Verify property tax assessment and any pending appeals', critical: false },
    { label: 'Check whether the lot allows a future garage / addition', critical: false },
    { label: 'Walk the block at three different times of day',         critical: false },
  ];

  return (
    <section className="container tr-section">
      <PBSectionHead
        n="09"
        topic="Before you bid"
        question={<>Do these <em>first</em>.</>}
        verdict={`${items.length} items · ${items.filter((i) => i.critical).length} critical`}
        verdictTone="caution"
      />

      <div className="card" style={{ padding: 28 }}>
        <div className="col">
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
          <button className="btn btn-primary"><Icon name="doc" size={13}/> Export checklist as PDF</button>
          <button className="btn btn-ghost"><Icon name="link" size={13}/> Email to my agent</button>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Conversion — to investor flow + agent CTA
// ══════════════════════════════════════════════════════════════════
function PBConversion() {
  return (
    <section className="container" style={{ paddingTop: 'clamp(72px, 8vw, 120px)', paddingBottom: 'clamp(48px, 6vw, 80px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Card 1 — what if you rented it out */}
        <div className="card col gap-16" style={{ padding: 32 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>Curious?</span>
          <h3 className="serif" style={{ fontSize: 'clamp(22px, 2vw, 28px)', lineHeight: 1.1, textWrap: 'balance' }}>
            What if you ever <em>rented it out</em>?
          </h3>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>
            Re-run this same listing as an investment and we'll show you the cap rate, the cash flow, the OSFI position, and the 20-year equity build. Free with your account.
          </p>
          <div className="row gap-12">
            <button className="btn btn-primary">Open investment report <Icon name="arrow" size={13}/></button>
          </div>
        </div>

        {/* Card 2 — talk to an agent */}
        <div className="card col gap-16" style={{
          padding: 32,
          background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)',
        }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Next step</span>
          <h3 className="serif" style={{ fontSize: 'clamp(22px, 2vw, 28px)', lineHeight: 1.1, color: 'var(--bg)', textWrap: 'balance' }}>
            Want a <em style={{ color: 'var(--accent)' }}>second opinion</em> from a local agent?
          </h3>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>
            We'll send this report to a verified Burlington agent who knows the Roseland area. No obligation — they reach out only if you reply.
          </p>
          <div className="row gap-12">
            <button className="btn btn-accent">Send to an agent <Icon name="arrow" size={13}/></button>
            <button className="btn" style={{ background: 'transparent', color: 'var(--bg)', border: '1px solid rgba(255,255,255,0.25)' }}>How this works</button>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { PBNeighbourhoodSection, PBSunScoutSection, PBRisksSection, PBMapSection, PBChecklist, PBConversion });
