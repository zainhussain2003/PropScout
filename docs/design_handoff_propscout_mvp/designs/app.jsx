// app.jsx — Hero + assembly + tweaks

const { useState: useState_a, useEffect: useEffect_a } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757",
  "density": "regular",
  "showReportPreview": true
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

// ── Hero ───────────────────────────────────────────────
// Sample listings the landing page can demo (display-only).
const SAMPLE_LISTINGS = [
  {
    key: 'vaughan',
    label: 'Vaughan rental',
    kind: 'rent',
    url: 'https://www.realtor.ca/real-estate/27905412/unit-3705-28-charles-st-e-toronto',
    pretty: '… / listing / 27905412 / unit-3705 · 28 charles st e · toronto',
  },
  {
    key: 'hamilton',
    label: 'Hamilton duplex',
    kind: 'buy',
    url: 'https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton',
    pretty: '… / listing / 27619830 / 146 east 19th st · hamilton',
  },
];

function Hero() {
  const [sampleIdx, setSampleIdx] = useState_a(0);
  const [url, setUrl] = useState_a(SAMPLE_LISTINGS[0].url);
  const [stage, setStage] = useState_a('idle'); // idle | scraping | done | error
  const [progress, setProgress] = useState_a(0);
  const [errorMsg, setErrorMsg] = useState_a('');

  const pickSample = (i) => {
    setSampleIdx(i);
    setUrl(SAMPLE_LISTINGS[i].url);
    setStage('idle');
    setErrorMsg('');
    setTimeout(() => runDemo(SAMPLE_LISTINGS[i].url), 60);
  };

  const validateUrl = (raw) => {
    const u = (raw || '').trim().toLowerCase();
    if (!u) return 'Paste a listing URL to begin.';
    if (!/^https?:\/\//.test(u)) return "That doesn't look like a valid URL.";
    const supported = /(realtor\.ca|zillow\.ca|zillow\.com)/.test(u);
    if (!supported) return "That listing source isn't supported yet. We currently read Realtor.ca and Zillow.ca — more sources coming soon.";
    if (/zillow\.com/.test(u) && !/zillow\.ca/.test(u)) return 'This appears to be a US listing. PropScout covers Canadian properties only.';
    return null;
  };

  const runDemo = (overrideUrl) => {
    const target = overrideUrl != null ? overrideUrl : url;
    const err = validateUrl(target);
    if (err) {
      setStage('error');
      setErrorMsg(err);
      return;
    }
    setStage('scraping');
    setErrorMsg('');
    setProgress(0);
    setStage('scraping');
    setProgress(0);
    let p = 0;
    const tick = setInterval(() => {
      p += 14;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(tick);
        setTimeout(() => setStage('done'), 250);
      }
    }, 180);
  };

  return (
    <section id="hero" style={{ paddingTop: 60, paddingBottom: 'var(--pad-y)', overflow: 'hidden' }}>
      <div className="container col gap-32">

        {/* Headline strip */}
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1100 }}>
          <div className="row gap-12" style={{ marginBottom: 24 }}>
            <span className="chip" style={{ background: 'transparent' }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }} className="live-dot"/>
              Live in Ontario · 2,400 listings analyzed last week
            </span>
            <span className="chip">v0.9 · MVP preview</span>
          </div>

          <h1 className="serif" style={{ textWrap: 'balance', maxWidth: 1100, marginBottom: 22 }}>
            Know what any Canadian listing
            <br/>
            is <em style={{ color: 'var(--accent)' }}>really</em> worth — before you sign.
          </h1>

          <p style={{ fontSize: clampStr(17, 21), maxWidth: 720, color: 'var(--ink-2)' }}>
            Paste any listing. Whether you're renting, buying a home, hunting an investment, or pricing out your own unit — PropScout returns a full, plain-English report in under sixty seconds. Comps, costs, risks, sun path, and a written verdict. Canadian rules. Real money.
          </p>
        </div>

        {/* Main URL input card */}
        <div className="col gap-24" style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 22,
          padding: 'clamp(20px, 2.4vw, 28px)',
          boxShadow: 'var(--shadow-pop)',
          marginTop: 8,
        }}>
          <div className="row gap-16" style={{ flexWrap: 'wrap' }}>
            <div className="hero-input-shell row" style={{
              flex: '1 1 480px',
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '14px 16px',
              gap: 12,
              minWidth: 0,
              transition: 'border-color .15s ease, background-color .15s ease',
            }}>
              <Icon name="link" size={18}/>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') runDemo(); }}
                placeholder="Paste a listing URL"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 13,
                  color: 'var(--ink)',
                  minWidth: 0,
                }}
              />
              <button
                onClick={() => { navigator.clipboard?.readText().then(v => v && setUrl(v)).catch(()=>{}); }}
                className="btn btn-ghost"
                style={{ padding: '6px 10px', fontSize: 11 }}
                title="Paste from clipboard"
              >
                <Icon name="paste" size={12}/> Paste
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => runDemo()} style={{ padding: '14px 22px', fontSize: 15, flexShrink: 0 }}>
              {stage === 'idle' ? 'Analyze' : stage === 'scraping' ? 'Working…' : 'Open report'}
              <Icon name="arrow" size={15}/>
            </button>
          </div>

          {/* Demo / status panel */}
          {stage === 'idle' && (
            <div className="row gap-24" style={{ flexWrap: 'wrap', color: 'var(--muted)', fontSize: 13, alignItems: 'center' }}>
              <div className="row gap-8"><Icon name="dot" size={10}/> Free preview · no sign-in</div>
              <div className="row gap-8"><Icon name="dot" size={10}/> No login required for tenant reports</div>
              <div className="row gap-8" style={{ marginLeft: 'auto', alignItems: 'center' }}>
                <span>Try one of ours →</span>
                {SAMPLE_LISTINGS.map((s, i) => (
                  <React.Fragment key={s.key}>
                    {i > 0 && <span>·</span>}
                    <button
                      onClick={() => pickSample(i)}
                      className="mono sample-link"
                      style={{
                        color: i === sampleIdx ? 'var(--accent)' : 'var(--ink-2)',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: 12, padding: 0,
                        textDecoration: i === sampleIdx ? 'underline' : 'none',
                        textUnderlineOffset: 4,
                      }}>{s.label}</button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {stage === 'scraping' && (
            <div className="col gap-12">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  Scraping listing · {progress}%
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>~12s remaining</div>
              </div>
              <div style={{ height: 3, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width .2s ease' }}/>
              </div>
              <div className="col gap-8" style={{ marginTop: 8 }}>
                {[
                  ['Found listing · Unit 3705 · 28 Charles St E, Toronto', progress > 10],
                  ['Asking $2,150/mo · 1+den · 1 bath · ~620 sqft', progress > 25],
                  ['Heat, water included · Hydro & parking extra', progress > 45],
                  ['Pulling 12 rental comps in this building & FSA', progress > 65],
                  ['Checking listing accuracy · scanning description', progress > 85],
                  ['Generating Scout AI verdict', progress > 95],
                ].map(([txt, on], i) => (
                  <div key={i} className="row gap-12" style={{ fontSize: 13, opacity: on ? 1 : 0.35, transition: 'opacity .2s' }}>
                    <span style={{ color: on ? 'var(--pass)' : 'var(--muted)' }}><Icon name={on ? 'check' : 'dot'} size={13}/></span>
                    <span style={{ color: on ? 'var(--ink)' : 'var(--muted)' }}>{txt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage === 'error' && (
            <div className="row gap-12" style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'color-mix(in oklab, var(--fail) 8%, transparent)',
              border: '1px solid color-mix(in oklab, var(--fail) 35%, transparent)',
              color: 'var(--fail)',
              alignItems: 'flex-start',
            }}>
              <div style={{ marginTop: 2, flexShrink: 0 }}><Icon name="flag" size={16}/></div>
              <div className="col grow" style={{ gap: 4 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Not a usable link</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{errorMsg}</div>
              </div>
              <button onClick={() => { setStage('idle'); setErrorMsg(''); }} className="btn btn-ghost" style={{ flexShrink: 0, padding: '6px 12px', fontSize: 12 }}>Dismiss</button>
            </div>
          )}

          {stage === 'done' && (
            <div className="row gap-16" style={{ padding: 16, borderRadius: 14, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
              <DealScore score={58} size={88} animate={true} label=""/>
              <div className="col grow gap-4" style={{ justifyContent: 'center' }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--caution)' }}>Negotiate first · tenant view</div>
                <div className="serif" style={{ fontSize: 22, lineHeight: 1.2 }}>Asking $2,150/mo · target $1,950–2,000</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                  The "second bedroom" is a glass-door den. You have strong leverage.{' '}
                  <button
                    onClick={() => window.__propscoutSignIn && window.__propscoutSignIn()}
                    className="verdict-link"
                    style={{
                      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                      color: 'var(--accent)', fontWeight: 500, fontSize: 13,
                      textDecoration: 'underline', textUnderlineOffset: 3, textDecorationThickness: '1px',
                    }}>Read full verdict →</button>
                </div>
              </div>
              <button onClick={() => setStage('idle')} className="btn btn-ghost" style={{ flexShrink: 0 }}>Try another</button>
            </div>
          )}
        </div>

        {/* Live report preview — the showcase */}
        <ReportShowcase/>

        {/* Trust strip */}
        <div className="col gap-16" style={{ marginTop: 24 }}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center' }}>
            Built on the data Canadian investors already trust
          </span>
          <div style={{ overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)' }}>
            <div className="marquee-track">
              {[...Array(2)].map((_, k) => (
                <React.Fragment key={k}>
                  {['Realtor.ca', 'Zillow.ca', 'Rentals.ca', 'Kijiji', 'PadMapper', 'CMHC', 'Statistics Canada', 'Bank of Canada', 'EQAO', 'Fraser Institute', 'Walk Score', 'Mapbox', 'NREL · SPA'].map(n => (
                    <span key={n + k} className="serif" style={{ fontSize: 22, color: 'var(--muted)' }}>{n}</span>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function clampStr(min, max) { return `clamp(${min}px, 1.4vw, ${max}px)`; }

// ── The big report showcase under the hero input ─────────────
function ReportShowcase() {
  return (
    <div className="card" style={{
      overflow: 'hidden',
      marginTop: 20,
      background: 'var(--surface)',
      boxShadow: 'var(--shadow-pop)',
    }}>
      {/* Browser-style top */}
      <div className="row" style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--line)',
        gap: 12,
        background: 'var(--bg-elev)',
      }}>
        <div className="row gap-8">
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#E26060' }}/>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#E2B660' }}/>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#7CB36B' }}/>
        </div>
        <div className="row gap-8" style={{
          flex: 1, justifyContent: 'center',
          background: 'var(--surface)', border: '1px solid var(--line)',
          padding: '5px 12px', borderRadius: 8,
          maxWidth: 480,
          fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--muted)',
        }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--pass)' }}/>
          propscout.ca / report / unit-3705-28-charles-toronto
        </div>
        <div className="row gap-8">
          <Chip accent>Sample report · Tenant view</Chip>
        </div>
      </div>

      {/* Inner report content */}
      <div style={{ padding: 'clamp(20px, 2.4vw, 32px)' }}>
        {/* Header: address + tags */}
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div className="col gap-12">
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <Chip accent>For rent</Chip>
              <Chip>Toronto · M4Y</Chip>
              <Chip>1+den · 620 sqft · 37th flr</Chip>
              <Chip>Heat & water included</Chip>
            </div>
            <h3 className="serif" style={{ fontSize: 36, lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              Unit 3705 · 28 Charles Street East
            </h3>
            <div className="row gap-16" style={{ color: 'var(--muted)', fontSize: 14, flexWrap: 'wrap' }}>
              <span><span className="serif tabular" style={{ color: 'var(--ink)' }}>$2,150</span>/mo asking</span>
              <span>·</span>
              <span>1+den · 1 bath</span>
              <span>·</span>
              <span>Parking $150/mo extra</span>
              <span>·</span>
              <span>Available March 1</span>
            </div>
          </div>
          <div className="row gap-12">
            <button className="btn btn-ghost"><Icon name="link" size={14}/> Share link</button>
            <button className="btn btn-primary" onClick={() => window.__propscoutSignIn && window.__propscoutSignIn()}>Save report <Icon name="arrow" size={14}/></button>
          </div>
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 22 }}>

          {/* Left column */}
          <div className="col" style={{ gap: 22 }}>
            {/* AI Verdict — tenant-style */}
            <AIVerdictBlock
              addr="Unit 3705 · 28 Charles St E, Toronto ON"
              headline={
                <>Do not sign at <span style={{ color: 'var(--accent)' }}>$2,150</span>. The room marketed as a second bedroom is a den with a sliding glass door — no privacy, no sound barrier, and almost certainly no exterior window. You are being asked to pay a 2-bedroom premium for a 1-bedroom with a study.</>
              }
              sub={
                <>Your negotiation target is <span className="tabular" style={{ color: 'var(--accent)' }}>$1,950–2,000</span>/mo. There are 14 competing rentals in this building right now and the unit has been listed for 22 days — you have leverage. Before you go back, confirm in writing whether the den has a window and whether parking is included.</>
              }
            />

            {/* Rent positioning — comps */}
            <div className="card col gap-20" style={{ padding: 24 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h4 className="serif" style={{ fontSize: 22, whiteSpace: 'nowrap', paddingRight: 8 }}>Rent positioning</h4>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>14 building comps · 22 nearby · 90d</span>
              </div>
              <MiniMap
                height={200}
                address="Toronto · M4Y · 1km radius"
                pins={[
                  { x: 18, y: 42, n: '$1,950' },
                  { x: 70, y: 24, n: '$2,100' },
                  { x: 34, y: 64, n: '$1,900' },
                  { x: 76, y: 68, n: '$2,250' },
                  { x: 58, y: 78, n: '$2,000' },
                ]}
              />
              <RentalCompsBar low={1800} mid={1950} high={2300} ask={2150}/>
            </div>

            {/* Listing accuracy — replaces the risk block */}
            <div className="card col gap-12" style={{ padding: 24 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h4 className="serif" style={{ fontSize: 22 }}>Listing accuracy</h4>
                <span className="chip" style={{ background: 'color-mix(in oklab, var(--caution) 10%, transparent)', borderColor: 'color-mix(in oklab, var(--caution) 30%, transparent)', color: 'var(--caution)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--caution)' }}/>
                  2 flags · 1 confirmation
                </span>
              </div>
              <RiskRow tone="red"   label="Possible non-bedroom" detail="Description mentions 'sliding glass door' — may not be a private, code-compliant second bedroom"/>
              <RiskRow tone="amber" label="Parking status unclear" detail="Listing reads 'contact manager' — confirm cost and availability before signing"/>
              <RiskRow tone="good"  label="Utilities · confirmed" detail="Heat and water included by landlord · hydro & internet are tenant-paid"/>
            </div>
          </div>

          {/* Right column */}
          <div className="col" style={{ gap: 22 }}>
            {/* Tenant scorecard */}
            <div className="card col" style={{ padding: 24, gap: 16, alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Scout tenant score</span>
              <DealScore score={58} size={196} label="Tenant score / 100"/>
              <div className="divider" style={{ margin: '4px 0' }}/>
              <div className="col gap-8" style={{ width: '100%' }}>
                {[
                  ['Rent vs market', '12 / 25',  0.48],
                  ['Listing honesty', '6 / 20',  0.30],
                  ['Cost transparency', '14 / 20', 0.70],
                  ['Negotiation leverage', '18 / 20', 0.90],
                  ['Building demand', '8 / 15', 0.53],
                ].map(([lbl, val, pct]) => (
                  <div key={lbl} className="col gap-4">
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--ink-2)' }}>{lbl}</span>
                      <span className="mono tabular" style={{ color: 'var(--muted)' }}>{val}</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 999, background: 'var(--line)' }}>
                      <div style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 999, background: pct > 0.6 ? 'var(--pass)' : pct > 0.3 ? 'var(--caution)' : 'var(--fail)' }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Negotiation card */}
            <div className="card col gap-12" style={{ padding: 22 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Negotiation</div>
                <span className="chip" style={{ background: 'color-mix(in oklab, var(--pass) 10%, transparent)', borderColor: 'color-mix(in oklab, var(--pass) 30%, transparent)', color: 'var(--pass)' }}>Strong leverage</span>
              </div>
              <div className="serif tabular" style={{ fontSize: 26, lineHeight: 1.1 }}>
                Target $1,950–2,000<span style={{ color: 'var(--muted)', fontSize: 14 }}>/mo</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Save up to <span className="tabular" style={{ color: 'var(--accent)', fontWeight: 500 }}>$2,400</span> over a 12-month lease.
              </div>
              <div className="divider"/>
              <div className="col gap-6">
                {[
                  ['Competing in building', '14 listings'],
                  ['Days on market', '22 days'],
                  ['Price drops', '1 · −$50 last week'],
                ].map(([k, v]) => (
                  <div key={k} className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>{k}</span>
                    <span className="mono tabular" style={{ color: 'var(--ink)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly cost breakdown */}
            <div className="card col gap-12" style={{ padding: 22 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>True monthly cost</div>
              <div className="col gap-8">
                {[
                  ['Rent · at asking', '$2,150', false],
                  ['Hydro · est.', '$65',   false],
                  ['Internet',        '$70',  false],
                  ['Parking',         '$150', false],
                  ['Total at asking', '$2,435', true],
                  ['Total at target', '$2,235', true, 'pass'],
                ].map(([k, v, bold, tone]) => (
                  <div key={k} className="row" style={{
                    justifyContent: 'space-between',
                    fontSize: bold ? 13 : 12,
                    color: tone === 'pass' ? 'var(--pass)' : 'var(--ink-2)',
                    paddingTop: bold ? 6 : 0,
                    borderTop: bold && k.startsWith('Total at asking') ? '1px solid var(--line)' : 'none',
                  }}>
                    <span style={{ color: bold ? (tone === 'pass' ? 'var(--pass)' : 'var(--ink)') : 'var(--muted)', fontWeight: bold ? 500 : 400 }}>{k}</span>
                    <span className="mono tabular" style={{ fontWeight: bold ? 600 : 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tweakable App ────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [showSignIn, setShowSignIn] = useState_a(false);

  useEffect_a(() => {
    window.__propscoutSignIn = () => setShowSignIn(true);
    return () => { delete window.__propscoutSignIn; };
  }, []);

  useEffect_a(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.setAttribute('data-density', t.density);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  return (
    <div>
      <Nav dark={t.theme === 'dark'} onToggleDark={() => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark')} onSignIn={() => setShowSignIn(true)}/>
      <Hero/>
      <ReportsSection/>
      <CoverageSection/>
      <SunScoutSection/>
      <HowSection/>
      <PricingSection/>
      <FAQSection/>
      <CTASection/>
      <Footer/>

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)}/>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme"/>
        <TweakRadio
          label="Mode"
          value={t.theme}
          options={['light', 'dark']}
          onChange={v => setTweak('theme', v)}
        />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={ACCENT_OPTIONS}
          onChange={v => setTweak('accent', v)}
        />

        <TweakSection label="Layout"/>
        <TweakRadio
          label="Density"
          value={t.density}
          options={['compact', 'regular']}
          onChange={v => setTweak('density', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
