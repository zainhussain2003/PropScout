// sections.jsx — Landing sections (modes, how-it-works, sunscout, pricing, faq, cta)

// ── Reports / Four modes ─────────────────────────────────────
function ReportsSection() {
  const modes = [
    {
      who: 'Tenant',
      tag: 'For rent',
      title: 'I\'m looking at a rental',
      copy: 'Free, no login. Flags fake bedrooms, basement units, missing parking, and overpriced asks. Tells you exactly where to negotiate to — and saves you the deposit on a unit that wasn\'t what it said it was.',
      stats: [
        ['Asking', '$2,150'],
        ['Fair range', '$1,950–2,000', 'pass'],
        ['Leverage', 'Strong', 'pass'],
      ],
      photoLabel: 'rental unit · downtown',
      accent: true,
      tag2: 'Free forever',
    },
    {
      who: 'Personal buyer',
      tag: 'For sale',
      title: 'I\'m buying a home to live in',
      copy: 'True monthly cost of ownership, comparable sales, walk/transit, school catchments. The home you can live in, not just close on.',
      stats: [
        ['Monthly cost', '$4,733'],
        ['FMV band', '$695–745k', 'pass'],
        ['School rank', 'Top 8%', 'pass'],
      ],
      photoLabel: 'detached · suburban',
    },
    {
      who: 'Investor',
      tag: 'For sale',
      title: 'I\'m running it as a rental',
      copy: 'Cap rate, cash flow, DSCR, OSFI stress test, Ontario LTT, and our 0–100 deal score — modelled for Canadian rules, not bolted on.',
      stats: [
        ['Cap rate', '4.8%', 'pass'],
        ['Cash flow', '−$1,833', 'fail'],
        ['DSCR', '0.45×', 'fail'],
      ],
      photoLabel: 'condo · downtown core',
    },
    {
      who: 'Landlord',
      tag: 'For rent',
      title: 'I\'m pricing out my own unit',
      copy: 'Test whether your listed rent pencils against the building, the FSA, and the trend line — before you sign a year-long lease at the wrong number.',
      stats: [
        ['Yield', '5.2%', 'pass'],
        ['Vs. market', '+ $50', 'pass'],
        ['Building supply', '24 listings', 'caution'],
      ],
      photoLabel: 'low-rise · duplex',
    },
  ];

  return (
    <section id="reports" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div className="col gap-32">
        <SectionHeader tag="One URL · the report adapts to you" title={<>Whoever you are, <span className="serif" style={{ color: 'var(--muted)' }}><em>we ask once.</em></span></>}>
          PropScout auto-detects whether your listing is for sale or for rent, then asks one routing question. Every section, calculation, and verdict downstream is tailored to that answer.
        </SectionHeader>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 22, marginTop: 24 }}>
          {modes.map((m) => (
            <article key={m.title} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Photo strip */}
              <div className="photo-ph" style={{ height: 180, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 14, left: 14 }} className="row gap-8">
                  <span className="chip" style={{ background: 'var(--surface)' }}>{m.tag}</span>
                  {m.tag2 && <span className="chip" style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' }}>{m.tag2}</span>}
                </div>
                <span>{m.photoLabel}</span>
              </div>

              <div className="col gap-16" style={{ padding: '24px 24px 26px' }}>
                <div className="col gap-8">
                  <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)' }}>For the {m.who.toLowerCase()}</div>
                  <h3 className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>{m.title}</h3>
                </div>
                <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 480 }}>{m.copy}</p>

                <div className="row gap-12" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                  {m.stats.map(([lbl, val, status]) => (
                    <div key={lbl} className="col gap-8" style={{
                      flex: '1 1 0', minWidth: 90,
                      padding: '10px 12px', borderRadius: 10,
                      background: 'var(--bg-elev)', border: '1px solid var(--line)',
                    }}>
                      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>{lbl}</div>
                      <div className="serif tabular" style={{
                        fontSize: 22, lineHeight: 1,
                        color: status === 'pass' ? 'var(--pass)' :
                               status === 'caution' ? 'var(--caution)' :
                               status === 'fail' ? 'var(--fail)' : 'var(--ink)',
                      }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works — three steps ───────────────────────────────
function HowSection() {
  const steps = [
    {
      n: '01',
      t: 'Paste any URL',
      d: 'Any Canadian listing URL. We read price, beds, taxes, condo fees, year built, photos — everything the listing exposes, structured.',
      visual: 'urlbar',
    },
    {
      n: '02',
      t: 'Tell us your angle',
      d: 'One question, two buttons. Investment or personal use. Tenant or landlord. The entire report adapts in place.',
      visual: 'modal',
    },
    {
      n: '03',
      t: 'Read the verdict',
      d: 'Numbers, comps, risk flags, schools, sun path, and a written verdict from Scout AI. Under sixty seconds, every time.',
      visual: 'report',
    },
  ];

  return (
    <section id="how" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div className="col gap-32">
        <SectionHeader tag="How it works" title={<>From listing URL to written verdict <span className="serif" style={{ color: 'var(--muted)' }}><em>in under sixty seconds.</em></span></>}>
          No exports, no spreadsheets, no hand-keying square footage. Three steps and the report is on your screen, ready to share.
        </SectionHeader>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
          {steps.map((s, i) => (
            <div key={s.n} className="card col" style={{ padding: 24, gap: 18, minHeight: 360 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="mono" style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--accent)' }}>{s.n}</span>
                <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Step {i + 1} of 3</span>
              </div>
              <h3 className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>{s.t}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{s.d}</p>
              <div style={{ flex: 1 }}/>
              <StepVisual kind={s.visual}/>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepVisual({ kind }) {
  if (kind === 'urlbar') {
    return (
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'var(--bg-elev)', border: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: "'Geist Mono', monospace", fontSize: 12,
      }}>
        <Icon name="link" size={14} />
        <span style={{ color: 'var(--muted)' }}>… / listing / <span style={{ color: 'var(--ink)' }}>28145902</span> / vaughan-condo</span>
        <span style={{ flex: 1 }}/>
        <span style={{
          background: 'var(--ink)', color: 'var(--bg)',
          fontSize: 10, padding: '4px 8px', borderRadius: 6, letterSpacing: '0.08em',
        }}>↵ ANALYZE</span>
      </div>
    );
  }
  if (kind === 'modal') {
    return (
      <div className="col gap-8" style={{ padding: 16, borderRadius: 12, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
        <div style={{ fontSize: 13, color: 'var(--ink)' }}>For-sale listing detected — what's this for?</div>
        <div className="row gap-8">
          <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12, flex: 1 }}>Investment</button>
          <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12, flex: 1 }}>Personal use</button>
        </div>
      </div>
    );
  }
  if (kind === 'report') {
    return (
      <div className="row gap-12" style={{ padding: 14, borderRadius: 12, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
        <DealScore score={78} size={64} animate={false} label=""/>
        <div className="col" style={{ gap: 4, justifyContent: 'center' }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Verdict</div>
          <div style={{ fontSize: 14, color: 'var(--ink)' }} className="serif">Good deal — proceed with standard due diligence.</div>
        </div>
      </div>
    );
  }
  return null;
}

// ── Risk + Schools + Neighbourhood strip ─────────────────────
function CoverageSection() {
  const features = [
    { icon: 'shield', t: 'Risk flags, not vibes', d: 'Ontario rent control, condo-fee burden, flood overlays, basement-bedroom heuristics, supply pressure — each flag with a deduction, source, and override.' },
    { icon: 'map',    t: 'Live rental comps',     d: 'Nightly scrape of Rentals.ca, Kijiji and PadMapper. Same FSA, ±1 bedroom, last 90 days. Outliers removed. Confidence shown.' },
    { icon: 'chart',  t: 'Canadian rules baked in', d: 'OSFI stress test, Ontario LTT with Toronto stack, CMHC vacancy by city, Bank of Canada rate feed. No US tools pretending.' },
    { icon: 'house',  t: 'Schools that matter',   d: 'EQAO scores, Fraser Institute percentile, catchment overlays for TDSB and the major Ontario boards. Drive time, not crow flies.' },
    { icon: 'sun',    t: 'SunScout · light score', d: 'NREL sun-path math, window by window, month by month. Building obstruction in dense cores on Investor Pro.' },
    { icon: 'doc',    t: 'Share or export',        d: 'Branded PDF, 30-day shareable link, save to portfolio. Your clients see the verdict without seeing the seams.' },
  ];

  return (
    <section className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div className="col gap-32">
        <SectionHeader tag="Inside the report" title={<>The work an analyst does in a morning <span className="serif" style={{ color: 'var(--muted)' }}><em>— in the time it takes to make coffee.</em></span></>}>
          Each section pulls from a different source, then writes itself into the report in the same vocabulary. No tabs to remember, no copy-paste to spreadsheets.
        </SectionHeader>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderTop: '1px solid var(--line)', borderLeft: '1px solid var(--line)' }}>
          {features.map(f => (
            <div key={f.t} className="col gap-12" style={{ padding: '28px 26px', borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
              <div style={{ color: 'var(--accent)' }}><Icon name={f.icon} size={22} stroke={1.4}/></div>
              <h3 className="serif" style={{ fontSize: 22, lineHeight: 1.1 }}>{f.t}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── SunScout teaser ──────────────────────────────────────────
function SunScoutSection() {
  // monthly hours (rough)
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const hours  = [62, 78, 110, 138, 168, 184, 188, 168, 132, 96, 64, 52];
  const max = Math.max(...hours);

  return (
    <section id="sunscout" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(36px, 5vw, 64px)',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        gap: 'clamp(32px, 5vw, 72px)',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="section-tag" style={{ marginBottom: 24 }}>SunScout™</span>
          <h2 className="serif" style={{ textWrap: 'balance', marginBottom: 24 }}>
            How much light <em style={{ color: 'var(--accent)' }}>actually</em> reaches each window — by hour, by month, every season.
          </h2>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', marginBottom: 28 }}>
            We run NREL's solar position algorithm against the property's coordinates, then weight by window orientation and surrounding obstructions. The result is a single light score, plus a seasonal arc you can show a tenant before they sign.
          </p>

          <div className="row gap-16" style={{ flexWrap: 'wrap' }}>
            <Chip accent>South-facing · 6.2hr/day avg</Chip>
            <Chip>14th floor</Chip>
            <Chip>No tall neighbours within 100m</Chip>
          </div>
        </div>

        <div className="col gap-16">
          {/* Light score gauge */}
          <div className="card row gap-24" style={{ padding: 24, alignItems: 'center' }}>
            <div className="col gap-8" style={{ alignItems: 'center' }}>
              <DealScore score={84} size={130} animate={false} label=""/>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Light score / 100</div>
            </div>
            <div className="col gap-12" style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Annual direct sun · weighted</div>
              <div className="serif tabular" style={{ fontSize: 36, lineHeight: 1 }}>1,512 <span style={{ color: 'var(--muted)', fontSize: 16 }}> hrs / yr</span></div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Bedroom (S) <span className="mono tabular" style={{ marginLeft: 8 }}>1,140h</span> · Living (W) <span className="mono tabular" style={{ marginLeft: 8 }}>720h</span>
              </div>
            </div>
          </div>

          {/* Seasonal arc */}
          <div className="card col gap-16" style={{ padding: 24 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Hours of direct sun · 2026</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>S · 180°</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
              {hours.map((h, i) => (
                <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 4 }}>
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
        </div>
      </div>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────
function PricingSection() {
  const [yearly, setYearly] = React.useState(false);
  const tiers = [
    {
      name: 'Free',
      price: 0,
      sub: 'For tenants and the merely curious.',
      cta: 'Start free',
      features: [
        '3 sale-listing reports / month',
        'Unlimited tenant reports',
        'Full rental comps, confidence shown',
        'AI verdict · 1 paragraph',
        'Save your last 10 analyses',
      ],
    },
    {
      name: 'Investor Pro',
      price: yearly ? 100/12 : 10,
      yearlyTotal: 100,
      sub: 'For the investor running the numbers themselves.',
      cta: 'Go Pro',
      featured: true,
      features: [
        'Unlimited reports, all four modes',
        'Full 3-paragraph AI verdicts',
        'Financing sliders · OSFI, 35% down, conservative',
        'SunScout with building obstruction',
        'Portfolio tracker · up to 10 properties',
        'Branded PDF export',
      ],
    },
    {
      name: 'Professional',
      price: yearly ? 590/12 : 59,
      yearlyTotal: 590,
      sub: 'For agents and brokers reporting to clients.',
      cta: 'Start Professional',
      features: [
        'Everything in Investor Pro',
        'White-label PDF with your branding',
        'Shareable client links',
        'Bulk URL analysis',
        'Priority comp data refresh',
      ],
    },
    {
      name: 'Team / REIT',
      price: 299,
      priceSuffix: '+',
      sub: 'For syndicates and small REITs.',
      cta: 'Talk to us',
      features: [
        'Everything in Professional',
        '5–20+ multi-user seats',
        'Read-only API access',
        'Portfolio-level reporting',
        'Custom onboarding',
      ],
    },
  ];

  return (
    <section id="pricing" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div className="col gap-32">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
          <SectionHeader tag="Pricing · CAD" title={<>Free for renters. <span className="serif" style={{ color: 'var(--muted)' }}><em>Real money for serious money.</em></span></>}>
            Cancel anytime. Annual saves two months. All prices in Canadian dollars, all tax inclusive.
          </SectionHeader>
          <div className="row gap-8" style={{ padding: 4, borderRadius: 999, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
            {['Monthly', 'Yearly · 2mo free'].map((l, i) => (
              <button key={l} onClick={() => setYearly(i === 1)} className="mono" style={{
                padding: '8px 14px', borderRadius: 999,
                fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                border: 'none', cursor: 'pointer',
                background: (i === 1) === yearly ? 'var(--ink)' : 'transparent',
                color: (i === 1) === yearly ? 'var(--bg)' : 'var(--muted)',
              }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1px solid var(--line-strong)' }}>
          {tiers.map(t => (
            <div key={t.name} className="col" style={{
              padding: '30px 26px 30px',
              background: t.featured ? 'var(--ink)' : 'transparent',
              color: t.featured ? 'var(--bg)' : 'var(--ink)',
              borderRight: '1px solid var(--line)',
              borderBottom: '1px solid var(--line)',
              position: 'relative',
              gap: 18,
            }}>
              {t.featured && (
                <span className="mono" style={{
                  position: 'absolute', top: -1, left: 0, right: 0,
                  background: 'var(--accent)', color: 'var(--accent-ink)',
                  fontSize: 10, letterSpacing: '0.14em', padding: '5px 10px',
                  textAlign: 'center', textTransform: 'uppercase',
                }}>Most chosen</span>
              )}
              <div className="col gap-8" style={{ marginTop: t.featured ? 14 : 0 }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.featured ? 'rgba(255,255,255,0.55)' : 'var(--muted)' }}>{t.name}</div>
                <p style={{ fontSize: 13, color: t.featured ? 'rgba(255,255,255,0.75)' : 'var(--ink-2)' }}>{t.sub}</p>
              </div>
              <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
                <span className="serif tabular" style={{ fontSize: 56, lineHeight: 1 }}>${Math.round(t.price)}{t.priceSuffix || ''}</span>
                <span className="mono" style={{ fontSize: 11, color: t.featured ? 'rgba(255,255,255,0.5)' : 'var(--muted)' }}>{t.priceSuffix === '+' ? '/ mo base' : '/ mo'}</span>
              </div>
              {t.yearlyTotal && yearly && (
                <div className="mono" style={{ fontSize: 11, color: t.featured ? 'rgba(255,255,255,0.55)' : 'var(--muted)', marginTop: -8 }}>${t.yearlyTotal} billed yearly</div>
              )}
              <button className="btn" style={{
                background: t.featured ? 'var(--accent)' : 'var(--ink)',
                color: t.featured ? 'var(--accent-ink)' : 'var(--bg)',
                width: '100%', justifyContent: 'center',
                padding: '14px',
              }}>{t.cta}</button>
              <div className="col gap-10" style={{ marginTop: 6 }}>
                {t.features.map(f => (
                  <div key={f} className="row gap-8" style={{ alignItems: 'flex-start', fontSize: 13, color: t.featured ? 'rgba(255,255,255,0.85)' : 'var(--ink-2)' }}>
                    <span style={{ color: t.featured ? 'var(--accent)' : 'var(--accent)', marginTop: 2 }}><Icon name="check" size={14} stroke={2}/></span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────
function FAQSection() {
  const items = [
    { q: 'Why Ontario only at launch?', a: 'LTT, rent control, and the comp database are all province-specific. Running Ontario rules on a BC property overstates closing costs by tens of thousands. We gate non-Ontario URLs cleanly, take your email, and notify you when BC and Alberta ship.' },
    { q: 'Where do your rental comps come from?', a: 'A nightly scrape of Rentals.ca, Kijiji, and PadMapper. We dedupe, geocode, and timestamp every record. The time-series database accumulates from day one — after six months, it exists nowhere else in Canada.' },
    { q: 'How accurate is the AI verdict?', a: 'It writes the verdict from validated structured data only — never from free-text. Numbers come from our calc engine and comps DB, then Sonnet writes the prose. We never feed raw listing descriptions into the prompt.' },
    { q: 'Can I export to PDF?', a: 'Yes — Investor Pro and above. The PDF is rendered from the live report HTML by headless Chrome, so what you see is exactly what your client sees. Professional tier white-labels with your branding.' },
    { q: 'Do you support short-term rentals?', a: 'STR legality (Toronto and Vancouver investment STR is prohibited) is flagged today. STR revenue modelling via AirDNA ships in Phase 2.' },
    { q: 'Is this financial advice?', a: 'No. PropScout is an analysis tool. The numbers are sourced and the methodology is published, but every decision is yours. Always confirm with a mortgage broker, lawyer, and accountant.' },
  ];

  const [open, setOpen] = React.useState(0);

  return (
    <section id="faq" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 60, alignItems: 'flex-start' }}>
        <SectionHeader tag="Common questions" title={<>If you've already asked yourself this, <em className="serif" style={{ color: 'var(--muted)' }}>good.</em></>}>
          Real estate is high-stakes. We over-document because you should.
        </SectionHeader>

        <div className="col" style={{ borderTop: '1px solid var(--line-strong)' }}>
          {items.map((it, i) => (
            <div key={it.q} style={{ borderBottom: '1px solid var(--line)' }}>
              <button onClick={() => setOpen(open === i ? -1 : i)} className="row" style={{
                width: '100%', padding: '22px 0', justifyContent: 'space-between',
                background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                color: 'var(--ink)',
              }}>
                <span className="serif" style={{ fontSize: 22, lineHeight: 1.2 }}>{it.q}</span>
                <span style={{ color: 'var(--muted)' }}><Icon name={open === i ? 'minus' : 'plus'} size={18}/></span>
              </button>
              {open === i && (
                <div style={{ paddingBottom: 22, paddingRight: 40 }}>
                  <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 640 }}>{it.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="container" style={{ paddingTop: 'var(--pad-y)', paddingBottom: 'var(--pad-y)' }}>
      <div style={{
        background: 'var(--ink)', color: 'var(--bg)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(48px, 6vw, 88px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 720, position: 'relative', zIndex: 2 }}>
          <span className="section-tag" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>The next listing you save</span>
          <h2 className="serif" style={{ color: 'var(--bg)', textWrap: 'balance', marginBottom: 24 }}>
            Stop building the spreadsheet again. <em style={{ color: 'var(--accent)' }}>Paste the URL.</em>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, maxWidth: 540, marginBottom: 28 }}>
            Three free analyses every month. No credit card, no demo call, no team to talk to. You'll know if the deal is dead in sixty seconds.
          </p>
          <div className="row gap-12">
            <a href="#hero" className="btn btn-accent" style={{ padding: '16px 24px', fontSize: 15 }}>Analyze a listing <Icon name="arrow" size={15}/></a>
            <a href="#pricing" className="btn" style={{ padding: '16px 24px', fontSize: 15, background: 'transparent', color: 'var(--bg)', border: '1px solid rgba(255,255,255,0.25)' }}>See pricing</a>
          </div>
        </div>

        {/* Decorative scout-mark watermark */}
        <div style={{
          position: 'absolute',
          right: -60, top: -30, opacity: 0.08,
          color: 'var(--accent)',
        }}>
          <ScoutMark size={460} color="var(--accent)"/>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, {
  ReportsSection, HowSection, StepVisual, CoverageSection, SunScoutSection, PricingSection, FAQSection, CTASection,
});
