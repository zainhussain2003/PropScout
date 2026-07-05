// account-v2.jsx — account dashboard, four tabs (saved / profile / plan /
// notifications). Faithful port of AccountPage.tsx. Harbour re-skin: no accent
// tweak, no raw hex. Canonical fixes: Buttermill 8/100; the two Charles St E
// rows aligned to Unit 2314 · $2,650 · 31 days. Other saved rows are the
// codebase's own demo fixture (SAVED_ANALYSES).

const { useState: useStateAc } = React;

const TWEAK_DEFAULTS_AC = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "tier": "free"
}/*EDITMODE-END*/;

const USER = { name: 'Marcus Reilly', email: 'marcus.reilly@example.com', avatarInitials: 'MR', joined: 'March 2026' };

const TIER_DETAILS = {
  free: { label: 'Free', color: 'var(--muted)', priceLine: '$0/mo', cycleNote: 'Resets monthly · 3 reports/mo' },
  pro: { label: 'Investor Pro', color: 'var(--accent)', priceLine: '$10/mo', cycleNote: 'Renews May 24, 2026' },
  professional: { label: 'Professional', color: 'var(--accent)', priceLine: '$59/mo', cycleNote: 'Renews May 24, 2026' },
};

const SAVED_ANALYSES = [
  { id: 'a1', kind: 'investor', address: 'Unit 5702 · 5 Buttermill Ave', city: 'Vaughan, ON', score: 8, verdict: 'Hard pass', tone: 'fail', savedAgo: '3 hours ago', opens: 4, ask: '$729,900', metricLabel: 'Cash flow', metricValue: '−$1,833/mo' },
  { id: 'a2', kind: 'investor', address: '146 East 19th Street', city: 'Hamilton, ON', score: 84, verdict: 'Strong deal', tone: 'pass', savedAgo: 'Yesterday', opens: 2, ask: '$449,000', metricLabel: 'Cash flow', metricValue: '+$539/mo' },
  { id: 'a3', kind: 'tenant', address: 'Unit 2314 · 28 Charles St E', city: 'Toronto, ON', score: 44, verdict: 'Above market', tone: 'caution', savedAgo: '2 days ago', opens: 6, ask: '$2,650/mo', metricLabel: 'Target', metricValue: '$2,450–2,500' },
  { id: 'a4', kind: 'personal', address: 'Unit 5702 · 5 Buttermill Ave', city: 'Vaughan, ON', score: 62, verdict: 'Negotiate first', tone: 'caution', savedAgo: '4 days ago', opens: 3, ask: '$729,900', metricLabel: 'Monthly cost', metricValue: '$5,160/mo' },
  { id: 'a5', kind: 'landlord', address: 'Unit 2314 · 28 Charles St E', city: 'Toronto, ON', score: 42, verdict: 'Top of range', tone: 'caution', savedAgo: 'Last week', opens: 1, ask: '$2,650/mo', metricLabel: 'Days listed', metricValue: '31 days' },
  { id: 'a6', kind: 'investor', address: '128 Spadina Road', city: 'Toronto, ON', score: 22, verdict: 'Do not buy', tone: 'fail', savedAgo: 'Last week', opens: 2, ask: '$1.49M', metricLabel: 'Cap rate', metricValue: '1.4%' },
  { id: 'a7', kind: 'personal', address: '17 Linden Avenue', city: 'Oakville, ON', score: 68, verdict: 'Worth pursuing', tone: 'pass', savedAgo: '2 weeks ago', opens: 5, ask: '$1.18M', metricLabel: 'Monthly cost', metricValue: '$6,420/mo' },
  { id: 'a8', kind: 'tenant', address: '42 Wellesley St E #1107', city: 'Toronto, ON', score: 72, verdict: 'Sign at asking', tone: 'pass', savedAgo: '3 weeks ago', opens: 1, ask: '$2,400/mo', metricLabel: 'Target', metricValue: '$2,300–2,400' },
];

