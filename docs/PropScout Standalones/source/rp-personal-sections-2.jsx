// rp-personal-sections-2.jsx — Personal Buyer report, part 2:
// §03 PBSalesSection, §04 SchoolsSection (data-pending honest state),
// §05 NeighbourhoodSection (personal), §07 RisksSection (real-flags path),
// §09 ChecklistSection, Conversion section. From PersonalBuyerPage.tsx +
// personal/PBSalesSection.tsx.

const { useState: useStatePt, useCallback: useCallbackPt } = React;

// ── §03 PBSalesSection (personal/PBSalesSection.tsx) ──────────────────────────

const PB_COLS = '2fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr';

function PBSalesSection({ comps, isSampleData = false }) {
  const sorted = [...comps].sort((a, b) => a.sold - b.sold);
  const median = sorted[Math.floor(sorted.length / 2)];
  const sortedByDOM = [...comps].sort((a, b) => a.dom - b.dom);
  const medianDOM = sortedByDOM[Math.floor(sortedByDOM.length / 2)].dom;

  return (
    <section className="container tr-section" data-section="03">
      <SectionHead
        n="03"
        topic="Comparable sales"
        question={<React.Fragment>What's <em>actually</em> selling around here?</React.Fragment>}
        verdict={`${comps.length} sales · last 6 mo`}
        tone="pass"
      />

      {isSampleData && (
        <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: 16 }}>
          Sample comparables · real sales data in Phase 2
        </p>
      )}

      <div className="card scroll-x-mobile" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ minWidth: 560 }}>
          <div style={{ display: 'grid', gridTemplateColumns: PB_COLS, padding: '14px 24px', background: 'var(--bg-elev)', borderBottom: '1px solid var(--line)' }}>
            {['Address', 'Beds', 'Sqft', 'Sold for', '$/sqft', 'DOM'].map((h, i) => (
              <div key={h} className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: i === 0 ? 'left' : 'right' }}>{h}</div>
            ))}
          </div>

          {comps.map((c, i) => (
            <div key={c.addr} style={{ display: 'grid', gridTemplateColumns: PB_COLS, padding: '14px 24px', borderBottom: i < comps.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 13.5, alignItems: 'center' }}>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ color: 'var(--ink)' }}>{c.addr}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.distance} · sold {c.soldDate}</span>
              </div>
              <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink)' }}>{c.beds}</span>
              <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink)' }}>{c.sqft.toLocaleString()}</span>
              <span className="serif tabular" style={{ textAlign: 'right', fontSize: 16 }}>{fmtMoney(c.sold)}</span>
              <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>${c.ppsqft}</span>
              <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{c.dom}d</span>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: PB_COLS, padding: '16px 24px', background: 'color-mix(in oklab, var(--accent) 5%, var(--bg-elev))', borderTop: '1px solid var(--line-strong)', alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Median · last 6 mo</span>
            <span></span>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{median.sqft.toLocaleString()}</span>
            <span className="serif tabular" style={{ textAlign: 'right', fontSize: 18, color: 'var(--accent)' }}>{fmtMoney(median.sold)}</span>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--accent)' }}>${median.ppsqft}</span>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--accent)' }}>{medianDOM}d</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── §04 SchoolsSection — data-pending honest state (PersonalBuyerPage.tsx) ────

function PersonalSchoolsSection() {
  return (
    <section className="container tr-section" data-section="04">
      <SectionHead
        n="04"
        topic="Schools"
        question={<React.Fragment>Where will the <em>kids</em> go?</React.Fragment>}
        verdict="Data pending"
        tone="caution"
      />

      <div className="card col" style={{ padding: 32, gap: 10 }}>
        <div className="serif" style={{ fontSize: 20 }}>School data pending</div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 560, lineHeight: 1.55 }}>
          The EQAO / Fraser Institute dataset hasn't been loaded yet. Once it is, this section shows the nearest elementary, middle, and high schools with their scores — a real address never shows placeholder schools.
        </p>
      </div>
    </section>
  );
}

// ── §05 NeighbourhoodSection — personal variant (PersonalBuyerPage.tsx) ───────

