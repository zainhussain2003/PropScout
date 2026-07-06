// rp-chrome.jsx — report page chrome shared by all four surfaces:
// ReportNav (Nav variant="report"), AIVerdictBlock, SunScoutPanel, MiniMap,
// StickyActionBar, ShareBar + AnalyseAnother cards (ReportPage.tsx footer cards),
// and the theme bootstrap helper. Loads after rp-core.jsx.

const { useState: useStateCh, useEffect: useEffectCh } = React;

// ── Theme bootstrap — ?theme=dark|light or #theme=dark|light wins (review
// harness / standalone export), else tweak ─────
function getUrlTheme() {
  const p = new URLSearchParams(window.location.search).get('theme');
  if (p === 'dark' || p === 'light') return p;
  const h = new URLSearchParams((window.location.hash || '').replace(/^#/, '')).get('theme');
  if (h === 'dark' || h === 'light') return h;
  return null;
}

function getInitialTheme(tweakTheme) {
  return getUrlTheme() || tweakTheme || 'light';
}

// ── ReportNav (shared/Nav.tsx variant="report") ───────────────────────────────
// Wordmark + breadcrumb (report label / address slug with copy feedback) +
// theme toggle + Share link + Sign in + Save to account (pro).

function ReportNav({ dark, onToggleDark, onSignIn, reportLabel, addressSlug }) {
  const [slugCopied, setSlugCopied] = useStateCh(false);

  function handleSlugClick() {
    try { navigator.clipboard.writeText(window.location.href).catch(() => {}); } catch (e) { /* non-HTTPS */ }
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 2000);
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'saturate(180%) blur(14px)', WebkitBackdropFilter: 'saturate(180%) blur(14px)',
      background: 'color-mix(in oklab, var(--bg) 84%, transparent)',
      borderBottom: '1px solid var(--line)',
    }}>
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between', gap: 12 }}>
        <div className="row gap-16" style={{ minWidth: 0 }}>
          <Wordmark height={22} />
          <div className="row gap-8 rn-crumb" style={{ color: 'var(--muted)', fontSize: 13 }}>
            <span style={{ opacity: 0.55 }}>/</span>
            <span>{reportLabel}</span>
            <span style={{ opacity: 0.55 }}>/</span>
            <span
              onClick={handleSlugClick}
              aria-label="Copy share link"
              style={{ color: slugCopied ? 'var(--accent)' : 'var(--ink)', fontFamily: "'Geist Mono', monospace", fontSize: 12, cursor: 'pointer', transition: 'color 0.15s ease', userSelect: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {slugCopied ? 'Link copied!' : addressSlug}
            </span>
          </div>
        </div>

        <div className="row gap-12">
          <button className="btn btn-ghost" onClick={onToggleDark} aria-label={dark ? 'Toggle light mode' : 'Toggle dark mode'} style={{ padding: '10px 12px' }}>
            <Icon name={dark ? 'sun' : 'moon'} size={15} />
          </button>
          <button className="btn btn-ghost rn-actions-wide" style={{ padding: '10px 14px' }}>
            <Icon name="link" size={13} /> Share link
          </button>
          <button className="btn btn-ghost rn-actions-wide" onClick={onSignIn} style={{ padding: '10px 14px' }}>
            Sign in
          </button>
          {/* Pro tier — Save is unlocked (free-tier LockedButton lives in Paywall States) */}
          <button className="btn btn-primary rn-actions-wide" onClick={onSignIn}>
            Save to account <Icon name="arrow" size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}

// ── AIVerdictBlock (analysis/AIVerdictBlock.tsx) ──────────────────────────────

function AIVerdictBlock({ eyebrow, headline, sub, compact = false }) {
  const [expanded, setExpanded] = useStateCh(false);
  const [isMobile, setIsMobile] = useStateCh(window.innerWidth <= 480);

  useEffectCh(() => {
    const handler = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 'var(--r-lg)', padding: compact ? 'clamp(24px, 3vw, 36px)' : 'clamp(36px, 4vw, 56px)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -80, top: -40, opacity: 0.06, color: 'var(--accent)', pointerEvents: 'none' }} aria-hidden="true">
        <ScoutMark size={520} color="var(--accent)" />
      </div>

      <div className="row" style={{ color: 'color-mix(in oklab, var(--bg) 55%, transparent)', marginBottom: 20, position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: 8 }}>
        <span className="live-dot" style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)', flexShrink: 0 }} aria-hidden="true"></span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{eyebrow}</span>
        <span style={{ flex: 1 }}></span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'color-mix(in oklab, var(--bg) 40%, transparent)' }}>claude · sonnet 4.6</span>
      </div>

      <div className="serif" style={{ fontSize: compact ? 'clamp(20px, 2.4vw, 30px)' : 'clamp(26px, 3.4vw, 42px)', lineHeight: 1.1, letterSpacing: '-0.025em', color: 'var(--bg)', textWrap: 'balance', maxWidth: 920, position: 'relative', zIndex: 1 }}>
        {headline}
      </div>

      {(!isMobile || expanded) && (
        <div className="serif" style={{ fontSize: compact ? 'clamp(14px, 1.4vw, 18px)' : 'clamp(17px, 1.7vw, 21px)', lineHeight: 1.5, color: 'color-mix(in oklab, var(--bg) 78%, transparent)', marginTop: 22, maxWidth: 880, position: 'relative', zIndex: 1 }}>
          {sub}
        </div>
      )}

      {isMobile && (
        <button onClick={() => setExpanded(!expanded)} style={{ marginTop: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: 0, position: 'relative', zIndex: 1 }}>
          {expanded ? 'Show less' : 'Read full verdict →'}
        </button>
      )}
    </div>
  );
}

