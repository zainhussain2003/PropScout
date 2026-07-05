// paywall-states-v2.jsx — free-tier paywall showroom, composed OVER the real
// Batch A report structures (Buttermill · investor). Blurred verdict ¶2, locked
// PDF/Save actions, locked report section, hard monthly-limit gate, feature
// modals. Harbour re-skin: no accent tweak, no raw hex, deal score 8/100.

const { useState: useStatePs } = React;

const TWEAK_DEFAULTS_PS = /*EDITMODE-BEGIN*/{
  "theme": "light"
}/*EDITMODE-END*/;

// Real deal-score gauge from the ONE Buttermill verdict (8/100 · Hard pass)
function ButtermillScoreColumn() {
  const score = toDealScoreData(BUTTERMILL_DEAL_SCORE);
  return (
    <div className="col" style={{ padding: 24, gap: 16, alignItems: 'center' }}>
      <DealScore score={score.displayTotal} max={100} tone={score.tone} size="lg" label="Deal score / 100" showVerdict verdictLabel={score.label} animate={false} />
      <div className="col gap-6" style={{ width: '100%' }}>
        {[
          ['Cap rate', `${score.breakdown.capRate} / 25`, score.breakdown.capRate / 25],
          ['Cash flow', `${score.breakdown.cashFlow} / 25`, score.breakdown.cashFlow / 25],
          ['CoC', `${score.breakdown.cashOnCash} / 20`, score.breakdown.cashOnCash / 20],
          ['DSCR', `${score.breakdown.dscr} / 15`, score.breakdown.dscr / 15],
          ['Demand', `${score.breakdown.demand} / 10`, score.breakdown.demand / 10],
        ].map(([k, v, p]) => (
          <div key={k} className="col gap-4">
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--ink-2)' }}>{k}</span>
              <span className="mono tabular" style={{ color: 'var(--muted)' }}>{v}</span>
            </div>
            <div style={{ height: 3, borderRadius: 999, background: 'var(--line)' }}>
              <div style={{ width: `${p * 100}%`, height: '100%', borderRadius: 999, background: p > 0.6 ? 'var(--pass)' : 'var(--fail)' }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Locked 3D obstruction mock (Phase-2 placeholder viz)
function MockObstructionViz() {
  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="col" style={{ gap: 2 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Building obstruction · 3D</span>
          <h3 className="serif" style={{ fontSize: 22 }}>Real shadow data for dense cores</h3>
        </div>
      </div>
      {/* CAPTURE: Mapbox 3D building tiles + shadow ray-trace render for the unit */}
      <div className="photo-ph" style={{ flex: 1, borderRadius: 'var(--r)', display: 'flex', alignItems: 'flex-end', padding: 14 }}><span>mapbox 3d tiles · shadow ray-trace</span></div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
        <span>Hours lost to obstruction</span>
        <span className="mono tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>118 hr/yr</span>
      </div>
    </div>
  );
}

function ShowroomScene({ onOpenModal }) {
  const light = BUTTERMILL_SUNSCOUT;
  return (
    <section className="container col" style={{ gap: 64, paddingBottom: 96 }}>
      {/* Scenario 01 — truncated verdict (real Buttermill ¶1) */}
      <ScenarioRow label="Scenario 01 · Free-tier verdict">
        <TruncatedVerdict
          firstParagraph={<React.Fragment>The <span style={{ color: 'var(--accent)' }}>$761/mo condo fee</span> ends this deal before it starts — 26% of gross rent, gone before the mortgage.</React.Fragment>}
        />
      </ScenarioRow>

      {/* Scenario 02 — locked actions over a real report head */}
      <ScenarioRow label="Scenario 02 · Locked actions">
        <div className="card" style={{ padding: 28 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
            <div className="col" style={{ gap: 6 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Report actions</span>
              <h3 className="serif" style={{ fontSize: 22 }}>Unit 5702 · 5 Buttermill Avenue</h3>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Hover any locked button below to see the upgrade prompt.</div>
            </div>
            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-ghost"><Icon name="link" size={13} /> Share link</button>
              <LockedButton label="Export PDF" icon="doc" onClick={() => onOpenModal('pdf')} />
              <LockedButton label="Save to portfolio" icon="plus" onClick={() => onOpenModal('portfolio')} />
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
            The lock-icon buttons stay clickable. Tapping one opens a feature-specific upgrade modal (try it). Free users never hit a dead button — they hit a pitch.
          </p>
        </div>
      </ScenarioRow>

      {/* Scenario 03 — locked report section over the real light score */}
      <ScenarioRow label="Scenario 03 · Locked report section">
        <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card col" style={{ padding: 24, gap: 12 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>SunScout · annual light</span>
            <div className="row gap-16" style={{ marginTop: 4, alignItems: 'center' }}>
              <DealScore score={light.sunScore} max={100} tone="pass" size="md" label="" showVerdict={false} animate={false} />
              <div className="col" style={{ gap: 4 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Light score</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{light.annualPeakSunHours.toLocaleString('en-CA')} hours/yr direct sun</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Available on all plans</span>
              </div>
            </div>
          </div>

          <LockedSection
            headline={<React.Fragment>Building obstruction in <em>3D</em></React.Fragment>}
            sub="For Toronto and Vancouver, this can shift the light score by 20+ points."
            ctaLabel="Unlock with Pro"
            mockContent={<MockObstructionViz />}
            height={380}
          />
        </div>
      </ScenarioRow>

      {/* Scenario 04 — hard limit gate */}
      <ScenarioRow label="Scenario 04 · Hard limit gate">
        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 360 }}>
            Triggered when a free user tries to run their 4th analysis in a calendar month. Full-screen — no half-measure. Shows the cycle reset date and the upgrade pitch in one screen.
          </p>
          <button className="btn btn-primary" onClick={() => onOpenModal('hardgate')}>Show the gate <Icon name="arrow" size={13} /></button>
        </div>
      </ScenarioRow>

      {/* Scenario 05 — feature modals */}
      <ScenarioRow label="Scenario 05 · Feature-specific upgrade modals">
        <div className="card" style={{ padding: 28 }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 18, maxWidth: 620 }}>
            Each Pro-only action opens its own modal with a feature-specific headline. Click one — they all share the same shell (same price block, same "What's in Investor Pro" list, same close behaviour) but the headline + sub-copy adapt.
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            {[
              { k: 'pdf', label: 'PDF export' },
              { k: 'portfolio', label: 'Save to portfolio' },
              { k: 'sunscout', label: 'SunScout 3D obstruction' },
              { k: 'verdict', label: 'Full AI verdict' },
              { k: 'generic', label: 'Generic upgrade' },
            ].map((f) => (
              <button key={f.k} onClick={() => onOpenModal('feature:' + f.k)} className="btn btn-ghost" style={{ padding: '10px 14px', fontSize: 13 }}>{f.label} →</button>
            ))}
          </div>
        </div>
      </ScenarioRow>

      <ScenarioRow label="Design notes">
        <DesignNotes
          title="Rules every paywall follows"
          notes={[
            ['Always show the value, never just "upgrade to continue".', 'Users see exactly what they are missing — blurred PDF, truncated verdict, hidden 3D shadows.'],
            ['Feature-specific copy beats generic copy.', 'PDF lock pitches the PDF. Portfolio lock pitches the portfolio. Each headline is tailored.'],
            ['Single price always in view.', '$10/mo · cancel anytime, with annual savings under the price.'],
            ['Soft exit is always present.', 'Every modal has "Not right now"; the hard gate has "Wait it out".'],
            ['Harbour-blue accent only on the upgrade itself.', 'Free users see a calm report; the colour signals the path forward without hijacking the page.'],
          ]}
        />
      </ScenarioRow>
    </section>
  );
}

function App() {
  const [dark, setDark, t, setTweak] = useThemeTweak(TWEAK_DEFAULTS_PS);
  const [modal, setModal] = useStatePs(null);
  const [showHardGate, setShowHardGate] = useStatePs(false);

  const openModal = (k) => {
    if (k === 'hardgate') { setShowHardGate(true); return; }
    if (k.startsWith('feature:')) { setModal(k.slice(8)); return; }
    setModal(k);
  };

  return (
    <div data-screen-label="Paywall States">
      <section className="container" style={{ paddingTop: 56, paddingBottom: 32 }}>
        <ShowroomHeader
          tag="Paywall states · Design preview"
          title={<React.Fragment>What free users see when they hit a <em style={{ color: 'var(--accent)' }}>locked feature</em>.</React.Fragment>}
          sub="Every paywall composes over the real report structures — blurred content plus a single upgrade card with a feature-specific pitch. No 'upgrade to continue' walls; users always see what they're missing."
        />
      </section>

      <ShowroomScene onOpenModal={openModal} />

      <UpgradeModal open={!!modal} onClose={() => setModal(null)} feature={modal} />
      {showHardGate && <HardLimitGate onClose={() => setShowHardGate(false)} used={3} monthlyLimit={3} />}

      <ThemeTweakPanel dark={dark} setDark={setDark} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
