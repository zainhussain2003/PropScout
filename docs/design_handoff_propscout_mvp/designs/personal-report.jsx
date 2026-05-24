// personal-report.jsx — page assembly.

const { useState: useStatePr, useEffect: useEffectPr, useMemo: useMemoPr } = React;

const TWEAK_DEFAULTS_PB = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS_PB = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_PB);
  const [showSignIn, setShowSignIn] = useStatePr(false);

  const property = PB_PROPERTY;

  // Financing default (used for true-cost calculation)
  const financing = {
    downPct: property.defaultDownPct,
    rate:    property.defaultRate,
    amort:   property.defaultAmort,
  };

  const monthly = useMemoPr(() => computeMonthlyCost(property, financing), [property]);

  // Light score is computed elsewhere visually; for the score formula we use a static 76 here.
  const score = useMemoPr(() => computeHomeScore(property, PB_SCHOOLS, PB_NEIGHBOURHOOD, property.fmv, 76), [property]);

  useEffectPr(() => {
    window.__propscoutSignIn = () => setShowSignIn(true);
    return () => { delete window.__propscoutSignIn; };
  }, []);

  useEffectPr(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  return (
    <div>
      <PBNav
        dark={t.theme === 'dark'}
        onToggleDark={() => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark')}
        onSignIn={() => setShowSignIn(true)}
        slug="248-mountcrest-burlington"
      />

      <PBPropertyHero property={property} score={score} monthly={monthly}/>
      <PBVerdictHero property={property} score={score} monthly={monthly}/>

      <PBTrueCostSection property={property} monthly={monthly}/>
      <PBFMVSection property={property} score={score}/>
      <PBSalesSection comps={PB_COMPS}/>
      <PBSchoolsSection schools={PB_SCHOOLS}/>
      <PBNeighbourhoodSection neigh={PB_NEIGHBOURHOOD}/>
      <PBSunScoutSection/>
      <PBRisksSection property={property}/>
      <PBMapSection comps={PB_COMPS}/>
      <PBChecklist/>
      <PBConversion/>

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
          options={ACCENT_OPTIONS_PB}
          onChange={(v) => setTweak('accent', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
