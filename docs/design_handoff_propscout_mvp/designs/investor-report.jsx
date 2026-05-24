// investor-report.jsx — page assembly. All metrics are derived live from
// (property, financing) state — sliders re-render everything in real time.

const { useState: useStateIr, useEffect: useEffectIr, useMemo: useMemoIr } = React;

const TWEAK_DEFAULTS_IR = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757",
  "dataset": "vaughan"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS_IR = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

// Default financing per spec — 20% down, 4.79%, 25-yr amort.
const DEFAULT_FINANCING = {
  downPct: 0.20,
  rate:    0.0479,
  amort:   25,
  includeManagement: false,
  toronto: false,
  appreciation: 0.03,
  assumedIncome: 125000,
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_IR);
  const [showSignIn, setShowSignIn] = useStateIr(false);
  const [financing, setFinancing] = useStateIr(DEFAULT_FINANCING);

  // Property comes from the dataset toggle in Tweaks.
  const property = PROPERTIES[t.dataset] || PROPERTIES.vaughan;

  // Recompute the whole metrics object whenever property or financing changes.
  const metrics = useMemoIr(() => {
    // pass property.price into financing object so sliders can render dollar values
    const fin = { ...financing, price: property.price };
    return computeMetrics(property, fin);
  }, [property, financing]);

  const score = useMemoIr(() => computeDealScore(metrics, property), [metrics, property]);

  // Sign-in plumbing (verdict links etc.)
  useEffectIr(() => {
    window.__propscoutSignIn = () => setShowSignIn(true);
    return () => { delete window.__propscoutSignIn; };
  }, []);

  // Theme + accent live updates
  useEffectIr(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  // Reset financing whenever the dataset flips
  useEffectIr(() => {
    setFinancing(DEFAULT_FINANCING);
  }, [t.dataset]);

  const slug = property.id === 'vaughan' ? '5702-buttermill-vaughan' : '146-east-19th-hamilton';

  // financing prop needs property.price for slider dollar display
  const financingForSliders = { ...financing, price: property.price };

  return (
    <div>
      <InvestorNav
        dark={t.theme === 'dark'}
        onToggleDark={() => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark')}
        onSignIn={() => setShowSignIn(true)}
        slug={slug}
      />

      {/* HERO + VERDICT */}
      <InvestorPropertyHero property={property} metrics={metrics} score={score}/>
      <InvestorVerdictHero property={property} metrics={metrics} score={score}/>

      {/* §01 Investment metrics */}
      <InvestmentMetricsSection metrics={metrics} property={property}/>

      {/* §02 Financing scenarios — sliders that drive everything */}
      <section className="container tr-section">
        <InvSectionHead
          n="02"
          topic="Financing scenarios"
          question={<>How do the <em>numbers</em> change?</>}
          verdict="Live recalc"
          verdictTone="pass"
        />
        <FinancingSliders financing={financingForSliders} onChange={(f) => setFinancing(f)}/>
      </section>

      {/* §03 Rental comps */}
      <InvestorCompsSection property={property}/>

      {/* §04 Cash to close (LTT + closing) */}
      <CashToCloseSection property={property} metrics={metrics} financing={financing}/>

      {/* §05 OSFI */}
      <OSFISection metrics={metrics} financing={financing}/>

      {/* §06 Risk */}
      <InvestorRiskSection property={property} score={score}/>

      {/* §07 Equity build */}
      <EquitySection metrics={metrics} financing={financing}/>

      {/* §08 Neighbourhood */}
      <NeighbourhoodSection property={property}/>

      {/* §09 SunScout */}
      <InvestorSunScoutSection property={property}/>

      {/* §10 STR placeholder */}
      <STRPlaceholderSection property={property}/>

      {/* §11 Checklist */}
      <InvestorChecklist property={property}/>

      <Footer/>

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)}/>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Demo dataset"/>
        <TweakRadio
          label="Property"
          value={t.dataset}
          options={['vaughan', 'hamilton']}
          onChange={(v) => setTweak('dataset', v)}
        />

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
          options={ACCENT_OPTIONS_IR}
          onChange={(v) => setTweak('accent', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
