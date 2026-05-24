// mobile-pass.jsx — iOS + Android frames for the 4 most important MVP screens.

const { useState: useStateMp, useEffect: useEffectMp } = React;

const TWEAK_DEFAULTS_MP = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757",
  "scenario": "landing"
}/*EDITMODE-END*/;
const ACCENT_OPTIONS_MP = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

const SCENARIOS = [
  { id: 'landing',  label: '01 · URL paste',     iosTitle: 'PropScout' },
  { id: 'modal',    label: '02 · Mode modal',    iosTitle: 'PropScout' },
  { id: 'scraping', label: '03 · Scraping',      iosTitle: 'Analyzing' },
  { id: 'report',   label: '04 · Tenant report', iosTitle: 'Report' },
];

// Shared theme tokens for content INSIDE the frames — these mobile screens
// live inside iOS/Android device chrome but render PropScout's own visual
// language. Frames stay light for clarity.
const MOBILE_BG = '#F1ECE2';
const MOBILE_INK = '#0E1320';
const MOBILE_MUTED = '#76716A';
const ACCENT = '#D97757';
const PASS = '#4F7A48';
const CAUTION = '#B98724';

// ══════════════════════════════════════════════════════════════════
//  Mobile screen content (renders inside the device frames)
// ══════════════════════════════════════════════════════════════════

// ── 01 · Landing / URL paste ─────────────────────────────────────
function MobileLanding() {
  return (
    <div style={{ background: MOBILE_BG, minHeight: '100%', padding: '64px 20px 30px' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20 }}>
          Prop<i>Scout</i>
        </span>
        <span style={{ fontSize: 12, color: MOBILE_MUTED }}>Sign in</span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: "'Instrument Serif', serif", fontSize: 36, lineHeight: 1.02,
        letterSpacing: '-0.025em', marginBottom: 16, color: MOBILE_INK,
        padding: 0,
      }}>
        Know what any Canadian listing is <i style={{ color: ACCENT }}>really</i> worth.
      </h1>
      <p style={{ fontSize: 14, color: MOBILE_MUTED, lineHeight: 1.5, marginBottom: 28 }}>
        Paste a listing. Full report in under sixty seconds — comps, costs, risks, and a written verdict.
      </p>

      {/* URL input */}
      <div style={{
        background: '#FBF7EE', border: '1px solid rgba(14,19,32,.1)',
        borderRadius: 14, padding: '14px 14px',
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 14, color: MOBILE_MUTED }}>🔗</span>
        <span style={{
          fontFamily: "'Geist Mono', monospace", fontSize: 11, color: MOBILE_MUTED,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
        }}>
          Paste a listing URL
        </span>
      </div>
      <button style={{
        width: '100%', padding: 14, borderRadius: 14,
        background: MOBILE_INK, color: MOBILE_BG, border: 'none',
        fontSize: 15, fontWeight: 500,
        marginBottom: 24,
        fontFamily: 'inherit',
      }}>Analyze →</button>

      {/* Sample chips */}
      <div style={{ fontSize: 11, color: MOBILE_MUTED, marginBottom: 12, fontFamily: "'Geist Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Try one of ours
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>
        <span style={{ padding: '8px 12px', borderRadius: 999, background: '#FBF7EE', border: '1px solid rgba(14,19,32,.1)', fontSize: 12 }}>Vaughan rental</span>
        <span style={{ padding: '8px 12px', borderRadius: 999, background: '#FBF7EE', border: '1px solid rgba(14,19,32,.1)', fontSize: 12 }}>Hamilton duplex</span>
      </div>

      {/* Trust */}
      <div style={{ borderTop: '1px solid rgba(14,19,32,.1)', paddingTop: 18 }}>
        <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: MOBILE_MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
          Built on data you trust
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontFamily: "'Instrument Serif', serif", fontSize: 14, color: MOBILE_MUTED }}>
          <span>Realtor.ca</span><span>Zillow.ca</span><span>CMHC</span><span>StatsCan</span><span>Mapbox</span>
        </div>
      </div>
    </div>
  );
}

