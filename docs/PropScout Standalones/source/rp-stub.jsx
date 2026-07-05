// rp-stub.jsx — shared primitives for the utility surfaces (pre-report,
// paywall, account, error, auth, legal): theme bootstrap, line-icon set,
// BlockState (error/gate) and StubState (auth) cards, and a showroom
// scenario list. Loads after components.jsx + rp-core.jsx. No raw hex —
// tokens + color-mix only.

const { useState: useStateStub, useEffect: useEffectStub } = React;

// ── Theme bootstrap — ?theme / #theme wins (harness + standalone), else tweak ──
function stubUrlTheme() {
  const p = new URLSearchParams(window.location.search).get('theme');
  if (p === 'dark' || p === 'light') return p;
  const h = new URLSearchParams((window.location.hash || '').replace(/^#/, '')).get('theme');
  if (h === 'dark' || h === 'light') return h;
  return null;
}
function stubInitialTheme(tweakTheme) {
  return stubUrlTheme() || tweakTheme || 'light';
}

// useThemeTweak — shared theme wiring: returns [dark, setDark, tweaks, setTweak].
function useThemeTweak(defaults) {
  const [t, setTweak] = useTweaks(defaults);
  const [dark, setDark] = useStateStub(stubInitialTheme(t.theme) === 'dark');
  useEffectStub(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffectStub(() => {
    if (!stubUrlTheme()) setDark(t.theme === 'dark');
  }, [t.theme]);
  return [dark, setDark, t, setTweak];
}

function ThemeTweakPanel({ dark, setDark, setTweak, children }) {
  return (
    <TweaksPanel title="Tweaks">
      {children}
      <TweakSection label="Theme" />
      <TweakRadio
        label="Mode"
        value={dark ? 'dark' : 'light'}
        options={['light', 'dark']}
        onChange={(v) => { setDark(v === 'dark'); setTweak('theme', v); }}
      />
    </TweaksPanel>
  );
}

// ── Line-icon set for state visuals ───────────────────────────────────────────
function StateIcon({ name, color = 'currentColor', size = 40 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'maple':    return <svg {...props}><path d="M12 21v-3M7 5l3 5-5-1 2 4-5 1 5 3-2 4 5-1-2 4 4-2 1 5 1-5 4 2-2-4 5 1-2-4 5-3-5-1 2-4-5 1z"/></svg>;
    case 'flag':     return <svg {...props}><path d="M4 21V4M4 4h12l-2 4 2 4H4"/></svg>;
    case 'sun':      return <svg {...props}><circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>;
    case 'cloud-off':return <svg {...props}><path d="M3 3l18 18M9 6a5 5 0 0 1 9.6 1.8A4 4 0 0 1 20 16M14 18H6a4 4 0 0 1-1.8-7.6"/></svg>;
    case 'search':   return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case 'clock':    return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'ghost':    return <svg {...props}><path d="M5 22v-9a7 7 0 0 1 14 0v9l-3-2-2 2-2-2-2 2-2-2-3 2zM9 11h.01M15 11h.01"/></svg>;
    case 'globe':    return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/></svg>;
    case 'pencil':   return <svg {...props}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
    case 'link':     return <svg {...props}><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 18.66l1-1"/></svg>;
    case 'envelope': return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>;
    case 'lock':     return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case 'sparkle':  return <svg {...props}><path d="M12 3v6m0 6v6M3 12h6m6 0h6M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4"/></svg>;
    case 'check-big':return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>;
    case 'x-big':    return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>;
    case 'check':    return <svg {...props}><path d="M4 12l5 5L20 6"/></svg>;
    case 'arrow':    return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    default:         return null;
  }
}

const STUB_TONE = { pass: 'var(--pass)', caution: 'var(--caution)', fail: 'var(--fail)', accent: 'var(--accent)', ink: 'var(--ink)' };

// ── BlockState — full-page error / gate card (error surface) ──────────────────
function BlockState({ tone = 'ink', icon, eyebrow, headline, body, primary, secondary, children, compact }) {
  const toneColor = STUB_TONE[tone] || STUB_TONE.ink;
  return (
    <div className="card col" style={{ padding: compact ? 'clamp(28px, 3.5vw, 44px)' : 'clamp(28px, 5vw, 64px)', alignItems: 'center', textAlign: 'center', gap: 18, width: '100%', maxWidth: 'min(720px, 100%)', margin: '0 auto' }}>
      <div className="icon-halo" style={{ color: toneColor }}>
        <StateIcon name={icon} color={toneColor} size={40} />
      </div>
      {eyebrow && <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: toneColor }}>{eyebrow}</span>}
      <h2 className="serif" style={{ textWrap: 'balance', maxWidth: 540 }}>{headline}</h2>
      {body && <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 480, lineHeight: 1.55 }}>{body}</p>}
      {children}
      {(primary || secondary) && (
        <div className="row gap-12" style={{ marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {primary && <button className="btn btn-primary" style={{ padding: '14px 22px' }}>{primary} <Icon name="arrow" size={13} /></button>}
          {secondary && <button className="btn btn-ghost">{secondary}</button>}
        </div>
      )}
    </div>
  );
}

// ── StubState — auth / billing transition card (auth surface) ─────────────────
function StubState({ tone = 'ink', icon, eyebrow, headline, body, primary, secondary, children, footer, dark }) {
  const toneColor = STUB_TONE[tone] || STUB_TONE.ink;
  const onInk = (pct) => `color-mix(in oklab, var(--bg) ${pct}%, transparent)`;
  return (
    <div className="card col" style={{ padding: 'clamp(28px, 4.5vw, 56px)', alignItems: 'center', textAlign: 'center', gap: 18, width: '100%', maxWidth: 'min(560px, 100%)', margin: '0 auto', background: dark ? 'var(--ink)' : 'var(--surface)', color: dark ? 'var(--bg)' : 'var(--ink)', borderColor: dark ? 'var(--ink)' : 'var(--line)' }}>
      <div className="icon-halo" style={{ color: toneColor }}>
        <StateIcon name={icon} color={toneColor} size={40} />
      </div>
      {eyebrow && <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: toneColor }}>{eyebrow}</span>}
      <h2 className="serif" style={{ textWrap: 'balance', maxWidth: 460, color: dark ? 'var(--bg)' : 'var(--ink)' }}>{headline}</h2>
      {body && <p style={{ fontSize: 15.5, color: dark ? onInk(78) : 'var(--ink-2)', maxWidth: 420, lineHeight: 1.6 }}>{body}</p>}
      {children}
      {(primary || secondary) && (
        <div className="col" style={{ width: '100%', maxWidth: 380, marginTop: 4, gap: 14 }}>
          {primary && <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>{primary} <Icon name="arrow" size={13} /></button>}
          {secondary && <button className="btn" style={{ width: '100%', justifyContent: 'center', padding: 12, background: 'transparent', color: dark ? onInk(70) : 'var(--ink-2)', border: '1px solid ' + (dark ? onInk(20) : 'var(--line-strong)') }}>{secondary}</button>}
        </div>
      )}
      {footer && <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: dark ? onInk(50) : 'var(--muted)', marginTop: 4 }}>{footer}</div>}
    </div>
  );
}

