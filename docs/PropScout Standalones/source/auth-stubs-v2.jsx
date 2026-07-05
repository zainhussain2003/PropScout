// auth-stubs-v2.jsx — auth landings + Stripe-return states. Magic-link,
// password reset (request + set), email verified, Stripe welcome/cancelled.
// Harbour re-skin: StubState from rp-stub, no accent tweak, no raw hex.

const TWEAK_DEFAULTS_AS = /*EDITMODE-BEGIN*/{
  "theme": "light"
}/*EDITMODE-END*/;

const { useState: useStateAS } = React;

function MagicLinkSent() {
  return (
    <StubState
      tone="accent"
      icon="envelope"
      eyebrow="Check your inbox"
      headline={<React.Fragment>We just sent a <em>magic link</em> to your email.</React.Fragment>}
      body={<React.Fragment>The link opens you straight into PropScout — no password to remember. It's good for the next <span className="tabular" style={{ color: 'var(--ink)' }}>15 minutes</span>.</React.Fragment>}
      primary="Open Gmail"
      secondary="Open another inbox"
      footer="Didn't get it? Check spam · resend in 30 s"
    />
  );
}

function MagicLinkConfirmed() {
  return (
    <StubState
      tone="pass"
      icon="check-big"
      eyebrow="You're signed in"
      headline={<React.Fragment>Welcome back, <em>Marcus</em>.</React.Fragment>}
      body="Taking you back to where you left off — the Vaughan investor report you were drafting last night."
      primary="Open my report"
      secondary="Go to account"
      footer="Auto-redirect in 3 s"
    />
  );
}

function PasswordResetRequest() {
  const [email, setEmail] = useStateAS('');
  return (
    <StubState
      tone="ink"
      icon="lock"
      eyebrow="Forgot password"
      headline={<React.Fragment>Reset your <em>password</em>.</React.Fragment>}
      body="Pop in the email you signed up with. We'll send a one-time link that lets you set a new password."
    >
      <form onSubmit={(e) => e.preventDefault()} className="col" style={{ width: '100%', maxWidth: 380, marginTop: 8, gap: 16 }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pr-input" />
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>Send reset link <Icon name="arrow" size={13} /></button>
        <a href="#" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3, textAlign: 'center', marginTop: 8 }}>← Back to sign in</a>
      </form>
    </StubState>
  );
}

function PasswordResetConfirm() {
  return (
    <StubState
      tone="accent"
      icon="lock"
      eyebrow="One more thing"
      headline={<React.Fragment>Set a <em>new password</em>.</React.Fragment>}
      body="Pick something at least 10 characters. We'll sign you in automatically as soon as you save it."
    >
      <form onSubmit={(e) => e.preventDefault()} className="col" style={{ width: '100%', maxWidth: 380, marginTop: 8, gap: 14 }}>
        <input type="password" placeholder="New password" className="pr-input" />
        <input type="password" placeholder="Confirm new password" className="pr-input" />
        <div className="row gap-4" style={{ gap: 4, marginTop: 6 }}>
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--pass)' }}></span>
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--pass)' }}></span>
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--pass)' }}></span>
          <span style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--line)' }}></span>
        </div>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pass)', textAlign: 'left' }}>Strong password</span>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, marginTop: 20 }}>Save and sign in <Icon name="arrow" size={13} /></button>
      </form>
    </StubState>
  );
}

function EmailVerified() {
  return (
    <StubState
      tone="pass"
      icon="check-big"
      eyebrow="Verified"
      headline={<React.Fragment>Your email is <em>verified</em>.</React.Fragment>}
      body="You can now save analyses, share reports, and get notified when listings you're watching change price."
      primary="Start analyzing a listing"
      secondary="Go to account"
    />
  );
}

function StripeWelcomePro() {
  return (
    <StubState
      tone="accent"
      icon="sparkle"
      eyebrow="You're on Investor Pro"
      headline={<React.Fragment>Welcome to <em>Investor Pro</em>, Marcus.</React.Fragment>}
      body={<React.Fragment>Unlimited reports, full AI verdicts, financing sliders, SunScout, branded PDF, and the portfolio tracker — all unlocked. Your first charge of <span className="tabular" style={{ color: 'var(--ink)' }}>$10.00</span> will appear as <span className="mono" style={{ background: 'var(--bg-elev)', padding: '2px 6px', borderRadius: 'var(--r-sm)', fontSize: 13 }}>PROPSCOUT*PRO</span> on your statement.</React.Fragment>}
      primary="Open my latest analysis"
      secondary="Manage subscription in Stripe"
    />
  );
}

function StripeCancelled() {
  return (
    <StubState
      tone="caution"
      icon="x-big"
      eyebrow="Checkout cancelled"
      headline={<React.Fragment>No charge — you're <em>still on the free plan</em>.</React.Fragment>}
      body="If you ran into a payment problem, hit Try again. If you just changed your mind, that's totally fine — your free quota is unchanged."
      primary="Try again"
      secondary="Back to my account"
    />
  );
}

function App() {
  const [dark, setDark, t, setTweak] = useThemeTweak(TWEAK_DEFAULTS_AS);

  const scenarios = [
    { id: 'magic-sent', label: 'Magic link · email sent', render: () => <MagicLinkSent /> },
    { id: 'magic-confirm', label: 'Magic link · signed in', render: () => <MagicLinkConfirmed /> },
    { id: 'reset-req', label: 'Password reset · enter email', render: () => <PasswordResetRequest /> },
    { id: 'reset-conf', label: 'Password reset · set new password', render: () => <PasswordResetConfirm /> },
    { id: 'verified', label: 'Email verification · success', render: () => <EmailVerified /> },
    { id: 'stripe-ok', label: 'Stripe return · welcome to Pro', render: () => <StripeWelcomePro /> },
    { id: 'stripe-cancel', label: 'Stripe return · cancelled', render: () => <StripeCancelled /> },
  ];

  return (
    <div data-screen-label="Auth & Billing Stubs">
      <section className="container col" style={{ paddingTop: 56, paddingBottom: 96, gap: 64 }}>
        <ShowroomHeader
          tag="Auth & billing stubs · Design preview"
          title={<React.Fragment>The seven screens between <em style={{ color: 'var(--accent)' }}>signup → signed in → paying</em>.</React.Fragment>}
          sub="These are the templated transition pages — magic-link confirmation, password reset, email verification, Stripe checkout return. All share the same icon-halo / serif headline / one-primary-action pattern as the error states."
        />
        {scenarios.map((s) => (
          <ScenarioRow key={s.id} label={s.label}>{s.render()}</ScenarioRow>
        ))}
      </section>

      <ThemeTweakPanel dark={dark} setDark={setDark} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
