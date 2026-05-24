// account-app.jsx — main shell: top nav, user header, sidebar tabs, and the
// other three views (Profile · Plan · Notifications).

const { useState: useStateAa, useEffect: useEffectAa } = React;

const TWEAK_DEFAULTS_ACC = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757",
  "tier": "free",
  "tab": "saved"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS_ACC = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

const USER = {
  name: 'Marcus Reilly',
  email: 'marcus.reilly@example.com',
  avatarInitials: 'MR',
  joined: 'March 2026',
};

const TIER_DETAILS = {
  free:        { label: 'Free',         color: 'var(--muted)', priceLine: '$0/mo',    cycleNote: 'Resets monthly · 3 reports/mo' },
  pro:         { label: 'Investor Pro', color: 'var(--accent)', priceLine: '$10/mo',  cycleNote: 'Renews May 24, 2026'        },
  professional:{ label: 'Professional', color: 'var(--accent)', priceLine: '$59/mo',  cycleNote: 'Renews May 24, 2026'        },
};

// ── Top nav ─────────────────────────────────────────────────────
function AccountTopNav({ dark, onToggleDark, tier }) {
  const t = TIER_DETAILS[tier];
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
            <span style={{ color: 'var(--ink)' }}>Your account</span>
          </div>
        </div>
        <div className="row gap-12">
          <button className="btn btn-ghost" onClick={onToggleDark} style={{ padding: '10px 12px' }}>
            <Icon name={dark ? 'sun' : 'moon'} size={15}/>
          </button>
          <button className="btn btn-ghost" style={{ padding: '10px 14px' }}>
            <Icon name="link" size={13}/> Help
          </button>
          {/* User pill */}
          <button className="row gap-10" style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 999, padding: '6px 14px 6px 6px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 999,
              background: 'var(--ink)', color: 'var(--bg)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600,
              fontFamily: "'Geist Mono', monospace",
            }}>{USER.avatarInitials}</span>
            <span className="col" style={{ alignItems: 'flex-start', gap: 0, fontSize: 13 }}>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{USER.name.split(' ')[0]}</span>
              <span style={{ color: t.color, fontSize: 10, fontFamily: "'Geist Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.label}</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────
function AccountSidebar({ tab, onTab, tier }) {
  const items = [
    { k: 'saved',         label: 'Saved analyses', icon: 'doc',    count: 8 },
    { k: 'profile',       label: 'Profile',         icon: 'house' },
    { k: 'plan',          label: 'Plan & billing',  icon: 'chart' },
    { k: 'notifications', label: 'Notifications',   icon: 'flag' },
  ];

  return (
    <aside className="col" style={{
      gap: 4, position: 'sticky', top: 84, alignSelf: 'flex-start',
    }}>
      <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 14px 8px' }}>Manage</span>
      {items.map((i) => (
        <button
          key={i.k}
          onClick={() => onTab(i.k)}
          className={`acc-nav-item ${tab === i.k ? 'active' : ''}`}
        >
          <Icon name={i.icon} size={15}/>
          <span style={{ flex: 1 }}>{i.label}</span>
          {i.count != null && <span className="acc-nav-count">{i.count}</span>}
        </button>
      ))}

      <div className="divider" style={{ margin: '14px 14px' }}/>

      {/* Tier pill at bottom */}
      <div className="col gap-8" style={{ padding: '0 14px' }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Your plan</span>
        <div className="card col" style={{
          padding: 16, gap: 10,
          background: tier === 'free' ? 'var(--surface)' : 'color-mix(in oklab, var(--accent) 5%, var(--surface))',
          borderColor: tier === 'free' ? 'var(--line)' : 'color-mix(in oklab, var(--accent) 25%, var(--line))',
        }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 500, fontSize: 14, color: tier === 'free' ? 'var(--ink)' : 'var(--accent)' }}>{TIER_DETAILS[tier].label}</span>
            <span className="mono tabular" style={{ fontSize: 12, color: 'var(--muted)' }}>{TIER_DETAILS[tier].priceLine}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{TIER_DETAILS[tier].cycleNote}</span>
          {tier === 'free' && (
            <button className="btn btn-accent" style={{ padding: '8px 12px', fontSize: 12, marginTop: 4 }}>
              Upgrade <Icon name="arrow" size={11}/>
            </button>
          )}
          {tier !== 'free' && (
            <button onClick={() => onTab('plan')} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12, marginTop: 4 }}>
              Manage plan
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Profile view
// ══════════════════════════════════════════════════════════════════
function ProfileView() {
  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="serif">Profile</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>How PropScout knows you and the defaults we use for your reports.</p>
      </div>

      {/* Identity card */}
      <SettingsCard title="Identity">
        <SettingsRow label="Name" hint="Used on PDF exports + shareable reports">
          <SettingsInput defaultValue={USER.name}/>
        </SettingsRow>
        <SettingsRow label="Email" hint="Login + verification + report-share notifications">
          <SettingsInput defaultValue={USER.email}/>
        </SettingsRow>
        <SettingsRow label="Member since">
          <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>{USER.joined}</span>
        </SettingsRow>
      </SettingsCard>

      {/* Default financing card */}
      <SettingsCard title="Default investor assumptions" subtitle="Used when you first open an Investor or Landlord report. You can override on any single report.">
        <SettingsRow label="Default down payment" hint="Pre-filled in financing sliders">
          <SettingsInput defaultValue="20%" suffix=""/>
        </SettingsRow>
        <SettingsRow label="Assumed household income" hint="Used in OSFI stress test calculations">
          <SettingsInput defaultValue="$125,000"/>
        </SettingsRow>
        <SettingsRow label="Annual appreciation" hint="Used in equity-build projections">
          <SettingsSelect
            options={[
              { v: '0',    label: '0% / yr (flat)' },
              { v: '0.02', label: '2% / yr (conservative)' },
              { v: '0.03', label: '3% / yr (default)' },
              { v: '0.05', label: '5% / yr (optimistic)' },
            ]}
            defaultValue="0.03"
          />
        </SettingsRow>
        <SettingsRow label="Include property management fee" hint="Adds 8% of gross rent to expenses">
          <SettingsToggle defaultValue={false}/>
        </SettingsRow>
      </SettingsCard>

      {/* Danger zone */}
      <SettingsCard title="Account">
        <SettingsRow label="Export everything" hint="Download a ZIP of every saved analysis as PDFs">
          <button className="btn btn-ghost"><Icon name="doc" size={13}/> Request export</button>
        </SettingsRow>
        <SettingsRow label="Delete account" hint="Permanently delete your data — this cannot be undone">
          <button className="btn" style={{
            color: 'var(--fail)',
            border: '1px solid color-mix(in oklab, var(--fail) 30%, transparent)',
            background: 'transparent',
          }}>Delete account…</button>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Plan & billing view
// ══════════════════════════════════════════════════════════════════
function PlanView({ tier, onUpgrade }) {
  const isFree = tier === 'free';
  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="serif">Plan & billing</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Your subscription, invoices, and payment method.</p>
      </div>

      {/* Current plan banner */}
      <div className="card" style={{
        padding: 32,
        background: isFree ? 'var(--ink)' : 'color-mix(in oklab, var(--accent) 6%, var(--surface))',
        color: isFree ? 'var(--bg)' : 'var(--ink)',
        borderColor: isFree ? 'var(--ink)' : 'color-mix(in oklab, var(--accent) 25%, var(--line))',
      }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div className="col" style={{ gap: 8 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: isFree ? 'rgba(255,255,255,0.55)' : 'var(--accent)' }}>
              You're on
            </span>
            <h2 className="serif" style={{ color: isFree ? 'var(--bg)' : 'var(--ink)' }}>{TIER_DETAILS[tier].label}</h2>
            <span style={{ fontSize: 14, color: isFree ? 'rgba(255,255,255,0.7)' : 'var(--ink-2)' }}>
              {isFree
                ? 'Three sale-listing analyses per month + unlimited tenant reports. Headlines on AI verdicts; no PDF.'
                : 'Unlimited analyses · full 3-paragraph AI verdicts · financing sliders · PDF export · portfolio tracker.'
              }
            </span>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 10 }}>
            <span className="serif tabular" style={{ fontSize: 38, lineHeight: 1, color: isFree ? 'var(--bg)' : 'var(--ink)' }}>
              {TIER_DETAILS[tier].priceLine}
            </span>
            <span className="mono" style={{ fontSize: 11, color: isFree ? 'rgba(255,255,255,0.5)' : 'var(--muted)' }}>{TIER_DETAILS[tier].cycleNote}</span>
            {isFree
              ? <button onClick={onUpgrade} className="btn btn-accent" style={{ padding: '12px 18px' }}>Upgrade <Icon name="arrow" size={13}/></button>
              : <button className="btn" style={{
                  background: 'transparent', color: 'var(--ink)',
                  border: '1px solid var(--line-strong)', padding: '12px 18px',
                }}>Manage in Stripe portal <Icon name="arrow" size={13}/></button>
            }
          </div>
        </div>
      </div>

      {/* Usage card */}
      <SettingsCard title="This month's usage">
        <div className="col" style={{ gap: 14, padding: '8px 24px 16px' }}>
          {[
            { k: 'Sale-listing analyses', used: 2, cap: isFree ? 3 : null },
            { k: 'Tenant reports',         used: 8, cap: null, sub: 'Always unlimited' },
            { k: 'PDF exports',            used: isFree ? 0 : 5, cap: isFree ? 0 : null, sub: isFree ? 'Locked on free tier' : null },
            { k: 'Saved analyses',         used: 8, cap: isFree ? 10 : null },
          ].map((u) => (
            <div key={u.k} className="col" style={{ gap: 4 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>{u.k}</span>
                <span className="mono tabular" style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {u.used}{u.cap ? ` / ${u.cap}` : (u.cap === 0 ? ' · locked' : '')}
                </span>
              </div>
              {u.cap > 0 && (
                <div style={{ height: 4, borderRadius: 999, background: 'var(--line)' }}>
                  <div style={{
                    width: `${Math.min(100, (u.used / u.cap) * 100)}%`,
                    height: '100%', borderRadius: 999,
                    background: u.used >= u.cap ? 'var(--fail)' : u.used >= u.cap * 0.7 ? 'var(--caution)' : 'var(--pass)',
                  }}/>
                </div>
              )}
              {u.sub && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{u.sub}</span>}
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Invoices */}
      {!isFree && (
        <SettingsCard title="Invoices" subtitle="Stripe sends a copy to your email after every charge.">
          <div className="col" style={{ padding: '8px 0 16px' }}>
            {[
              ['May 24, 2026', 'Investor Pro · monthly', '$10.00', 'Paid'],
              ['Apr 24, 2026', 'Investor Pro · monthly', '$10.00', 'Paid'],
              ['Mar 24, 2026', 'Investor Pro · monthly', '$10.00', 'Paid'],
            ].map(([date, desc, amt, status], i, arr) => (
              <div key={i} className="row" style={{
                justifyContent: 'space-between',
                padding: '14px 24px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                fontSize: 13, gap: 12,
              }}>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ color: 'var(--ink)' }}>{desc}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{date}</span>
                </div>
                <div className="row gap-12" style={{ alignItems: 'center' }}>
                  <span className="mono tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>{amt}</span>
                  <span className="chip" style={{ background: 'color-mix(in oklab, var(--pass) 10%, transparent)', color: 'var(--pass)', borderColor: 'color-mix(in oklab, var(--pass) 30%, transparent)' }}>{status}</span>
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

// ══════════════════════════════════════════════════════════════════
//  Notifications view
// ══════════════════════════════════════════════════════════════════
function NotificationsView() {
  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="serif">Notifications</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Choose what PropScout emails you about. Transactional emails always come through.</p>
      </div>

      <SettingsCard title="Watch lists" subtitle="Listings you've asked us to monitor.">
        {[
          { k: 'Rent-drop alerts',          sub: 'Notify when a tracked rental drops price or is re-listed', enabled: true },
          { k: 'Comparable sale closes',     sub: 'New verified sales within 1km of a saved property',        enabled: true },
          { k: 'Rate change notifications',  sub: 'When the Bank of Canada or our 5-yr fixed average moves',    enabled: false },
        ].map((r) => (
          <SettingsRow key={r.k} label={r.k} hint={r.sub}>
            <SettingsToggle defaultValue={r.enabled}/>
          </SettingsRow>
        ))}
      </SettingsCard>

      <SettingsCard title="Product">
        {[
          { k: 'Weekly market digest',      sub: 'Tuesday morning · highlights from your tracked listings',  enabled: false },
          { k: 'Investor Pro feature drops', sub: 'When new features ship — AirDNA, BC support, etc.',         enabled: true },
        ].map((r) => (
          <SettingsRow key={r.k} label={r.k} hint={r.sub}>
            <SettingsToggle defaultValue={r.enabled}/>
          </SettingsRow>
        ))}
      </SettingsCard>
    </div>
  );
}

// ── Settings primitives ─────────────────────────────────────────
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
    <div className="row" style={{
      padding: '16px 24px',
      borderBottom: '1px solid var(--line)',
      gap: 16, justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div className="col" style={{ gap: 2, minWidth: 180 }}>
        <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{label}</span>
        {hint && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{hint}</span>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SettingsInput({ defaultValue, suffix }) {
  return (
    <input
      defaultValue={defaultValue}
      style={{
        padding: '8px 14px',
        border: '1px solid var(--line)',
        borderRadius: 10,
        background: 'var(--bg-elev)',
        fontFamily: 'inherit', fontSize: 13.5,
        color: 'var(--ink)',
        outline: 'none',
        minWidth: 240,
      }}
    />
  );
}

function SettingsSelect({ options, defaultValue }) {
  return (
    <select
      defaultValue={defaultValue}
      style={{
        padding: '8px 14px',
        border: '1px solid var(--line)',
        borderRadius: 10,
        background: 'var(--bg-elev)',
        fontFamily: 'inherit', fontSize: 13.5,
        color: 'var(--ink)',
        outline: 'none',
        minWidth: 240,
      }}
    >
      {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
  );
}

function SettingsToggle({ defaultValue }) {
  const [v, setV] = useStateAa(defaultValue);
  return (
    <button
      onClick={() => setV(!v)}
      style={{
        width: 40, height: 22, borderRadius: 999,
        background: v ? 'var(--accent)' : 'var(--line-strong)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background-color .15s ease',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2, left: v ? 20 : 2,
        width: 18, height: 18, borderRadius: 999,
        background: 'var(--surface)',
        transition: 'left .18s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }}/>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════
//  App
// ══════════════════════════════════════════════════════════════════
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_ACC);
  const [upgradeOpen, setUpgradeOpen] = useStateAa(false);

  useEffectAa(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  const onUpgrade = () => setUpgradeOpen(true);

  let view;
  if (t.tab === 'profile')          view = <ProfileView/>;
  else if (t.tab === 'plan')        view = <PlanView tier={t.tier} onUpgrade={onUpgrade}/>;
  else if (t.tab === 'notifications') view = <NotificationsView/>;
  else                              view = <SavedAnalysesView tier={t.tier} onUpgrade={onUpgrade}/>;

  return (
    <div>
      <AccountTopNav dark={t.theme === 'dark'} onToggleDark={() => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark')} tier={t.tier}/>

      <div className="container" style={{ padding: '40px var(--gutter)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'clamp(28px, 4vw, 56px)', alignItems: 'flex-start' }}>
          <AccountSidebar tab={t.tab} onTab={(k) => setTweak('tab', k)} tier={t.tier}/>
          <main>{view}</main>
        </div>
      </div>

      <Footer/>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="generic"/>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Demo state"/>
        <TweakRadio
          label="Plan tier"
          value={t.tier}
          options={['free', 'pro', 'professional']}
          onChange={(v) => setTweak('tier', v)}
        />
        <TweakSelect
          label="View"
          value={t.tab}
          options={['saved', 'profile', 'plan', 'notifications']}
          onChange={(v) => setTweak('tab', v)}
        />

        <TweakSection label="Theme"/>
        <TweakRadio
          label="Mode"
          value={t.theme}
          options={['light', 'dark']}
          onChange={(v) => setTweak('theme', v)}
        />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={ACCENT_OPTIONS_ACC}
          onChange={(v) => setTweak('accent', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