const KIND_LABEL = { investor: 'Investment', personal: 'Personal buy', tenant: 'Tenant view', landlord: 'Landlord view' };
const KIND_COLOR = { investor: 'var(--accent)', personal: 'var(--pass)', tenant: 'var(--caution)', landlord: 'var(--ink)' };
const NAV_ITEMS = [
  { k: 'saved', label: 'Saved analyses', icon: 'doc', count: SAVED_ANALYSES.length },
  { k: 'profile', label: 'Profile', icon: 'house' },
  { k: 'plan', label: 'Plan & billing', icon: 'chart' },
  { k: 'notifications', label: 'Notifications', icon: 'flag' },
];
const INVOICES = [
  { date: 'May 24, 2026', desc: 'Investor Pro · monthly', amt: '$10.00', status: 'Paid' },
  { date: 'Apr 24, 2026', desc: 'Investor Pro · monthly', amt: '$10.00', status: 'Paid' },
  { date: 'Mar 24, 2026', desc: 'Investor Pro · monthly', amt: '$10.00', status: 'Paid' },
];

function safeTierKey(tier) { return tier === 'pro' || tier === 'professional' ? tier : 'free'; }

// ── Settings primitives ───────────────────────────────────────────────────────
function SettingsCard({ title, subtitle, children }) {
  return (
    <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="col" style={{ padding: '22px 24px 14px', gap: 4, borderBottom: '1px solid var(--line)' }}>
        <h3 className="serif">{title}</h3>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{subtitle}</p>}
      </div>
      <div className="col">{children}</div>
    </div>
  );
}
function SettingsRow({ label, hint, children }) {
  return (
    <div className="row" style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', gap: 16, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="col" style={{ gap: 2, minWidth: 180 }}>
        <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{label}</span>
        {hint && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{hint}</span>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}
function SettingsInput({ defaultValue }) {
  return <input defaultValue={defaultValue} style={{ padding: '8px 14px', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--bg-elev)', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink)', outline: 'none', minWidth: 240 }} />;
}
function SettingsSelect({ options, defaultValue }) {
  return (
    <select defaultValue={defaultValue} style={{ padding: '8px 14px', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--bg-elev)', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink)', outline: 'none', minWidth: 240 }}>
      {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
  );
}
function SettingsToggle({ defaultValue }) {
  const [on, setOn] = useStateAc(defaultValue);
  return (
    <button onClick={() => setOn(!on)} role="switch" aria-checked={on} style={{ width: 40, height: 22, borderRadius: 999, background: on ? 'var(--accent)' : 'var(--line-strong)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color .15s ease' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: 999, background: 'var(--surface)', transition: 'left .18s ease', boxShadow: 'var(--shadow-card)', display: 'block' }}></span>
    </button>
  );
}

// ── ReportCard ────────────────────────────────────────────────────────────────
function ReportCard({ item }) {
  return (
    <a href="#" className="card col" style={{ padding: 0, overflow: 'hidden', textDecoration: 'none', color: 'inherit', transition: 'transform .15s ease, box-shadow .15s ease, border-color .15s ease', cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-pop)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}>
      {/* CAPTURE: saved-analysis thumbnail — listing hero for each property */}
      <div className="photo-ph" style={{ height: 130, position: 'relative' }}>
        <span>{item.kind} · {item.city.split(',')[0].toLowerCase()}</span>
        <span className="mono" style={{ position: 'absolute', top: 12, left: 12, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999, background: 'var(--surface)', color: KIND_COLOR[item.kind], border: '1px solid var(--line)' }}>{KIND_LABEL[item.kind]}</span>
        <span className={`score-badge ${item.tone}`} style={{ position: 'absolute', top: 12, right: 12 }}>{item.score}</span>
      </div>
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
          <VerdictPill tone={item.tone} label={item.verdict} />
        </div>
        <div className="divider"></div>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
          <span className="row" style={{ gap: 6 }}><Icon name="dot" size={9} /> Saved {item.savedAgo}</span>
          <span className="row" style={{ gap: 6 }}>Opened {item.opens}× · open <Icon name="arrow" size={11} /></span>
        </div>
      </div>
    </a>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────
function SavedAnalysesView({ tier, onUpgrade }) {
  const [filter, setFilter] = useStateAc('all');
  const [search, setSearch] = useStateAc('');
  const freeLimit = 10;
  const remaining = freeLimit - SAVED_ANALYSES.length;

  const filtered = SAVED_ANALYSES.filter((a) => {
    if (filter !== 'all' && a.kind !== filter) return false;
    if (search && !a.address.toLowerCase().includes(search.toLowerCase()) && !a.city.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const FILTER_OPTIONS = [
    { k: 'all', label: `All · ${SAVED_ANALYSES.length}` },
    { k: 'investor', label: 'Investment' },
    { k: 'personal', label: 'Personal' },
    { k: 'tenant', label: 'Tenant' },
    { k: 'landlord', label: 'Landlord' },
  ];

  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div className="col" style={{ gap: 6 }}>
          <h1 className="serif">Saved analyses</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            {tier === 'free' ? (
              <React.Fragment>You've saved <span className="tabular" style={{ color: 'var(--ink)' }}>{SAVED_ANALYSES.length} of {freeLimit}</span> on the free plan · {remaining} slot{remaining === 1 ? '' : 's'} left</React.Fragment>
            ) : (<React.Fragment>Unlimited saved analyses · sorted by most recent</React.Fragment>)}
          </p>
        </div>
        <button className="btn btn-primary"><Icon name="plus" size={13} /> Analyze new listing</button>
      </div>

      <div className="row gap-12" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 4, padding: 4, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)', flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)} className="mono" style={{ background: filter === f.k ? 'var(--ink)' : 'transparent', color: filter === f.k ? 'var(--bg)' : 'var(--ink-2)', fontSize: 11, letterSpacing: '0.06em', padding: '7px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 500 }}>{f.label}</button>
          ))}
        </div>
        <div className="row" style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '8px 14px', borderRadius: 999, gap: 8, minWidth: 260 }}>
          <Icon name="search" size={13} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search address or city" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)' }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card col" style={{ padding: 48, alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <h3 className="serif">Nothing matches that filter.</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Try clearing the search or switching to "All".</p>
        </div>
      ) : (
        <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {filtered.map((a) => <ReportCard key={a.id} item={a} />)}
        </div>
      )}

      {tier === 'free' && SAVED_ANALYSES.length >= freeLimit - 2 && (
        <div className="card row" style={{ padding: 22, background: 'color-mix(in oklab, var(--accent) 5%, var(--surface))', borderColor: 'color-mix(in oklab, var(--accent) 25%, var(--line))', gap: 18, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div className="col" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>{remaining} of {freeLimit} slots remaining</span>
            <h3 className="serif">Save unlimited analyses on Investor Pro.</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 540 }}>Plus full 3-paragraph AI verdicts, financing sliders, branded PDF export, and the portfolio tracker.</p>
          </div>
          <button onClick={onUpgrade} className="btn btn-accent">Upgrade to Pro <Icon name="arrow" size={13} /></button>
        </div>
      )}
    </div>
  );
}

