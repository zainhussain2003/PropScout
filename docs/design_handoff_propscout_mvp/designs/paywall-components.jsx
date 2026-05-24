// paywall-components.jsx — reusable paywall building blocks.
// All free-tier gates use the same visual vocabulary so the upgrade pitch feels
// consistent across the product: blurred content + accent-bordered upgrade card.

const { useState: useStatePc, useEffect: useEffectPc } = React;

// ── 1. Pro badge — small inline marker on locked features ───────
function ProBadge({ tier = 'Investor Pro' }) {
  return (
    <span className="pro-badge">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="11" width="16" height="10" rx="1.5"/>
        <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
      </svg>
      {tier}
    </span>
  );
}

// ── 2. Upgrade card — the consistent CTA used inside every paywall ──
function UpgradeCard({ headline, sub, ctaLabel = 'Upgrade to Pro', size = 'md', dense, dark }) {
  return (
    <div className="card col" style={{
      padding: size === 'sm' ? '20px 22px' : '28px 30px',
      gap: dense ? 12 : 16,
      maxWidth: size === 'sm' ? 360 : 460,
      textAlign: 'center', alignItems: 'center',
      background: dark ? 'var(--ink)' : 'var(--surface)',
      color: dark ? 'var(--bg)' : 'var(--ink)',
      borderColor: dark ? 'var(--ink)' : 'color-mix(in oklab, var(--accent) 28%, var(--line))',
      boxShadow: '0 16px 40px -16px rgba(14,19,32,.22)',
    }}>
      <ProBadge/>
      <h3 className="serif" style={{
        fontSize: size === 'sm' ? 22 : 26,
        lineHeight: 1.15, textWrap: 'balance',
        color: dark ? 'var(--bg)' : 'var(--ink)',
      }}>{headline}</h3>
      {sub && (
        <p style={{
          fontSize: 14, lineHeight: 1.5,
          color: dark ? 'rgba(255,255,255,0.72)' : 'var(--ink-2)',
          maxWidth: 360,
        }}>{sub}</p>
      )}
      <div className="row gap-12" style={{ marginTop: dense ? 0 : 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-accent" style={{ padding: '12px 20px' }}>
          {ctaLabel} <Icon name="arrow" size={13}/>
        </button>
        <button className="btn btn-ghost" style={{
          color: dark ? 'rgba(255,255,255,0.7)' : 'var(--ink-2)',
          borderColor: dark ? 'rgba(255,255,255,0.2)' : 'var(--line-strong)',
        }}>See what's included</button>
      </div>
      <div className="mono" style={{
        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: dark ? 'rgba(255,255,255,0.45)' : 'var(--muted)',
        marginTop: dense ? 2 : 4,
      }}>$10/mo · cancel anytime</div>
    </div>
  );
}

// ── 3. Locked section — blurred content beneath an upgrade card ──
function LockedSection({ headline, sub, ctaLabel, mockContent, height = 320 }) {
  return (
    <div className="locked-base" style={{
      height,
      background: 'var(--surface)',
      border: '1px solid var(--line)',
    }}>
      {/* Mock content underneath (will be blurred by the overlay) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {mockContent}
      </div>

      {/* Overlay */}
      <div className="locked-overlay">
        <UpgradeCard
          headline={headline}
          sub={sub}
          ctaLabel={ctaLabel}
          size="sm"
          dense
        />
      </div>
    </div>
  );
}

// ── 4. Truncated AI verdict — first paragraph visible, fade to lock ──
function TruncatedVerdict({ firstParagraph }) {
  return (
    <div style={{
      background: 'var(--ink)', color: 'var(--bg)',
      borderRadius: 24,
      padding: 'clamp(36px, 4vw, 56px)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="row gap-8" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 20 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)' }} className="live-dot"/>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Scout AI · investor verdict</span>
        <span style={{ flex: 1 }}/>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>1 of 3 paragraphs · free tier</span>
      </div>

      {/* First paragraph — fully visible */}
      <div className="serif" style={{
        fontSize: 'clamp(22px, 2.6vw, 32px)', lineHeight: 1.15, letterSpacing: '-0.02em',
        color: 'var(--bg)', textWrap: 'balance',
      }}>
        {firstParagraph}
      </div>

      {/* Fade-out preview of paragraph 2 — partial visible then fade */}
      <div style={{ position: 'relative', marginTop: 22 }}>
        <div className="serif" style={{
          fontSize: 'clamp(17px, 1.7vw, 21px)',
          lineHeight: 1.5,
          color: 'rgba(255,255,255,0.55)',
          filter: 'blur(3px)',
          userSelect: 'none',
          maxHeight: 110, overflow: 'hidden',
        }}>
          Run the numbers at current rates and you are looking at $4,733 going out every month against roughly $2,900 coming in — a $1,833 shortfall every single month before a single vacancy or repair. The DSCR sits at 0.45×, which means most investment mortgage products will not even be available to you here. The only scenario where this makes sense is as a personal residence, not a rental.
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 0%, var(--ink) 80%)',
          pointerEvents: 'none',
        }}/>
      </div>

      {/* Inline upgrade strip */}
      <div className="row" style={{
        marginTop: 18,
        padding: '14px 18px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
          <ProBadge/>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
            Read the full 3-paragraph verdict with specific dollar gaps and a precise next step.
          </span>
        </div>
        <button className="btn btn-accent" style={{ padding: '10px 16px' }}>
          Unlock full verdict <Icon name="arrow" size={13}/>
        </button>
      </div>
    </div>
  );
}

// ── 5. Locked button — for PDF, Save to portfolio, etc. ──────────
function LockedButton({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn"
      style={{
        background: 'var(--bg-elev)',
        color: 'var(--muted)',
        border: '1px solid var(--line)',
        padding: '11px 16px',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.color = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--line)';
        e.currentTarget.style.color = 'var(--muted)';
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="11" width="16" height="10" rx="1.5"/>
        <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
      </svg>
      {icon && <Icon name={icon} size={13}/>}
      {label}
      <span className="pro-badge" style={{
        marginLeft: 4, padding: '3px 7px', fontSize: 9,
      }}>Pro</span>
    </button>
  );
}

// ── 6. Upgrade modal — when user clicks a Pro-only action ────────
function UpgradeModal({ open, onClose, feature }) {
  useEffectPc(() => {
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

  // Feature-specific pitch
  const f = FEATURE_COPY[feature] || FEATURE_COPY.generic;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483640,
        background: 'rgba(10, 13, 20, 0.55)',
        backdropFilter: 'blur(10px) saturate(140%)',
        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        maxHeight: 'calc(100vh - 48px)',
        background: 'var(--surface)', color: 'var(--ink)',
        borderRadius: 24, border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-pop)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 14, right: 14, zIndex: 2,
          width: 32, height: 32, borderRadius: 999,
          background: 'color-mix(in oklab, var(--surface) 88%, transparent)',
          border: '1px solid var(--line)', cursor: 'pointer',
          color: 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
        }}>×</button>

        <div className="mm-scroll" style={{ overflowY: 'auto', padding: 'clamp(26px, 2.8vw, 36px)' }}>
        <ProBadge/>

        <h2 className="serif" style={{ fontSize: 'clamp(26px, 2.8vw, 36px)', lineHeight: 1.1, marginTop: 18, marginBottom: 12, textWrap: 'balance' }}>
          {f.headline}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', marginBottom: 24, lineHeight: 1.55 }}>{f.sub}</p>

        {/* What's included list */}
        <div style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 22,
        }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>What's in Investor Pro</div>
          <div className="col" style={{ gap: 10 }}>
            {[
              'Unlimited analyses — all four report types',
              'Full 3-paragraph AI verdicts with dollar gaps',
              'Financing sliders · OSFI · 35% down · conservative',
              'SunScout with building obstruction (Mapbox 3D)',
              'Branded PDF export · shareable links',
              'Portfolio tracker · up to 10 properties',
            ].map((t) => (
              <div key={t} className="row gap-10" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}><Icon name="check" size={14} stroke={2}/></span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Price block */}
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="serif tabular" style={{ fontSize: 40, lineHeight: 1 }}>$10<span style={{ fontSize: 14, color: 'var(--muted)' }}>/mo</span></span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>or $100/yr · 2 months free</span>
          </div>
          <span className="chip" style={{
            background: 'color-mix(in oklab, var(--pass) 10%, transparent)',
            borderColor: 'color-mix(in oklab, var(--pass) 30%, transparent)',
            color: 'var(--pass)',
          }}>14-day money-back</span>
        </div>

        <div className="col gap-10">
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 16, fontSize: 15 }}>
            Start Investor Pro <Icon name="arrow" size={14}/>
          </button>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
            Not right now
          </button>
        </div>
        </div>{/* /mm-scroll */}
      </div>
    </div>
  );
}

