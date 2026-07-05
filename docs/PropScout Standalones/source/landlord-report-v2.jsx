// landlord-report-v2.jsx — Landlord Report page assembly.
// Section structure follows LandlordPage.tsx (the designed landlord surface):
// hero → verdict → §01 rent positioning (slider) → §02 investment metrics →
// §03 financing scenarios → §04 rental comps → §05 cash to close → §06 OSFI →
// §07 risk flags → §08 equity build → §09 neighbourhood → §10 SunScout →
// §11 STR placeholder → §11 landlord checklist → Footer.
// NOTE (delivery note): ReportPage.tsx routes landlord mode through the
// investor renderer, which degrades on a for-rent listing (no sale price →
// metrics unavailable). LandlordPage.tsx is the codebase's designed landlord
// surface, so it is the reference here — flagged as an interpretation.

const { useState: useStateLr, useEffect: useEffectLr, useMemo: useMemoLr } = React;

const TWEAK_DEFAULTS_LR = /*EDITMODE-BEGIN*/{
  "theme": "light"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_LR);
  const [showSignIn, setShowSignIn] = useStateLr(false);

  const theme = getInitialTheme(t.theme);
  const [dark, setDark] = useStateLr(theme === 'dark');

  useEffectLr(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffectLr(() => {
    if (!getUrlTheme()) {
      setDark(t.theme === 'dark');
    }
  }, [t.theme]);

  const property = CHARLES_LANDLORD;
  const [askingRent, setAskingRent] = useStateLr(property.askingRent);
  const [financing, setFinancing] = useStateLr(CHARLES_LANDLORD_FINANCING);

  // ListingData shape for the shared investor components
  const listing = useMemoLr(() => ({
    ...property,
    isToronto: property.toronto,
    rentEstimate: askingRent,
    yearBuiltKnown: true,
  }), [askingRent]);

  // Stable NOI-level metrics (change only with rent / expense toggles),
  // then financing-dependent metrics + display enrichment — LandlordPage.tsx flow.
  const stable = useMemoLr(
    () => computeLandlordStable(property, askingRent, financing.includeManagementFee),
    [askingRent, financing.includeManagementFee]
  );
  const coreMetrics = useMemoLr(() => computeDemoMetrics(stable, listing, financing), [stable, listing, financing]);
  const metrics = useMemoLr(() => enrichMetrics(coreMetrics, listing, financing), [coreMetrics, listing, financing]);

  // Landlord deal score — spec Section 10 formula; gauge/label/ring from ONE verdict.
  const score = useMemoLr(
    () => computeLandlordDealScore(
      { capRate: metrics.capRate, cashFlowMonthly: metrics.cashFlowMonthly, cashOnCashReturn: metrics.cashOnCashReturn, dscr: metrics.dscr },
      { market: property.market, riskFlags: property.riskFlags }
    ),
    [metrics]
  );

  const positioning = useMemoLr(() => computeRentPositioning(askingRent, CHARLES_RENT_COMPS), [askingRent]);

  const redFlags = property.riskFlags.filter((f) => f.tone === 'red');
  const amberFlags = property.riskFlags.filter((f) => f.tone === 'amber');
  const riskVerdictLabel =
    redFlags.length > 0
      ? `${redFlags.length} red · ${amberFlags.length} amber`
      : amberFlags.length > 0
        ? `${amberFlags.length} amber flag${amberFlags.length > 1 ? 's' : ''}`
        : 'No red flags';
  const riskVerdictTone = redFlags.length > 1 ? 'fail' : redFlags.length === 1 ? 'caution' : 'pass';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }} className="report-page-mobile-padding" data-screen-label="Landlord Report">
      <ReportNav
        dark={dark}
        onToggleDark={() => { setDark(!dark); setTweak('theme', !dark ? 'dark' : 'light'); }}
        onSignIn={() => setShowSignIn(true)}
        reportLabel="Landlord report"
        addressSlug={CHARLES_SLUG}
      />

      <main>
        <LandlordPropertyHero
          property={property}
          askingRent={askingRent}
          metrics={metrics}
          score={score}
          positioning={positioning}
        />

        <LandlordVerdictHero
          property={property}
          askingRent={askingRent}
          positioning={positioning}
          metrics={metrics}
          comps={CHARLES_RENT_COMPS}
        />

        {/* §01 Rent positioning */}
        <LandlordRentPositioningSection
          property={property}
          askingRent={askingRent}
          onRentChange={setAskingRent}
          positioning={positioning}
          comps={CHARLES_RENT_COMPS}
        />

        {/* §02 Investment metrics — LandlordPage.tsx numbers this §02; the shared
            component hardcodes §01 in the codebase (a numbering bug there —
            flagged as a PROPOSAL in the delivery note) */}
        <InvestmentMetricsSection metrics={metrics} listing={listing} n="02" />

        {/* §03 Financing scenarios */}
        <section className="container tr-section" data-section="03">
          <SectionHead
            n="03"
            topic="Financing scenarios"
            question={<React.Fragment>What if you <em>refinanced</em>?</React.Fragment>}
            verdict="Live recalc"
            tone="pass"
          />
          <FinancingSliders financing={financing} price={property.price} onChange={(f) => setFinancing(f)} />
        </section>

        {/* §04 Rental comps */}
        <section className="container tr-section" data-section="04">
          <SectionHead
            n="04"
            topic="Rental comps"
            question={<React.Fragment>What will tenants <em>actually</em> pay?</React.Fragment>}
            verdict={`${property.compCount} comps · ${property.compConfidence} confidence`}
            tone="pass"
          />
          <div className="card" style={{ padding: 28 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Market rent range · {property.compCount} comparable rentals
              </span>
              <span className="mono" style={{ fontSize: 11, color: property.compConfidence === 'high' ? 'var(--pass)' : property.compConfidence === 'medium' ? 'var(--caution)' : 'var(--fail)' }}>
                {property.compConfidence.charAt(0).toUpperCase() + property.compConfidence.slice(1)} confidence
              </span>
            </div>
            <RentalCompsBar low={property.rentLow} mid={CHARLES_RENT_COMPS.buildingP50} high={property.rentHigh} ask={askingRent} />
          </div>
        </section>

        {/* §05 Cash to close */}
        <section className="container tr-section" data-section="05">
          <SectionHead
            n="05"
            topic="Cash to close"
            question={<React.Fragment>What did you need to <em>bring</em>?</React.Fragment>}
            verdict={fmtMoney(metrics.downPayment + metrics.lttProvincial + metrics.lttMunicipal + metrics.closingCostsTotal)}
            tone="pass"
          />
          <LTTTable ltt={metrics.ltt} price={property.price} toronto={financing.isToronto} />
        </section>

        {/* §06 OSFI stress test */}
        <section className="container tr-section" data-section="06">
          <SectionHead
            n="06"
            topic="OSFI stress test"
            question={<React.Fragment>Can you still <em>qualify</em>?</React.Fragment>}
            verdict={metrics.osfi.pass ? 'Pass' : 'Fail'}
            tone={metrics.osfi.pass ? 'pass' : 'fail'}
          />
          <OSFICard osfi={metrics.osfi} financing={financing} income={financing.assumedIncome} />
        </section>

        {/* §07 Risk flags */}
        <section className="container tr-section" data-section="07">
          <SectionHead
            n="07"
            topic="Risk flags"
            question={<React.Fragment>What could go <em>wrong</em>?</React.Fragment>}
            verdict={riskVerdictLabel}
            tone={riskVerdictTone}
          />
          <div className="col gap-12">
            {property.riskFlags.map((f) => (
              <RiskRow key={f.id} tone={f.tone === 'red' ? 'red' : 'amber'} label={f.label} detail={f.detail} />
            ))}
          </div>
        </section>

        {/* §08 Equity build */}
        <section className="container tr-section" data-section="08">
          <SectionHead
            n="08"
            topic="Equity build"
            question={<React.Fragment>How does your wealth <em>compound</em>?</React.Fragment>}
            verdict={`${fmtPct(metrics.equityCurve[20] ? metrics.equityCurve[20].cashOnCash : 0)} CoC at year 20`}
            tone="pass"
          />
          <EquityChart equityCurve={metrics.equityCurve} totalCashInvested={metrics.totalCashInvested} />
        </section>

        {/* §09 Neighbourhood */}
        <NeighbourhoodSection neighbourhood={CHARLES_LANDLORD_NEIGH} sectionNumber="09" />

        {/* §10 SunScout — same unit, same data as the tenant surface */}
        <SunScoutPanel sunScout={CHARLES_SUNSCOUT} sectionNumber="10" token="demo-token" />

        {/* §11 STR placeholder — Phase 2; legality check is live */}
        <STRPlaceholderSection cityName="Toronto" sectionNumber="11" />

        {/* §12 Landlord checklist */}
        <LandlordChecklistSection />
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
