// account-views.jsx — the four tab views: Saved · Profile · Plan · Notifications

const { useState: useStateAv } = React;

// ── Mock saved analyses ──────────────────────────────────────────
const SAVED_ANALYSES = [
  { id: 'a1', kind: 'investor', address: 'Unit 5702 · 5 Buttermill Ave',  city: 'Vaughan, ON',  score: 9,  verdict: 'Hard pass',  tone: 'fail',    savedAgo: '3 hours ago',  opens: 4, ask: '$729,900', metricLabel: 'Cash flow', metricValue: '−$1,833/mo' },
  { id: 'a2', kind: 'investor', address: '146 East 19th Street',           city: 'Hamilton, ON', score: 84, verdict: 'Strong deal', tone: 'pass',    savedAgo: 'Yesterday',     opens: 2, ask: '$449,000', metricLabel: 'Cash flow', metricValue: '+$539/mo' },
  { id: 'a3', kind: 'tenant',   address: 'Unit 3705 · 28 Charles St E',    city: 'Toronto, ON',  score: 58, verdict: 'Negotiate',    tone: 'caution', savedAgo: '2 days ago',    opens: 6, ask: '$2,150/mo', metricLabel: 'Target',    metricValue: '$1,950–2,000' },
  { id: 'a4', kind: 'personal', address: '248 Mountcrest Avenue',          city: 'Burlington, ON', score: 76, verdict: 'Worth pursuing', tone: 'pass', savedAgo: '4 days ago',  opens: 3, ask: '$875,000', metricLabel: 'Monthly cost', metricValue: '$5,180/mo' },
  { id: 'a5', kind: 'landlord', address: 'Unit 3208 · 88 Harbour Street',  city: 'Toronto, ON',  score: 42, verdict: 'Rent too high', tone: 'caution', savedAgo: 'Last week',    opens: 1, ask: '$3,400/mo', metricLabel: 'Days listed', metricValue: '38 days' },
  { id: 'a6', kind: 'investor', address: '128 Spadina Road',                city: 'Toronto, ON',  score: 22, verdict: 'Do not buy',   tone: 'fail',    savedAgo: 'Last week',    opens: 2, ask: '$1.49M',    metricLabel: 'Cap rate',  metricValue: '1.4%' },
  { id: 'a7', kind: 'personal', address: '17 Linden Avenue',                city: 'Oakville, ON', score: 68, verdict: 'Worth pursuing', tone: 'pass', savedAgo: '2 weeks ago',  opens: 5, ask: '$1.18M',    metricLabel: 'Monthly cost', metricValue: '$6,420/mo' },
  { id: 'a8', kind: 'tenant',   address: '42 Wellesley St E #1107',         city: 'Toronto, ON',  score: 72, verdict: 'Sign at asking', tone: 'pass', savedAgo: '3 weeks ago',  opens: 1, ask: '$2,400/mo', metricLabel: 'Target',    metricValue: '$2,300–2,400' },
];

const KIND_LABEL = {
  investor: 'Investment',
  personal: 'Personal buy',
  tenant:   'Tenant view',
  landlord: 'Landlord view',
};
const KIND_COLOR = {
  investor: 'var(--accent)',
  personal: 'var(--pass)',
  tenant:   'var(--caution)',
  landlord: 'var(--ink)',
};

