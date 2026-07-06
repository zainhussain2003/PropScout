// tenant-report-v2.jsx — Tenant Report page assembly.
// Mirrors ReportPage.tsx TenantReportContent (the live /r/:token renderer for
// mode="tenant"): dark hero band → AI verdict → §01 Rent positioning →
// §02 Listing flags → §03 Schools nearby → §04 SunScout → share bar →
// analyse-another → StickyActionBar → Footer.

const { useState: useStateTr, useEffect: useEffectTr } = React;

const TWEAK_DEFAULTS_TR = /*EDITMODE-BEGIN*/{
  "theme": "light"
}/*EDITMODE-END*/;

// ── TenantSchoolsSection (tenant/TenantSchoolsSection.tsx) ────────────────────

const TS_BOARD_GLYPH = {
  public: { letter: 'P', color: 'var(--pass)' },
  catholic: { letter: 'C', color: 'var(--accent)' },
  french: { letter: 'F', color: 'var(--caution)' },
};

function TenantSchoolCard({ school }) {
  const glyph = TS_BOARD_GLYPH[school.board];
  const qualityColor = school.quality === 'above' ? 'var(--pass)' : school.quality === 'below' ? 'var(--fail)' : 'var(--ink-2)';
  const qualityLabel = school.quality === 'above' ? 'Above avg' : school.quality === 'below' ? 'Below avg' : 'Average';

  return (
    <div className="card col" style={{ padding: 18, gap: 12, borderColor: school.inCatchment ? 'color-mix(in oklab, var(--accent) 35%, var(--line))' : 'var(--line)', background: school.inCatchment ? 'color-mix(in oklab, var(--accent) 4%, var(--surface))' : 'var(--surface)', position: 'relative' }}>
      {school.inCatchment && (
        <span className="mono" style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', padding: '3px 8px', borderRadius: 999, border: '1px solid color-mix(in oklab, var(--accent) 35%, transparent)', background: 'color-mix(in oklab, var(--accent) 10%, transparent)' }}>
          In catchment
        </span>
      )}

      <div className="row" style={{ gap: 10 }}>
        <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: `color-mix(in oklab, ${glyph.color} 14%, transparent)`, color: glyph.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, fontFamily: "'Geist Mono', monospace" }}>
          {glyph.letter}
        </span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{school.boardLabel}</span>
      </div>

      <div className="col" style={{ gap: 2 }}>
        <div className="serif" style={{ fontSize: 16, lineHeight: 1.2, color: 'var(--ink)' }}>{school.name}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{school.grades}</div>
      </div>

      <div style={{ height: 1, background: 'var(--line)' }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--muted)' }}>{school.distance} · {school.walk}</span>
        <span style={{ color: qualityColor, fontWeight: 500 }}>{qualityLabel}</span>
      </div>
    </div>
  );
}

function TenantSchoolColumn({ label, schools }) {
  if (!schools || schools.length === 0) return null;
  return (
    <div className="col" style={{ gap: 10 }}>
      <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>{label}</span>
      {schools.map((s) => <TenantSchoolCard key={s.name} school={s} />)}
    </div>
  );
}

function TenantSchoolsSection({ schools, sectionNumber = '08' }) {
  const allSchools = [...schools.elementary, ...schools.middle, ...schools.high];
  const totalCards = allSchools.length;
  const inCatchCount = allSchools.filter((s) => s.inCatchment).length;

  // Real data never claims catchment (boundaries not ingested) — honest
  // count-only verdict instead of "0 catchment".
  const verdictLabel = inCatchCount > 0 ? `${inCatchCount} catchment · ${totalCards} total` : `${totalCards} nearby`;

  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead
        n={sectionNumber}
        topic="Schools nearby"
        question={<React.Fragment>What <em>schools</em> will your kids walk to?</React.Fragment>}
        verdict={verdictLabel}
        tone="pass"
      />

      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'flex-start' }}>
        <TenantSchoolColumn label="Elementary" schools={schools.elementary} />
        <TenantSchoolColumn label="Middle" schools={schools.middle} />
        <TenantSchoolColumn label="High school" schools={schools.high} />
      </div>

      <p style={{ marginTop: 22, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        Quality is a tenant-friendly summary — Above / Average / Below — drawn from EQAO and Fraser Institute. Nearest schools by straight-line distance — attendance boundaries are not verified. Boards with no nearby school for a level are skipped.
      </p>
    </section>
  );
}

