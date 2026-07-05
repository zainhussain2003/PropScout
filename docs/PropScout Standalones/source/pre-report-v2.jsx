// pre-report-v2.jsx — two pre-report flows: full-screen scraping progress
// (Charles St E tenant scrape) + manual-entry fallback (Buttermill, scraper
// partial). Mirrors analyzing.tsx. Harbour re-skin: no accent tweak, no hex.

const { useState: useStatePR, useEffect: useEffectPR } = React;

const TWEAK_DEFAULTS_PR = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "scenario": "scraping"
}/*EDITMODE-END*/;

// ── Mini top bar ──────────────────────────────────────────────────────────────
function MiniNav() {
  return (
    <header style={{ borderBottom: '1px solid var(--line)', background: 'color-mix(in oklab, var(--bg) 84%, transparent)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'saturate(180%) blur(14px)', WebkitBackdropFilter: 'saturate(180%) blur(14px)' }}>
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        <Wordmark height={22} />
        <button className="btn btn-ghost" style={{ padding: '10px 14px', fontSize: 12 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={12} /></span>
          Cancel &amp; start over
        </button>
      </div>
    </header>
  );
}

function PreviewChip({ children, filled }) {
  return (
    <span className="chip" style={{ opacity: filled ? 1 : 0.45, transition: 'opacity .25s ease', color: filled ? 'var(--ink)' : 'var(--muted)' }}>
      {filled && <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--pass)' }}></span>}
      {children}
    </span>
  );
}

// ── Scenario 1 — scraping progress (Charles St E · tenant) ────────────────────
function ScrapingProgress() {
  const [pct, setPct] = useStatePR(0);

  useEffectPR(() => {
    const timer = setInterval(() => {
      setPct((p) => (p >= 92 ? p : p + Math.random() * 3 + 1));
    }, 300);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    { txt: 'Fetched listing · ID 28145902', at: 8 },
    { txt: 'Read address · Unit 2314 · 28 Charles St E, Toronto', at: 22 },
    { txt: 'Read asking rent · $2,650/mo', at: 36 },
    { txt: 'Read unit details · 2 bed · 2 bath · 780 sqft', at: 50 },
    { txt: 'Detected building · Casa III · 38 floors · 2018', at: 62 },
    { txt: 'Pulling rental comps · 12 in-building · 22 in 1km', at: 76 },
    { txt: 'Scanning description · 7 listing-accuracy rules', at: 88 },
    { txt: 'Generating Scout AI verdict', at: 96 },
  ];

  return (
    <div>
      <MiniNav />
      <main className="container" style={{ paddingTop: 80, paddingBottom: 120 }}>
        <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 56 }}>
          <div className="row gap-12" style={{ padding: '16px 22px', borderRadius: 'var(--r)', background: 'var(--surface)', border: '1px solid var(--line)', flexWrap: 'wrap' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent)' }} className="live-dot"></span>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Analyzing</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
              realtor.ca / real-estate / 28145902 / unit-2314-28-charles-st-e-toronto
            </span>
            <span className="chip">Tenant view</span>
          </div>

          <div className="col" style={{ gap: 22, textAlign: 'center', alignItems: 'center' }}>
            <h1 className="serif" style={{ textWrap: 'balance', maxWidth: 720 }}>
              Reading the listing and pulling <em style={{ color: 'var(--accent)' }}>12 building comps</em>.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 520, lineHeight: 1.6 }}>
              Most reports finish in <span className="tabular" style={{ color: 'var(--ink)' }}>under 20 seconds</span>. Sit tight — or open another tab and we'll be here when you get back.
            </p>
          </div>

          <div className="col" style={{ gap: 12, maxWidth: 720, margin: '0 auto', width: '100%' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="mono tabular" style={{ fontSize: 12, color: 'var(--muted)' }}>{Math.floor(pct)}%</span>
              <span className="mono tabular" style={{ fontSize: 12, color: 'var(--muted)' }}>~{Math.max(2, Math.round((100 - pct) / 8))}s remaining</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width .4s ease' }}></div>
              <div className="shimmer" style={{ position: 'absolute', inset: 0, opacity: 0.5, borderRadius: 999 }}></div>
            </div>
          </div>

          <div className="pr-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div className="card col" style={{ padding: 32, gap: 18 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>What we're doing</span>
              {steps.map((s, i) => {
                const done = pct > s.at;
                const active = pct >= s.at && pct < (steps[i + 1] ? steps[i + 1].at : 100);
                return (
                  <div key={i} className="row gap-12" style={{ fontSize: 14, color: done || active ? 'var(--ink)' : 'var(--muted)', transition: 'color .2s ease' }}>
                    {done ? (
                      <span style={{ color: 'var(--pass)', flexShrink: 0 }}><Icon name="check" size={14} stroke={2.4} /></span>
                    ) : active ? (
                      <span style={{ width: 14, height: 14, borderRadius: 999, border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0, display: 'inline-block' }}></span>
                    ) : (
                      <span style={{ width: 14, height: 14, borderRadius: 999, border: '1.5px solid var(--line-strong)', flexShrink: 0, display: 'inline-block' }}></span>
                    )}
                    <span>{s.txt}</span>
                  </div>
                );
              })}
            </div>

            <div className="col" style={{ gap: 22 }}>
              <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
                {/* CAPTURE: live listing photo — Casa III skyline unit exterior */}
                <div className="photo-ph" style={{ height: 180, position: 'relative', opacity: pct > 50 ? 1 : 0.4, transition: 'opacity .4s ease' }}>
                  <span>{pct > 50 ? 'unit · skyline view' : 'pulling photos...'}</span>
                </div>
                <div className="col" style={{ padding: 24, gap: 14 }}>
                  <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                    <PreviewChip filled={pct > 22}>For rent · M4Y</PreviewChip>
                    <PreviewChip filled={pct > 36}>$2,650/mo</PreviewChip>
                    <PreviewChip filled={pct > 50}>2 bed · 780 sqft</PreviewChip>
                    <PreviewChip filled={pct > 62}>Built 2018</PreviewChip>
                  </div>
                  <h3 className="serif" style={{ fontSize: 22, lineHeight: 1.2, color: pct > 22 ? 'var(--ink)' : 'var(--muted)', transition: 'color .3s ease' }}>
                    {pct > 22 ? 'Unit 2314 · 28 Charles St E' : <span style={{ background: 'var(--line)', display: 'inline-block', width: 240, height: 24, borderRadius: 'var(--r-sm)' }}></span>}
                  </h3>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{pct > 22 ? 'Toronto · M4Y · Bay Corridor' : 'Reading location…'}</div>
                </div>
              </div>

              <div className="card row" style={{ padding: 22, gap: 18, alignItems: 'center', opacity: pct > 76 ? 1 : 0.5, transition: 'opacity .4s ease' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--r)', background: 'color-mix(in oklab, var(--accent) 12%, transparent)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="map" size={20} />
                </div>
                <div className="col grow" style={{ gap: 4 }}>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Comps found</span>
                  <span style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>
                    {pct > 76 ? '12 in-building comps · high confidence' : 'Searching the comps database…'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 22, color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>
            <span className="row gap-6"><Icon name="check" size={12} /> Realtor.ca · live</span>
            <span className="row gap-6"><Icon name="check" size={12} /> 12 verified comps in building</span>
            <span className="row gap-6"><Icon name="check" size={12} /> No data leaves your account</span>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Form primitives ───────────────────────────────────────────────────────────
function FormCard({ title, status, children }) {
  return (
    <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="row" style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', justifyContent: 'space-between' }}>
        <h3 className="serif" style={{ fontSize: 20 }}>{title}</h3>
        {status && <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>{status}</span>}
      </div>
      <div className="col gap-16" style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

function FormRow({ label, required, missing, hint, children }) {
  return (
    <label className="col" style={{ gap: 6 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
          {label}{required && <span style={{ color: 'var(--caution)', marginLeft: 4 }}>*</span>}
        </span>
        {missing && <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--caution)' }}>Not found</span>}
      </div>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{hint}</span>}
    </label>
  );
}

function FormRow2col({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>;
}

// ── Scenario 2 — manual entry fallback (Buttermill · scraper partial) ─────────
function ManualEntry() {
  return (
    <div>
      <MiniNav />
      <main className="container" style={{ paddingTop: 48, paddingBottom: 96 }}>
        <div className="col" style={{ maxWidth: 920, margin: '0 auto', gap: 32 }}>
          <div className="col" style={{ gap: 16, maxWidth: 720 }}>
            <span className="chip" style={{ background: 'color-mix(in oklab, var(--accent) 8%, transparent)', borderColor: 'color-mix(in oklab, var(--accent) 25%, transparent)', color: 'var(--accent)', alignSelf: 'flex-start' }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }}></span>
              Auto-filled · 8 of 12 fields
            </span>
            <h1 className="serif" style={{ textWrap: 'balance' }}>
              We need a <em style={{ color: 'var(--accent)' }}>few more details</em> before this report runs.
            </h1>
            <p style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 620 }}>
              The scraper got most of what it needed from the listing. <span className="tabular">4 fields</span> weren't in the listing data — fill them in and we'll run the analysis. Amber-tinted fields are the ones we still need.
            </p>
          </div>

          <div className="pr-two-col" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 22 }}>
              <FormCard title="Property basics" status="7 auto-filled">
                <FormRow label="Street address" required>
                  <input className="pr-input" defaultValue="Unit 5702 · 5 Buttermill Avenue, Vaughan" />
                </FormRow>
                <FormRow2col>
                  <FormRow label="Property type" required>
                    <select className="pr-select" defaultValue="Condo apartment">
                      <option>Detached</option><option>Semi-detached</option>
                      <option>Townhouse</option><option>Condo apartment</option>
                      <option>Condo townhouse</option><option>Duplex</option>
                    </select>
                  </FormRow>
                  <FormRow label="Built year" required>
                    <input className="pr-input" defaultValue="2020" />
                  </FormRow>
                </FormRow2col>
                <FormRow2col>
                  <FormRow label="Beds"><input className="pr-input" defaultValue="3" /></FormRow>
                  <FormRow label="Baths"><input className="pr-input" defaultValue="2" /></FormRow>
                </FormRow2col>
                <FormRow2col>
                  <FormRow label="Sqft (interior)"><input className="pr-input" defaultValue="950" /></FormRow>
                  <FormRow label="Parking"><input className="pr-input" defaultValue="1 · underground" /></FormRow>
                </FormRow2col>
              </FormCard>

              <FormCard title="Money" status="3 still needed">
                <FormRow label="Asking price" required>
                  <input className="pr-input" defaultValue="$729,900" />
                </FormRow>
                <FormRow2col>
                  <FormRow label="Property taxes" required missing hint="$ per year — sometimes behind a Realtor login">
                    <input className="pr-input missing" placeholder="$ / yr" />
                  </FormRow>
                  <FormRow label="Condo / strata fee" required missing hint="monthly maintenance fee">
                    <input className="pr-input missing" placeholder="$ / month" />
                  </FormRow>
                </FormRow2col>
                <FormRow label="Estimated monthly rent" required missing hint="If you don't know, leave blank — we'll estimate from comps">
                  <input className="pr-input missing" placeholder="$ / month" />
                </FormRow>
              </FormCard>

              <FormCard title="Photos & description" status="optional · improves AI verdict">
                {/* CAPTURE: user-dropped listing photos for the manual-entry fallback */}
                <div className="photo-ph row" style={{ height: 160, borderRadius: 'var(--r)', border: '1.5px dashed var(--line-strong)', background: 'var(--bg-elev)', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 8, color: 'var(--muted)', cursor: 'pointer', padding: 14 }}>
                  <span style={{ color: 'var(--accent)' }}><Icon name="paste" size={20} /></span>
                  <span style={{ fontFamily: "'Geist', sans-serif", textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--ink)' }}>
                    Drop photos here, or <span style={{ color: 'var(--accent)' }}>browse</span>
                  </span>
                  <span style={{ fontFamily: "'Geist', sans-serif", textTransform: 'none', letterSpacing: 0, fontSize: 12, color: 'var(--muted)' }}>JPG, PNG · up to 20 images</span>
                </div>
                <FormRow label="Listing description" hint="Paste the seller's description — helps our AI flag rental-accuracy issues">
                  <textarea className="pr-input" rows={4} placeholder="Paste the listing description here..." style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}></textarea>
                </FormRow>
              </FormCard>
            </div>

            <div className="col pr-sticky" style={{ gap: 16, position: 'sticky', top: 84 }}>
              <div className="card col" style={{ padding: 24, gap: 16 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Field status</span>
                <div className="col gap-10">
                  {[
                    ['Auto-filled', 8, 'var(--pass)'],
                    ['Still missing', 3, 'var(--caution)'],
                    ['Optional', 1, 'var(--muted)'],
                  ].map(([k, n, color]) => (
                    <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="row gap-8" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }}></span>{k}
                      </span>
                      <span className="mono tabular" style={{ fontSize: 14, color, fontWeight: 500 }}>{n}</span>
                    </div>
                  ))}
                </div>
                <div className="divider"></div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  The report runs as soon as the <span style={{ color: 'var(--caution)' }}>3 amber fields</span> are filled. Optional fields just improve the verdict quality.
                </p>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>Run analysis <Icon name="arrow" size={13} /></button>
                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>Save draft &amp; finish later</button>
              </div>

              <div className="card col" style={{ padding: 20, gap: 12 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Why we ask</span>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  Listings sometimes hide taxes behind a Realtor login, or skip the condo-fee field entirely. Filling them in once gives you a real cap rate, an accurate rent-control status, and a properly-stress-tested OSFI result.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [dark, setDark, t, setTweak] = useThemeTweak(TWEAK_DEFAULTS_PR);
  const view = t.scenario === 'manual-entry' ? <ManualEntry /> : <ScrapingProgress />;

  return (
    <div data-screen-label="Pre Report Flows">
      {view}
      <ThemeTweakPanel dark={dark} setDark={setDark} setTweak={setTweak}>
        <TweakSection label="Scenario" />
        <TweakRadio label="Flow" value={t.scenario} options={['scraping', 'manual-entry']} onChange={(v) => setTweak('scenario', v)} />
      </ThemeTweakPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
