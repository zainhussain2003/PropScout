// auth-stubs.jsx — showroom of auth landings + Stripe-return states.

const { useState: useStateAS, useEffect: useEffectAS } = React;

const TWEAK_DEFAULTS_AS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757"
}/*EDITMODE-END*/;
const ACCENT_OPTIONS_AS = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

// ── Shared state-card primitive ──────────────────────────────────
function StubState({ tone = 'ink', icon, eyebrow, headline, body, primary, secondary, children, footer, dark }) {
  const toneColor =
    tone === 'pass'    ? 'var(--pass)' :
    tone === 'caution' ? 'var(--caution)' :
    tone === 'fail'    ? 'var(--fail)' :
    tone === 'accent'  ? 'var(--accent)' : 'var(--ink)';

  return (
    <div className="card col" style={{
      padding: 'clamp(36px, 4.5vw, 56px)',
      alignItems: 'center', textAlign: 'center', gap: 18,
      maxWidth: 560, margin: '0 auto',
      background: dark ? 'var(--ink)' : 'var(--surface)',
      color: dark ? 'var(--bg)' : 'var(--ink)',
      borderColor: dark ? 'var(--ink)' : 'var(--line)',
    }}>
      <div className="icon-halo" style={{ color: toneColor }}>
        {icon}
      </div>

      {eyebrow && (
        <span className="mono" style={{
          fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: toneColor,
        }}>{eyebrow}</span>
      )}

      <h2 className="serif" style={{
        textWrap: 'balance', maxWidth: 460,
        color: dark ? 'var(--bg)' : 'var(--ink)',
      }}>{headline}</h2>

      {body && (
        <p style={{
          fontSize: 15.5, color: dark ? 'rgba(255,255,255,0.78)' : 'var(--ink-2)',
          maxWidth: 420, lineHeight: 1.6,
        }}>{body}</p>
      )}

      {children}

      {(primary || secondary) && (
        <div className="col" style={{ width: '100%', maxWidth: 380, marginTop: 4, gap: 14 }}>
          {primary && (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
              {primary} <Icon name="arrow" size={13}/>
            </button>
          )}
          {secondary && (
            <button className="btn" style={{
              width: '100%', justifyContent: 'center', padding: 12,
              background: 'transparent',
              color: dark ? 'rgba(255,255,255,.7)' : 'var(--ink-2)',
              border: '1px solid ' + (dark ? 'rgba(255,255,255,.2)' : 'var(--line-strong)'),
            }}>{secondary}</button>
          )}
        </div>
      )}

      {footer && (
        <div className="mono" style={{
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: dark ? 'rgba(255,255,255,.5)' : 'var(--muted)',
          marginTop: 4,
        }}>{footer}</div>
      )}
    </div>
  );
}

// ── Icon helpers ──────────────────────────────────────────────────
const SVG = (props) => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}/>;
const Envelope = () => <SVG><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></SVG>;
const Lock     = () => <SVG><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></SVG>;
const Sparkle  = () => <SVG><path d="M12 3v6m0 6v6M3 12h6m6 0h6M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4"/></SVG>;
const CheckBig = () => <SVG><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></SVG>;
const X        = () => <SVG><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></SVG>;

// ══════════════════════════════════════════════════════════════════
//  1. Magic-link · "check your email"
// ══════════════════════════════════════════════════════════════════
function MagicLinkSent() {
  return (
    <StubState
      tone="accent"
      icon={<Envelope/>}
      eyebrow="Check your inbox"
      headline={<>We just sent a <em>magic link</em> to your email.</>}
      body={<>The link opens you straight into PropScout — no password to remember. It's good for the next <span className="tabular" style={{ color: 'var(--ink)' }}>15 minutes</span>.</>}
      primary="Open Gmail"
      secondary="Open another inbox"
      footer="Didn't get it? Check spam · resend in 30 s"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  2. Magic-link confirm · success state
// ══════════════════════════════════════════════════════════════════
function MagicLinkConfirmed() {
  return (
    <StubState
      tone="pass"
      icon={<CheckBig/>}
      eyebrow="You're signed in"
      headline={<>Welcome back, <em>Marcus</em>.</>}
      body="Taking you back to where you left off — the Vaughan investor report you were drafting last night."
      primary="Open my report"
      secondary="Go to account"
      footer="Auto-redirect in 3 s"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  3. Password reset — request
// ══════════════════════════════════════════════════════════════════
function PasswordResetRequest() {
  const [email, setEmail] = useStateAS('');
  return (
    <StubState
      tone="ink"
      icon={<Lock/>}
      eyebrow="Forgot password"
      headline={<>Reset your <em>password</em>.</>}
      body="Pop in the email you signed up with. We'll send a one-time link that lets you set a new password."
    >
      <form
        onSubmit={(e) => e.preventDefault()}
        className="col"
        style={{ width: '100%', maxWidth: 380, marginTop: 8, gap: 16 }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="pr-input"
        />
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
          Send reset link <Icon name="arrow" size={13}/>
        </button>
        <a href="#" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3, textAlign: 'center', marginTop: 8 }}>
          ← Back to sign in
        </a>
      </form>
    </StubState>
  );
}

// ══════════════════════════════════════════════════════════════════
//  4. Password reset — set new password
// ══════════════════════════════════════════════════════════════════
function PasswordResetConfirm() {
  return (
    <StubState
      tone="accent"
      icon={<Lock/>}
      eyebrow="One more thing"
      headline={<>Set a <em>new password</em>.</>}
      body="Pick something at least 10 characters. We'll sign you in automatically as soon as you save it."
    >
      <form
        onSubmit={(e) => e.preventDefault()}
        className="col"
        style={{ width: '100%', maxWidth: 380, marginTop: 8, gap: 14 }}
      >
        <input type="password" placeholder="New password" className="pr-input"/>
        <input type="password" placeholder="Confirm new password" className="pr-input"/>
        {/* Strength meter */}
        <div className="row gap-4" style={{ gap: 4, marginTop: 6 }}>
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--pass)' }}/>
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--pass)' }}/>
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--pass)' }}/>
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--line)' }}/>
        </div>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pass)', textAlign: 'left' }}>Strong password</span>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, marginTop: 20 }}>
          Save and sign in <Icon name="arrow" size={13}/>
        </button>
      </form>
    </StubState>
  );
}

