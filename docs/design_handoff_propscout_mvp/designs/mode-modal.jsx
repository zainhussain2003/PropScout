// mode-modal.jsx — the routing modal shown after a user pastes a URL.
//
// After we detect for-sale vs for-rent, we ask ONE question: investment vs personal
// (for sale), or tenant vs landlord (for rent). Each choice routes to a tailored
// report — every section, calculation, and verdict downstream is shaped by that one
// answer. This modal is the single most important UX gate in the product, so it
// shows the listing PropScout read, the choice in plain language, and a hint of
// what each path will give them.

const { useState: useStateMm, useEffect: useEffectMm } = React;

// ── The two routing options, by listing type ──────────────────────
const MODE_OPTIONS = {
  sale: [
    {
      key: 'investment',
      who: 'investor',
      title: "I'm buying it as an investment",
      sub: 'I want to rent it out (or model whether I should).',
      icon: 'chart',
      hints: [
        'Cap rate, cash flow, DSCR',
        'OSFI stress test · Ontario LTT',
        'Scout deal score · 0–100',
      ],
    },
    {
      key: 'personal',
      who: 'home buyer',
      title: "I'm buying it to live in",
      sub: 'I want to know the real monthly cost and the right offer.',
      icon: 'house',
      hints: [
        'True monthly cost of ownership',
        'Fair-market band from recent sales',
        'School catchments · walkability',
      ],
    },
  ],
  rent: [
    {
      key: 'tenant',
      who: 'tenant',
      title: "I'm evaluating this as a tenant",
      sub: 'I want to know if it\'s priced fairly and how to negotiate.',
      icon: 'key',
      hints: [
        'Rent positioning vs building & FSA',
        'Listing accuracy · fake-bedroom flags',
        'Negotiation target & leverage',
      ],
      free: true,
    },
    {
      key: 'landlord',
      who: 'landlord',
      title: "I'm pricing my own unit",
      sub: 'I want to know if my asking rent pencils against the market.',
      icon: 'flag',
      hints: [
        'Yield vs market median',
        'Building supply pressure',
        '12-month trend & vacancy',
      ],
    },
  ],
};

// ── A single choice card ──────────────────────────────────────────
function ChoiceCard({ opt, selected, dimmed, onClick }) {
  const [hovered, setHovered] = useStateMm(false);
  const active = selected || hovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 0',
        textAlign: 'left',
        background: selected ? 'color-mix(in oklab, var(--accent) 8%, var(--surface))' : 'var(--surface)',
        border: '1.5px solid',
        borderColor: selected ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--line)',
        borderRadius: 18,
        padding: '20px 20px',
        cursor: 'pointer',
        opacity: dimmed ? 0.45 : 1,
        transform: active && !dimmed ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border-color .18s ease, transform .18s ease, opacity .25s ease, background-color .25s ease, box-shadow .18s ease',
        boxShadow: active && !dimmed
          ? '0 16px 36px -16px color-mix(in oklab, var(--accent) 35%, transparent), 0 2px 6px rgba(14,19,32,.05)'
          : '0 1px 0 rgba(14,19,32,.03)',
        font: 'inherit',
        color: 'inherit',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Free pill — top-right, only for tenant */}
      {opt.free && (
        <span className="mono" style={{
          position: 'absolute', top: 18, right: 18,
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--accent)',
          padding: '3px 8px', borderRadius: 999,
          background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
          border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
        }}>Free forever</span>
      )}

      {/* Icon disc */}
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: active ? 'var(--accent)' : 'var(--bg-elev)',
        color: active ? 'var(--accent-ink)' : 'var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        transition: 'background-color .18s ease, color .18s ease',
      }}>
        <Icon name={opt.icon} size={20} stroke={1.6}/>
      </div>

      {/* Eyebrow */}
      <div className="mono" style={{
        fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: active ? 'var(--accent)' : 'var(--muted)',
        marginBottom: 6,
        transition: 'color .18s ease',
      }}>
        For the {opt.who}
      </div>

      {/* Title */}
      <div className="serif" style={{
        fontSize: 22, lineHeight: 1.12, letterSpacing: '-0.015em',
        marginBottom: 6,
      }}>{opt.title}</div>

      {/* Sub */}
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.5 }}>{opt.sub}</div>

      {/* Hints */}
      <div className="col" style={{ gap: 8 }}>
        {opt.hints.map((h) => (
          <div key={h} className="row gap-8" style={{ fontSize: 12.5, color: 'var(--muted)', alignItems: 'flex-start' }}>
            <span style={{ color: active ? 'var(--accent)' : 'var(--muted)', marginTop: 2, transition: 'color .18s ease' }}>
              <Icon name="check" size={12} stroke={2}/>
            </span>
            <span>{h}</span>
          </div>
        ))}
      </div>

      {/* Arrow chip — bottom-right */}
      <div className="row gap-8" style={{
        marginTop: 18,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span className="mono" style={{
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: active ? 'var(--accent)' : 'var(--muted)',
          transition: 'color .18s ease',
        }}>
          Open this report
        </span>
        <span style={{
          width: 28, height: 28, borderRadius: 999,
          background: active ? 'var(--accent)' : 'transparent',
          border: '1px solid',
          borderColor: active ? 'var(--accent)' : 'var(--line-strong)',
          color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background-color .18s ease, color .18s ease, border-color .18s ease, transform .18s ease',
          transform: active ? 'translateX(2px)' : 'none',
        }}>
          <Icon name="arrow" size={13}/>
        </span>
      </div>
    </button>
  );
}

