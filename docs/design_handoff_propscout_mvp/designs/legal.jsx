// legal.jsx — Privacy & Terms pages. Same shell, switch via Tweak.

const { useState: useStateL, useEffect: useEffectL, useMemo: useMemoL, useRef: useRefL } = React;

const TWEAK_DEFAULTS_L = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#D97757",
  "page": "privacy"
}/*EDITMODE-END*/;
const ACCENT_OPTIONS_L = ['#D97757', '#1F8A5B', '#2A6FDB', '#B14A37', '#7A5AE0'];

// ── Top nav ─────────────────────────────────────────────────────
function LegalNav({ dark, onToggleDark }) {
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
            <span style={{ color: 'var(--ink)' }}>Legal</span>
          </div>
        </div>
        <div className="row gap-12">
          <button className="btn btn-ghost" onClick={onToggleDark} style={{ padding: '10px 12px' }}>
            <Icon name={dark ? 'sun' : 'moon'} size={15}/>
          </button>
          <button className="btn btn-ghost"><Icon name="doc" size={13}/> Download as PDF</button>
          <button className="btn btn-primary">Back to PropScout <Icon name="arrow" size={13}/></button>
        </div>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Page content
// ══════════════════════════════════════════════════════════════════
const PAGES = {
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'PIPEDA-compliant · effective May 24, 2026',
    intro: <>PropScout Analytics Inc. ("we", "us", "PropScout") respects your privacy. This Privacy Policy explains what personal information we collect, why we collect it, how long we keep it, and the rights you have under the Personal Information Protection and Electronic Documents Act (PIPEDA). If a clause here ever conflicts with what you'd expect a reasonable Canadian privacy-conscious software company to do — please let us know.</>,
    contact: 'For privacy questions, write to privacy@propscout.ca. Our Privacy Officer responds within 30 days as required under PIPEDA.',
    sections: [
      {
        id: 'collect',
        title: 'What we collect',
        body: <>
          <p>We collect three categories of personal information:</p>
          <ul>
            <li><strong>Account information</strong> — your email address, name (if you provide it), and authentication tokens. We never store passwords in plain text; we use Supabase Auth, which hashes them with bcrypt.</li>
            <li><strong>Analysis data</strong> — the listing URLs you paste, the property details we scrape from them, your saved analyses, and any field values you override (financing assumptions, household income estimates, etc.).</li>
            <li><strong>Usage data</strong> — anonymized analytics from Plausible (page views, button clicks, no cookies, no cross-site tracking). We log API request counts per user account to enforce free-tier limits.</li>
          </ul>
          <p>We do <strong>not</strong> collect, and never have: government ID, social insurance numbers, your credit score, or your real bank-account balances. Stripe handles all billing data — we only see a customer ID and subscription status.</p>
        </>,
      },
      {
        id: 'use',
        title: 'How we use it',
        body: <>
          <p>Your personal information is used solely to:</p>
          <ul>
            <li>Operate the PropScout service — running analyses, saving them to your account, generating share links, sending verification emails.</li>
            <li>Enforce the free-tier monthly limit (we count analyses per email per month).</li>
            <li>Email you transactional messages: signup confirmation, password reset, your shareable report links, billing receipts via Stripe.</li>
            <li>Improve the product — anonymized usage patterns help us understand which sections of a report get the most attention.</li>
          </ul>
          <p>We will not use your data to train external machine-learning models. The Claude API calls we make for AI verdicts are sent with property-specific structured data, not your account identity.</p>
        </>,
      },
      {
        id: 'share',
        title: 'Sharing & third parties',
        body: <>
          <p>The third parties we share data with, and the strict reason for each:</p>
          <ul>
            <li><strong>Supabase</strong> (Toronto, Canada) — our database and authentication provider. All data is stored within Canadian data centres.</li>
            <li><strong>Stripe</strong> — billing only. They see your name, email, and payment method. We see a subscription status.</li>
            <li><strong>Anthropic Claude API</strong> — the property's structured data (price, beds, comp data) is sent to generate your AI verdict. Account identity is not sent.</li>
            <li><strong>Resend</strong> — transactional email delivery (verification, password reset, share-link emails).</li>
            <li><strong>Mapbox, Google Places, Walk Score, CMHC</strong> — your property's coordinates are sent to retrieve map tiles, school listings, walkability scores, and vacancy data. No account identity is sent.</li>
          </ul>
          <p>We do <em>not</em> sell, rent, or trade your personal information. Ever.</p>
        </>,
      },
      {
        id: 'retain',
        title: 'Data retention',
        body: <>
          <p>Active accounts keep all data indefinitely so you can return to past analyses. Closed accounts have their personal data deleted within 30 days of closure, with two exceptions:</p>
          <ul>
            <li>Anonymized listing data and rental comps remain in our market database (you cannot be identified from this data).</li>
            <li>Billing records are retained for 7 years to satisfy CRA requirements.</li>
          </ul>
          <p>You can request a hard delete at any time by writing to <a href="mailto:privacy@propscout.ca">privacy@propscout.ca</a>. We respond within 30 days.</p>
        </>,
      },
      {
        id: 'rights',
        title: 'Your rights under PIPEDA',
        body: <>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of everything we hold about you.</li>
            <li><strong>Correct</strong> — fix any incorrect or out-of-date personal information.</li>
            <li><strong>Delete</strong> — request full deletion of your account and associated data.</li>
            <li><strong>Export</strong> — receive a portable copy of your saved analyses as JSON or PDF.</li>
            <li><strong>Withdraw consent</strong> — opt out of any data processing not strictly required to operate the service.</li>
          </ul>
          <p>Email <a href="mailto:privacy@propscout.ca">privacy@propscout.ca</a> to exercise any of these rights. If you're unsatisfied with our response, you can file a complaint with the Office of the Privacy Commissioner of Canada at <a href="https://www.priv.gc.ca">priv.gc.ca</a>.</p>
        </>,
      },
      {
        id: 'security',
        title: 'Security',
        body: <>
          <p>All data is encrypted in transit (TLS 1.3) and at rest (AES-256 via Supabase). Access to production databases requires hardware-key authentication. Backups are encrypted and rotated nightly.</p>
          <p>If a breach affecting your personal information occurs, we will notify you and the Office of the Privacy Commissioner of Canada within 72 hours, as required.</p>
        </>,
      },
      {
        id: 'cookies',
        title: 'Cookies & tracking',
        body: <>
          <p>We use a single first-party cookie to keep you signed in. We use no advertising trackers, no cross-site cookies, and no Google Analytics. Plausible Analytics provides aggregate page-view counts using only the referring URL and a daily-rotating hash — no individual user is ever identifiable.</p>
        </>,
      },
      {
        id: 'changes',
        title: 'Changes to this policy',
        body: <>
          <p>If we make material changes to this policy, we will notify you by email at least 30 days before they take effect. The previous version remains accessible from the footer of every page.</p>
        </>,
      },
      {
        id: 'contact',
        title: 'Contact',
        body: <>
          <p>For any privacy question, request, or complaint:</p>
          <p><strong>Privacy Officer</strong><br/>PropScout Analytics Inc.<br/><a href="mailto:privacy@propscout.ca">privacy@propscout.ca</a></p>
          <p>For general support, email <a href="mailto:support@propscout.ca">support@propscout.ca</a>.</p>
        </>,
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    eyebrow: 'Effective May 24, 2026',
    intro: <>These Terms of Service govern your use of PropScout, a Canadian real estate analysis platform operated by PropScout Analytics Inc. ("we", "us"). Please read them — particularly the section on <em>Not financial or legal advice</em>, which is important and which we mean.</>,
    contact: 'Questions about these terms? Email legal@propscout.ca.',
    sections: [
      {
        id: 'acceptance',
        title: 'Acceptance',
        body: <>
          <p>By creating a PropScout account or using any part of the service, you agree to these Terms. If you don't agree, please don't use PropScout. That's fine.</p>
          <p>If you are using PropScout on behalf of a company or organization, you confirm that you have authority to bind that entity to these Terms.</p>
        </>,
      },
      {
        id: 'service',
        title: 'The service',
        body: <>
          <p>PropScout is software that analyzes Canadian real estate listings. You paste a URL; we return a report containing scraped property data, comparable rental and sale data, calculated investment metrics, neighbourhood data, sun-path analysis, risk flags, and a written verdict generated by an AI model (currently Anthropic's Claude).</p>
          <p>The service is currently available for Ontario properties only. Other provinces will be supported as our data and tax engines are calibrated.</p>
        </>,
      },
      {
        id: 'not-advice',
        title: 'Not financial or legal advice',
        body: <>
          <p><strong>This is the most important section. Please read it.</strong></p>
          <p>PropScout is an information tool. The reports, scores, verdicts, AI narratives, and any calculation outputs we produce are <em>not</em> financial, legal, tax, real estate, or mortgage advice. They are estimates and analyses based on data sourced from public listings, public datasets, and our scraped rental comparables database.</p>
          <p>Real estate decisions involve hundreds of thousands of dollars in commitments and meaningful legal obligations. Always engage qualified professionals before signing anything:</p>
          <ul>
            <li>A licensed real estate agent or broker</li>
            <li>A real estate lawyer for the closing</li>
            <li>A mortgage broker or bank for financing</li>
            <li>An accountant for tax implications</li>
            <li>A home inspector before any conditional offer</li>
          </ul>
          <p>PropScout is not a substitute for any of these. We do not guarantee the accuracy, completeness, or timeliness of any data, calculation, or AI-generated text we display.</p>
        </>,
      },
      {
        id: 'account',
        title: 'Your account & security',
        body: <>
          <p>You're responsible for keeping your sign-in credentials secret and for all activity that happens under your account. Tell us immediately at <a href="mailto:security@propscout.ca">security@propscout.ca</a> if you suspect unauthorized access.</p>
          <p>You must be at least 18 years old to use PropScout.</p>
        </>,
      },
      {
        id: 'subscriptions',
        title: 'Subscriptions, billing & cancellation',
        body: <>
          <p>PropScout offers a Free tier and paid tiers (Investor Pro, Professional, Team) billed monthly or annually via Stripe. Subscriptions renew automatically until you cancel.</p>
          <p>You can cancel at any time from your account settings, which links to your Stripe customer portal. Cancellation takes effect at the end of your current billing cycle; you retain access until then.</p>
          <p>We offer a <strong>14-day satisfaction refund</strong> on your first paid month. After 14 days, charges are non-refundable except where required by law.</p>
          <p>Annual subscribers receive a pro-rata refund of any unused months if they cancel due to a documented PropScout product defect.</p>
        </>,
      },
      {
        id: 'acceptable-use',
        title: 'Acceptable use',
        body: <>
          <p>Don't do the obvious bad things: don't scrape PropScout itself, don't redistribute reports commercially under a different brand, don't attempt to reverse-engineer our calculation engine, don't abuse the API to attack other services. Don't use PropScout to harass tenants, landlords, or sellers. Don't submit URLs that aren't real listings — it wastes our scraper budget.</p>
          <p>If we detect abuse, we may suspend or terminate your account without notice.</p>
        </>,
      },
      {
        id: 'ip',
        title: 'Intellectual property',
        body: <>
          <p>PropScout's software, design, calculation engine, deal-score formula, and AI prompts are our intellectual property. The PropScout name, logo, and "Scout-Mark" are trademarks.</p>
          <p>The reports you generate are yours — you can save them, share them, send them to clients, post them on the internet. We grant you a perpetual, royalty-free license to use any report you generate, even if you later cancel your subscription.</p>
          <p>Listing data, rental comparables, and public data we display remain the intellectual property of their respective sources.</p>
        </>,
      },
      {
        id: 'liability',
        title: 'Limitation of liability',
        body: <>
          <p>To the maximum extent allowed by law:</p>
          <ul>
            <li>PropScout is provided "as is" without warranty of any kind — express, implied, statutory, or otherwise.</li>
            <li>We are not liable for any indirect, incidental, consequential, special, or punitive damages, including lost profits, lost data, or business interruption.</li>
            <li>Our total liability to you in any 12-month period is capped at the amount you paid us for PropScout in that period, or <code>$100 CAD</code>, whichever is greater.</li>
          </ul>
          <p>Nothing in these Terms excludes liability that cannot lawfully be excluded.</p>
        </>,
      },
      {
        id: 'termination',
        title: 'Termination',
        body: <>
          <p>You may close your account at any time from your account settings. We will delete your personal data within 30 days as described in the Privacy Policy.</p>
          <p>We may terminate or suspend your account if you breach these Terms, fail to pay, or use PropScout in a way that puts the service or other users at risk.</p>
        </>,
      },
      {
        id: 'law',
        title: 'Governing law',
        body: <>
          <p>These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable in Ontario. Any dispute is subject to the exclusive jurisdiction of the courts of Ontario, sitting in Toronto.</p>
        </>,
      },
      {
        id: 'changes-tos',
        title: 'Changes to these terms',
        body: <>
          <p>If we make material changes to these Terms, we will notify you by email at least 30 days before they take effect. Continued use of PropScout after the effective date constitutes acceptance of the revised Terms.</p>
        </>,
      },
      {
        id: 'contact-tos',
        title: 'Contact',
        body: <>
          <p>For questions about these Terms, email <a href="mailto:legal@propscout.ca">legal@propscout.ca</a>.</p>
          <p>For general support, write to <a href="mailto:support@propscout.ca">support@propscout.ca</a>.</p>
        </>,
      },
    ],
  },
};

// ══════════════════════════════════════════════════════════════════
//  Page renderer
// ══════════════════════════════════════════════════════════════════
function LegalPage({ pageKey, onSwitch }) {
  const page = PAGES[pageKey];
  const [activeId, setActiveId] = useStateL(page.sections[0].id);
  const containerRef = useRefL(null);

  // Simple scroll-spy
  useEffectL(() => {
    setActiveId(page.sections[0].id);
    const handler = () => {
      const sections = page.sections.map((s) => document.getElementById(s.id)).filter(Boolean);
      const y = window.scrollY + 120;
      let current = sections[0]?.id;
      for (const el of sections) {
        if (el.offsetTop <= y) current = el.id;
      }
      if (current) setActiveId(current);
    };
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, [pageKey]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 84, behavior: 'smooth' });
  };

  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 120 }}>
      {/* Header */}
      <div className="col" style={{ gap: 16, marginBottom: 56, maxWidth: 820 }}>
        <span className="chip" style={{
          alignSelf: 'flex-start',
          background: 'color-mix(in oklab, var(--accent) 8%, transparent)',
          borderColor: 'color-mix(in oklab, var(--accent) 25%, transparent)',
          color: 'var(--accent)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }}/>
          {page.eyebrow}
        </span>
        <h1 className="serif" style={{ textWrap: 'balance' }}>{page.title}</h1>
        <p style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 720, lineHeight: 1.6 }}>{page.intro}</p>

        {/* Page switch */}
        <div className="row gap-6" style={{
          marginTop: 8, padding: 4, borderRadius: 999,
          background: 'var(--surface)', border: '1px solid var(--line)',
          alignSelf: 'flex-start',
        }}>
          {[
            { k: 'privacy', label: 'Privacy Policy' },
            { k: 'terms',   label: 'Terms of Service' },
          ].map((p) => (
            <button
              key={p.k}
              onClick={() => onSwitch(p.k)}
              className="mono"
              style={{
                background: pageKey === p.k ? 'var(--ink)' : 'transparent',
                color: pageKey === p.k ? 'var(--bg)' : 'var(--ink-2)',
                fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '7px 14px', borderRadius: 999,
                border: 'none', cursor: 'pointer', fontWeight: 500,
              }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Two-column: TOC + content */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'clamp(28px, 4vw, 64px)', alignItems: 'flex-start' }}>
        <aside className="col" style={{ gap: 2, position: 'sticky', top: 84 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 12px 10px' }}>
            On this page
          </span>
          {page.sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`toc-item ${activeId === s.id ? 'active' : ''}`}
            >
              <span className="toc-num">{String(i + 1).padStart(2, '0')}</span>
              <span style={{ flex: 1 }}>{s.title}</span>
            </button>
          ))}
        </aside>

        <article className="legal-body" ref={containerRef} style={{ maxWidth: 720 }}>
          {page.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="legal-section">
              <h2 className="serif">
                <span className="mono" style={{ fontSize: 13, letterSpacing: '0.1em', color: 'var(--accent)', marginRight: 14 }}>§ {String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </h2>
              <div style={{ marginTop: 18 }}>{s.body}</div>
            </section>
          ))}

          {/* Footer card */}
          <div className="card col" style={{ marginTop: 64, padding: 28, gap: 12 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Questions?</span>
            <h3 className="serif" style={{ fontSize: 22 }}>{page.contact}</h3>
            <div className="row gap-12" style={{ marginTop: 4 }}>
              <button className="btn btn-primary"><Icon name="doc" size={13}/> Download as PDF</button>
              <button className="btn btn-ghost">
                <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={13}/></span>
                Back to PropScout
              </button>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}

// ══════════════════════════════════════════════════════════════════
//  App
// ══════════════════════════════════════════════════════════════════
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_L);

  useEffectL(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-ink', t.theme === 'dark' ? '#0A0D14' : '#FFFFFF');
  }, [t]);

  return (
    <div>
      <LegalNav dark={t.theme === 'dark'} onToggleDark={() => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark')}/>
      <LegalPage pageKey={t.page} onSwitch={(k) => { setTweak('page', k); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/>
      <Footer/>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Demo"/>
        <TweakRadio label="Page" value={t.page} options={['privacy', 'terms']} onChange={(v) => setTweak('page', v)}/>

        <TweakSection label="Theme"/>
        <TweakRadio label="Mode"   value={t.theme}  options={['light', 'dark']} onChange={(v) => setTweak('theme', v)}/>
        <TweakColor label="Accent" value={t.accent} options={ACCENT_OPTIONS_L} onChange={(v) => setTweak('accent', v)}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
