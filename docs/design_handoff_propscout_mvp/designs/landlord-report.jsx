// landlord-report.jsx — page assembly. Lifts asking-rent into state so the slider drives every metric.

const { useState: useStateLr, useEffect: useEffectLr, useMemo: useMemoLr } = React;

const TWEAK_DEFAULTS_LR = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS_LR = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

// Landlord's owned-financing — used as the default for slider panel
const LL_DEFAULT_FINANCING = {
  downPct: 0.30,                  // implied: paid down enough to leave $478k balance
  rate:    0.0349,                // their locked-in rate from 2019
  amort:   20,                    // years left
  includeManagement: false,
  toronto: true,                  // Toronto LTT applies
  appreciation: 0.03,
  assumedIncome: 165000,
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_LR);
  const [showSignIn, setShowSignIn] = useStateLr(false);
  const [askingRent, setAskingRent] = useStateLr(LL_PROPERTY.askingRent);
  const [financing, setFinancing] = useStateLr(LL_DEFAULT_FINANCING);

  // Build the effective property — askingRent is the variable
  const property = useMemoLr(() => ({
    ...LL_PROPERTY,
    rentEstimate: askingRent,
  }), [askingRent]);

  const metrics = useMemoLr(() => {
    const fin = { ...financing, price: property.price };
    return computeMetrics(property, fin);
  }, [property, financing]);

  const score = useMemoLr(() => computeDealScore(metrics, property), [metrics, property]);
  const positioning = useMemoLr(() => computeRentPositioning(askingRent, LL_RENT_COMPS), [askingRent]);

  useEffectLr(() => {
    window.__propscoutSignIn = () => setShowSignIn(true);
    return () => { delete window.__propscoutSignIn; };
  }, []);

  useEffectLr(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  const financingForSliders = { ...financing, price: property.price };

  return (
    <div>
      <LandlordNav
        dark={t.theme === 'dark'}
        onToggleDark={() => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark')}
        onSignIn={() => setShowSignIn(true)}
        slug="3208-harbour-st-toronto"
      />

      <LandlordPropertyHero property={property} askingRent={askingRent} metrics={metrics} score={score} positioning={positioning}/>
      <LandlordVerdictHero  property={property} askingRent={askingRent} positioning={positioning} metrics={metrics}/>

      <LandlordRentPositioningSection
        property={property}
        askingRent={askingRent}
        onRentChange={setAskingRent}
        positioning={positioning}
        comps={LL_RENT_COMPS}
      />

      {/* Reused investor sections — they're framework-agnostic */}
      <InvestmentMetricsSection metrics={metrics} property={property}/>

      <section className="container tr-section">
        <InvSectionHead
          n="03"
          topic="Financing scenarios"
          question={<>What if you <em>refinanced</em>?</>}
          verdict="Live recalc"
          verdictTone="pass"
        />
        <FinancingSliders financing={financingForSliders} onChange={(f) => setFinancing(f)}/>
      </section>

      <InvestorCompsSection property={property}/>
      <OSFISection metrics={metrics} financing={financing}/>
      <InvestorRiskSection property={property} score={score}/>
      <EquitySection metrics={metrics} financing={financing}/>
      <NeighbourhoodSection property={{ ...property, id: 'vaughan' }}/>{/* uses neighbourhood data keyed by id */}
      <InvestorSunScoutSection property={{ ...property, id: 'vaughan' }}/>
      <STRPlaceholderSection property={{ ...property, id: 'vaughan' }}/>
      <InvestorChecklist property={{ ...property, id: 'vaughan' }}/>

      <Footer/>

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)}/>

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
          options={ACCENT_OPTIONS_LR}
          onChange={(v) => setTweak('accent', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
