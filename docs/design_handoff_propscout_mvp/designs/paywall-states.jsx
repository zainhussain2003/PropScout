// paywall-states.jsx — showroom demo. Each scenario shows the paywall in context.

const { useState: useStatePs, useEffect: useEffectPs } = React;

const TWEAK_DEFAULTS_PS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757",
  "scenario": "showroom"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS_PS = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

// ── Demo header at top of the page ─────────────────────────────
function DemoHeader() {
  return (
    <section className="container" style={{ paddingTop: 56, paddingBottom: 32 }}>
      <div className="col gap-16" style={{ maxWidth: 820 }}>
        <span className="section-tag">Paywall states · Design preview</span>
        <h1 className="serif" style={{ textWrap: 'balance' }}>
          What free users see when they hit a <em style={{ color: 'var(--accent)' }}>locked feature</em>.
        </h1>
        <p style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 620 }}>
          Every paywall in PropScout uses the same visual vocabulary — blurred content + a single upgrade card with a feature-specific pitch. No "upgrade to continue" walls; users always see what they're missing.
        </p>
      </div>
    </section>
  );
}

// ── Mock the "right column" of a deal-score card to lock behind a paywall ─
function MockScoreColumn() {
  return (
    <div className="col" style={{ padding: 24, gap: 16, alignItems: 'center' }}>
      <div style={{
        width: 160, height: 160, borderRadius: 999,
        background: `conic-gradient(var(--accent) 0% 9%, var(--line) 9% 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 134, height: 134, borderRadius: 999,
          background: 'var(--surface)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 4,
        }}>
          <span className="serif tabular" style={{ fontSize: 56, lineHeight: 1 }}>9</span>
          <span className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Deal score</span>
        </div>
      </div>
      <div className="col gap-6" style={{ width: '100%' }}>
        {[
          ['Cap rate',  '2 / 25', 0.08],
          ['Cash flow', '0 / 25', 0.0],
          ['CoC',       '0 / 20', 0.0],
          ['DSCR',      '0 / 15', 0.0],
          ['Demand',    '7 / 10', 0.7],
        ].map(([k, v, p]) => (
          <div key={k} className="col gap-4">
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--ink-2)' }}>{k}</span>
              <span className="mono tabular" style={{ color: 'var(--muted)' }}>{v}</span>
            </div>
            <div style={{ height: 3, borderRadius: 999, background: 'var(--line)' }}>
              <div style={{ width: `${p * 100}%`, height: '100%', borderRadius: 999, background: p > 0.6 ? 'var(--pass)' : 'var(--fail)' }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mock SunScout 3D obstruction visual that gets locked
function MockObstructionViz() {
  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="col" style={{ gap: 2 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Building obstruction · 3D</span>
          <h3 className="serif" style={{ fontSize: 22 }}>Real shadow data for dense cores</h3>
        </div>
      </div>
      <div className="photo-ph" style={{
        flex: 1, borderRadius: 14,
        display: 'flex', alignItems: 'flex-end', padding: 14,
      }}><span>mapbox 3d tiles · shadow ray-trace</span></div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
        <span>Hours lost to obstruction</span>
        <span className="mono tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>118 hr/yr</span>
      </div>
    </div>
  );
}

// ── Showroom scene ─────────────────────────────────────────────
function ShowroomScene({ onOpenModal }) {
  return (
    <section className="container col" style={{ gap: 64, paddingBottom: 96 }}>

      {/* — Scenario 1: Truncated AI verdict — */}
      <div className="col" style={{ gap: 14 }}>
        <span className="scenario-label">Scenario 01 · Free tier verdict</span>
        <TruncatedVerdict
          firstParagraph={<>The <span style={{ color: 'var(--accent)' }}>$761/mo condo fee</span> is what ends this deal before it starts. At $9,132/yr it consumes 26% of the gross rent this unit can realistically earn — before the mortgage, taxes, or insurance are touched.</>}
        />
      </div>

      {/* — Scenario 2: Locked PDF + Save buttons — */}
      <div className="col" style={{ gap: 14 }}>
        <span className="scenario-label">Scenario 02 · Locked actions</span>
        <div className="card" style={{ padding: 28 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
            <div className="col" style={{ gap: 6 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Report actions</span>
              <h3 className="serif" style={{ fontSize: 22 }}>Unit 5702 · 5 Buttermill Avenue</h3>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Hover any locked button below to see the upgrade prompt.</div>
            </div>
            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-ghost"><Icon name="link" size={13}/> Share link</button>
              <LockedButton label="Export PDF" icon="doc" onClick={() => onOpenModal('pdf')}/>
              <LockedButton label="Save to portfolio" icon="plus" onClick={() => onOpenModal('portfolio')}/>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
            The lock-icon buttons stay clickable. Tapping one opens a feature-specific upgrade modal (try it). Free users never hit a dead button — they hit a pitch.
          </p>
        </div>
      </div>

      {/* — Scenario 3: Locked SunScout obstruction — */}
      <div className="col" style={{ gap: 14 }}>
        <span className="scenario-label">Scenario 03 · Locked report section</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card col" style={{ padding: 24, gap: 12 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>SunScout · annual light</span>
            <div className="row gap-16" style={{ marginTop: 4, alignItems: 'center' }}>
              <div style={{
                width: 110, height: 110, borderRadius: 999,
                background: `conic-gradient(var(--pass) 0% 84%, var(--line) 84% 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 90, height: 90, borderRadius: 999, background: 'var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>84</span>
                </div>
              </div>
              <div className="col" style={{ gap: 4 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Light score</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>1,512 hours/yr direct sun</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Available on all plans</span>
              </div>
            </div>
          </div>

          <LockedSection
            headline={<>Building obstruction in <em>3D</em></>}
            sub="For Toronto and Vancouver, this can shift the light score by 20+ points."
            ctaLabel="Unlock with Pro"
            mockContent={<MockObstructionViz/>}
            height={380}
          />
        </div>
      </div>

      {/* — Scenario 4: Hard limit gate inline preview — */}
      <div className="col" style={{ gap: 14 }}>
        <span className="scenario-label">Scenario 04 · Hard limit gate</span>
        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 360 }}>
            Triggered when a free user tries to run their 4th analysis in a calendar month. Full-screen — no half-measure. Shows them the cycle reset date and the upgrade pitch in one screen.
          </p>
          <button className="btn btn-primary" onClick={() => onOpenModal('hardgate')}>
            Show the gate <Icon name="arrow" size={13}/>
          </button>
        </div>
      </div>

      {/* — Scenario 5: Upgrade modals — */}
      <div className="col" style={{ gap: 14 }}>
        <span className="scenario-label">Scenario 05 · Feature-specific upgrade modals</span>
        <div className="card" style={{ padding: 28 }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 18, maxWidth: 620 }}>
            Each Pro-only action opens its own modal with a feature-specific headline. Click one — they all share the same shell (same price block, same "What's in Investor Pro" list, same close behaviour) but the headline + sub-copy adapt.
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            {[
              { k: 'pdf',       label: 'PDF export' },
              { k: 'portfolio', label: 'Save to portfolio' },
              { k: 'sunscout',  label: 'SunScout 3D obstruction' },
              { k: 'verdict',   label: 'Full AI verdict' },
              { k: 'generic',   label: 'Generic upgrade' },
            ].map((f) => (
              <button
                key={f.k}
                onClick={() => onOpenModal('feature:' + f.k)}
                className="btn btn-ghost"
                style={{ padding: '10px 14px', fontSize: 13 }}
              >{f.label} →</button>
            ))}
          </div>
        </div>
      </div>

      {/* — Design notes — */}
      <div className="col" style={{ gap: 14 }}>
        <span className="scenario-label">Design notes</span>
        <div className="card col" style={{ padding: 28, gap: 14 }}>
          <h3 className="serif" style={{ fontSize: 22 }}>Rules every paywall follows</h3>
          <div className="col" style={{ gap: 10 }}>
            {[
              ['Always show the value, never just "upgrade to continue".', 'Users see exactly what they are missing — blurred PDF, truncated verdict, hidden 3D shadows.'],
              ['Feature-specific copy beats generic copy.', 'PDF lock pitches the PDF. Portfolio lock pitches the portfolio. Each headline is tailored.'],
              ['Single price always in view.', '$10/mo · cancel anytime, with annual savings under the price.'],
              ['Soft exit is always present.', 'Every modal has "Not right now"; the hard gate has "Wait it out".'],
              ['Terracotta accent only on the upgrade itself.', 'Free users see a calm report; the colour signals the path forward without hijacking the page.'],
            ].map(([h, sub]) => (
              <div key={h} className="row gap-12" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)', marginTop: 4 }}><Icon name="check" size={14} stroke={2.4}/></span>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{h}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_PS);
  const [modal, setModal] = useStatePs(null);
  const [showHardGate, setShowHardGate] = useStatePs(false);

  useEffectPs(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  const openModal = (k) => {
    if (k === 'hardgate') { setShowHardGate(true); return; }
    if (k.startsWith('feature:')) { setModal(k.slice(8)); return; }
    setModal(k);
  };

  return (
    <div>
      <DemoHeader/>
      <ShowroomScene onOpenModal={openModal}/>

      <UpgradeModal open={!!modal} onClose={() => setModal(null)} feature={modal}/>
      {showHardGate && <HardLimitGate onClose={() => setShowHardGate(false)} used={3} monthlyLimit={3}/>}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme"/>
        <TweakRadio
          label="Mode"
          value={t.theme}
          options={['light', 'dark']}
          onChange={(v) => setTweak('theme', v)}
        />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={ACCENT_OPTIONS_PS}
          onChange={(v) => setTweak('accent', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
