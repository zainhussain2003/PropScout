// pre-report.jsx — Two pre-report flows: full-screen scraping progress + manual entry fallback.
// Tweak switches between scenarios.

const { useState: useStatePR, useEffect: useEffectPR } = React;

const TWEAK_DEFAULTS_PR = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757",
  "scenario": "scraping"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS_PR = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

// ── Mini top bar ─────────────────────────────────────────────────
function MiniNav() {
  return (
    <header style={{
      borderBottom: '1px solid var(--line)',
      background: 'color-mix(in oklab, var(--bg) 84%, transparent)',
      position: 'sticky', top: 0, zIndex: 10,
      backdropFilter: 'saturate(180%) blur(14px)',
      WebkitBackdropFilter: 'saturate(180%) blur(14px)',
    }}>
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        <Wordmark height={22}/>
        <button className="btn btn-ghost" style={{ padding: '10px 14px', fontSize: 12 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={12}/></span>
          Cancel & start over
        </button>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Scenario 1 — Full-screen scraping progress
// ══════════════════════════════════════════════════════════════════
function ScrapingProgress() {
  const [pct, setPct] = useStatePR(0);

  // Animate progress
  useEffectPR(() => {
    let t = setInterval(() => {
      setPct((p) => {
        if (p >= 92) return p;
        return p + Math.random() * 3 + 1;
      });
    }, 300);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { txt: 'Fetched listing · ID 28145902',                        at: 8 },
    { txt: 'Read address · Unit 3705 · 28 Charles St E, Toronto', at: 22 },
    { txt: 'Read asking rent · $2,150/mo',                         at: 36 },
    { txt: 'Read unit details · 1+den · 1 bath · 620 sqft',         at: 50 },
    { txt: 'Detected building · Casa III · 38 floors · 2018',       at: 62 },
    { txt: 'Pulling rental comps · 14 in-building · 22 in 1km',     at: 76 },
    { txt: 'Scanning description · 7 listing-accuracy rules',       at: 88 },
    { txt: 'Generating Scout AI verdict',                           at: 96 },
  ];

  return (
    <div>
      <MiniNav/>
      <main className="container" style={{ paddingTop: 80, paddingBottom: 120 }}>
        <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 56 }}>

          {/* URL strip */}
          <div className="row gap-12" style={{
            padding: '16px 22px', borderRadius: 14,
            background: 'var(--surface)', border: '1px solid var(--line)',
            flexWrap: 'wrap',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent)' }} className="live-dot"/>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Analyzing
            </span>
            <span className="mono" style={{
              fontSize: 12, color: 'var(--ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              flex: 1, minWidth: 0,
            }}>
              realtor.ca / real-estate / 27905412 / unit-3705-28-charles-st-e-toronto
            </span>
            <span className="chip">Tenant view</span>
          </div>

          {/* Big headline + meta */}
          <div className="col" style={{ gap: 22, textAlign: 'center', alignItems: 'center' }}>
            <h1 className="serif" style={{ textWrap: 'balance', maxWidth: 720 }}>
              Reading the listing and pulling <em style={{ color: 'var(--accent)' }}>14 building comps</em>.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 520, lineHeight: 1.6 }}>
              Most reports finish in <span className="tabular" style={{ color: 'var(--ink)' }}>under 20 seconds</span>. Sit tight — or open another tab and we'll be here when you get back.
            </p>
          </div>

          {/* Progress bar */}
          <div className="col" style={{ gap: 12, maxWidth: 720, margin: '0 auto', width: '100%' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="mono tabular" style={{ fontSize: 12, color: 'var(--muted)' }}>{Math.floor(pct)}%</span>
              <span className="mono tabular" style={{ fontSize: 12, color: 'var(--muted)' }}>~{Math.max(2, Math.round((100 - pct) / 8))}s remaining</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width .4s ease' }}/>
              <div className="shimmer" style={{ position: 'absolute', inset: 0, opacity: 0.5, borderRadius: 999 }}/>
            </div>
          </div>

          {/* Two-column main */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            {/* Steps */}
            <div className="card col" style={{ padding: 32, gap: 18 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                What we're doing
              </span>
              {steps.map((s, i) => {
                const done = pct > s.at;
                const active = pct >= s.at && pct < (steps[i + 1]?.at ?? 100);
                return (
                  <div key={i} className="row gap-12" style={{
                    fontSize: 14,
                    color: done ? 'var(--ink)' : active ? 'var(--ink)' : 'var(--muted)',
                    transition: 'color .2s ease',
                  }}>
                    {done ? (
                      <span style={{ color: 'var(--pass)', flexShrink: 0 }}><Icon name="check" size={14} stroke={2.4}/></span>
                    ) : active ? (
                      <span style={{
                        width: 14, height: 14, borderRadius: 999,
                        border: '2px solid var(--accent)',
                        borderTopColor: 'transparent',
                        animation: 'spin 0.8s linear infinite',
                        flexShrink: 0, display: 'inline-block',
                      }}/>
                    ) : (
                      <span style={{
                        width: 14, height: 14, borderRadius: 999,
                        border: '1.5px solid var(--line-strong)',
                        flexShrink: 0, display: 'inline-block',
                      }}/>
                    )}
                    <span>{s.txt}</span>
                  </div>
                );
              })}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>

            {/* Live preview card — what we've found so far */}
            <div className="col" style={{ gap: 22 }}>
              <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Photo placeholder appears when we've read photos */}
                <div className="photo-ph" style={{
                  height: 180, position: 'relative',
                  opacity: pct > 50 ? 1 : 0.4,
                  transition: 'opacity .4s ease',
                }}>
                  <span>{pct > 50 ? 'unit · skyline view' : 'pulling photos...'}</span>
                </div>
                <div className="col" style={{ padding: 24, gap: 14 }}>
                  <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                    <PreviewChip filled={pct > 22}>For rent · M4Y</PreviewChip>
                    <PreviewChip filled={pct > 36}>$2,150/mo</PreviewChip>
                    <PreviewChip filled={pct > 50}>1+den · 620 sqft</PreviewChip>
                    <PreviewChip filled={pct > 62}>Built 2018</PreviewChip>
                  </div>
                  <h3 className="serif" style={{
                    fontSize: 22, lineHeight: 1.2,
                    color: pct > 22 ? 'var(--ink)' : 'var(--muted)',
                    transition: 'color .3s ease',
                  }}>
                    {pct > 22 ? 'Unit 3705 · 28 Charles St E' : <span style={{ background: 'var(--line)', display: 'inline-block', width: 240, height: 24, borderRadius: 6 }}/>}
                  </h3>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {pct > 22 ? 'Toronto · M4Y · Bay Corridor' : 'Reading location…'}
                  </div>
                </div>
              </div>

              {/* Comp count preview */}
              <div className="card row" style={{ padding: 22, gap: 18, alignItems: 'center', opacity: pct > 76 ? 1 : 0.5, transition: 'opacity .4s ease' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
                  color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon name="map" size={20}/>
                </div>
                <div className="col grow" style={{ gap: 4 }}>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Comps found</span>
                  <span style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>
                    {pct > 76 ? '36 comparable rentals · high confidence' : 'Searching the comps database…'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reassurance row */}
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 22, color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>
            <span className="row gap-6"><Icon name="check" size={12}/> Realtor.ca · live</span>
            <span className="row gap-6"><Icon name="check" size={12}/> 36 verified comps in 1km</span>
            <span className="row gap-6"><Icon name="check" size={12}/> No data leaves your account</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function PreviewChip({ children, filled }) {
  return (
    <span className="chip" style={{
      opacity: filled ? 1 : 0.45,
      transition: 'opacity .25s ease',
      color: filled ? 'var(--ink)' : 'var(--muted)',
    }}>
      {filled && <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--pass)' }}/>}
      {children}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Scenario 2 — Manual entry fallback form
// ══════════════════════════════════════════════════════════════════
function ManualEntry() {
  return (
    <div>
      <MiniNav/>
      <main className="container" style={{ paddingTop: 48, paddingBottom: 96 }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }} className="col" style={{ gap: 32 }}>

          {/* Header */}
          <div className="col" style={{ gap: 16, maxWidth: 720 }}>
            <span className="chip" style={{
              background: 'color-mix(in oklab, var(--accent) 8%, transparent)',
              borderColor: 'color-mix(in oklab, var(--accent) 25%, transparent)',
              color: 'var(--accent)',
              alignSelf: 'flex-start',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }}/>
              Auto-filled · 9 of 14 fields
            </span>
            <h1 className="serif" style={{ textWrap: 'balance' }}>
              We need a <em style={{ color: 'var(--accent)' }}>few more details</em> before this report runs.
            </h1>
            <p style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 620 }}>
              The scraper got most of what it needed from the listing. <span className="tabular">5 fields</span> weren't in the listing data — fill them in below and we'll run the analysis. Amber-tinted fields are the ones we still need.
            </p>
          </div>

          {/* Two-column form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'flex-start' }}>
            {/* Left column — form sections */}
            <div className="col gap-22" style={{ gap: 22 }}>
              {/* Address & basics */}
              <FormCard title="Property basics" status="9 auto-filled">
                <FormRow label="Street address" required>
                  <input className="pr-input" defaultValue="1422 Erin Mills Parkway, Mississauga"/>
                </FormRow>
                <FormRow2col>
                  <FormRow label="Property type" required>
                    <select className="pr-select" defaultValue="Detached">
                      <option>Detached</option><option>Semi-detached</option>
                      <option>Townhouse</option><option>Condo apartment</option>
                      <option>Condo townhouse</option><option>Duplex</option>
                    </select>
                  </FormRow>
                  <FormRow label="Built year" required missing>
                    <input className="pr-input missing" placeholder="e.g. 1985"/>
                  </FormRow>
                </FormRow2col>
                <FormRow2col>
                  <FormRow label="Beds">
                    <input className="pr-input" defaultValue="3"/>
                  </FormRow>
                  <FormRow label="Baths">
                    <input className="pr-input" defaultValue="3"/>
                  </FormRow>
                </FormRow2col>
                <FormRow2col>
                  <FormRow label="Sqft (interior)">
                    <input className="pr-input" defaultValue="1,820"/>
                  </FormRow>
                  <FormRow label="Parking">
                    <input className="pr-input" defaultValue="2 driveway · 0 garage"/>
                  </FormRow>
                </FormRow2col>
              </FormCard>

              {/* Money */}
              <FormCard title="Money" status="3 still needed">
                <FormRow label="Asking price" required>
                  <input className="pr-input" defaultValue="$1,049,000"/>
                </FormRow>
                <FormRow2col>
                  <FormRow label="Property taxes" required missing hint="$ per year">
                    <input className="pr-input missing" placeholder="$ / yr"/>
                  </FormRow>
                  <FormRow label="Condo / strata fee" hint="leave blank for freehold">
                    <input className="pr-input" placeholder="$ / month"/>
                  </FormRow>
                </FormRow2col>
                <FormRow label="Estimated monthly rent" required missing hint="If you don't know, leave blank — we'll estimate from comps">
                  <input className="pr-input missing" placeholder="$ / month"/>
                </FormRow>
              </FormCard>

              {/* Description / photos */}
              <FormCard title="Photos & description" status="optional · improves AI verdict">
                <div className="photo-ph row" style={{
                  height: 160, borderRadius: 14,
                  border: '1.5px dashed var(--line-strong)',
                  background: 'var(--bg-elev)',
                  justifyContent: 'center', alignItems: 'center',
                  flexDirection: 'column', gap: 8,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: 14,
                }}>
                  <span style={{ color: 'var(--accent)' }}><Icon name="paste" size={20}/></span>
                  <span style={{ fontFamily: "'Geist', sans-serif", textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--ink)' }}>
                    Drop photos here, or <span style={{ color: 'var(--accent)' }}>browse</span>
                  </span>
                  <span style={{ fontFamily: "'Geist', sans-serif", textTransform: 'none', letterSpacing: 0, fontSize: 12, color: 'var(--muted)' }}>JPG, PNG · up to 20 images</span>
                </div>
                <FormRow label="Listing description" hint="Paste the seller's description — helps our AI flag rental-accuracy issues">
                  <textarea className="pr-input" rows={4} placeholder="Paste the listing description here..." style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}/>
                </FormRow>
              </FormCard>
            </div>

            {/* Right column — sticky summary + CTA */}
            <div className="col gap-16" style={{ position: 'sticky', top: 84 }}>
              <div className="card col" style={{ padding: 24, gap: 16 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Field status</span>
                <div className="col gap-10">
                  {[
                    ['Auto-filled', 9, 'var(--pass)'],
                    ['Still missing', 3, 'var(--caution)'],
                    ['Optional', 2, 'var(--muted)'],
                  ].map(([k, n, color]) => (
                    <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="row gap-8" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }}/>
                        {k}
                      </span>
                      <span className="mono tabular" style={{ fontSize: 14, color, fontWeight: 500 }}>{n}</span>
                    </div>
                  ))}
                </div>

                <div className="divider"/>

                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  The report runs as soon as the <span style={{ color: 'var(--caution)' }}>3 amber fields</span> are filled. Optional fields just improve the verdict quality.
                </p>

                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
                  Run analysis <Icon name="arrow" size={13}/>
                </button>
                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                  Save draft & finish later
                </button>
              </div>

              <div className="card col" style={{ padding: 20, gap: 12 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Why we ask</span>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  Listings sometimes hide taxes behind a Realtor login, or skip the year-built field entirely. Filling them in once gives you a real cap rate, an accurate rent-control status, and a properly-stress-tested OSFI result.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Form primitives ─────────────────────────────────────────────
function FormCard({ title, status, children }) {
  return (
    <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="row" style={{
        padding: '18px 24px',
        borderBottom: '1px solid var(--line)',
        justifyContent: 'space-between',
      }}>
        <h3 className="serif" style={{ fontSize: 20 }}>{title}</h3>
        {status && <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>{status}</span>}
      </div>
      <div className="col gap-16" style={{ padding: 24 }}>
        {children}
      </div>
    </div>
  );
}

function FormRow({ label, required, missing, hint, children }) {
  return (
    <label className="col" style={{ gap: 6 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
          {label}
          {required && <span style={{ color: 'var(--caution)', marginLeft: 4 }}>*</span>}
        </span>
        {missing && <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--caution)' }}>Not found</span>}
      </div>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{hint}</span>}
    </label>
  );
}

function FormRow2col({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  App
// ══════════════════════════════════════════════════════════════════
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_PR);

  useEffectPR(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  const view = t.scenario === 'manual-entry' ? <ManualEntry/> : <ScrapingProgress/>;

  return (
    <div>
      {view}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Scenario"/>
        <TweakRadio
          label="Flow"
          value={t.scenario}
          options={['scraping', 'manual-entry']}
          onChange={(v) => setTweak('scenario', v)}
        />

        <TweakSection label="Theme"/>
        <TweakRadio label="Mode"   value={t.theme}  options={['light', 'dark']} onChange={(v) => setTweak('theme', v)}/>
        <TweakColor label="Accent" value={t.accent} options={ACCENT_OPTIONS_PR}  onChange={(v) => setTweak('accent', v)}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