function ProfileView() {
  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="serif">Profile</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>How PropScout knows you and the defaults we use for your reports.</p>
      </div>
      <SettingsCard title="Identity">
        <SettingsRow label="Name" hint="Used on PDF exports + shareable reports"><SettingsInput defaultValue={USER.name} /></SettingsRow>
        <SettingsRow label="Email" hint="Login + verification + report-share notifications"><SettingsInput defaultValue={USER.email} /></SettingsRow>
        <SettingsRow label="Member since"><span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>{USER.joined}</span></SettingsRow>
      </SettingsCard>
      <SettingsCard title="Default investor assumptions" subtitle="Used when you first open an Investor or Landlord report. You can override on any single report.">
        <SettingsRow label="Default down payment" hint="Pre-filled in financing sliders"><SettingsInput defaultValue="20%" /></SettingsRow>
        <SettingsRow label="Assumed household income" hint="Used in OSFI stress test calculations"><SettingsInput defaultValue="$125,000" /></SettingsRow>
        <SettingsRow label="Annual appreciation" hint="Used in equity-build projections">
          <SettingsSelect defaultValue="0.03" options={[{ v: '0', label: '0% / yr (flat)' }, { v: '0.02', label: '2% / yr (conservative)' }, { v: '0.03', label: '3% / yr (default)' }, { v: '0.05', label: '5% / yr (optimistic)' }]} />
        </SettingsRow>
        <SettingsRow label="Include property management fee" hint="Adds 8% of gross rent to expenses"><SettingsToggle defaultValue={false} /></SettingsRow>
      </SettingsCard>
      <SettingsCard title="Account">
        <SettingsRow label="Export everything" hint="Download a ZIP of every saved analysis as PDFs"><button className="btn btn-ghost"><Icon name="doc" size={13} /> Request export</button></SettingsRow>
        <SettingsRow label="Delete account" hint="Permanently delete your data — this cannot be undone">
          <button className="btn" style={{ color: 'var(--fail)', border: '1px solid color-mix(in oklab, var(--fail) 30%, transparent)', background: 'transparent' }}>Delete account…</button>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}