// ── Page (ReportPage.tsx TenantReportContent) ─────────────────────────────────

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_TR);
  const [showSignIn, setShowSignIn] = useStateTr(false);

  const theme = getInitialTheme(t.theme);
  const [dark, setDark] = useStateTr(theme === 'dark');

  useEffectTr(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffectTr(() => {
    if (!getUrlTheme()) {
      setDark(t.theme === 'dark');
    }
  }, [t.theme]);

  const asking = CHARLES_ASKING;
  const comps = CHARLES_COMPS;
  const redFlags = CHARLES_TENANT_FLAGS.filter((f) => f.severity === 'red');
  const amberFlags = CHARLES_TENANT_FLAGS.filter((f) => f.severity === 'amber');
  const [overrides, setOverrides] = useStateTr(new Set());
  const toggleFlag = (id) => setOverrides((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const narrativeFirst = CHARLES_TENANT_NARRATIVE.split('.')[0];
  const narrativeRest = CHARLES_TENANT_NARRATIVE.split('. ').slice(1).join('. ');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }} className="report-page-mobile-padding" data-screen-label="Tenant Report">
      <ReportNav
        dark={dark}
        onToggleDark={() => { setDark(!dark); setTweak('theme', !dark ? 'dark' : 'light'); }}
        onSignIn={() => setShowSignIn(true)}
        reportLabel="Tenant report"
        addressSlug={CHARLES_SLUG}
      />

      <main>
        {/* Dark hero band */}
        <div style={{ background: 'var(--ink)', padding: '40px 0 32px', marginBottom: 24 }}>
          <div className="container">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div className="col" style={{ gap: 8, flex: 1, minWidth: 200 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'color-mix(in oklab, var(--bg) 50%, transparent)', textTransform: 'uppercase' }}>
                  Tenant report
                </div>
                <h1 className="serif" style={{ fontSize: 28, color: 'var(--bg)', lineHeight: 1.2 }}>{CHARLES_ADDRESS_1}</h1>
                <p style={{ fontSize: 14, color: 'color-mix(in oklab, var(--bg) 60%, transparent)' }}>{CHARLES_ADDRESS_2}</p>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--bg)' }}>{fmtMoney(asking)}/mo</div>
                <div style={{ fontSize: 13, color: 'color-mix(in oklab, var(--bg) 50%, transparent)' }}>Asking rent</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
              {CHARLES_TENANT_CHIPS.map((c) => (
                <span key={c} className="mono" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'color-mix(in oklab, var(--bg) 10%, transparent)', color: 'color-mix(in oklab, var(--bg) 70%, transparent)' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="container" style={{ marginBottom: 32 }}>
          <AIVerdictBlock
            eyebrow="Scout AI · tenant verdict"
            headline={<React.Fragment>{narrativeFirst}.</React.Fragment>}
            sub={<React.Fragment>{narrativeRest}</React.Fragment>}
          />
        </div>

        {/* §01 Rent positioning */}
        <section className="container tr-section" data-section="01">
          <SectionHead
            n="01"
            topic="Rent positioning"
            question={<React.Fragment>Is the rent <em>fair</em>?</React.Fragment>}
            verdict={asking <= comps.mid ? 'At or below market' : 'Above market'}
            tone={asking <= comps.mid ? 'pass' : 'caution'}
          />
          <div className="card" style={{ padding: 28 }}>
            <RentalCompsBar low={comps.low} mid={comps.mid} high={comps.high} ask={asking} />
          </div>
        </section>

        {/* §02 Listing flags */}
        <section className="container tr-section" data-section="02">
          <SectionHead
            n="02"
            topic="Listing flags"
            question={<React.Fragment>Is the listing <em>honest</em>?</React.Fragment>}
            verdict={redFlags.length > 0 ? `${redFlags.length} red · ${amberFlags.length} amber` : `${amberFlags.length} amber`}
            tone={redFlags.length > 0 ? 'fail' : 'caution'}
          />
          <div className="card col" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--r)' }}>
            {CHARLES_TENANT_FLAGS.map((f) => (
              <RiskRow
                key={f.id}
                tone={f.severity}
                label={f.label}
                detail={f.evidence}
                dismissable
                dismissed={overrides.has(f.id)}
                onToggleDismiss={() => toggleFlag(f.id)}
              />
            ))}
          </div>
        </section>

        {/* §03 Schools nearby */}
        <TenantSchoolsSection schools={CHARLES_SCHOOLS} sectionNumber="03" />

        {/* §04 SunScout */}
        <SunScoutPanel sunScout={CHARLES_SUNSCOUT} sectionNumber="04" token="demo-token" />
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
