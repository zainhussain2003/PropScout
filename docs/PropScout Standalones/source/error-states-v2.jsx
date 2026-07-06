// error-states-v2.jsx — showroom of every error / gate / empty state.
// Honest voice: province gate → waitlist, scraper fail → manual entry,
// no comps → low-confidence inset, expired listing → honest expired state.
// Harbour re-skin: no accent tweak, no raw hex, canonical data.

const { useState: useStateEs } = React;

const TWEAK_DEFAULTS_ES = /*EDITMODE-BEGIN*/{
  "theme": "light"
}/*EDITMODE-END*/;

// ── Province gate — non-Ontario URL with waitlist (honest, not an error) ──────
function ProvinceGateState({ submitted, onSubmit }) {
  const [email, setEmail] = useStateEs('');
  if (submitted) {
    return (
      <BlockState
        tone="pass"
        icon="check"
        eyebrow="You're on the list"
        headline={<React.Fragment>We'll <em>email you</em> the day BC reports go live.</React.Fragment>}
        body="Expected Q3 2026 — that's BC LTT, BC rent-control rules, and a fresh comps database scraped from PadMapper West and Rentals.ca BC."
        primary="Analyze an Ontario listing"
        secondary="Back to home"
      />
    );
  }
  return (
    <BlockState
      tone="accent"
      icon="maple"
      eyebrow="British Columbia · coming Q3 2026"
      headline={<React.Fragment>We're not in <em>British Columbia</em> yet.</React.Fragment>}
      body="Running Ontario rules on a BC property would overstate closing costs by tens of thousands. We gate cleanly until our BC data and tax engine are calibrated."
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(email); }} className="row gap-8" style={{ marginTop: 6, padding: 4, borderRadius: 999, background: 'var(--bg-elev)', border: '1px solid var(--line)', maxWidth: 460, width: '100%' }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={{ flex: 1, padding: '10px 14px', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)', minWidth: 0 }} />
        <button className="btn btn-accent" type="submit">Notify me</button>
      </form>
      <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Free · one email when BC launches · no marketing</span>
    </BlockState>
  );
}

function USPropertyState() {
  return (
    <BlockState
      tone="fail"
      icon="globe"
      eyebrow="United States · Not supported"
      headline={<React.Fragment>That listing is in <em>the US</em>.</React.Fragment>}
      body="PropScout covers Canadian real estate only — our rent control, OSFI stress test, and LTT calculators don't apply south of the border."
      primary="Try a Canadian listing"
      secondary="Back to home"
    />
  );
}

function ExpiredListingState() {
  return (
    <BlockState
      tone="caution"
      icon="ghost"
      eyebrow="Listing expired"
      headline={<React.Fragment>That listing has <em>been removed</em>.</React.Fragment>}
      body="The seller or agent took it down. If you still have the property details handy, you can run the analysis manually — every field is editable."
      primary="Enter details manually"
      secondary="Try a different URL"
    />
  );
}

function ScraperFailState() {
  return (
    <BlockState
      tone="caution"
      icon="cloud-off"
      eyebrow="Couldn't read the listing"
      headline={<React.Fragment>We hit a wall <em>reading the page</em>.</React.Fragment>}
      body="The listing source may have changed their layout, or the URL is geo-blocked from our scraper. You can enter the property fields manually — every calculation still runs."
      primary="Enter manually"
      secondary="Try again"
    />
  );
}

function NetworkTimeoutState() {
  return (
    <BlockState
      tone="ink"
      icon="clock"
      eyebrow="Slow response · 30s timeout"
      headline={<React.Fragment>The listing source is <em>taking a while</em>.</React.Fragment>}
      body="Realtor.ca and Zillow.ca occasionally throttle requests during peak hours. Hit retry — most timeouts clear on the second attempt."
      primary="Retry"
      secondary="Enter manually instead"
    />
  );
}

function NotFoundState() {
  return (
    <BlockState
      tone="ink"
      icon="search"
      eyebrow="404 · page not found"
      headline={<React.Fragment>That page <em>doesn't exist</em>.</React.Fragment>}
      body="Either the link is broken or the page moved. If you got here from a shared report link, the share may have expired (links last 30 days)."
      primary="Back to home"
      secondary="Report a broken link"
    />
  );
}

function ExpiredShareState() {
  return (
    <BlockState
      tone="caution"
      icon="link"
      eyebrow="Shared link expired"
      headline={<React.Fragment>That share link <em>expired</em>.</React.Fragment>}
      body="Public report links are active for 30 days after they're generated. If you have an account, sign in to see the latest version of this analysis."
      primary="Sign in"
      secondary="Analyze the same URL fresh"
    />
  );
}

// ── Inline: low comp confidence (honest default inside a report) ──────────────
function NoCompsInlineDemo() {
  return (
    <div className="card col" style={{ padding: 28, gap: 14, borderColor: 'color-mix(in oklab, var(--caution) 25%, var(--line))', background: 'color-mix(in oklab, var(--caution) 4%, var(--surface))' }}>
      <div className="row gap-10">
        <span style={{ color: 'var(--caution)' }}><StateIcon name="search" color="var(--caution)" size={20} /></span>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>Only <em>2 rental comps</em> found in 90 days</h3>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--caution)' }}>Confidence: low</span>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 620, lineHeight: 1.55 }}>
        Smaller towns and very high-end neighbourhoods often have thin rental comp data. The analysis still runs against the 2 comps we found, but we flag the confidence so you know to weight the rent estimate cautiously.
      </p>
      <div className="row gap-12" style={{ marginTop: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost"><Icon name="search" size={13} /> Expand to 1km radius</button>
        <button className="btn btn-ghost"><Icon name="pencil" size={13} /> Override estimated rent</button>
      </div>
    </div>
  );
}

// ── Inline: scraper partial — missing fields, prompt manual entry ─────────────
function ScraperPartialInlineDemo() {
  return (
    <div className="card col" style={{ padding: 28, gap: 18, borderColor: 'color-mix(in oklab, var(--accent) 30%, var(--line))', background: 'color-mix(in oklab, var(--accent) 4%, var(--surface))' }}>
      <div className="row gap-10">
        <span style={{ color: 'var(--accent)' }}><StateIcon name="pencil" color="var(--accent)" size={20} /></span>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>We need <em>3 fields</em> before this report runs</h3>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>Auto-filled · 12 of 15</span>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 620, lineHeight: 1.55 }}>
        We pulled most of the listing automatically. These three fields weren't in the listing data — fill them in and the analysis kicks off.
      </p>
      <div className="col gap-10">
        {[
          { label: 'Condo fee', hint: 'monthly · required for accurate cap rate', placeholder: '$ / month' },
          { label: 'Year built', hint: 'used for rent control + maintenance reserve', placeholder: 'e.g. 1985' },
          { label: 'Annual property taxes', hint: 'usually on the listing — sometimes hidden behind login', placeholder: '$ / year' },
        ].map((f) => (
          <div key={f.label} className="row" style={{ padding: '12px 16px', borderRadius: 'var(--r)', background: 'var(--surface)', border: '1px dashed var(--accent)', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div className="col" style={{ gap: 2, minWidth: 160 }}>
              <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{f.label}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{f.hint}</span>
            </div>
            <input placeholder={f.placeholder} style={{ padding: '8px 14px', background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', outline: 'none', fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)', minWidth: 200 }} />
          </div>
        ))}
      </div>
      <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-primary">Run analysis <Icon name="arrow" size={13} /></button>
        <button className="btn btn-ghost">Save and finish later</button>
      </div>
    </div>
  );
}

// ── Guest email capture (post guest analysis) ─────────────────────────────────
function GuestCaptureState() {
  const [email, setEmail] = useStateEs('');
  return (
    <BlockState
      tone="accent"
      icon="flag"
      eyebrow="Free guest analysis · 1 of 1"
      headline={<React.Fragment>Save your report — <em>one email</em>, done.</React.Fragment>}
      body="We'll send a 30-day shareable link to this exact analysis. No account, no password, no marketing. You can come back any time."
    >
      <form onSubmit={(e) => e.preventDefault()} className="row gap-8" style={{ marginTop: 6, padding: 4, borderRadius: 999, background: 'var(--bg-elev)', border: '1px solid var(--line)', maxWidth: 460, width: '100%' }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={{ flex: 1, padding: '10px 14px', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)', minWidth: 0 }} />
        <button className="btn btn-accent" type="submit">Send my report</button>
      </form>
      <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Or <a href="#" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }}>create an account</a> for unlimited tenant reports
      </span>
    </BlockState>
  );
}

function App() {
  const [dark, setDark, t, setTweak] = useThemeTweak(TWEAK_DEFAULTS_ES);
  const [provinceSubmitted, setProvinceSubmitted] = useStateEs(false);

  const scenarios = [
    { id: 'province', label: 'Province gate · non-Ontario URL', render: () => <ProvinceGateState submitted={provinceSubmitted} onSubmit={() => setProvinceSubmitted(true)} /> },
    { id: 'us', label: 'US property block', render: () => <USPropertyState /> },
    { id: 'expired', label: 'Listing expired or removed', render: () => <ExpiredListingState /> },
    { id: 'scraper', label: 'Scraper failed · full-page', render: () => <ScraperFailState /> },
    { id: 'timeout', label: 'Network timeout', render: () => <NetworkTimeoutState /> },
    { id: '404', label: '404 · page not found', render: () => <NotFoundState /> },
    { id: 'share', label: 'Expired shared link', render: () => <ExpiredShareState /> },
    { id: 'guest', label: 'Guest email capture · post-analysis', render: () => <GuestCaptureState /> },
    { id: 'comps', label: 'Inline · low comp confidence', render: () => <NoCompsInlineDemo /> },
    { id: 'partial', label: 'Inline · scraper found 12 of 15 fields', render: () => <ScraperPartialInlineDemo /> },
  ];

  return (
    <div data-screen-label="Error States">
      <section className="container col" style={{ paddingTop: 56, paddingBottom: 96, gap: 64 }}>
        <ShowroomHeader
          tag="Error & gate states · Design preview"
          title={<React.Fragment>What users see when something <em style={{ color: 'var(--accent)' }}>doesn't go right</em>.</React.Fragment>}
          sub="Every gate uses the same vocabulary: a halo'd icon, a clear eyebrow, a confident headline, a plain-English reason, and one primary path forward. No dead ends, ever."
        />

        {scenarios.map((s) => (
          <ScenarioRow key={s.id} label={s.label}>{s.render()}</ScenarioRow>
        ))}

        <ScenarioRow label="Design notes">
          <DesignNotes
            title="Rules every error state follows"
            notes={[
              ['One primary action.', 'Never two equally-weighted buttons. The user always knows the recommended next step.'],
              ['Plain English over technical truth.', '"We hit a wall reading the page" beats "HTTP 503 from upstream".'],
              ['Explain why, not just that.', "A user who knows why BC isn't supported is more likely to wait than a user who just sees a block."],
              ['Tone-coloured icon halo.', 'Pass = green, caution = amber, fail = clay-red, accent = harbour blue. No emoji, ever.'],
              ['Inline beats full-page when possible.', 'Low comp confidence flags inline inside the report; the report still loads with reduced confidence. Only block when the analysis cannot proceed.'],
            ]}
          />
        </ScenarioRow>
      </section>

      <ThemeTweakPanel dark={dark} setDark={setDark} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
