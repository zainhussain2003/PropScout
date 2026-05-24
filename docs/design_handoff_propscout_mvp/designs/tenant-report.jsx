// tenant-report.jsx — page assembly: nav → hero → verdict → 6 sections → checklist → conversion → footer.

const { useState: useStateTr, useEffect: useEffectTr } = React;

const TWEAK_DEFAULTS_TR = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757",
  "density": "regular"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS_TR = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

// The unit we're reporting on
const LISTING = {
  addressLine1: 'Unit 3705 · 28 Charles Street East',
  addressLine2: 'Toronto · M4Y · Bay Corridor',
  asking: 2150,
  beds: '1+den',
  baths: '1',
  sqft: '620',
  floor: '37th floor',
  utilities: 'Heat & water incl.',
  scoreNumber: 58,
  chips: ['For rent', 'Available March 1', 'Pet-friendly', '12-mo lease', 'Furnished optional'],
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_TR);
  const [showSignIn, setShowSignIn] = useStateTr(false);

  useEffectTr(() => {
    window.__propscoutSignIn = () => setShowSignIn(true);
    return () => { delete window.__propscoutSignIn; };
  }, []);

  useEffectTr(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  return (
    <div>
      <ReportNav
        dark={t.theme === 'dark'}
        onToggleDark={() => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark')}
        onSignIn={() => setShowSignIn(true)}
      />

      <PropertyHero listing={LISTING}/>
      <TenantVerdictHero/>

      <RentPositioningSection/>
      <ListingAccuracySection/>
      <ListedVsRealitySection/>
      <NegotiationSection/>
      <CostBreakdownSection/>
      <WhatsIncludedSection/>
      <LocationCommuteSection/>
      <TenantSchoolsSection/>
      <TenantSunScoutSection/>
      <CompsMapSection/>
      <UnitDetailsSection/>
      <ConfirmChecklist/>
      <ConversionBlock/>

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
          options={ACCENT_OPTIONS_TR}
          onChange={(v) => setTweak('accent', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