function PlanView({ tier, onUpgrade }) {
  const isFree = tier === 'free';
  const tierDetail = TIER_DETAILS[safeTierKey(tier)];
  const usageItems = [
    { k: 'Sale-listing analyses', used: 2, cap: isFree ? 3 : null, sub: null },
    { k: 'Tenant reports', used: 8, cap: null, sub: 'Always unlimited' },
    { k: 'PDF exports', used: isFree ? 0 : 5, cap: isFree ? 0 : null, sub: isFree ? 'Locked on free tier' : null },
    { k: 'Saved analyses', used: 8, cap: isFree ? 10 : null, sub: null },
  ];

  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="serif">Plan &amp; billing</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Your subscription, invoices, and payment method.</p>
      </div>

      <div className="card" style={{ padding: 32, background: isFree ? 'var(--ink)' : 'color-mix(in oklab, var(--accent) 6%, var(--surface))', color: isFree ? 'var(--bg)' : 'var(--ink)', borderColor: isFree ? 'var(--ink)' : 'color-mix(in oklab, var(--accent) 25%, var(--line))' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div className="col" style={{ gap: 8 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: isFree ? 'color-mix(in oklab, var(--bg) 55%, transparent)' : 'var(--accent)' }}>You're on</span>
            <h2 className="serif" style={{ color: isFree ? 'var(--bg)' : 'var(--ink)' }}>{tierDetail.label}</h2>
            <span style={{ fontSize: 14, color: isFree ? 'color-mix(in oklab, var(--bg) 70%, transparent)' : 'var(--ink-2)' }}>
              {isFree ? 'Three sale-listing analyses per month + unlimited tenant reports. Headlines on AI verdicts; no PDF.' : 'Unlimited analyses · full 3-paragraph AI verdicts · financing sliders · PDF export · portfolio tracker.'}
            </span>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 10 }}>
            <span className="serif tabular" style={{ fontSize: 38, lineHeight: 1, color: isFree ? 'var(--bg)' : 'var(--ink)' }}>{tierDetail.priceLine}</span>
            <span className="mono" style={{ fontSize: 11, color: isFree ? 'color-mix(in oklab, var(--bg) 50%, transparent)' : 'var(--muted)' }}>{tierDetail.cycleNote}</span>
            {isFree ? (
              <button onClick={onUpgrade} className="btn btn-accent" style={{ padding: '12px 18px' }}>Upgrade <Icon name="arrow" size={13} /></button>
            ) : (
              <button className="btn" style={{ background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line-strong)', padding: '12px 18px' }}>Manage in Stripe portal <Icon name="arrow" size={13} /></button>
            )}
          </div>
        </div>
      </div>

      <SettingsCard title="This month's usage">
        <div className="col" style={{ gap: 14, padding: '8px 24px 16px' }}>
          {usageItems.map((u) => (
            <div key={u.k} className="col" style={{ gap: 4 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>{u.k}</span>
                <span className="mono tabular" style={{ fontSize: 13, color: 'var(--muted)' }}>{u.used}{u.cap !== null && u.cap > 0 ? ` / ${u.cap}` : u.cap === 0 ? ' · locked' : ''}</span>
              </div>
              {u.cap !== null && u.cap > 0 && (
                <div style={{ height: 4, borderRadius: 999, background: 'var(--line)' }}>
                  <div style={{ width: `${Math.min(100, (u.used / u.cap) * 100)}%`, height: '100%', borderRadius: 999, background: u.used >= u.cap ? 'var(--fail)' : u.used >= u.cap * 0.7 ? 'var(--caution)' : 'var(--pass)' }}></div>
                </div>
              )}
              {u.sub && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{u.sub}</span>}
            </div>
          ))}
        </div>
      </SettingsCard>

      {!isFree && (
        <SettingsCard title="Invoices" subtitle="Stripe sends a copy to your email after every charge.">
          <div className="col" style={{ padding: '8px 0 16px' }}>
            {INVOICES.map((inv, i) => (
              <div key={inv.date} className="row" style={{ justifyContent: 'space-between', padding: '14px 24px', borderBottom: i < INVOICES.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 13, gap: 12 }}>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ color: 'var(--ink)' }}>{inv.desc}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{inv.date}</span>
                </div>
                <div className="row gap-12" style={{ alignItems: 'center' }}>
                  <span className="mono tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>{inv.amt}</span>
                  <span className="chip" style={{ background: 'color-mix(in oklab, var(--pass) 10%, transparent)', color: 'var(--pass)', borderColor: 'color-mix(in oklab, var(--pass) 30%, transparent)' }}>{inv.status}</span>
                  <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }}>PDF</button>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>
      )}
    </div>
  );
}

function NotificationsView() {
  const watchRows = [
    { k: 'Rent-drop alerts', sub: 'Notify when a tracked rental drops price or is re-listed', enabled: true },
    { k: 'Comparable sale closes', sub: 'New verified sales within 1km of a saved property', enabled: true },
    { k: 'Rate change notifications', sub: 'When the Bank of Canada or our 5-yr fixed average moves', enabled: false },
  ];
  const productRows = [
    { k: 'Weekly market digest', sub: 'Tuesday morning · highlights from your tracked listings', enabled: false },
    { k: 'Investor Pro feature drops', sub: 'When new features ship — AirDNA, BC support, etc.', enabled: true },
  ];
  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="serif">Notifications</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Choose what PropScout emails you about. Transactional emails always come through.</p>
      </div>
      <SettingsCard title="Watch lists" subtitle="Listings you've asked us to monitor.">
        {watchRows.map((r) => <SettingsRow key={r.k} label={r.k} hint={r.sub}><SettingsToggle defaultValue={r.enabled} /></SettingsRow>)}
      </SettingsCard>
      <SettingsCard title="Product">
        {productRows.map((r) => <SettingsRow key={r.k} label={r.k} hint={r.sub}><SettingsToggle defaultValue={r.enabled} /></SettingsRow>)}
      </SettingsCard>
    </div>
  );
}