const FEATURE_COPY = {
  pdf: {
    headline: <>Export this report as a <em style={{ color: 'var(--accent)' }}>branded PDF</em></>,
    sub: 'Eight-page investor PDF with your branding, Scout-Mark watermark, and a 30-day shareable client link. Looks like something an analyst would send.',
  },
  portfolio: {
    headline: <>Save this and <em style={{ color: 'var(--accent)' }}>track up to 10 properties</em></>,
    sub: 'Side-by-side dashboard of every property you\'re modeling, with refreshed comps and rate snapshots. Investor Pro includes 10 properties; Professional unlocks unlimited.',
  },
  sunscout: {
    headline: <>Accurate sun path in <em style={{ color: 'var(--accent)' }}>dense urban cores</em></>,
    sub: 'Investor Pro unlocks building-obstruction modeling via Mapbox 3D building tiles. For Toronto, Vancouver, and other dense markets this can shift the light score by 20+ points.',
  },
  verdict: {
    headline: <>Read the <em style={{ color: 'var(--accent)' }}>full 3-paragraph</em> verdict</>,
    sub: 'Free tier shows the headline. Pro shows the full reasoning with specific dollar gaps and a precise next step you can act on.',
  },
  generic: {
    headline: <>Unlock <em style={{ color: 'var(--accent)' }}>all of PropScout</em></>,
    sub: 'Unlimited analyses, full AI verdicts, PDF export, portfolio tracker, and SunScout building obstruction.',
  },
};

