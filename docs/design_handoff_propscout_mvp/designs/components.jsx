// components.jsx — primitives shared across sections

const { useState, useEffect, useRef, useMemo } = React;

// ── Logo / wordmark ──────────────────────────────────────────────
// "PropScout" wordmark with a custom scout-mark: a triangulation glyph
// (compass + crosshair + roof angle) — the property scout's tool of trade.
function ScoutMark({ size = 28, color }) {
  // The mark: a roof line that doubles as a compass needle.
  const c = color || 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* outer ring */}
      <circle cx="16" cy="16" r="14.5" stroke={c} strokeWidth="1" opacity="0.35" />
      {/* roof / triangulation */}
      <path d="M5 21 L16 8 L27 21" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* center pin */}
      <circle cx="16" cy="21" r="1.8" fill={c} />
      {/* compass tick */}
      <path d="M16 4 L16 7" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Wordmark({ height = 28 }) {
  return (
    <div className="row gap-12" style={{ height }}>
      <ScoutMark size={Math.round(height * 0.95)} />
      <span style={{
        fontFamily: "'Instrument Serif', serif",
        fontSize: Math.round(height * 1.05),
        letterSpacing: '-0.02em',
        lineHeight: 1,
        color: 'var(--ink)',
      }}>
        Prop<span style={{ fontStyle: 'italic' }}>Scout</span>
      </span>
    </div>
  );
}

// ── Generic UI primitives ────────────────────────────────────────
function Chip({ children, accent }) {
  return (
    <span className="chip">
      {accent && <span className="chip-dot" />}
      {children}
    </span>
  );
}

function SectionHeader({ tag, title, children, align = 'left' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      maxWidth: align === 'center' ? 760 : 920,
      margin: align === 'center' ? '0 auto' : 0,
      textAlign: align,
      alignItems: align === 'center' ? 'center' : 'flex-start',
    }}>
      {tag && <span className="section-tag" style={{ marginBottom: 18 }}>{tag}</span>}
      <h2 className="serif" style={{ textWrap: 'balance', marginBottom: children ? 22 : 0 }}>{title}</h2>
      {children && <p style={{ fontSize: 18, color: 'var(--muted)', maxWidth: 620, textWrap: 'pretty' }}>{children}</p>}
    </div>
  );
}

// ── Tiny inline SVG icons (line, 1.6 stroke) ─────────────────────
function Icon({ name, size = 16, stroke = 1.6 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'arrow':   return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'link':    return <svg {...props}><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 18.66l1-1"/></svg>;
    case 'check':   return <svg {...props}><path d="M4 12l5 5L20 6"/></svg>;
    case 'sun':     return <svg {...props}><circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>;
    case 'house':   return <svg {...props}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>;
    case 'chart':   return <svg {...props}><path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6"/></svg>;
    case 'shield':  return <svg {...props}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/></svg>;
    case 'doc':     return <svg {...props}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></svg>;
    case 'map':     return <svg {...props}><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/></svg>;
    case 'key':     return <svg {...props}><circle cx="8" cy="15" r="4"/><path d="M11 13l9-9M16 8l3 3"/></svg>;
    case 'flag':    return <svg {...props}><path d="M4 21V4M4 4h12l-2 4 2 4H4"/></svg>;
    case 'sparkle': return <svg {...props}><path d="M12 4v6m0 4v6M4 12h6m4 0h6M7 7l3 3M14 14l3 3M17 7l-3 3M10 14l-3 3"/></svg>;
    case 'moon':    return <svg {...props}><path d="M21 13A9 9 0 0 1 11 3a8 8 0 1 0 10 10z"/></svg>;
    case 'paste':   return <svg {...props}><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/></svg>;
    case 'plus':    return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus':   return <svg {...props}><path d="M5 12h14"/></svg>;
    case 'dot':     return <svg {...props}><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>;
    default:        return <svg {...props}/>;
  }
}