function PersonalNeighbourhoodSection({ neigh }) {
  const mobilityItems = [
    { label: 'Walk Score', val: neigh.walkScore, sub: neigh.walkSub },
    { label: 'Transit Score', val: neigh.transitScore, sub: neigh.transitSub },
    { label: 'Bike Score', val: neigh.bikeScore, sub: neigh.bikeSub },
  ];

  return (
    <section className="container tr-section" data-section="05">
      <SectionHead
        n="05"
        topic="Neighbourhood"
        question={<React.Fragment>What's it like to <em>live</em> here?</React.Fragment>}
        verdict={neigh.walkSub ? `${neigh.walkSub} · Transit ${neigh.transitScore}` : 'Quiet · GO-connected'}
        tone={neigh.walkScore >= 70 ? 'pass' : 'caution'}
      />

      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Mobility scores */}
        <div className="card col" style={{ padding: 28, gap: 22 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Mobility scores</div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>via Walk Score · Mapbox</span>
          </div>

          {mobilityItems.map((s) => {
            const color = s.val >= 70 ? 'var(--pass)' : 'var(--caution)';
            return (
              <div key={s.label} className="col gap-8">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{s.label}</span>
                  <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1, color }}>
                    {s.val}<span style={{ fontSize: 12, color: 'var(--muted)' }}>/100</span>
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ width: `${s.val}%`, height: '100%', background: color, borderRadius: 999 }}></div>
                </div>
                {s.sub ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.sub}</span> : null}
              </div>
            );
          })}
        </div>

        {/* Distances — honest empty state until Phase 2 */}
        <div className="card col gap-16" style={{ padding: 28 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>From this address</div>
          {neigh.distances.length === 0 && (
            <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em' }}>
              Distance data · available in Phase 2
            </p>
          )}
          {neigh.distances.map((d, i, arr) => (
            <div key={d.k} className="row" style={{ justifyContent: 'space-between', padding: '13px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 13, gap: 12 }}>
              <span style={{ color: 'var(--ink-2)' }}>{d.k}</span>
              <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
                <span className="mono tabular" style={{ color: d.tone === 'pass' ? 'var(--ink)' : 'var(--caution)', fontWeight: 500, fontSize: 13 }}>{d.v}</span>
                {d.unit && <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {d.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Demographic + appreciation strip — em-dashes until sources land */}
      <div className="grid-2col-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 16 }}>
        {[
          ['Median household income', neigh.avgIncome > 0 ? fmtMoney(neigh.avgIncome) : '—', 'StatsCan 2021'],
          ['5-year population growth', neigh.popGrowth5y !== 0 ? fmtPct(neigh.popGrowth5y, 1) : '—', 'StatsCan'],
          ['Price per sqft trend', neigh.ppsqftTrend !== 'N/A' ? neigh.ppsqftTrend : '—', 'last 12 months'],
          ['5-year price appreciation', neigh.appreciation5y !== 0 ? '+' + fmtPct(neigh.appreciation5y, 1) : '—', 'Teranet HPI'],
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

// ── §07 RisksSection — real-flags path (PersonalBuyerPage.tsx) ────────────────

function PersonalRisksSection({ flags }) {
  const redCount = flags.filter((f) => f.severity === 'red').length;
  const amberCount = flags.filter((f) => f.severity === 'amber').length;
  // Never imply a clean home: we only parse listing wording.
  const verdict =
    flags.length === 0
      ? 'Listing text only — verify directly'
      : `${amberCount + redCount} flagged · ${redCount > 0 ? redCount + ' critical' : 'none critical'}`;

  return (
    <section className="container tr-section" data-section="07">
      <SectionHead
        n="07"
        topic="Risks & conditions"
        question={<React.Fragment>What should the <em>inspector</em> look at?</React.Fragment>}
        verdict={verdict}
        tone={redCount > 0 ? 'fail' : 'caution'}
      />
      <div className="col gap-12">
        {flags.length === 0 ? (
          <RiskRow
            tone="amber"
            label="No risk language found in the listing text"
            detail="A wording check only — not a clean bill of health. Ask the agent about as-is / remediation, water or flood history, and any past grow-op."
          />
        ) : (
          [...flags]
            .sort((a, b) => Number(b.severity === 'red') - Number(a.severity === 'red'))
            .map((f) => <RiskRow key={f.label} tone={f.severity} label={f.label} detail={f.evidence || ''} />)
        )}
      </div>
      <p style={{ marginTop: 22, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        These come from parsing the listing description only — explicit risk wording, plus ambiguous phrasing worth verifying, and a pre-1980 build heuristic. PropScout does not yet check municipal flood overlays or open data, and the description catches explicit mentions far better than euphemisms — so the absence of a flag is not a clearance. Use this to scope your inspection and conditions, not as a final word.
      </p>
    </section>
  );
}

// ── §09 Before-you-bid checklist (PersonalBuyerPage.tsx) ──────────────────────

const PB_CHECKLIST_ITEMS = [
  { label: 'Book a home inspection before any firm offer', critical: true },
  { label: 'Pull a status certificate (condo) or title search (freehold)', critical: true },
  { label: 'Confirm school catchment with the board directly', critical: true },
  { label: 'Get insurance quoted on the actual address', critical: false },
  { label: 'Verify property tax assessment and any pending appeals', critical: false },
  { label: 'Check whether the lot allows a future garage / addition', critical: false },
  { label: 'Walk the block at three different times of day', critical: false },
];

function PersonalChecklistSection() {
  const [checked, setChecked] = useStatePt(new Set());

  const toggle = useCallbackPt((i) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }, []);

  const criticalCount = PB_CHECKLIST_ITEMS.filter((i) => i.critical).length;

  return (
    <section className="container tr-section" data-section="09">
      <SectionHead
        n="09"
        topic="Before you bid"
        question={<React.Fragment>Do these <em>first</em>.</React.Fragment>}
        verdict={`${PB_CHECKLIST_ITEMS.length} items · ${criticalCount} critical`}
        tone="caution"
      />

      <div className="card" style={{ padding: 28 }}>
        <div className="col">
          {PB_CHECKLIST_ITEMS.map((it, i) => {
            const done = checked.has(i);
            return (
              <label key={i} className="row gap-14" style={{ padding: '14px 4px', borderBottom: i < PB_CHECKLIST_ITEMS.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer', alignItems: 'center', gap: 14 }}>
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
          <button className="btn btn-primary"><Icon name="doc" size={13} /> Export checklist as PDF</button>
          <button className="btn btn-ghost"><Icon name="link" size={13} /> Email to my agent</button>
        </div>
      </div>
    </section>
  );
}

// ── Conversion section (PersonalBuyerPage.tsx) ────────────────────────────────

function PersonalConversionSection({ city }) {
  return (
    <section className="container" style={{ paddingTop: 'clamp(72px, 8vw, 120px)', paddingBottom: 'clamp(48px, 6vw, 80px)' }}>
      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card col gap-16" style={{ padding: 32 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>Curious?</span>
          <h3 className="serif" style={{ fontSize: 'clamp(22px, 2vw, 28px)', lineHeight: 1.1, textWrap: 'balance' }}>
            What if you ever <em>rented it out</em>?
          </h3>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>
            Re-run this same listing as an investment and we'll show you the cap rate, the cash flow, the OSFI position, and the 20-year equity build. Free with your account.
          </p>
          <div className="row gap-12">
            <button className="btn btn-primary">Open investment report <Icon name="arrow" size={13} /></button>
          </div>
        </div>

        <div className="card col gap-16" style={{ padding: 32, background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--bg) 50%, transparent)' }}>Next step</span>
          <h3 className="serif" style={{ fontSize: 'clamp(22px, 2vw, 28px)', lineHeight: 1.1, color: 'var(--bg)', textWrap: 'balance' }}>
            Want a <em style={{ color: 'var(--accent)' }}>second opinion</em> from a local agent?
          </h3>
          <p style={{ fontSize: 15, color: 'color-mix(in oklab, var(--bg) 70%, transparent)' }}>
            We'll send this report to a verified {city} agent who knows the area. No obligation — they reach out only if you reply.
          </p>
          <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-accent">Send to an agent <Icon name="arrow" size={13} /></button>
            <button className="btn" style={{ background: 'transparent', color: 'var(--bg)', border: '1px solid color-mix(in oklab, var(--bg) 25%, transparent)' }}>
              How this works
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, {
  PBSalesSection, PersonalSchoolsSection, PersonalNeighbourhoodSection,
  PersonalRisksSection, PersonalChecklistSection, PersonalConversionSection,
});