// ── Showroom shell — header + labelled scenario rows ──────────────────────────
function ShowroomHeader({ tag, title, sub }) {
  return (
    <div className="col" style={{ gap: 16, maxWidth: 820 }}>
      <span className="section-tag">{tag}</span>
      <h1 className="serif" style={{ textWrap: 'balance' }}>{title}</h1>
      <p style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 620 }}>{sub}</p>
    </div>
  );
}

function ScenarioRow({ label, children }) {
  return (
    <div className="col" style={{ gap: 14 }} data-scenario={label}>
      <span className="scenario-label">{label}</span>
      {children}
    </div>
  );
}

// Design-notes card shared by error + paywall showrooms
function DesignNotes({ title, notes }) {
  return (
    <div className="card col" style={{ padding: 28, gap: 14 }}>
      <h3 className="serif" style={{ fontSize: 22 }}>{title}</h3>
      <div className="col" style={{ gap: 10 }}>
        {notes.map(([h, sub]) => (
          <div key={h} className="row gap-12" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--accent)', marginTop: 4 }}><Icon name="check" size={14} stroke={2.4} /></span>
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{h}</span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  stubUrlTheme, stubInitialTheme, useThemeTweak, ThemeTweakPanel,
  StateIcon, BlockState, StubState, ShowroomHeader, ScenarioRow, DesignNotes,
});