// ── Listing preview strip (top of modal) ──────────────────────────
function ListingPreview({ listing }) {
  return (
    <div className="row gap-16" style={{
      padding: 14,
      borderRadius: 14,
      background: 'var(--bg-elev)',
      border: '1px solid var(--line)',
      alignItems: 'stretch',
    }}>
      {/* Photo placeholder */}
      <div className="photo-ph" style={{ width: 88, height: 64, borderRadius: 10, padding: 0, flexShrink: 0 }}/>

      <div className="col grow" style={{ gap: 4, justifyContent: 'center', minWidth: 0 }}>
        <div className="row gap-8" style={{ alignItems: 'center' }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }} className="live-dot"/>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pass)' }}>
            Listing found · {listing.kind === 'sale' ? 'for sale' : 'for rent'}
          </span>
        </div>
        <div className="serif" style={{
          fontSize: 18, lineHeight: 1.2, letterSpacing: '-0.005em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{listing.address}</div>
        <div className="row gap-8" style={{ fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span className="tabular">{listing.price}</span>
          <span>·</span>
          <span>{listing.beds}</span>
          <span>·</span>
          <span>{listing.sqft}</span>
          {listing.extra && (<><span>·</span><span>{listing.extra}</span></>)}
        </div>
      </div>
    </div>
  );
}

// ── The modal ─────────────────────────────────────────────────────
function ModeModal({
  open,
  listing,
  onClose,
  onSelect,
  initialSelected,
  forceState,         // optional: 'idle' | 'selected' | 'loading' — for demos
  forceHoverKey,      // optional: card key to show as hover-active
}) {
  const kind = listing?.kind || 'sale';
  const options = MODE_OPTIONS[kind];

  const [selected, setSelected] = useStateMm(initialSelected || null);
  const [loading, setLoading] = useStateMm(false);
  const [progress, setProgress] = useStateMm(0);
  const [whyOpen, setWhyOpen] = useStateMm(false);

  // Reset when modal opens or listing changes
  useEffectMm(() => {
    if (open) {
      setSelected(initialSelected || null);
      setLoading(false);
      setProgress(0);
      setWhyOpen(false);
    }
  }, [open, listing, initialSelected]);

  // Apply demo force-state
  useEffectMm(() => {
    if (forceState === 'selected') {
      setSelected(options[0].key);
      setLoading(false);
    } else if (forceState === 'loading') {
      setSelected(options[0].key);
      setLoading(true);
      setProgress(45);
    } else if (forceState === 'idle') {
      setSelected(null);
      setLoading(false);
    }
  }, [forceState, kind]);

  // Esc to close
  useEffectMm(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSelect = (k) => {
    if (loading) return;
    setSelected(k);
    setLoading(true);
    setProgress(0);
    // animate progress
    let p = 0;
    const tick = setInterval(() => {
      p += 12;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(tick);
        setTimeout(() => onSelect && onSelect(k), 250);
      }
    }, 180);
  };

  if (!open) return null;

  const question = kind === 'sale'
    ? <>Are you buying this <em style={{ color: 'var(--accent)' }}>as an investment</em>, or to live in?</>
    : <>Are you a <em style={{ color: 'var(--accent)' }}>tenant</em> looking at this, or a landlord pricing it?</>;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose && onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483640,
        background: 'rgba(10, 13, 20, 0.55)',
        backdropFilter: 'blur(10px) saturate(140%)',
        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        opacity: 1,
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 760,
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--surface)', color: 'var(--ink)',
          borderRadius: 24, border: '1px solid var(--line)',
          boxShadow: '0 32px 64px -24px rgba(14,19,32,.45)',
          position: 'relative',
          opacity: 1,
          overflow: 'hidden',     /* clip scrollbar to rounded corners */
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Close — pinned to the rounded corner, on top of scroller */}
        <button
          onClick={() => onClose && onClose()}
          aria-label="Close"
          disabled={loading}
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 2,
            width: 32, height: 32, borderRadius: 999,
            background: 'color-mix(in oklab, var(--surface) 88%, transparent)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid var(--line)',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: 'var(--ink-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, lineHeight: 1,
            opacity: loading ? 0.35 : 1,
            transition: 'color .15s ease, border-color .15s ease, background-color .15s ease',
          }}
          onMouseEnter={(e) => {
            if (loading) return;
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--ink-2)';
            e.currentTarget.style.borderColor = 'var(--line)';
          }}
        >×</button>

        {/* Inner scroll container — its scrollbar is inside the rounded clip */}
        <div className="mm-scroll" style={{
          overflowY: 'auto',
          padding: 'clamp(22px, 2.6vw, 34px)',
        }}>

        {/* Listing preview */}
        {listing && <ListingPreview listing={listing}/>}

        {/* Question */}
        <div className="col" style={{ marginTop: 20, marginBottom: 20 }}>
          <span className="section-tag" style={{ marginBottom: 12 }}>One quick question</span>
          <h2 className="serif" style={{
            fontSize: 'clamp(24px, 2.4vw, 32px)',
            lineHeight: 1.12, letterSpacing: '-0.025em',
            textWrap: 'balance',
            padding: 0, margin: 0,
          }}>
            {question}
          </h2>
        </div>

        {/* Choice cards */}
        <div className="row gap-16" style={{ alignItems: 'stretch' }}>
          {options.map((opt) => (
            <ChoiceCard
              key={opt.key}
              opt={opt}
              selected={selected === opt.key}
              dimmed={selected && selected !== opt.key}
              onClick={() => handleSelect(opt.key)}
            />
          ))}
        </div>

        {/* Loading bar (under cards, slides in when active) */}
        <div style={{
          height: loading ? 'auto' : 0,
          overflow: 'hidden',
          transition: 'height .3s ease',
        }}>
          {loading && (
            <div className="col gap-10" style={{ marginTop: 22 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  Opening your report · {progress}%
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>~12s</div>
              </div>
              <div style={{ height: 3, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width .2s ease' }}/>
              </div>
            </div>
          )}
        </div>

        {/* Why are we asking */}
        <div className="col" style={{ marginTop: 18, alignItems: 'center' }}>
          <button
            onClick={() => setWhyOpen(!whyOpen)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--muted)',
              padding: '6px 12px',
            }}
          >
            {whyOpen ? '— Hide why we ask' : '+ Why are we asking this?'}
          </button>
          {whyOpen && (
            <p style={{
              fontSize: 13, color: 'var(--ink-2)', textAlign: 'center', maxWidth: 520,
              marginTop: 4, lineHeight: 1.6,
            }}>
              The numbers that matter for a <em>tenant</em> are different from the numbers a <em>landlord</em> cares about — even on the same listing. We tailor the whole report to your angle so you're not reading sections that don't apply. You can switch later from inside the report.
            </p>
          )}
        </div>
        </div>{/* /mm-scroll */}
      </div>
    </div>
  );
}

Object.assign(window, { ModeModal, MODE_OPTIONS });
