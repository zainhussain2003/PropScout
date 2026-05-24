// tenant-sections.jsx — the six story sections of the tenant report,
// plus the confirm-before-signing checklist and conversion block.

const { useState: useStateTs } = React;

// ── AI Verdict hero (full-bleed dark) ───────────────────────────
function TenantVerdictHero() {
  return (
    <section className="container" style={{ marginTop: 24, marginBottom: 16 }}>
      <div style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        borderRadius: 24,
        padding: 'clamp(36px, 4vw, 56px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative scout-mark watermark */}
        <div style={{
          position: 'absolute',
          right: -80, top: -40, opacity: 0.06,
          color: 'var(--accent)',
        }}>
          <ScoutMark size={520} color="var(--accent)"/>
        </div>

        <div className="row gap-8" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)' }} className="live-dot"/>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Scout AI · tenant verdict</span>
          <span style={{ flex: 1 }}/>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>claude · sonnet 4.6</span>
        </div>

        <div className="serif" style={{
          fontSize: 'clamp(26px, 3.6vw, 44px)',
          lineHeight: 1.1, letterSpacing: '-0.025em',
          color: 'var(--bg)',
          textWrap: 'balance',
          maxWidth: 920,
          position: 'relative', zIndex: 1,
        }}>
          Do not sign at <span style={{ color: 'var(--accent)' }}>$2,150</span>. The room marketed as a second bedroom is a den with a sliding glass door — no privacy, no sound barrier, almost certainly no window. You're paying a 2-bedroom premium for a 1-bedroom with a study.
        </div>

        <div className="serif" style={{
          fontSize: 'clamp(18px, 1.8vw, 22px)', lineHeight: 1.45,
          color: 'rgba(255,255,255,0.78)',
          marginTop: 22,
          maxWidth: 880,
          position: 'relative', zIndex: 1,
        }}>
          Your negotiation target is <span className="tabular" style={{ color: 'var(--accent)' }}>$1,950–2,000</span>/mo. You have real leverage: 14 competing rentals in this building, the unit has been listed for 22 days, and you have a documented misrepresentation to point to. Before you go back, confirm two things in writing — does the den have a window, and is parking included or extra.
        </div>

        <div className="row gap-16" style={{ marginTop: 28, color: 'rgba(255,255,255,0.5)', fontSize: 12, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <span className="row gap-6"><Icon name="check" size={12}/> 14 building comps · 22 in 1km radius</span>
          <span className="row gap-6"><Icon name="check" size={12}/> Description scanned by Scout AI</span>
          <span className="row gap-6"><Icon name="check" size={12}/> Generated in 7.2s</span>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════
//  § 01 · Rent positioning
// ═════════════════════════════════════════════════════════════════
function RentPositioningSection() {
  return (
    <section className="container tr-section">
      <SectionHead
        n="01"
        topic="Rent positioning"
        question={<>Is the rent <em>fair</em>?</>}
        verdict="$150 above market"
        verdictTone="caution"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'clamp(24px, 3vw, 44px)', alignItems: 'flex-start' }}>
        {/* Left — the bar */}
        <div className="card" style={{ padding: 28 }}>
          <RentalCompsBar low={1800} mid={1950} high={2300} ask={2150}/>
        </div>

        {/* Right — narrative + stat grid */}
        <div className="col gap-20">
          <p style={{ fontSize: 17, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Comparable 1-bedroom units in this building have rented for <span className="tabular" style={{ color: 'var(--ink)' }}>$1,900–2,100</span> over the last 90 days. The median for true 2-bedrooms is <span className="tabular" style={{ color: 'var(--ink)' }}>$2,300</span> — but, per §02, this isn't a true 2-bedroom.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Metric label="Asking"  value="$2,150" sub="/mo" status="caution"/>
            <Metric label="Market median" value="$1,950" sub="1-bed · this FSA"/>
            <Metric label="Building median" value="$2,000" sub="14 active listings"/>
            <Metric label="Negotiation gap" value="$150–200" sub="leverage area" status="pass"/>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════
//  § 02 · Listing accuracy
// ═════════════════════════════════════════════════════════════════
function ListingAccuracySection() {
  const flags = [
    {
      tone: 'red',
      label: 'The "second bedroom" is likely a den',
      detail: 'Listing description includes "sliding glass door" and "study/den" language. Toronto building code requires a private bedroom to have a window and a door — this room likely has neither.',
      evidence: '"Bright open-concept living with a sleek sliding glass den/2nd bedroom..."',
      ask: 'Ask the landlord to confirm in writing whether the room has a window and a solid door.',
    },
    {
      tone: 'amber',
      label: 'Parking status unclear',
      detail: 'Listing says "parking available — contact manager." That usually means parking is not included in rent. In this building, monthly parking is typically $150–200/mo.',
      evidence: '"Premium parking available — contact for details."',
      ask: 'Confirm whether parking is included or extra before signing.',
    },
    {
      tone: 'good',
      label: 'Utilities are clear',
      detail: 'Heat, water, and central air are confirmed included. Hydro and internet are tenant-paid.',
      evidence: '"All utilities except hydro included. Tenant pays internet."',
    },
  ];

  return (
    <section className="container tr-section">
      <SectionHead
        n="02"
        topic="Listing accuracy"
        question={<>Is the listing <em>honest</em>?</>}
        verdict="2 concerns · 1 confirmation"
        verdictTone="caution"
      />

      <div className="col gap-16">
        {flags.map((f) => <FlagDeepRow key={f.label} flag={f}/>)}
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        Scanned with Scout AI · 100% of listing description checked against 7 rule patterns (fake bedrooms, basement units, parking ambiguity, utilities, pets, smoking, broker-style hedges). Override any flag from within the report.
      </p>
    </section>
  );
}

function FlagDeepRow({ flag }) {
  const [open, setOpen] = useStateTs(false);
  const color = flag.tone === 'red' ? 'var(--fail)' : flag.tone === 'amber' ? 'var(--caution)' : 'var(--pass)';
  const stripe = flag.tone === 'red' ? 'var(--fail)' : flag.tone === 'amber' ? 'var(--caution)' : 'var(--pass)';

  return (
    <div className="card" style={{
      padding: 0, overflow: 'hidden',
      borderLeft: `3px solid ${stripe}`,
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', textAlign: 'left',
        padding: '20px 26px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'inherit',
        display: 'flex', alignItems: 'flex-start', gap: 18,
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 999,
          background: `color-mix(in oklab, ${color} 12%, transparent)`,
          color, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 600,
        }}>
          {flag.tone === 'red' ? '!' : flag.tone === 'amber' ? '?' : '✓'}
        </span>
        <div className="col grow" style={{ gap: 4 }}>
          <div style={{ fontSize: 16.5, fontWeight: 500, color: 'var(--ink)' }}>{flag.label}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 760 }}>{flag.detail}</div>
        </div>
        <span style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 6 }}>
          <Icon name={open ? 'minus' : 'plus'} size={16}/>
        </span>
      </button>

      {open && (
        <div className="col gap-12" style={{ padding: '0 26px 22px 80px' }}>
          <div className="col gap-8">
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Evidence from listing</div>
            <div className="serif" style={{ fontSize: 17, lineHeight: 1.45, color: 'var(--ink-2)', fontStyle: 'italic', borderLeft: '2px solid var(--line-strong)', paddingLeft: 14 }}>
              {flag.evidence}
            </div>
          </div>
          {flag.ask && (
            <div className="row gap-12" style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'color-mix(in oklab, var(--accent) 8%, transparent)',
              border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
            }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}><Icon name="flag" size={14}/></span>
              <div style={{ fontSize: 14, color: 'var(--ink)' }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginRight: 8 }}>Ask before signing</span>
                {flag.ask}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TenantVerdictHero, RentPositioningSection, ListingAccuracySection, FlagDeepRow });
