// error-states.jsx — showroom of all error / gate / empty states.

const { useState: useStateEs, useEffect: useEffectEs } = React;

const TWEAK_DEFAULTS_ES = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS_ES = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

// ── SVG icons used in state visuals ──────────────────────────────
function StateIcon({ name, color = 'currentColor', size = 36 }) {
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
    case 'check':    return <svg {...props}><path d="M4 12l5 5L20 6"/></svg>;
    case 'arrow':    return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'link':     return <svg {...props}><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 18.66l1-1"/></svg>;
    default:         return null;
  }
}

// ── Generic "BlockState" — used for most full-page errors ────────
function BlockState({ tone = 'ink', icon, eyebrow, headline, body, primary, secondary, children, compact }) {
  const toneColor =
    tone === 'pass'    ? 'var(--pass)' :
    tone === 'caution' ? 'var(--caution)' :
    tone === 'fail'    ? 'var(--fail)' :
    tone === 'accent'  ? 'var(--accent)' :
                         'var(--ink)';

  return (
    <div className="card col" style={{
      padding: compact ? 'clamp(28px, 3.5vw, 44px)' : 'clamp(40px, 5vw, 64px)',
      alignItems: 'center', textAlign: 'center', gap: 18,
      maxWidth: 720, margin: '0 auto',
    }}>
      <div className="icon-halo" style={{ color: toneColor }}>
        <StateIcon name={icon} color={toneColor} size={40}/>
      </div>

      {eyebrow && (
        <span className="mono" style={{
          fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: toneColor,
        }}>{eyebrow}</span>
      )}

      <h2 className="serif" style={{ textWrap: 'balance', maxWidth: 540 }}>{headline}</h2>

      {body && (
        <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 480, lineHeight: 1.55 }}>{body}</p>
      )}

      {children}

      {(primary || secondary) && (
        <div className="row gap-12" style={{ marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {primary && (
            <button className="btn btn-primary" style={{ padding: '14px 22px' }}>
              {primary} <Icon name="arrow" size={13}/>
            </button>
          )}
          {secondary && (
            <button className="btn btn-ghost">{secondary}</button>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Province gate — non-Ontario URL with waitlist
// ══════════════════════════════════════════════════════════════════
function ProvinceGateState({ submitted, onSubmit }) {
  const [email, setEmail] = useStateEs('');
  if (submitted) {
    return (
      <BlockState
        tone="pass"
        icon="check"
        eyebrow="You're on the list"
        headline={<>We'll <em>email you</em> the day BC reports go live.</>}
        body="Expected Q3 2026 — that's BC LTT, BC rent control rules, and a fresh comps database scraped from PadMapper West and Rentals.ca BC."
        primary="Analyze an Ontario listing"
        secondary="Back to home"
      />
    );
  }
  return (
    <BlockState
      tone="accent"
      icon="maple"
      eyebrow="British Columbia · coming Q3 2026"
      headline={<>We're not in <em>British Columbia</em> yet.</>}
      body="Running Ontario rules on a BC property would overstate closing costs by tens of thousands. We gate cleanly until our BC data and tax engine are calibrated."
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(email); }}
        className="row gap-8"
        style={{
          marginTop: 6, padding: 4, borderRadius: 999,
          background: 'var(--bg-elev)', border: '1px solid var(--line)',
          maxWidth: 460, width: '100%',
        }}
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="you@example.com"
          style={{
            flex: 1, padding: '10px 14px',
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)',
            minWidth: 0,
          }}
        />
        <button className="btn btn-accent" type="submit">Notify me</button>
      </form>
      <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Free · one email when BC launches · no marketing
      </span>
    </BlockState>
  );
}

// ══════════════════════════════════════════════════════════════════
//  US property block
// ══════════════════════════════════════════════════════════════════
function USPropertyState() {
  return (
    <BlockState
      tone="fail"
      icon="globe"
      eyebrow="United States · Not supported"
      headline={<>That listing is in <em>the US</em>.</>}
      body="PropScout covers Canadian real estate only — our rent control, OSFI stress test, and LTT calculators don't apply south of the border."
      primary="Try a Canadian listing"
      secondary="Back to home"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  Listing expired / removed
// ══════════════════════════════════════════════════════════════════
function ExpiredListingState() {
  return (
    <BlockState
      tone="caution"
      icon="ghost"
      eyebrow="Listing expired"
      headline={<>That listing has <em>been removed</em>.</>}
      body="The seller or agent took it down. If you still have the property details handy, you can run the analysis manually — every field is editable."
      primary="Enter details manually"
      secondary="Try a different URL"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  Scraper failed (full-fail variant)
// ══════════════════════════════════════════════════════════════════
function ScraperFailState() {
  return (
    <BlockState
      tone="caution"
      icon="cloud-off"
      eyebrow="Couldn't read the listing"
      headline={<>We hit a wall <em>reading the page</em>.</>}
      body="The listing source may have changed their layout, or the URL is geo-blocked from our scraper. You can enter the property fields manually — every calculation still runs."
      primary="Enter manually"
      secondary="Try again"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  Network timeout
// ══════════════════════════════════════════════════════════════════
function NetworkTimeoutState() {
  return (
    <BlockState
      tone="ink"
      icon="clock"
      eyebrow="Slow response · 30s timeout"
      headline={<>The listing source is <em>taking a while</em>.</>}
      body="Realtor.ca and Zillow.ca occasionally throttle requests during peak hours. Hit retry — most timeouts clear on the second attempt."
      primary="Retry"
      secondary="Enter manually instead"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  Generic 404
// ══════════════════════════════════════════════════════════════════
function NotFoundState() {
  return (
    <BlockState
      tone="ink"
      icon="search"
      eyebrow="404 · page not found"
      headline={<>That page <em>doesn't exist</em>.</>}
      body="Either the link is broken or the page moved. If you got here from a shared report link, the share may have expired (links last 30 days)."
      primary="Back to home"
      secondary="Report a broken link"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  Expired share link
// ══════════════════════════════════════════════════════════════════
function ExpiredShareState() {
  return (
    <BlockState
      tone="caution"
      icon="link"
      eyebrow="Shared link expired"
      headline={<>That share link <em>expired</em>.</>}
      body="Public report links are active for 30 days after they're generated. If you have an account, sign in to see the latest version of this analysis."
      primary="Sign in"
      secondary="Analyze the same URL fresh"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  Inline empty state — no rental comps found (used inside a report)
// ══════════════════════════════════════════════════════════════════
function NoCompsInlineState() {
  return (
    <div className="card col" style={{
      padding: 28, gap: 14,
      borderColor: 'color-mix(in oklab, var(--caution) 25%, var(--line))',
      background: 'color-mix(in oklab, var(--caution) 4%, var(--surface))',
    }}>
      <div className="row gap-10">
        <span style={{ color: 'var(--caution)' }}><StateIcon name="search" color="var(--caution)" size={20}/></span>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>Only <em>2 rental comps</em> found in 90 days</h3>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--caution)' }}>Confidence: low</span>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 620, lineHeight: 1.55 }}>
        Smaller towns and very high-end neighbourhoods often have thin rental comp data. The analysis still runs against the 2 comps we found, but we flag the confidence so you know to weight the rent estimate cautiously.
      </p>
      <div className="row gap-12" style={{ marginTop: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost"><Icon name="search" size={13}/> Expand to 1km radius</button>
        <button className="btn btn-ghost"><Icon name="pencil" size={13}/> Override estimated rent</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Inline scraper partial — fields missing, prompt manual entry
// ══════════════════════════════════════════════════════════════════
function ScraperPartialInlineState() {
  return (
    <div className="card col" style={{
      padding: 28, gap: 18,
      borderColor: 'color-mix(in oklab, var(--accent) 30%, var(--line))',
      background: 'color-mix(in oklab, var(--accent) 4%, var(--surface))',
    }}>
      <div className="row gap-10">
        <span style={{ color: 'var(--accent)' }}><StateIcon name="pencil" color="var(--accent)" size={20}/></span>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>We need <em>3 fields</em> before this report runs</h3>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>Auto-filled · 12 of 15</span>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 620, lineHeight: 1.55 }}>
        We pulled most of the listing automatically. These three fields weren't in the listing data — fill them in and the analysis kicks off.
      </p>
      {/* Three missing-field inputs */}
      <div className="col gap-10">
        {[
          { label: 'Condo fee', hint: 'monthly · required for accurate cap rate', placeholder: '$ / month' },
          { label: 'Year built', hint: 'used for rent control + maintenance reserve', placeholder: 'e.g. 1985' },
          { label: 'Annual property taxes', hint: 'usually on the listing — sometimes hidden behind login', placeholder: '$ / year' },
        ].map((f) => (
          <div key={f.label} className="row" style={{
            padding: '12px 16px', borderRadius: 12,
            background: 'var(--surface)', border: '1px dashed var(--accent)',
            gap: 16, justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}>
            <div className="col" style={{ gap: 2, minWidth: 160 }}>
              <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{f.label}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{f.hint}</span>
            </div>
            <input
              placeholder={f.placeholder}
              style={{
                padding: '8px 14px',
                background: 'var(--bg-elev)', border: '1px solid var(--line)',
                borderRadius: 10, outline: 'none',
                fontFamily: 'inherit', fontSize: 13,
                color: 'var(--ink)', minWidth: 200,
              }}
            />
          </div>
        ))}
      </div>
      <div className="row gap-12">
        <button className="btn btn-primary">Run analysis <Icon name="arrow" size={13}/></button>
        <button className="btn btn-ghost">Save and finish later</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Guest email-capture (end of guest analysis)
// ══════════════════════════════════════════════════════════════════
function GuestCaptureState() {
  const [email, setEmail] = useStateEs('');
  return (
    <BlockState
      tone="accent"
      icon="flag"
      eyebrow="Free guest analysis · 1 of 1"
      headline={<>Save your report — <em>one email</em>, done.</>}
      body="We'll send a 30-day shareable link to this exact analysis. No account, no password, no marketing. You can come back any time."
    >
      <form
        onSubmit={(e) => e.preventDefault()}
        className="row gap-8"
        style={{
          marginTop: 6, padding: 4, borderRadius: 999,
          background: 'var(--bg-elev)', border: '1px solid var(--line)',
          maxWidth: 460, width: '100%',
        }}
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="you@example.com"
          style={{
            flex: 1, padding: '10px 14px',
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)',
            minWidth: 0,
          }}
        />
        <button className="btn btn-accent" type="submit">Send my report</button>
      </form>
      <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Or <a href="#" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }}>create an account</a> for unlimited tenant reports
      </span>
    </BlockState>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Showroom shell
// ══════════════════════════════════════════════════════════════════
function Showroom() {
  const [provinceSubmitted, setProvinceSubmitted] = useStateEs(false);

  const scenarios = [
    { id: 'province',   label: 'Province gate · non-Ontario URL',     render: () => <ProvinceGateState submitted={provinceSubmitted} onSubmit={() => setProvinceSubmitted(true)}/> },
    { id: 'us',         label: 'US property block',                    render: () => <USPropertyState/> },
    { id: 'expired',    label: 'Listing expired or removed',           render: () => <ExpiredListingState/> },
    { id: 'scraper',    label: 'Scraper failed · full-page',           render: () => <ScraperFailState/> },
    { id: 'timeout',    label: 'Network timeout',                      render: () => <NetworkTimeoutState/> },
    { id: '404',        label: '404 · page not found',                 render: () => <NotFoundState/> },
    { id: 'share',      label: 'Expired shared link',                  render: () => <ExpiredShareState/> },
    { id: 'guest',      label: 'Guest email capture · post-analysis',  render: () => <GuestCaptureState/> },
    { id: 'comps',      label: 'Inline · low comp confidence',         render: () => <NoCompsInlineState/> },
    { id: 'partial',    label: 'Inline · scraper found 12 of 15 fields', render: () => <ScraperPartialInlineState/> },
  ];

  return (
    <section className="container col" style={{ paddingTop: 56, paddingBottom: 96, gap: 64 }}>
      <div className="col" style={{ gap: 16, maxWidth: 820 }}>
        <span className="section-tag">Error & gate states · Design preview</span>
        <h1 className="serif" style={{ textWrap: 'balance' }}>
          What users see when something <em style={{ color: 'var(--accent)' }}>doesn't go right</em>.
        </h1>
        <p style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 620 }}>
          Every gate uses the same vocabulary: a halo'd icon, a clear eyebrow, a confident headline, a plain-English reason, and one primary path forward. No dead ends, ever.
        </p>
      </div>

      {scenarios.map((s) => (
        <div key={s.id} className="col" style={{ gap: 14 }}>
          <span className="scenario-label">{s.label}</span>
          {s.render()}
        </div>
      ))}

      {/* Design notes */}
      <div className="col" style={{ gap: 14 }}>
        <span className="scenario-label">Design notes</span>
        <div className="card col" style={{ padding: 28, gap: 14 }}>
          <h3 className="serif" style={{ fontSize: 22 }}>Rules every error state follows</h3>
          <div className="col" style={{ gap: 10 }}>
            {[
              ['One primary action.', 'Never two equally-weighted buttons. The user always knows the recommended next step.'],
              ['Plain English over technical truth.', '"We hit a wall reading the page" beats "HTTP 503 from upstream".'],
              ['Explain *why*, not just *that*.', 'A user who knows why BC isn\'t supported is more likely to wait than a user who just sees a block.'],
              ['Tone-coloured icon halo.', 'Pass = green, caution = amber, fail = clay-red, accent = terracotta. No emoji, ever.'],
              ['Inline > full-page when possible.', 'Low comp confidence flags inline inside the report; the report still loads with reduced confidence. Only block when the analysis cannot proceed.'],
            ].map(([h, sub]) => (
              <div key={h} className="row gap-12" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)', marginTop: 4 }}><Icon name="check" size={14} stroke={2.4}/></span>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{h}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_ES);

  useEffectEs(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  return (
    <div>
      <Showroom/>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme"/>
        <TweakRadio label="Mode" value={t.theme} options={['light', 'dark']} onChange={(v) => setTweak('theme', v)}/>
        <TweakColor label="Accent" value={t.accent} options={ACCENT_OPTIONS_ES} onChange={(v) => setTweak('accent', v)}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
