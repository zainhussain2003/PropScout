// personal-report-v2.jsx — Personal Buyer Report page assembly.
// Mirrors PersonalBuyerPage.tsx on the real-analysis path (ReportPage routes
// mode="personal" here): hero (gauge suppressed — pricing & schools pending) →
// provenance line → verdict hero → §01 true cost → §02 FMV (estimated) →
// §03 comparable sales (sample) → §04 schools (pending) → §05 neighbourhood →
// §06 SunScout (live) → §07 risks → §09 checklist → conversion → Footer.
// (§08 comps map is not rendered by the live page — numbering preserved.)

const { useState: useStatePr, useEffect: useEffectPr, useMemo: useMemoPr } = React;

const TWEAK_DEFAULTS_PR = /*EDITMODE-BEGIN*/{
  "theme": "light"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_PR);
  const [showSignIn, setShowSignIn] = useStatePr(false);

  const theme = getInitialTheme(t.theme);
  const [dark, setDark] = useStatePr(theme === 'dark');

  useEffectPr(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffectPr(() => {
    if (!getUrlTheme()) {
      setDark(t.theme === 'dark');
    }
  }, [t.theme]);

  const property = BUTTERMILL_PERSONAL;
  const neighbourhood = BUTTERMILL_PERSONAL_NEIGH;

  const financing = { downPct: property.defaultDownPct, rate: property.defaultRate, amort: property.defaultAmort };
  const monthly = useMemoPr(() => computeMonthlyCost(property, financing), []);

  // Real-analysis path: schools pending (EMPTY → 0 pts), light score from
  // pvlib sun output, flags from listing parse. Gauge suppressed regardless —
  // the breakdown bars stay visible so a red flag reads as a real deduction.
  const EMPTY_SCHOOLS = { elementary: [], middle: [], high: [] };
  const score = useMemoPr(
    () => computeHomeScore(property, EMPTY_SCHOOLS, neighbourhood, BUTTERMILL_SUNSCOUT.sunScore, BUTTERMILL_PERSONAL_FLAGS),
    []
  );

  return (
    <div className="report-page-mobile-padding" style={{ minHeight: '100vh', background: 'var(--bg)' }} data-screen-label="Personal Buyer Report">
      <ReportNav
        dark={dark}
        onToggleDark={() => { setDark(!dark); setTweak('theme', !dark ? 'dark' : 'light'); }}
        onSignIn={() => setShowSignIn(true)}
        reportLabel="Personal buyer report"
        addressSlug="unit-5702-5-buttermill-avenue"
      />

      <main>
        <PersonalPropertyHero
          property={property}
          score={score}
          monthly={monthly}
          scoreSuppressed
        />

        {/* Provenance line — schools pending, sun data live */}
        <div className="container" style={{ marginTop: -24, marginBottom: 8 }}>
          <p className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em' }}>
            School data · pending EQAO/Fraser dataset load
          </p>
        </div>

        <PersonalVerdictHero narrative={BUTTERMILL_PERSONAL_NARRATIVE} />

        <PBTrueCostSection property={property} monthly={monthly} />
        <PBFMVSection property={property} score={score} isEstimated />
        <PBSalesSection comps={PB_SAMPLE_COMPS} isSampleData />
        <PersonalSchoolsSection />
        <PersonalNeighbourhoodSection neigh={neighbourhood} />
        <SunScoutPanel
          sunScout={BUTTERMILL_SUNSCOUT}
          sectionNumber="06"
          token="demo-token"
          question={<React.Fragment>Which rooms will the <em>light</em> reach?</React.Fragment>}
        />
        <PersonalRisksSection flags={BUTTERMILL_PERSONAL_FLAGS} />
        <PersonalChecklistSection />
        <PersonalConversionSection city="Vaughan" />
      </main>

      <Footer />
      <StickyActionBar
        onSave={() => {}}
        onShare={() => { try { navigator.clipboard.writeText(window.location.href); } catch (e) {} }}
        onPDF={() => {}}
      />
      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakRadio
          label="Mode"
          value={dark ? 'dark' : 'light'}
          options={['light', 'dark']}
          onChange={(v) => { setDark(v === 'dark'); setTweak('theme', v); }}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
