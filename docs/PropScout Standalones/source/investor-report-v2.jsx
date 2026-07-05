// investor-report-v2.jsx — Investor Report page assembly.
// Mirrors ReportPage.tsx (the live /r/:token renderer) for mode="investor",
// pro tier: Nav → PropertyHero → AIVerdictBlock → §01 metrics → §03 comps →
// §04 cash to close → §05 OSFI → §06 risk flags → §07 equity → §08 SunScout →
// share bar → analyse-another → StickyActionBar → Footer.
// (§02 is skipped by the live renderer — numbering preserved faithfully.)

const { useState: useStateIr, useEffect: useEffectIr, useMemo: useMemoIr } = React;

const TWEAK_DEFAULTS_IR = /*EDITMODE-BEGIN*/{
  "theme": "light"
}/*EDITMODE-END*/;

// Narrative helpers (ReportPage.tsx buildHeadline / buildSub)
function irBuildHeadline(narrative) {
  const firstSentence = narrative.split('.')[0];
  return <React.Fragment>{firstSentence}.</React.Fragment>;
}
function irBuildSub(narrative) {
  const sentences = narrative.split('. ').filter((s) => s.trim().length > 0);
  return <React.Fragment>{sentences.slice(1).join('. ')}{narrative.endsWith('.') ? '' : '.'}</React.Fragment>;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_IR);
  const [showSignIn, setShowSignIn] = useStateIr(false);

  const theme = getInitialTheme(t.theme);
  const [dark, setDark] = useStateIr(theme === 'dark');

  useEffectIr(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffectIr(() => {
    if (!getUrlTheme()) {
      setDark(t.theme === 'dark');
    }
  }, [t.theme]);

  const listing = BUTTERMILL_LISTING;
  const financing = BUTTERMILL_FINANCING;

  // Calc-engine metrics (canonical) + client-side display enrichment —
  // exactly the live division of labour (enrichMetrics in ReportPage.tsx).
  const metrics = useMemoIr(() => enrichMetrics(BUTTERMILL_METRICS, listing, financing), []);
  const dealScore = useMemoIr(() => toDealScoreData(BUTTERMILL_DEAL_SCORE), []);

  const comps = {
    low: listing.rentLow,
    mid: listing.rentEstimate,
    high: listing.rentHigh,
    compCount: listing.compCount,
    confidence: listing.compConfidence,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }} className="report-page-mobile-padding" data-screen-label="Investor Report">
      <ReportNav
        dark={dark}
        onToggleDark={() => { setDark(!dark); setTweak('theme', !dark ? 'dark' : 'light'); }}
        onSignIn={() => setShowSignIn(true)}
        reportLabel="Investor report"
        addressSlug="unit-5702-5-buttermill-avenue"
      />

      <main>
        <PropertyHero
          listing={listing}
          score={dealScore}
          cashFlowMonthly={metrics.cashFlowMonthly}
          capRate={metrics.capRate}
          dscr={metrics.dscr}
          viewLabel="Investor view"
        />

        <div className="container" style={{ marginBottom: 32 }}>
          <AIVerdictBlock
            eyebrow="Scout AI · investor verdict"
            headline={irBuildHeadline(BUTTERMILL_NARRATIVE)}
            sub={irBuildSub(BUTTERMILL_NARRATIVE)}
          />
        </div>

        <InvestmentMetricsSection metrics={metrics} listing={listing} />
        <RentalCompsSection comps={comps} ask={listing.rentEstimate} />
        <CashToCloseSection metrics={metrics} listing={listing} financing={financing} />
        <OSFISection financing={financing} listing={listing} />
        <RiskFlagsSection listing={listing} />
        <EquitySection metrics={metrics} />
        <SunScoutPanel sunScout={BUTTERMILL_SUNSCOUT} sectionNumber="08" token="demo-token" />
      </main>

      <ReportShareBar />
      <AnalyseAnotherCard />

      <StickyActionBar
        onShare={() => { try { navigator.clipboard.writeText(window.location.href); } catch (e) {} }}
        onPDF={() => {}}
      />
      <Footer />

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