// ── SunScoutPanel (sunscout/SunScoutPanel.tsx) ────────────────────────────────

const SUN_MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const SUN_SUMMER = new Set([5, 6, 7]);
const SUN_FACADES = [
  { label: 'North', bearing: 0 }, { label: 'North-east', bearing: 45 },
  { label: 'East', bearing: 90 }, { label: 'South-east', bearing: 135 },
  { label: 'South', bearing: 180 }, { label: 'South-west', bearing: 225 },
  { label: 'West', bearing: 270 }, { label: 'North-west', bearing: 315 },
];

function sunVerdictLabel(v) {
  return { excellent: 'Excellent', good: 'Good', average: 'Average', below_average: 'Below average', poor: 'Poor' }[v];
}
function sunVerdictTone(v) {
  if (v === 'excellent' || v === 'good') return 'pass';
  if (v === 'below_average' || v === 'poor') return 'fail';
  return 'caution';
}

function SunScoutPlaceholder({ sectionNumber, question }) {
  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead n={sectionNumber} topic="SunScout" question={question} verdict="Modeling · Phase 2" tone="caution" />
      <div className="card col" style={{ padding: 40, gap: 20, alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: 'color-mix(in oklab, var(--caution) 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="sun" size={28} />
        </div>
        <div className="col" style={{ gap: 8, maxWidth: 560, alignItems: 'center' }}>
          <Chip>Coming Phase 2</Chip>
          <h4 className="serif" style={{ fontSize: 24 }}>Solar path analysis — shipping Q3 2026.</h4>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            SunScout uses NASA NREL sun-path data to show peak sun hours by season and window orientation. Available once address geocoding is confirmed for this property.
          </p>
        </div>
      </div>
    </section>
  );
}

const SUN_DEFAULT_QUESTION = <React.Fragment>How <em>well-lit</em> is the unit?</React.Fragment>;

function SunScoutPanel({ sunScout, sectionNumber = '09', token, question = SUN_DEFAULT_QUESTION }) {
  const [bearing, setBearing] = useStateCh(180);

  if (!sunScout) return <SunScoutPlaceholder sectionNumber={sectionNumber} question={question} />;
  const max = Math.max(...sunScout.monthlyHours, 1);

  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead
        n={sectionNumber}
        topic="SunScout"
        question={question}
        verdict={`${sunVerdictLabel(sunScout.verdict)} · ${sunScout.sunScore.toFixed(0)}/100`}
        tone={sunVerdictTone(sunScout.verdict)}
      />

      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
        <div className="card col" style={{ padding: 28, alignItems: 'center', textAlign: 'center', gap: 16 }}>
          <DealScore score={sunScout.sunScore} max={100} size="lg" label="" showVerdict={false} />
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Light score / 100</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
            {sunScout.summerDailyHours.toFixed(1)}h/day summer · {sunScout.winterDailyHours.toFixed(1)}h/day winter
          </div>

          {token ? (
            <label className="col" style={{ gap: 6, width: '100%', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Primary facade faces</span>
              <select
                value={String(bearing)}
                onChange={(e) => setBearing(Number(e.target.value))}
                style={{ font: "500 13px/1.2 'Geist', sans-serif", padding: '8px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}
              >
                {SUN_FACADES.map((o) => (
                  <option key={o.bearing} value={String(o.bearing)}>{o.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>Assumes south-facing primary facade</div>
          )}
        </div>

        <div className="card col" style={{ padding: 28, gap: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Hours of direct sun · monthly</div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>NREL SPA · pvlib</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
            {sunScout.monthlyHours.map((h, i) => (
              <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <span className="mono tabular" style={{ fontSize: 9, color: 'var(--muted)', lineHeight: 1 }}>{Math.round(h)}</span>
                <div style={{ width: '100%', height: `${(h / max) * 72}px`, minHeight: 2, background: SUN_SUMMER.has(i) ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 35%, transparent)', borderRadius: 3 }}></div>
                <span className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>{SUN_MONTH_LABELS[i]}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            {sunScout.annualPeakSunHours.toFixed(0)} estimated annual peak sun hours (primary window). Bright units rent 8–14% faster than comparable dim units.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── StickyActionBar (shared/StickyActionBar.tsx — mobile only) ────────────────

function StickyActionBar({ onSave, onShare, onPDF }) {
  const [isMobile, setIsMobile] = useStateCh(window.innerWidth <= 480);

  useEffectCh(() => {
    const handler = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (!isMobile) return null;

  const btnStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    fontSize: 10, fontFamily: "'Geist Mono', monospace", letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--ink-2)', background: 'transparent',
    border: 'none', cursor: 'pointer', padding: '8px 16px',
  };

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-around', background: 'var(--bg)', borderTop: '1px solid var(--line)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <button style={btnStyle} onClick={() => onSave && onSave()}><Icon name="bookmark" size={16} /> Save</button>
      <button style={btnStyle} onClick={() => onShare && onShare()}><Icon name="share" size={16} /> Share</button>
      <button style={btnStyle} onClick={() => onPDF && onPDF()}><Icon name="doc" size={16} /> PDF</button>
    </div>
  );
}

// ── Share bar + Analyse another (ReportPage.tsx footer cards) ─────────────────

function ReportShareBar() {
  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 16 }}>
      <div className="card row" style={{ padding: '16px 20px', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Share this report · expires in 30 days</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => { try { navigator.clipboard.writeText(window.location.href); } catch (e) {} }}>
            <Icon name="share" size={14} /> Copy link
          </button>
          {/* Pro tier — PDF export unlocked (locked variant lives in Paywall States) */}
          <button className="btn btn-ghost" style={{ fontSize: 13 }}>
            <Icon name="doc" size={14} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyseAnotherCard() {
  return (
    <div className="container" style={{ paddingBottom: 48 }}>
      <div className="card col" style={{ padding: 32, alignItems: 'center', textAlign: 'center', gap: 16 }}>
        <h3 className="serif" style={{ fontSize: 22 }}>Analyse another property</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 360 }}>
          Paste any Realtor.ca listing URL to get a full investment analysis in seconds.
        </p>
        <button className="btn btn-primary">Go to home <Icon name="arrow" size={13} /></button>
      </div>
    </div>
  );
}

// ── MiniMap — SVG map mock standing in for the Mapbox tile ────────────────────
// (Live app renders Mapbox GL when coordinates exist; the design surface keeps
// the approved SVG mock from the landing review era.)

function MiniMap({ height = 240, address, pins: customPins }) {
  const buildings = [
    [44, 30, 18, 14], [66, 30, 16, 14], [86, 30, 22, 14], [112, 30, 14, 14], [130, 30, 24, 14],
    [44, 50, 14, 18], [62, 50, 22, 18], [88, 50, 18, 18], [110, 50, 16, 18], [130, 50, 24, 18],
    [180, 22, 18, 12], [202, 22, 14, 12], [220, 22, 22, 12], [246, 22, 16, 12], [266, 22, 20, 12],
    [180, 40, 22, 16], [206, 40, 18, 16], [228, 40, 22, 16], [254, 40, 18, 16], [276, 40, 10, 16],
    [296, 30, 18, 14], [318, 30, 16, 14], [338, 30, 24, 14], [366, 30, 14, 14],
    [296, 50, 18, 18], [318, 50, 22, 18], [344, 50, 16, 18], [364, 50, 18, 18],
    [44, 96, 22, 16], [70, 96, 18, 16], [92, 96, 22, 16], [118, 96, 14, 16], [136, 96, 22, 16],
    [44, 116, 18, 20], [66, 116, 22, 20], [92, 116, 16, 20], [112, 116, 22, 20], [138, 116, 20, 20],
    [310, 96, 22, 14], [336, 96, 18, 14], [358, 96, 16, 14],
    [310, 114, 18, 22], [332, 114, 22, 22], [358, 114, 16, 22],
    [44, 164, 16, 14], [64, 164, 22, 14], [90, 164, 18, 14], [112, 164, 22, 14], [138, 164, 16, 14],
    [44, 182, 22, 18], [70, 182, 18, 18], [92, 182, 22, 18], [118, 182, 16, 18], [138, 182, 20, 18],
    [296, 162, 22, 16], [322, 162, 18, 16], [344, 162, 22, 16],
    [296, 184, 18, 18], [318, 184, 22, 18], [344, 184, 22, 18]];

  const pins = customPins || [
    { x: 14, y: 40, n: '$2,850' },
    { x: 72, y: 22, n: '$3,050' },
    { x: 36, y: 64, n: '$2,750' },
    { x: 75, y: 68, n: '$3,200' },
    { x: 58, y: 78, n: '$2,900' }];

  const mapBtnStyle = {
    width: 26, height: 26, border: 'none', background: 'var(--surface)',
    color: 'var(--ink)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{ position: 'relative', height, borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <svg width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="mapWash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--accent) 5%, var(--bg-elev))" />
            <stop offset="100%" stopColor="var(--bg-elev)" />
          </linearGradient>
          <pattern id="micro" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="transparent" />
            <circle cx="0.5" cy="0.5" r="0.4" fill="currentColor" opacity="0.05" />
          </pattern>
        </defs>

        <rect width="400" height="240" fill="url(#mapWash)" />
        <rect width="400" height="240" fill="url(#micro)" style={{ color: 'var(--ink)' }} />

        <path d="M 280 -20 Q 320 30 380 50 L 410 60 L 410 -10 Z" fill="color-mix(in oklab, var(--accent) 14%, var(--bg-elev))" opacity="0.45" />
        <path d="M 280 -20 Q 320 30 380 50" fill="none" stroke="color-mix(in oklab, var(--accent) 25%, transparent)" strokeWidth="0.6" />

        <rect x="170" y="78" width="118" height="68" rx="3" fill="color-mix(in oklab, var(--pass) 20%, transparent)" stroke="color-mix(in oklab, var(--pass) 25%, transparent)" strokeWidth="0.5" />
        <rect x="172" y="80" width="114" height="64" rx="2" fill="none" stroke="color-mix(in oklab, var(--pass) 18%, transparent)" strokeWidth="0.5" strokeDasharray="2 3" />

        <g style={{ color: 'var(--line-strong)' }}>
          <line x1="-10" y1="84" x2="410" y2="80" stroke="currentColor" strokeWidth="9" opacity="0.45" />
          <line x1="-10" y1="84" x2="410" y2="80" stroke="var(--bg-elev)" strokeWidth="7" />
          <line x1="-10" y1="84" x2="410" y2="80" stroke="var(--bg)" strokeWidth="5" opacity="0.85" />
          <line x1="-10" y1="84" x2="410" y2="80" stroke="color-mix(in oklab, var(--accent) 40%, transparent)" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.7" />

          <line x1="-10" y1="152" x2="410" y2="155" stroke="currentColor" strokeWidth="9" opacity="0.45" />
          <line x1="-10" y1="152" x2="410" y2="155" stroke="var(--bg-elev)" strokeWidth="7" />
          <line x1="-10" y1="152" x2="410" y2="155" stroke="var(--bg)" strokeWidth="5" opacity="0.85" />
          <line x1="-10" y1="152" x2="410" y2="155" stroke="color-mix(in oklab, var(--accent) 40%, transparent)" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.7" />

          <line x1="168" y1="-10" x2="170" y2="250" stroke="currentColor" strokeWidth="9" opacity="0.45" />
          <line x1="168" y1="-10" x2="170" y2="250" stroke="var(--bg-elev)" strokeWidth="7" />
          <line x1="168" y1="-10" x2="170" y2="250" stroke="var(--bg)" strokeWidth="5" opacity="0.85" />

          <line x1="290" y1="-10" x2="288" y2="250" stroke="currentColor" strokeWidth="9" opacity="0.45" />
          <line x1="290" y1="-10" x2="288" y2="250" stroke="var(--bg-elev)" strokeWidth="7" />
          <line x1="290" y1="-10" x2="288" y2="250" stroke="var(--bg)" strokeWidth="5" opacity="0.85" />
        </g>

        <g stroke="var(--line)" strokeWidth="2" opacity="0.7">
          <line x1="-10" y1="22" x2="170" y2="22" /><line x1="200" y1="22" x2="410" y2="22" />
          <line x1="-10" y1="46" x2="170" y2="46" /><line x1="200" y1="46" x2="410" y2="46" />
          <line x1="-10" y1="112" x2="170" y2="112" /><line x1="-10" y1="138" x2="170" y2="138" />
          <line x1="290" y1="112" x2="410" y2="112" /><line x1="290" y1="138" x2="410" y2="138" />
          <line x1="-10" y1="180" x2="170" y2="180" /><line x1="-10" y1="206" x2="170" y2="206" />
          <line x1="290" y1="180" x2="410" y2="180" /><line x1="290" y1="206" x2="410" y2="206" />
          <line x1="40" y1="-10" x2="40" y2="250" />
          <line x1="86" y1="-10" x2="86" y2="78" /><line x1="86" y1="160" x2="86" y2="250" />
          <line x1="130" y1="-10" x2="130" y2="78" /><line x1="130" y1="160" x2="130" y2="250" />
          <line x1="218" y1="-10" x2="218" y2="78" /><line x1="218" y1="160" x2="218" y2="250" />
          <line x1="252" y1="-10" x2="252" y2="78" /><line x1="252" y1="160" x2="252" y2="250" />
          <line x1="338" y1="-10" x2="338" y2="250" /><line x1="380" y1="-10" x2="380" y2="250" />
        </g>

        <g fill="var(--ink)" opacity="0.07">
          {buildings.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="1.5" />)}
        </g>

        <rect x="0.5" y="0.5" width="399" height="239" fill="none" stroke="var(--line)" strokeWidth="0.5" />
      </svg>

      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: -22, borderRadius: 999, background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 40%, transparent) 0%, transparent 65%)' }}></div>
        <div style={{ position: 'relative', width: 30, height: 30, borderRadius: 999, background: 'var(--accent)', border: '3px solid var(--surface)', boxShadow: 'var(--shadow-pop)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-ink)', fontSize: 12, fontWeight: 600 }}>★</div>
      </div>

      {pins.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
          <div className="mono tabular" style={{ fontSize: 11, padding: '4px 9px', borderRadius: 999, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line-strong)', boxShadow: 'var(--shadow-card)', whiteSpace: 'nowrap', fontWeight: 500, letterSpacing: '-0.005em' }}>{p.n}</div>
          <div style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink)', border: '1.5px solid var(--surface)' }}></div>
        </div>
      ))}

      <div className="mono" style={{ position: 'absolute', top: 12, left: 14, padding: '4px 10px', borderRadius: 'var(--r-sm)', background: 'color-mix(in oklab, var(--surface) 90%, transparent)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid var(--line)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {address || '1 km radius'}
      </div>

      <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4, borderRadius: 'var(--r-sm)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        <button aria-label="zoom in" style={mapBtnStyle}>+</button>
        <button aria-label="zoom out" style={{ ...mapBtnStyle, borderTop: '1px solid var(--line)' }}>−</button>
      </div>

      <div className="mono" style={{ position: 'absolute', bottom: 8, left: 14, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', background: 'color-mix(in oklab, var(--surface) 85%, transparent)', padding: '2px 6px', borderRadius: 4 }}>
        © Mapbox · OpenStreetMap
      </div>
    </div>
  );
}

Object.assign(window, {
  getInitialTheme, getUrlTheme, ReportNav, AIVerdictBlock,
  SunScoutPanel, SunScoutPlaceholder, StickyActionBar,
  ReportShareBar, AnalyseAnotherCard, MiniMap,
});