// ── Chrome ────────────────────────────────────────────────────────────────────
function AccountTopNav({ dark, onToggleDark, tier }) {
  const t = TIER_DETAILS[safeTierKey(tier)];
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'saturate(180%) blur(14px)', WebkitBackdropFilter: 'saturate(180%) blur(14px)', background: 'color-mix(in oklab, var(--bg) 84%, transparent)', borderBottom: '1px solid var(--line)' }}>
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        <div className="row gap-16">
          <Wordmark height={22} />
          <div className="row gap-8" style={{ color: 'var(--muted)', fontSize: 13 }}>
            <span style={{ opacity: 0.55 }}>/</span>
            <span style={{ color: 'var(--ink)' }}>Your account</span>
          </div>
        </div>
        <div className="row gap-12">
          <button className="btn btn-ghost" onClick={onToggleDark} aria-label={dark ? 'Toggle light mode' : 'Toggle dark mode'} style={{ padding: '10px 12px' }}><Icon name={dark ? 'sun' : 'moon'} size={15} /></button>
          <button className="btn btn-ghost rn-actions-wide" style={{ padding: '10px 14px' }}><Icon name="link" size={13} /> Help</button>
          <div className="row gap-10" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999, padding: '6px 14px 6px 6px', cursor: 'pointer' }}>
            <span style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--ink)', color: 'var(--bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>{USER.avatarInitials}</span>
            <span className="col" style={{ alignItems: 'flex-start', gap: 0, fontSize: 13 }}>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{USER.name.split(' ')[0]}</span>
              <span style={{ color: t.color, fontSize: 10, fontFamily: "'Geist Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.label}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function AccountSidebar({ activeTab, onTab, tier }) {
  const tierKey = safeTierKey(tier);
  const tierDetail = TIER_DETAILS[tierKey];
  return (
    <aside className="col acc-sidebar" style={{ gap: 4, position: 'sticky', top: 84, alignSelf: 'flex-start' }}>
      <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 14px 8px' }}>Manage</span>
      {NAV_ITEMS.map((item) => (
        <button key={item.k} onClick={() => onTab(item.k)} className={`acc-nav-item${activeTab === item.k ? ' active' : ''}`}>
          <Icon name={item.icon} size={15} />
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.count !== undefined && <span className="acc-nav-count">{item.count}</span>}
        </button>
      ))}
      <div className="divider" style={{ margin: '14px 14px', width: 'auto' }}></div>
      <div className="col gap-8" style={{ padding: '0 14px' }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Your plan</span>
        <div className="card col" style={{ padding: 16, gap: 10, background: tierKey === 'free' ? 'var(--surface)' : 'color-mix(in oklab, var(--accent) 5%, var(--surface))', borderColor: tierKey === 'free' ? 'var(--line)' : 'color-mix(in oklab, var(--accent) 25%, var(--line))' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 500, fontSize: 14, color: tierKey === 'free' ? 'var(--ink)' : 'var(--accent)' }}>{tierDetail.label}</span>
            <span className="mono tabular" style={{ fontSize: 12, color: 'var(--muted)' }}>{tierDetail.priceLine}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{tierDetail.cycleNote}</span>
          {tierKey === 'free' ? (
            <button onClick={() => onTab('plan')} className="btn btn-accent" style={{ padding: '8px 12px', fontSize: 12, marginTop: 4 }}>Upgrade <Icon name="arrow" size={11} /></button>
          ) : (
            <button onClick={() => onTab('plan')} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12, marginTop: 4 }}>Manage plan</button>
          )}
        </div>
      </div>
    </aside>
  );
}