// ── 7. Free-tier hard gate — full-page block on 11th analysis ────
function HardLimitGate({ onClose, monthlyLimit = 3, used = 3, resetsIn = '8 days' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2147483640,
      background: 'rgba(10, 13, 20, 0.65)',
      backdropFilter: 'blur(14px) saturate(140%)',
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 620,
        background: 'var(--ink)', color: 'var(--bg)',
        borderRadius: 28,
        padding: 'clamp(36px, 4vw, 56px)',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,.6)',
      }}>
        {/* Scout-mark watermark */}
        <div style={{
          position: 'absolute', right: -100, top: -60,
          opacity: 0.06, color: 'var(--accent)',
        }}>
          <ScoutMark size={560} color="var(--accent)"/>
        </div>

        <div className="col" style={{ position: 'relative', zIndex: 1, gap: 20 }}>
          <div className="row gap-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)' }}/>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Free tier · monthly limit reached</span>
          </div>

          <h2 className="serif" style={{
            color: 'var(--bg)', fontSize: 'clamp(32px, 4vw, 48px)',
            lineHeight: 1.05, letterSpacing: '-0.02em', textWrap: 'balance',
          }}>
            You've used your <span style={{ color: 'var(--accent)' }}>{used} of {monthlyLimit}</span> free reports this month.
          </h2>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, maxWidth: 480 }}>
            Your free quota resets in <span className="tabular" style={{ color: 'var(--bg)' }}>{resetsIn}</span>. Or unlock unlimited reports, full AI verdicts, financing sliders, and PDF export with Investor Pro — for less than your average lunch.
          </p>

          {/* Counter visual */}
          <div className="row gap-8" style={{ marginTop: 4 }}>
            {Array.from({ length: monthlyLimit }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 999,
                background: i < used ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
              }}/>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            <span>Started this cycle May 1</span>
            <span className="mono tabular">Resets June 1 · {resetsIn}</span>
          </div>

          <div className="divider" style={{ background: 'rgba(255,255,255,0.12)', margin: '6px 0' }}/>

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
            <div className="col" style={{ gap: 2 }}>
              <span className="serif tabular" style={{ fontSize: 36, lineHeight: 1 }}>$10<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>/mo</span></span>
              <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>or $100/yr · 2 months free</span>
            </div>
            <div className="row gap-10">
              <button className="btn btn-accent" style={{ padding: '14px 20px', fontSize: 15 }}>
                Upgrade now <Icon name="arrow" size={14}/>
              </button>
              <button onClick={onClose} className="btn" style={{
                background: 'transparent', color: 'var(--bg)',
                border: '1px solid rgba(255,255,255,0.2)', padding: '14px 20px',
              }}>Wait it out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ProBadge, UpgradeCard, LockedSection, TruncatedVerdict,
  LockedButton, UpgradeModal, HardLimitGate, FEATURE_COPY,
});