// ══════════════════════════════════════════════════════════════════
//  5. Email verified
// ══════════════════════════════════════════════════════════════════
function EmailVerified() {
  return (
    <StubState
      tone="pass"
      icon={<CheckBig/>}
      eyebrow="Verified"
      headline={<>Your email is <em>verified</em>.</>}
      body="You can now save analyses, share reports, and get notified when listings you're watching change price."
      primary="Start analyzing a listing"
      secondary="Go to account"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  6. Stripe return · welcome to Pro
// ══════════════════════════════════════════════════════════════════
function StripeWelcomePro() {
  return (
    <StubState
      tone="accent"
      icon={<Sparkle/>}
      eyebrow="You're on Investor Pro"
      headline={<>Welcome to <em>Investor Pro</em>, Marcus.</>}
      body={<>Unlimited reports, full AI verdicts, financing sliders, SunScout 3D, branded PDF, and the portfolio tracker — all unlocked. Your first charge of <span className="tabular" style={{ color: 'var(--ink)' }}>$10.00</span> will appear as <span className="mono" style={{ background: 'var(--bg-elev)', padding: '2px 6px', borderRadius: 6, fontSize: 13 }}>PROPSCOUT*PRO</span> on your statement.</>}
      primary="Open my latest analysis"
      secondary="Manage subscription in Stripe"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  7. Stripe return · cancelled
// ══════════════════════════════════════════════════════════════════
function StripeCancelled() {
  return (
    <StubState
      tone="caution"
      icon={<X/>}
      eyebrow="Checkout cancelled"
      headline={<>No charge — you're <em>still on the free plan</em>.</>}
      body="If you ran into a payment problem, hit Try again. If you just changed your mind, that's totally fine — your free quota is unchanged."
      primary="Try again"
      secondary="Back to my account"
    />
  );
}

// ══════════════════════════════════════════════════════════════════
//  Showroom
// ══════════════════════════════════════════════════════════════════
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_AS);

  useEffectAS(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  const scenarios = [
    { id: 'magic-sent',    label: 'Magic link · email sent',          render: () => <MagicLinkSent/> },
    { id: 'magic-confirm', label: 'Magic link · signed in',            render: () => <MagicLinkConfirmed/> },
    { id: 'reset-req',     label: 'Password reset · enter email',      render: () => <PasswordResetRequest/> },
    { id: 'reset-conf',    label: 'Password reset · set new password', render: () => <PasswordResetConfirm/> },
    { id: 'verified',      label: 'Email verification · success',      render: () => <EmailVerified/> },
    { id: 'stripe-ok',     label: 'Stripe return · welcome to Pro',    render: () => <StripeWelcomePro/> },
    { id: 'stripe-cancel', label: 'Stripe return · cancelled',         render: () => <StripeCancelled/> },
  ];

  return (
    <div>
      <section className="container col" style={{ paddingTop: 56, paddingBottom: 96, gap: 64 }}>
        <div className="col" style={{ gap: 16, maxWidth: 820 }}>
          <span className="section-tag">Auth & billing stubs · Design preview</span>
          <h1 className="serif" style={{ textWrap: 'balance' }}>
            The seven screens between <em style={{ color: 'var(--accent)' }}>signup → signed in → paying</em>.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 620 }}>
            These are the templated transition pages — magic-link confirmation, password reset, email verification, Stripe checkout return. All share the same icon-halo / serif headline / one-primary-action pattern as the error states.
          </p>
        </div>

        {scenarios.map((s) => (
          <div key={s.id} className="col" style={{ gap: 14 }}>
            <span className="scenario-label">{s.label}</span>
            {s.render()}
          </div>
        ))}
      </section>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme"/>
        <TweakRadio label="Mode"   value={t.theme}  options={['light', 'dark']} onChange={(v) => setTweak('theme', v)}/>
        <TweakColor label="Accent" value={t.accent} options={ACCENT_OPTIONS_AS} onChange={(v) => setTweak('accent', v)}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