function App() {
  const [dark, setDark, t, setTweak] = useThemeTweak(TWEAK_DEFAULTS_AC);
  const [activeTab, setActiveTab] = useStateAc('saved');
  const tier = t.tier === 'pro' || t.tier === 'professional' ? t.tier : 'free';
  const goUpgrade = () => setActiveTab('plan');

  let view;
  if (activeTab === 'profile') view = <ProfileView />;
  else if (activeTab === 'plan') view = <PlanView tier={tier} onUpgrade={goUpgrade} />;
  else if (activeTab === 'notifications') view = <NotificationsView />;
  else view = <SavedAnalysesView tier={tier} onUpgrade={goUpgrade} />;

  return (
    <div data-screen-label="Account">
      <AccountTopNav dark={dark} onToggleDark={() => { setDark(!dark); setTweak('theme', !dark ? 'dark' : 'light'); }} tier={tier} />
      <div className="container" style={{ padding: '40px var(--gutter)' }}>
        <div className="acc-grid">
          <AccountSidebar activeTab={activeTab} onTab={setActiveTab} tier={tier} />
          <main>{view}</main>
        </div>
      </div>
      <Footer />
      <ThemeTweakPanel dark={dark} setDark={setDark} setTweak={setTweak}>
        <TweakSection label="Account" />
        <TweakRadio label="Tier" value={tier} options={['free', 'pro']} onChange={(v) => setTweak('tier', v)} />
      </ThemeTweakPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