// ══════════════════════════════════════════════════════════════════
//  Saved Analyses view
// ══════════════════════════════════════════════════════════════════
function SavedAnalysesView({ tier, onUpgrade }) {
  const [filter, setFilter] = useStateAv('all');
  const [search, setSearch] = useStateAv('');

  const filtered = SAVED_ANALYSES.filter((a) => {
    if (filter !== 'all' && a.kind !== filter) return false;
    if (search && !a.address.toLowerCase().includes(search.toLowerCase()) && !a.city.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const freeLimit = 10;
  const remaining = freeLimit - SAVED_ANALYSES.length;

  return (
    <div className="col" style={{ gap: 28 }}>
      {/* View header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div className="col" style={{ gap: 6 }}>
          <h1 className="serif">Saved analyses</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            {tier === 'free'
              ? <>You've saved <span className="tabular" style={{ color: 'var(--ink)' }}>{SAVED_ANALYSES.length} of {freeLimit}</span> on the free plan · {remaining} slot{remaining === 1 ? '' : 's'} left</>
              : <>Unlimited saved analyses · sorted by most recent</>
            }
          </p>
        </div>
        <button className="btn btn-primary"><Icon name="plus" size={13}/> Analyze new listing</button>
      </div>

      {/* Controls */}
      <div className="row gap-12" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {/* Filter chips */}
        <div className="row gap-6" style={{ padding: 4, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)' }}>
          {[
            { k: 'all',      label: `All · ${SAVED_ANALYSES.length}` },
            { k: 'investor', label: 'Investment' },
            { k: 'personal', label: 'Personal' },
            { k: 'tenant',   label: 'Tenant' },
            { k: 'landlord', label: 'Landlord' },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className="mono"
              style={{
                background: filter === f.k ? 'var(--ink)' : 'transparent',
                color: filter === f.k ? 'var(--bg)' : 'var(--ink-2)',
                fontSize: 11, letterSpacing: '0.06em',
                padding: '7px 12px', borderRadius: 999,
                border: 'none', cursor: 'pointer',
                fontWeight: 500,
              }}>{f.label}</button>
          ))}
        </div>

        {/* Search */}
        <div className="row" style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          padding: '8px 14px', borderRadius: 999, gap: 8,
          minWidth: 260,
        }}>
          <Icon name="link" size={13}/>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address or city"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)',
            }}
          />
        </div>
      </div>

      {/* Grid of report cards */}
      {filtered.length === 0 ? (
        <div className="card col" style={{ padding: 48, alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <h3 className="serif">Nothing matches that filter.</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Try clearing the search or switching to "All".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {filtered.map((a) => <ReportCard key={a.id} item={a}/>)}
        </div>
      )}

      {/* Free-tier prompt to upgrade if at limit */}
      {tier === 'free' && SAVED_ANALYSES.length >= freeLimit - 2 && (
        <div className="card row" style={{
          padding: 22,
          background: 'color-mix(in oklab, var(--accent) 5%, var(--surface))',
          borderColor: 'color-mix(in oklab, var(--accent) 25%, var(--line))',
          gap: 18,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          <div className="col" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>{remaining} of {freeLimit} slots remaining</span>
            <h3 className="serif">Save unlimited analyses on Investor Pro.</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 540 }}>Plus full 3-paragraph AI verdicts, financing sliders, branded PDF export, and the portfolio tracker.</p>
          </div>
          <button onClick={onUpgrade} className="btn btn-accent">Upgrade to Pro <Icon name="arrow" size={13}/></button>
        </div>
      )}
    </div>
  );
}

function ReportCard({ item }) {
  const toneClass = item.tone === 'pass' ? 'pass' : item.tone === 'caution' ? 'caution' : 'fail';
  return (
    <a href={`#report/${item.id}`} className="card col" style={{
      padding: 0, overflow: 'hidden',
      textDecoration: 'none', color: 'inherit',
      transition: 'transform .15s ease, box-shadow .15s ease, border-color .15s ease',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.borderColor = 'var(--line-strong)';
      e.currentTarget.style.boxShadow = '0 12px 32px -16px rgba(14,19,32,.25)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.borderColor = 'var(--line)';
      e.currentTarget.style.boxShadow = 'var(--shadow-card)';
    }}
    >
      {/* Photo strip */}
      <div className="photo-ph" style={{ height: 130, position: 'relative' }}>
        <span>{item.kind} · {item.city.split(',')[0].toLowerCase()}</span>
        {/* Kind pill top-left */}
        <span className="mono" style={{
          position: 'absolute', top: 12, left: 12,
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          padding: '4px 10px', borderRadius: 999,
          background: 'var(--surface)', color: KIND_COLOR[item.kind],
          border: '1px solid var(--line)',
        }}>
          {KIND_LABEL[item.kind]}
        </span>
        {/* Score top-right */}
        <span className={`score-badge ${toneClass}`} style={{
          position: 'absolute', top: 12, right: 12,
        }}>{item.score}</span>
      </div>

      {/* Card body */}
      <div className="col" style={{ padding: 20, gap: 14 }}>
        <div className="col" style={{ gap: 2 }}>
          <div className="serif" style={{ fontSize: 19, lineHeight: 1.2, color: 'var(--ink)' }}>{item.address}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{item.city} · {item.ask}</div>
        </div>

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{item.metricLabel}</span>
            <span className="mono tabular" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{item.metricValue}</span>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 500,
            padding: '4px 10px', borderRadius: 999,
            color: item.tone === 'pass' ? 'var(--pass)' : item.tone === 'caution' ? 'var(--caution)' : 'var(--fail)',
            background: `color-mix(in oklab, ${item.tone === 'pass' ? 'var(--pass)' : item.tone === 'caution' ? 'var(--caution)' : 'var(--fail)'} 8%, transparent)`,
            border: `1px solid color-mix(in oklab, ${item.tone === 'pass' ? 'var(--pass)' : item.tone === 'caution' ? 'var(--caution)' : 'var(--fail)'} 30%, transparent)`,
          }}>{item.verdict}</span>
        </div>

        <div className="divider"/>

        <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
          <span className="row gap-6"><Icon name="dot" size={9}/> Saved {item.savedAgo}</span>
          <span className="row gap-6">Opened {item.opens}× · open <Icon name="arrow" size={11}/></span>
        </div>
      </div>
    </a>
  );
}

Object.assign(window, { SavedAnalysesView, ReportCard, SAVED_ANALYSES });