// ── Top Nav ──────────────────────────────────────────────────────
function Nav({ dark, onToggleDark, onSignIn }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'saturate(180%) blur(14px)',
      WebkitBackdropFilter: 'saturate(180%) blur(14px)',
      background: 'color-mix(in oklab, var(--bg) 78%, transparent)',
      borderBottom: '1px solid var(--line)',
    }}>
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        <Wordmark height={24} />

        <nav className="row gap-32 nav-links" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
          <a href="#how">How it works</a>
          <a href="#reports">Reports</a>
          <a href="#sunscout">SunScout</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="row gap-12">
          <button className="btn btn-ghost" onClick={onToggleDark} aria-label="Toggle theme" style={{ padding: '10px 12px' }}>
            <Icon name={dark ? 'sun' : 'moon'} size={15} />
          </button>
          <button className="btn btn-ghost" onClick={onSignIn} style={{ padding: '10px 14px' }}>Sign in</button>
          <button className="btn btn-primary" onClick={onSignIn}>Start free <Icon name="arrow" size={14}/></button>
        </div>
      </div>
    </header>
  );
}

// ── Footer ───────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { h: 'Product', items: ['Investment report', 'Personal buyer report', 'Tenant report', 'Landlord report', 'SunScout', 'Portfolio tracker'] },
    { h: 'Company', items: ['About', 'Methodology', 'Data sources', 'Press', 'Careers'] },
    { h: 'Resources', items: ['Help centre', 'Underwriting glossary', 'Ontario LTT calculator', 'OSFI stress test', 'API (Team)'] },
    { h: 'Legal', items: ['Privacy', 'Terms', 'Disclaimer', 'Brokerage info'] },
  ];
  return (
    <footer style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '80px 0 36px', marginTop: 80 }}>
      <div className="container col gap-32">
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: 40 }}>
          <div className="col gap-16">
            <div style={{ color: 'var(--bg)' }}>
              <Wordmark height={26} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, maxWidth: 280 }}>
              Underwriting for Canadian real estate. Built in Toronto, opinionated about the numbers.
            </p>
            <div className="row gap-8">
              <Chip>Ontario · Live</Chip>
              <Chip>BC · Q3 2026</Chip>
            </div>
          </div>
          {cols.map(c => (
            <div key={c.h} className="col gap-12">
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>{c.h}</div>
              <div className="col gap-8">
                {c.items.map(i => <a key={i} href="#" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{i}</a>)}
              </div>
            </div>
          ))}
        </div>

        <div className="divider" style={{ background: 'rgba(255,255,255,0.12)' }}></div>

        <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          <span>© 2026 PropScout Analytics Inc. · propscout.ca</span>
          <span className="mono">v0.9 · MVP preview</span>
          <span>Not financial or legal advice. Always do your own due diligence.</span>
        </div>
      </div>
    </footer>
  );
}

// ── Sign-in modal ────────────────────────────────────────────────
function SignInModal({ open, onClose }) {
  const [mode, setMode] = React.useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483640,
        background: 'rgba(10, 13, 20, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460,
          background: 'var(--surface)', color: 'var(--ink)',
          borderRadius: 22, border: '1px solid var(--line)',
          padding: 32,
          boxShadow: 'var(--shadow-pop)',
          position: 'relative',
        }}
      >
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 14, right: 14,
          width: 32, height: 32, borderRadius: 999,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>×</button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 }}>
          <ScoutMark size={36}/>
        </div>

        <h3 className="serif" style={{ fontSize: 28, textAlign: 'center', marginTop: 14, marginBottom: 8 }}>
          {mode === 'signin' ? <>Sign in to read the <em>full verdict</em></> : <>Create a free account</>}
        </h3>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
          {mode === 'signin'
            ? 'The free verdict you just saw is a snippet — sign in to see all 3 paragraphs, comps map, financing scenarios, and PDF export.'
            : 'Three free reports every month. No credit card. Cancel anytime.'}
        </p>

        <div className="col gap-12" style={{ marginBottom: 16 }}>
          <button className="btn" style={{
            width: '100%', justifyContent: 'center', padding: 14,
            background: 'var(--surface)', border: '1px solid var(--line-strong)', color: 'var(--ink)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: 8 }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div className="row gap-8" style={{ alignItems: 'center', margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'var(--bg-elev)', border: '1px solid var(--line)',
              fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
            {mode === 'signin' ? 'Send magic link' : 'Create account'} <Icon name="arrow" size={14}/>
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginBottom: 0 }}>
          {mode === 'signin' ? <>New to PropScout? <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }}>Create a free account</button></>
            : <>Already have an account? <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }}>Sign in</button></>}
        </p>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 18, lineHeight: 1.5 }}>
          By continuing you agree to our <a href="#" style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>Terms</a> and <a href="#" style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

Object.assign(window, { ScoutMark, Wordmark, Chip, SectionHeader, Icon, Nav, Footer, SignInModal });
