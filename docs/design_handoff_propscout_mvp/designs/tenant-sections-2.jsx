// tenant-sections-2.jsx — sections 3-6, confirm checklist, conversion block.

// ═════════════════════════════════════════════════════════════════
//  § 03 · Negotiation
// ═════════════════════════════════════════════════════════════════
function NegotiationSection() {
  return (
    <section className="container tr-section">
      <SectionHead
        n="04"
        topic="Negotiation"
        question={<>Should you <em>negotiate</em>?</>}
        verdict="Strong leverage"
        verdictTone="pass"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(20px, 2.5vw, 32px)', alignItems: 'stretch' }}>
        {/* LEFT — leverage card */}
        <div className="card col gap-20" style={{ padding: 28 }}>
          <div className="col gap-8">
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Your target
            </div>
            <div className="serif tabular" style={{ fontSize: 'clamp(36px, 4vw, 52px)', lineHeight: 1, letterSpacing: '-0.025em' }}>
              $1,950<span style={{ color: 'var(--muted)' }}> – </span>$2,000<span style={{ fontSize: 16, color: 'var(--muted)' }}>/mo</span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              That's <span className="tabular" style={{ color: 'var(--accent)', fontWeight: 500 }}>$1,800–2,400</span> saved over a 12-month lease.
            </div>
          </div>

          <div className="divider"/>

          {/* Leverage factors */}
          <div className="col">
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Why you have leverage</div>
            {[
              { k: 'Competing rentals in this building', v: '14 listings', tone: 'pass' },
              { k: 'Days on market for this unit',        v: '22 days',    tone: 'pass' },
              { k: 'Price drops since listing',           v: '1 · –$50',   tone: 'pass' },
              { k: 'Documented misrepresentation',        v: 'Glass-door bedroom (§02)', tone: 'pass' },
              { k: '12-month rent trend in this FSA',     v: '–1.4%',      tone: 'pass' },
            ].map((row, i, arr) => (
              <div key={row.k} className="row" style={{
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                fontSize: 13,
                gap: 12,
              }}>
                <span style={{ color: 'var(--ink-2)' }}>{row.k}</span>
                <span className="mono tabular" style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — suggested script */}
        <div className="card col gap-16" style={{ padding: 28, background: 'var(--bg-elev)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)' }}>
              Suggested message
            </div>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }}>
              <Icon name="paste" size={12}/> Copy
            </button>
          </div>

          <div className="serif" style={{
            fontSize: 18, lineHeight: 1.55, color: 'var(--ink)',
            fontStyle: 'italic',
            borderLeft: '2px solid var(--accent)',
            paddingLeft: 16,
          }}>
            Hi — thanks for showing the unit at 28 Charles. We'd love to move forward, but the listing markets it as a 2-bedroom and the second room appears to be a den with a sliding glass door. Comparable true 1-bedrooms in the building are at <span className="tabular">$1,950–2,050</span>. We can sign this week at <span className="tabular">$1,975</span>, parking confirmed in writing. Let me know.
          </div>

          <div className="col gap-8" style={{ marginTop: 4 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Why this works</div>
            <div className="col gap-6">
              {[
                'Names the specific misrepresentation (anchors the conversation in their problem)',
                'Cites the building comp range (shows you did the research)',
                'Offers a concrete number, not a request to "negotiate"',
                'Signals readiness ("we can sign this week") to reduce their risk',
              ].map((t) => (
                <div key={t} className="row gap-8" style={{ alignItems: 'flex-start', fontSize: 13, color: 'var(--ink-2)' }}>
                  <span style={{ color: 'var(--accent)', marginTop: 2 }}><Icon name="check" size={12} stroke={2}/></span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════
//  § 04 · Cost breakdown
// ═════════════════════════════════════════════════════════════════
function CostBreakdownSection() {
  const lines = [
    { k: 'Rent',                  asking: 2150, target: 1975, included: false },
    { k: 'Hydro (est.)',          asking: 65,   target: 65,   included: false, note: 'tenant-paid' },
    { k: 'Internet (est.)',       asking: 70,   target: 70,   included: false, note: 'tenant-paid' },
    { k: 'Heat + water + A/C',    asking: 0,    target: 0,    included: true,  note: 'included in rent' },
    { k: 'Parking',               asking: 150,  target: 0,    included: 'maybe', note: 'unclear — confirm' },
  ];
  const totalAsk = lines.reduce((s, l) => s + l.asking, 0);
  const totalTgt = lines.reduce((s, l) => s + l.target, 0);
  const monthlySavings = totalAsk - totalTgt;
  const annualSavings = monthlySavings * 12;

  return (
    <section className="container tr-section">
      <SectionHead
        n="05"
        topic="Monthly cost"
        question={<>What will it <em>really</em> cost?</>}
        verdict={`Save $${annualSavings.toLocaleString()}/yr at target`}
        verdictTone="pass"
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table */}
        <div>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr',
            padding: '14px 28px',
            background: 'var(--bg-elev)',
            borderBottom: '1px solid var(--line)',
            alignItems: 'center',
          }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Line item</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'right' }}>At asking</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'right' }}>At target ↓</div>
          </div>

          {lines.map((l) => (
            <div key={l.k} style={{
              display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr',
              padding: '16px 28px',
              borderBottom: '1px solid var(--line)',
              alignItems: 'center',
            }}>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>{l.k}</span>
                {l.note && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{l.note}</span>}
              </div>
              <span className="mono tabular" style={{ textAlign: 'right', color: l.included === true ? 'var(--muted)' : 'var(--ink)', fontSize: 15 }}>
                {l.included === true ? '— incl.' : `$${l.asking.toLocaleString()}`}
              </span>
              <span className="mono tabular" style={{ textAlign: 'right', color: l.target < l.asking ? 'var(--pass)' : l.included === true ? 'var(--muted)' : 'var(--ink)', fontSize: 15 }}>
                {l.included === true ? '— incl.' : `$${l.target.toLocaleString()}`}
              </span>
            </div>
          ))}

          {/* Totals */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr',
            padding: '22px 28px',
            background: 'color-mix(in oklab, var(--accent) 5%, var(--bg-elev))',
            alignItems: 'flex-end',
          }}>
            <div className="col" style={{ gap: 2 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>True monthly cost</span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Including utilities & parking</span>
            </div>
            <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
              <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1 }}>${totalAsk.toLocaleString()}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>/mo</span>
            </div>
            <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
              <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1, color: 'var(--pass)' }}>${totalTgt.toLocaleString()}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--pass)' }}>/mo · save ${monthlySavings.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════
