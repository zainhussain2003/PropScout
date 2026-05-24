// tenant-blocks.jsx — section components for the Tenant Report.
// Each section follows the same pattern: eyebrow (SECTION 0X · TOPIC) + serif
// question + verdict pill (right-aligned) + body content.

const { useState: useStateTb } = React;

// ── Reusable section header ─────────────────────────────────────
function SectionHead({ n, topic, question, verdict, verdictTone = 'pass' }) {
  return (
    <div className="tr-section-head">
      <div className="col gap-12" style={{ maxWidth: 760 }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          <span style={{ color: 'var(--accent)' }}>§ {n}</span>
          <span style={{ marginLeft: 12, color: 'var(--muted)' }}>{topic}</span>
        </span>
        <h2 className="serif" style={{ textWrap: 'balance' }}>{question}</h2>
      </div>
      {verdict && (
        <span className={`verdict-pill ${verdictTone}`}>{verdict}</span>
      )}
    </div>
  );
}

// ── Top nav adapted for in-report context (breadcrumb) ──────────
function ReportNav({ dark, onToggleDark, onSignIn }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'saturate(180%) blur(14px)',
      WebkitBackdropFilter: 'saturate(180%) blur(14px)',
      background: 'color-mix(in oklab, var(--bg) 84%, transparent)',
      borderBottom: '1px solid var(--line)',
    }}>
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        <div className="row gap-16">
          <Wordmark height={22}/>
          <div className="row gap-8" style={{ color: 'var(--muted)', fontSize: 13 }}>
            <span style={{ opacity: 0.55 }}>/</span>
            <span>Tenant report</span>
            <span style={{ opacity: 0.55 }}>/</span>
            <span style={{ color: 'var(--ink)', fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>3705-charles-st-e</span>
          </div>
        </div>

        <div className="row gap-12">
          <button className="btn btn-ghost" onClick={onToggleDark} aria-label="Toggle theme" style={{ padding: '10px 12px' }}>
            <Icon name={dark ? 'sun' : 'moon'} size={15}/>
          </button>
          <button className="btn btn-ghost" style={{ padding: '10px 14px' }}><Icon name="link" size={13}/> Share link</button>
          <button className="btn btn-primary" onClick={onSignIn}>Save report <Icon name="arrow" size={13}/></button>
        </div>
      </div>
    </header>
  );
}

// ── Property hero (top of page) ──────────────────────────────────
function PropertyHero({ listing }) {
  // listing: { addressLine1, addressLine2, asking, beds, baths, sqft, floor, photos, chips, scoreNumber }
  return (
    <section className="container" style={{ paddingTop: 56, paddingBottom: 48 }}>
      {/* Breadcrumb-style eyebrow + back link */}
      <div className="row gap-12" style={{ marginBottom: 28, color: 'var(--muted)', fontSize: 13 }}>
        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={13}/></span> Analyze another listing</a>
        <span style={{ opacity: 0.4 }}>·</span>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Report · Tenant view</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }} className="live-dot"/>
          Refreshed 3 min ago
        </span>
      </div>

      {/* Two-column hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'clamp(28px, 3.5vw, 52px)', alignItems: 'flex-start' }}>
        {/* LEFT */}
        <div className="col" style={{ gap: 28 }}>
          {/* Photo strip — single hero + 3 thumbnails */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>
            <div className="photo-ph" style={{ borderRadius: 18, height: '100%' }}>
              <span>unit · skyline view</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}><span>living</span></div>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}><span>kitchen</span></div>
              <div className="photo-ph" style={{ borderRadius: 14, flex: 1, position: 'relative' }}>
                <span>bedroom</span>
                <div className="mono" style={{
                  position: 'absolute', right: 10, bottom: 10,
                  fontSize: 10, letterSpacing: '0.1em', padding: '3px 8px',
                  background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
                  borderRadius: 999,
                  color: 'var(--ink)',
                  backdropFilter: 'blur(4px)',
                }}>+ 18 more</div>
              </div>
            </div>
          </div>

          {/* Chips + Address + Sub */}
          <div className="col" style={{ gap: 18 }}>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {listing.chips.map((c, i) => (
                <Chip key={i}>{c}</Chip>
              ))}
            </div>

            <h1 className="serif" style={{ textWrap: 'balance', letterSpacing: '-0.035em', marginTop: 4 }}>
              {listing.addressLine1}
            </h1>
            <div style={{ fontSize: 16, color: 'var(--muted)' }}>{listing.addressLine2}</div>

            <div className="row gap-20" style={{ flexWrap: 'wrap', marginTop: 8, fontSize: 14, color: 'var(--ink-2)' }}>
              <span className="row gap-8"><Icon name="key" size={14}/> {listing.beds} · {listing.baths} bath</span>
              <span className="row gap-8"><Icon name="house" size={14}/> {listing.sqft} sqft</span>
              <span className="row gap-8"><Icon name="dot" size={10}/> {listing.floor}</span>
              <span className="row gap-8"><Icon name="check" size={14}/> {listing.utilities}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — score + headline + actions */}
        <div className="card col" style={{ padding: 32, gap: 24, position: 'sticky', top: 84 }}>
          <div className="col gap-8" style={{ alignItems: 'center' }}>
            <DealScore score={listing.scoreNumber} size={170} label="Tenant score / 100"/>
          </div>

          <div className="col gap-8" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--caution)' }}>
              Negotiate first
            </div>
            <div className="serif" style={{ fontSize: 22, lineHeight: 1.15, textWrap: 'balance' }}>
              Priced above market and listing may misrepresent the unit.
            </div>
          </div>

          <div className="divider"/>

          {/* Headline price block — stacked vertically */}
          <div className="col gap-12" style={{ marginTop: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Asking
              </span>
              <span className="serif tabular" style={{ fontSize: 34, lineHeight: 1 }}>
                ${listing.asking.toLocaleString()}<span style={{ fontSize: 14, color: 'var(--muted)' }}>/mo</span>
              </span>
            </div>
            <div className="row" style={{
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'color-mix(in oklab, var(--pass) 8%, transparent)',
              border: '1px solid color-mix(in oklab, var(--pass) 25%, transparent)',
            }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pass)' }}>
                Your target
              </span>
              <span className="serif tabular" style={{ fontSize: 22, lineHeight: 1, color: 'var(--pass)' }}>$1,950–2,000</span>
            </div>
          </div>

          {/* Actions */}
          <div className="col gap-8">
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
              Save report <Icon name="arrow" size={14}/>
            </button>
            <div className="row gap-8">
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '11px 12px', fontSize: 13 }}>
                <Icon name="link" size={13}/> Share
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '11px 12px', fontSize: 13 }}>
                <Icon name="doc" size={13}/> PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { SectionHead, ReportNav, PropertyHero });