// ── 02 · Mode modal ───────────────────────────────────────────
function MobileModeModal() {
  return (
    <div style={{
      background: MOBILE_BG, minHeight: '100%',
      position: 'relative', padding: '64px 20px 30px',
    }}>
      {/* Blurred backdrop content */}
      <div style={{ filter: 'blur(2px) brightness(0.85)', opacity: 0.5, pointerEvents: 'none' }}>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, lineHeight: 1, color: MOBILE_INK, marginBottom: 16 }}>
          Know what any Canadian listing is really worth.
        </h1>
        <div style={{ background: '#FBF7EE', height: 50, borderRadius: 14, marginBottom: 12 }}/>
        <div style={{ background: MOBILE_INK, height: 50, borderRadius: 14 }}/>
      </div>

      {/* Modal */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 32,
        boxShadow: '0 -16px 32px rgba(14,19,32,.18)',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(14,19,32,.18)', margin: '0 auto 18px' }}/>

        {/* Listing preview */}
        <div style={{
          background: '#FBF7EE', border: '1px solid rgba(14,19,32,.1)',
          borderRadius: 12, padding: 12, marginBottom: 20,
          display: 'flex', gap: 12,
        }}>
          <div className="photo-ph" style={{ width: 56, height: 42, borderRadius: 8, padding: 0 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, letterSpacing: '0.14em', color: PASS, textTransform: 'uppercase', marginBottom: 2 }}>
              ● Listing found · for rent
            </div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 15, lineHeight: 1.1, color: MOBILE_INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Unit 3705 · 28 Charles St E
            </div>
            <div style={{ fontSize: 11, color: MOBILE_MUTED, marginTop: 2 }}>$2,150/mo · 1+den</div>
          </div>
        </div>

        {/* Question */}
        <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: MOBILE_MUTED, marginBottom: 10 }}>
          One quick question
        </div>
        <h2 style={{
          fontFamily: "'Instrument Serif', serif", fontSize: 24, lineHeight: 1.1,
          letterSpacing: '-0.02em', color: MOBILE_INK, marginBottom: 22,
        }}>
          Are you a <i style={{ color: ACCENT }}>tenant</i>, or a landlord pricing it?
        </h2>

        {/* Stacked choice cards (mobile uses stacked, not side-by-side) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            { who: 'Tenant',   title: "I'm evaluating this", icon: '🔑', free: true },
            { who: 'Landlord', title: "I'm pricing my unit",   icon: '🏷️' },
          ].map((c) => (
            <div key={c.who} style={{
              background: '#FBF7EE',
              border: c.free ? `1.5px solid ${ACCENT}` : '1px solid rgba(14,19,32,.12)',
              borderRadius: 14, padding: 14,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: c.free ? ACCENT : 'rgba(14,19,32,.06)',
                color: c.free ? '#fff' : MOBILE_INK,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, letterSpacing: '0.14em', color: c.free ? ACCENT : MOBILE_MUTED, textTransform: 'uppercase', marginBottom: 1 }}>
                  For the {c.who.toLowerCase()}
                </div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 16, color: MOBILE_INK }}>
                  {c.title}
                </div>
              </div>
              {c.free && (
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 8, padding: '3px 6px', borderRadius: 999, color: ACCENT, border: `1px solid ${ACCENT}40`, background: `${ACCENT}10`, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Free
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: MOBILE_MUTED }}>
          + Why are we asking?
        </div>
      </div>
    </div>
  );
}

// ── 03 · Scraping progress ─────────────────────────────────────
function MobileScraping() {
  return (
    <div style={{ background: MOBILE_BG, minHeight: '100%', padding: '64px 20px 24px' }}>
      {/* URL strip */}
      <div style={{
        background: '#FFFFFF', border: '1px solid rgba(14,19,32,.1)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 32,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: ACCENT }} className="live-dot"/>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: MOBILE_MUTED }}>
          Analyzing
        </span>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: MOBILE_INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
          realtor.ca/...28-charles
        </span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: "'Instrument Serif', serif", fontSize: 28, lineHeight: 1.05,
        letterSpacing: '-0.025em', color: MOBILE_INK, marginBottom: 12, textAlign: 'center',
      }}>
        Reading the listing and pulling <i style={{ color: ACCENT }}>14 comps</i>.
      </h1>
      <p style={{ fontSize: 13, color: MOBILE_MUTED, lineHeight: 1.5, marginBottom: 28, textAlign: 'center' }}>
        Most reports finish in under 20 seconds.
      </p>

      {/* Progress */}
      <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: MOBILE_MUTED }}>62%</span>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: MOBILE_MUTED }}>~5s remaining</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'rgba(14,19,32,.1)', overflow: 'hidden', marginBottom: 32 }}>
        <div style={{ width: '62%', height: '100%', background: ACCENT, borderRadius: 999 }}/>
      </div>

      {/* Steps */}
      <div style={{
        background: '#FFFFFF', border: '1px solid rgba(14,19,32,.1)',
        borderRadius: 14, padding: 18,
        marginBottom: 18,
      }}>
        <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: MOBILE_MUTED, marginBottom: 14 }}>
          What we're doing
        </div>
        {[
          ['Fetched listing',                    true],
          ['Read address · 28 Charles St E',     true],
          ['Read asking · $2,150/mo',            true],
          ['Read unit · 1+den · 620 sqft',        true],
          ['Pulling 14 building comps',          'active'],
          ['Scanning description',               false],
          ['Generating AI verdict',              false],
        ].map(([txt, state], i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 12,
            color: state ? MOBILE_INK : MOBILE_MUTED,
          }}>
            {state === true && <span style={{ color: PASS, fontSize: 13 }}>✓</span>}
            {state === 'active' && <span style={{ width: 12, height: 12, borderRadius: 999, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>}
            {state === false && <span style={{ width: 12, height: 12, borderRadius: 999, border: '1.5px solid rgba(14,19,32,.18)' }}/>}
            <span>{txt}</span>
          </div>
        ))}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Live preview card */}
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,19,32,.1)', borderRadius: 14, overflow: 'hidden' }}>
        <div className="photo-ph" style={{ height: 90, padding: 8 }}>
          <span>unit · skyline view</span>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ padding: '3px 7px', borderRadius: 999, background: 'rgba(14,19,32,.04)', fontSize: 10, border: '1px solid rgba(14,19,32,.1)' }}>For rent · M4Y</span>
            <span style={{ padding: '3px 7px', borderRadius: 999, background: 'rgba(14,19,32,.04)', fontSize: 10, border: '1px solid rgba(14,19,32,.1)' }}>$2,150/mo</span>
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: MOBILE_INK, lineHeight: 1.2 }}>
            Unit 3705 · 28 Charles St E
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 04 · Tenant report ────────────────────────────────────────
function MobileTenantReport() {
  return (
    <div style={{ background: MOBILE_BG, minHeight: '100%' }}>
      {/* Sticky-feeling top */}
      <div style={{
        background: 'rgba(241,236,226,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '68px 16px 14px', borderBottom: '1px solid rgba(14,19,32,.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: MOBILE_MUTED, letterSpacing: '0.1em' }}>
          ← Back
        </span>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, color: MOBILE_INK, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Tenant report
        </span>
        <span style={{ fontSize: 14, color: MOBILE_INK }}>⋯</span>
      </div>

      <div style={{ padding: '20px 18px 30px' }}>
        {/* Photo + chips */}
        <div className="photo-ph" style={{ height: 200, borderRadius: 16, marginBottom: 16, padding: 12 }}>
          <span>unit · skyline view</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ padding: '4px 8px', borderRadius: 999, background: 'rgba(14,19,32,.04)', fontSize: 10, border: '1px solid rgba(14,19,32,.1)' }}>For rent</span>
          <span style={{ padding: '4px 8px', borderRadius: 999, background: 'rgba(14,19,32,.04)', fontSize: 10, border: '1px solid rgba(14,19,32,.1)' }}>Toronto · M4Y</span>
          <span style={{ padding: '4px 8px', borderRadius: 999, background: 'rgba(14,19,32,.04)', fontSize: 10, border: '1px solid rgba(14,19,32,.1)' }}>1+den · 620 sqft</span>
        </div>

        <h1 style={{
          fontFamily: "'Instrument Serif', serif", fontSize: 26, lineHeight: 1.1,
          letterSpacing: '-0.025em', color: MOBILE_INK, marginBottom: 6,
        }}>
          Unit 3705 · 28 Charles Street E
        </h1>
        <p style={{ fontSize: 13, color: MOBILE_MUTED, marginBottom: 20 }}>Toronto · M4Y · Bay Corridor</p>

        {/* Score + verdict pill */}
        <div style={{
          background: '#FFFFFF', border: '1px solid rgba(14,19,32,.1)',
          borderRadius: 16, padding: 18, marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 84, height: 84, borderRadius: 999,
            background: `conic-gradient(${CAUTION} 0% 58%, rgba(14,19,32,.1) 58% 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <div style={{ width: 70, height: 70, borderRadius: 999, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, color: MOBILE_INK }}>58</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: CAUTION, marginBottom: 4 }}>
              Negotiate first
            </div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, lineHeight: 1.2, color: MOBILE_INK, marginBottom: 8 }}>
              Priced above market and listing may misrepresent the unit.
            </div>
          </div>
        </div>

        {/* Asking / target */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(14,19,32,.1)', borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: MOBILE_MUTED }}>Asking</span>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, color: MOBILE_INK }}>$2,150<span style={{ fontSize: 12, color: MOBILE_MUTED }}>/mo</span></span>
          </div>
          <div style={{
            background: `${PASS}10`, border: `1px solid ${PASS}40`,
            borderRadius: 10, padding: '10px 12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: PASS }}>Your target</span>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: PASS }}>$1,950–2,000</span>
          </div>
        </div>

        {/* AI verdict card */}
        <div style={{
          background: MOBILE_INK, color: MOBILE_BG, borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'rgba(255,255,255,.55)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: ACCENT }} className="live-dot"/>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Scout AI · verdict</span>
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, lineHeight: 1.25 }}>
            Do not sign at <span style={{ color: ACCENT }}>$2,150</span>. The second bedroom is a glass-door den.
          </div>
          <div style={{ fontSize: 11, color: ACCENT, fontFamily: "'Geist Mono', monospace", marginTop: 12, letterSpacing: '0.05em' }}>
            read full verdict →
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, padding: 12, borderRadius: 12, background: MOBILE_INK, color: MOBILE_BG, border: 'none', fontSize: 13, fontFamily: 'inherit' }}>Save report</button>
          <button style={{ padding: 12, borderRadius: 12, background: 'transparent', color: MOBILE_INK, border: '1px solid rgba(14,19,32,.18)', fontSize: 13, fontFamily: 'inherit' }}>↗ Share</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Scenario renderer
// ══════════════════════════════════════════════════════════════════
function ScenarioContent({ scenario }) {
  if (scenario === 'landing')  return <MobileLanding/>;
  if (scenario === 'modal')    return <MobileModeModal/>;
  if (scenario === 'scraping') return <MobileScraping/>;
  return <MobileTenantReport/>;
}

// ══════════════════════════════════════════════════════════════════
//  App — side-by-side device frames
// ══════════════════════════════════════════════════════════════════
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_MP);

  useEffectMp(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  const scenario = SCENARIOS.find((s) => s.id === t.scenario) || SCENARIOS[0];

  return (
    <div style={{ minHeight: '100vh', padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        {/* Page header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48, maxWidth: 820 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--muted)',
          }}>
            <span style={{ width: 22, height: 1, background: 'var(--ink)', opacity: 0.5 }}/>
            Mobile pass · iOS + Android
          </span>
          <h1 className="serif" style={{ fontSize: 'clamp(36px, 4vw, 60px)', lineHeight: 1, letterSpacing: '-0.035em' }}>
            The funnel on a <em style={{ color: ACCENT }}>phone</em>.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 620, lineHeight: 1.6 }}>
            Side-by-side iOS and Android frames of the four mobile-critical screens. Switch scenario via the Tweaks panel — the same React content renders inside both device frames.
          </p>
        </div>

        {/* Scenario label */}
        <div style={{ marginBottom: 32 }}>
          <span className="scenario-label">{scenario.label}</span>
        </div>

        {/* Side-by-side frames */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 'clamp(28px, 4vw, 64px)',
          alignItems: 'flex-start', justifyItems: 'center',
        }}>
          {/* iOS column */}
          <div className="col" style={{ alignItems: 'center', gap: 16 }}>
            <div style={{
              fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'var(--muted)',
            }}>iOS 26 · iPhone 15 Pro</div>
            <IOSDevice width={380} height={780}>
              <ScenarioContent scenario={scenario.id}/>
            </IOSDevice>
          </div>

          {/* Android column */}
          <div className="col" style={{ alignItems: 'center', gap: 16 }}>
            <div style={{
              fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'var(--muted)',
            }}>Material 3 · Pixel 8</div>
            <AndroidDevice width={390} height={790}>
              <ScenarioContent scenario={scenario.id}/>
            </AndroidDevice>
          </div>
        </div>

        {/* Design notes */}
        <div style={{
          marginTop: 80, padding: 32,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22,
          maxWidth: 920, marginInline: 'auto',
        }}>
          <h3 className="serif" style={{ fontSize: 24, marginBottom: 16 }}>What changes on mobile</h3>
          <div className="col" style={{ gap: 12 }}>
            {[
              ['Modal becomes a bottom-sheet.', 'Mode selection slides up from the bottom on mobile with a drag handle. Choice cards stack vertically; horizontal layout would crush at 380px.'],
              ['Two-column report → single column.', 'The score card moves above the photo gallery on mobile. Score gauge stays prominent but shrinks to 84px.'],
              ['URL input is multi-line capable.', 'Native iOS / Android keyboards take over input; sample chips wrap below.'],
              ['Sticky action bar at the bottom.', 'Save / Share / PDF actions collapse into a sticky bottom bar on report pages so they\'re always reachable with one thumb.'],
              ['AI verdict is shorter, sharper.', 'Mobile shows only the headline punch — full body expands via "read full verdict" tap.'],
            ].map(([h, sub]) => (
              <div key={h} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ color: ACCENT, marginTop: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l5 5L20 6"/>
                  </svg>
                </span>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{h}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Demo"/>
        <TweakRadio label="Scenario" value={t.scenario}
          options={['landing', 'modal', 'scraping', 'report']}
          onChange={(v) => setTweak('scenario', v)}/>

        <TweakSection label="Theme"/>
        <TweakRadio label="Mode" value={t.theme} options={['light', 'dark']} onChange={(v) => setTweak('theme', v)}/>
        <TweakColor label="Accent" value={t.accent} options={ACCENT_OPTIONS_MP} onChange={(v) => setTweak('accent', v)}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