//  § 05 · SunScout
// ═════════════════════════════════════════════════════════════════
function TenantSunScoutSection() {
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const hours  = [62, 78, 110, 138, 168, 184, 188, 168, 132, 96, 64, 52];
  const max = Math.max(...hours);

  return (
    <section className="container tr-section">
      <SectionHead
        n="09"
        topic="SunScout"
        question={<>How much <em>light</em> will you actually get?</>}
        verdict="Excellent · 84/100"
        verdictTone="pass"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 'clamp(20px, 2.5vw, 32px)' }}>
        {/* Score card */}
        <div className="card col gap-16" style={{ padding: 28, alignItems: 'center', textAlign: 'center' }}>
          <DealScore score={84} size={170} label="" showVerdict={false}/>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Light score / 100</div>
          <div className="col gap-4">
            <div className="serif tabular" style={{ fontSize: 28, lineHeight: 1 }}>1,512<span style={{ fontSize: 14, color: 'var(--muted)' }}> hrs / yr</span></div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>South-facing · 14th floor · no obstructing buildings within 100m</div>
          </div>
        </div>

        {/* Seasonal chart + window breakdown */}
        <div className="col gap-16">
          <div className="card col gap-16" style={{ padding: 28 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Hours of direct sun · monthly
              </div>
              <div className="row gap-12" style={{ fontSize: 12, color: 'var(--muted)' }}>
                <span className="row gap-6"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'color-mix(in oklab, var(--accent) 35%, transparent)' }}/> Winter</span>
                <span className="row gap-6"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)' }}/> Peak summer</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96 }}>
              {hours.map((h, i) => (
                <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <span className="mono tabular" style={{ fontSize: 9, color: 'var(--muted)' }}>{h}h</span>
                  <div style={{
                    width: '100%',
                    height: `${(h / max) * 64}px`,
                    background: i >= 4 && i <= 7 ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 35%, transparent)',
                    borderRadius: 3,
                  }}/>
                  <span className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>{months[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Window breakdown */}
          <div className="card col gap-12" style={{ padding: 24 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Window-by-window</div>
            {[
              { lbl: 'Bedroom · S', dir: '180°', hrs: '1,140 h/yr', bar: 0.84 },
              { lbl: 'Living · W',  dir: '270°', hrs: '720 h/yr',   bar: 0.55 },
              { lbl: 'Kitchen · N', dir: '0°',   hrs: '120 h/yr',   bar: 0.12 },
            ].map((w) => (
              <div key={w.lbl} className="row gap-16" style={{ alignItems: 'center' }}>
                <div className="col" style={{ width: 130 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{w.lbl}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>bearing {w.dir}</span>
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

// ═════════════════════════════════════════════════════════════════
//  § 06 · Comps map
// ═════════════════════════════════════════════════════════════════
function CompsMapSection() {
  return (
    <section className="container tr-section">
      <SectionHead
        n="10"
        topic="Map of comps"
        question={<>Where do <em>similar units</em> sit?</>}
        verdict="14 building · 22 nearby"
        verdictTone="pass"
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <MiniMap
          height={420}
          address="Toronto · M4Y · 1km radius"
          pins={[
            { x: 14, y: 40, n: '$1,950' },
            { x: 70, y: 22, n: '$2,100' },
            { x: 34, y: 64, n: '$1,900' },
            { x: 76, y: 68, n: '$2,250' },
            { x: 58, y: 78, n: '$2,000' },
            { x: 22, y: 78, n: '$1,875' },
            { x: 88, y: 42, n: '$2,150' },
          ]}
        />
        {/* Legend below */}
        <div className="row" style={{ padding: '16px 24px', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--line)' }}>
          <div className="row gap-16" style={{ flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
            <span className="row gap-8">
              <span style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--accent)', border: '2px solid var(--surface)', boxShadow: '0 0 0 1px var(--line-strong)' }}/>
              This listing
            </span>
            <span className="row gap-8">
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--ink)' }}/>
              Comparable rental ($1,875 – $2,250)
            </span>
            <span className="row gap-8">
              <span style={{ width: 12, height: 8, borderRadius: 2, background: 'color-mix(in oklab, var(--pass) 25%, transparent)' }}/>
              Park
            </span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            Hover any pin · live data refreshed nightly · © Mapbox · OSM
          </div>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Confirm-before-signing checklist
// ═════════════════════════════════════════════════════════════════
function ConfirmChecklist() {
  const items = [
    { label: 'Does the second room have an exterior window?', critical: true },
    { label: 'Is parking included or extra ($/mo)?',            critical: true },
    { label: 'Is the AC central or wall-unit?',                  critical: false },
    { label: 'Are pets allowed (size limit / deposit)?',         critical: false },
    { label: 'When does heat get turned on (RTA Sept–May)?',     critical: false },
    { label: 'Lease term — 12 months or month-to-month after?',  critical: true },
  ];

  return (
    <section className="container tr-section">
      <SectionHead
        n="12"
        topic="Before you sign"
        question={<>Get these in <em>writing</em>.</>}
        verdict="6 items · 3 critical"
        verdictTone="caution"
      />

      <div className="card" style={{ padding: 28 }}>
        <div className="col gap-12">
          {items.map((it, i) => (
            <label key={i} className="row gap-14" style={{
              padding: '12px 4px',
              borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none',
              cursor: 'pointer',
              alignItems: 'center',
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
          <button className="btn btn-ghost"><Icon name="link" size={13}/> Send to my email</button>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Conversion block — to investor flow + rent-drop alerts
// ═════════════════════════════════════════════════════════════════
function ConversionBlock() {
  return (
    <section className="container" style={{ paddingTop: 'clamp(72px, 8vw, 120px)', paddingBottom: 'clamp(48px, 6vw, 80px)' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
      }}>
        {/* Card 1 — buy instead */}
        <div className="card col gap-16" style={{ padding: 32 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Curious?
          </span>
          <h3 className="serif" style={{ fontSize: 'clamp(22px, 2vw, 28px)', lineHeight: 1.1, textWrap: 'balance' }}>
            Wondering if you should <em>buy</em> instead of rent?
          </h3>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>
            Run the same address as a personal purchase and we'll show you what the monthly carry would actually be, what the unit is worth based on recent sales, and how schools and walkability shake out.
          </p>
          <div className="row gap-12">
            <button className="btn btn-primary">Open personal-buy report <Icon name="arrow" size={13}/></button>
          </div>
        </div>

        {/* Card 2 — rent drop alert email capture */}
        <div className="card col gap-16" style={{
          padding: 32,
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderColor: 'var(--ink)',
        }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
            Stay in the loop
          </span>
          <h3 className="serif" style={{ fontSize: 'clamp(22px, 2vw, 28px)', lineHeight: 1.1, color: 'var(--bg)', textWrap: 'balance' }}>
            Get notified if this rent <em style={{ color: 'var(--accent)' }}>drops</em>.
          </h3>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>
            We'll watch this listing for 30 days and email you the moment the price changes or it gets relisted. Free, no account needed.
          </p>
          <form className="row" style={{ gap: 8 }} onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="you@example.com"
              style={{
                flex: 1,
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 12,
                color: 'var(--bg)',
                fontSize: 14, fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button className="btn btn-accent" style={{ padding: '12px 18px' }}>
              Notify me
            </button>
          </form>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
            Unsubscribe anytime · no marketing
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { NegotiationSection, CostBreakdownSection, TenantSunScoutSection, CompsMapSection, ConfirmChecklist, ConversionBlock });
