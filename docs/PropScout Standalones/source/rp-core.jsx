// rp-core.jsx — calculation library + core display atoms for the report surfaces.
// Faithful ports of apps/web/src/lib/investorCalc.ts and the analysis components
// (DealScore, Metric, RentalCompsBar, RiskRow, VerdictPill, SectionHead) that
// ReportPage.tsx renders. Loads after components.jsx (Icon/Chip/Wordmark/Footer).

const { useState: useStateRc, useEffect: useEffectRc } = React;

// ── Extended Icon — adds the glyphs ReportPage chrome needs ───────────────────
const RPBaseIcon = window.Icon;
function RPIcon({ name, size = 16, stroke = 1.6 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'share':    return <svg {...props}><circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="5.5" r="2.5"/><circle cx="17" cy="18.5" r="2.5"/><path d="M8.2 10.8l6.6-4M8.2 13.2l6.6 4"/></svg>;
    case 'bookmark': return <svg {...props}><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>;
    case 'search':   return <svg {...props}><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>;
    default:         return <RPBaseIcon name={name} size={size} stroke={stroke} />;
  }
}

// ── Formatting (investorCalc.ts) ──────────────────────────────────────────────

function fmtMoney(n, opts = {}) {
  if (!Number.isFinite(n)) return '—';
  const { decimals = 0 } = opts;
  const abs = Math.abs(n);
  const s = '$' + abs.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return n < 0 ? `\u2212${s}` : s;
}

function fmtPct(n, decimals = 2) {
  if (!Number.isFinite(n)) return '—';
  return (n * 100).toFixed(decimals) + '%';
}

// ── Deal score display metadata (investorCalc.ts VERDICT_DISPLAY) ─────────────

const VERDICT_DISPLAY = {
  strong_buy: { label: 'Strong deal', tagline: 'Proceed — fundamentals are solid.', tone: 'pass' },
  good_deal:  { label: 'Good deal', tagline: 'Proceed with standard due diligence.', tone: 'pass' },
  caution:    { label: 'Caution', tagline: 'Real issues — model the risks carefully.', tone: 'caution' },
  marginal:   { label: 'Marginal', tagline: 'Significant headwinds — need a specific thesis.', tone: 'caution' },
  do_not_buy: { label: 'Do not buy', tagline: "Numbers don't pencil as a rental.", tone: 'fail' },
  hard_pass:  { label: 'Hard pass', tagline: 'Fails on multiple fundamentals.', tone: 'fail' },
};

// ONE SOURCE OF TRUTH: score object comes from the (fixture) calc engine —
// the frontend only decorates it with label/tagline/tone. Never re-derived.
function toDealScoreData(score) {
  const display = VERDICT_DISPLAY[score.verdict];
  return {
    total: score.total,
    displayTotal: score.displayTotal,
    verdict: score.verdict,
    label: display.label,
    tagline: display.tagline,
    tone: display.tone,
    breakdown: score.breakdown,
    deductions: score.breakdown.deduction,
  };
}

// ── Ontario LTT (investorCalc.ts computeLTT) ──────────────────────────────────

const ONTARIO_LTT_BRACKETS = [
  { upTo: 55000, rate: 0.005 },
  { upTo: 250000, rate: 0.01 },
  { upTo: 400000, rate: 0.015 },
  { upTo: 2000000, rate: 0.02 },
  { upTo: Infinity, rate: 0.025 },
];

function computeLTT(price, isToronto) {
  let remaining = price;
  let prevCap = 0;
  const rows = [];
  let provincial = 0;
  for (const bracket of ONTARIO_LTT_BRACKETS) {
    if (remaining <= 0) break;
    const cap = bracket.upTo === Infinity ? price : Math.min(bracket.upTo, price);
    const span = cap - prevCap;
    if (span > 0) {
      const ltt = span * bracket.rate;
      rows.push({
        band: bracket.upTo === Infinity
          ? `$${prevCap.toLocaleString('en-CA')} – ∞`
          : `$${prevCap.toLocaleString('en-CA')} – $${bracket.upTo.toLocaleString('en-CA')}`,
        rate: bracket.rate,
        amount: span,
        ltt,
      });
      provincial += ltt;
      remaining -= span;
      prevCap = cap;
    }
  }
  const municipal = isToronto ? provincial : 0;
  return { rows, provincial, municipal, total: provincial + municipal };
}

// ── Mortgage math (investorCalc.ts) ───────────────────────────────────────────

function computeMonthlyPayment(principal, annualRate, years) {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function remainingBalance(principal, annualRate, years, monthsElapsed) {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return Math.max(0, principal - (principal / n) * monthsElapsed);
  const pmt = computeMonthlyPayment(principal, annualRate, years);
  return principal * Math.pow(1 + r, monthsElapsed) - (pmt * (Math.pow(1 + r, monthsElapsed) - 1)) / r;
}

// OSFI B-20: qualifying = max(contract + 2%, 5.25%); GDS threshold 44%.
function computeOSFI(price, downPaymentPct, mortgageRate, amortizationYears, annualTaxes, condoFeeMonthly, assumedIncome) {
  const principal = price * (1 - downPaymentPct);
  const qualifyingRate = Math.max(mortgageRate + 0.02, 0.0525);
  const qualifyingPmt = computeMonthlyPayment(principal, qualifyingRate, amortizationYears);
  const monthlyTaxes = annualTaxes / 12;
  const gds = (qualifyingPmt + monthlyTaxes + 0.5 * condoFeeMonthly) / (assumedIncome / 12);
  return { qualifyingRate, qualifyingPmt, gds, pass: gds <= 0.44, threshold: 0.44 };
}

function computeEquityCurve(price, principal, mortgageRate, amortizationYears, appreciationRate, totalCashInvested) {
  const curve = [];
  for (let year = 0; year <= 20; year++) {
    const months = year * 12;
    const remaining = year === 0 ? principal : remainingBalance(principal, mortgageRate, amortizationYears, months);
    const propertyValue = price * Math.pow(1 + appreciationRate, year);
    const equity = Math.max(0, propertyValue - Math.max(0, remaining));
    const cashOnCash =
      year === 0 || totalCashInvested === 0
        ? 0
        : (equity - price * (1 - principal / price)) / totalCashInvested;
    curve.push({ year, equity, propertyValue, remaining: Math.max(0, remaining), cashOnCash });
  }
  return curve;
}

function maintenanceRate(yearBuilt) {
  if (yearBuilt === 0) return 0.01;
  if (yearBuilt >= 2010) return 0.005;
  if (yearBuilt >= 1980) return 0.01;
  return 0.015;
}

function computeExpenses(price, annualTaxes, condoFeeMonthly, annualGrossRent, yearBuilt, includeManagementFee) {
  const insurance = price * 0.0035;
  const maintenance = price * maintenanceRate(yearBuilt);
  const vacancy = annualGrossRent * 0.05;
  const condo = condoFeeMonthly * 12;
  const management = includeManagementFee ? annualGrossRent * 0.08 : 0;
  const total = annualTaxes + insurance + maintenance + vacancy + condo + management;
  return { taxes: annualTaxes, insurance, maintenance, vacancy, condo, management, total };
}

// Enrich the calc-engine metrics with display-only extras (LTT rows, OSFI,
// equity curve, expense breakdown) — same division of labour as the live app.
function enrichMetrics(metrics, listing, financing) {
  const grossRentAnnual = listing.rentEstimate * 12;
  const principal = listing.price * (1 - financing.downPaymentPct);
  const totalCashInvested =
    metrics.downPayment + metrics.lttProvincial + metrics.lttMunicipal + metrics.closingCostsTotal;
  const ltt = computeLTT(listing.price, financing.isToronto);
  const osfi = computeOSFI(
    listing.price, financing.downPaymentPct, financing.mortgageRate,
    financing.amortizationYears, listing.annualTaxes, listing.condoFeeMonthly,
    financing.assumedIncome
  );
  const equityCurve = computeEquityCurve(
    listing.price, principal, financing.mortgageRate, financing.amortizationYears,
    financing.appreciationRate, totalCashInvested
  );
  const expenses = computeExpenses(
    listing.price, listing.annualTaxes, listing.condoFeeMonthly,
    grossRentAnnual, listing.yearBuilt, financing.includeManagementFee
  );
  return { ...metrics, expenses, ltt, osfi, equityCurve, grossRentAnnual, totalCashInvested, principal };
}

// Demo-mode local computation (investorCalc.ts computeDemoMetrics) — used by the
// landlord surface where the rent slider re-derives financing-dependent metrics.
function computeDemoMetrics(stable, listing, financing) {
  const { noi, capRate, grm, closingCostsTotal } = stable;
  const downPayment = Math.round(listing.price * financing.downPaymentPct);
  const mortgageAmount = listing.price - downPayment;
  const mortgagePaymentMonthly = Math.round(
    computeMonthlyPayment(mortgageAmount, financing.mortgageRate, financing.amortizationYears)
  );
  const annualMortgagePayments = mortgagePaymentMonthly * 12;
  const cashFlowMonthly = Math.round(noi / 12 - mortgagePaymentMonthly);
  const cashFlowAnnual = cashFlowMonthly * 12;
  const dscr = annualMortgagePayments > 0 ? noi / annualMortgagePayments : 0;
  const lttResult = computeLTT(listing.price, financing.isToronto);
  const totalCashInvested = downPayment + lttResult.provincial + lttResult.municipal + closingCostsTotal;
  const cashOnCashReturn = totalCashInvested > 0 ? cashFlowAnnual / totalCashInvested : 0;
  const annualGrossRent = listing.rentEstimate * 12;
  const operatingExpenses = Math.max(0, annualGrossRent - noi);
  const breakEvenRent = Math.round((annualMortgagePayments + operatingExpenses) / 12);
  return {
    cashFlowMonthly, cashFlowAnnual, capRate, cashOnCashReturn, dscr, grm, noi,
    mortgagePaymentMonthly, downPayment, mortgageAmount,
    amortizationYears: financing.amortizationYears, mortgageRate: financing.mortgageRate,
    breakEvenRent, closingCostsTotal,
    lttProvincial: lttResult.provincial, lttMunicipal: lttResult.municipal,
    hasSanityWarnings: false,
  };
}

// ── VerdictPill ───────────────────────────────────────────────────────────────

function VerdictPill({ tone = 'pass', label }) {
  return <span className={`verdict-pill ${tone}`}>{label}</span>;
}

// ── SectionHead (shared/SectionHead.tsx) ──────────────────────────────────────
// Numbered mono eyebrow + serif question (one italic word via <em>) + verdict pill.

function SectionHead({ n, topic, question, verdict, tone = 'pass' }) {
  return (
    <div className="tr-section-head">
      <div className="col gap-12" style={{ maxWidth: 760 }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          <span style={{ color: 'var(--accent)' }}>§ {n}</span>
          <span style={{ marginLeft: 12, color: 'var(--muted)' }}>{topic}</span>
        </span>
        <h2 className="serif" style={{ textWrap: 'balance' }}>{question}</h2>
      </div>
      {verdict !== undefined && verdict !== '' && <VerdictPill tone={tone} label={verdict} />}
    </div>
  );
}

// ── DealScore gauge (analysis/DealScore.tsx) ──────────────────────────────────
// Number, ring colour, and verdict label all come from ONE verdict object —
// pass `tone` + `verdictLabel` so the gauge can never disagree with the verdict.

const DEAL_SIZE_MAP = { sm: 84, md: 120, lg: 180 };
const DEAL_TONE_COLOR = { pass: 'var(--pass)', caution: 'var(--caution)', fail: 'var(--fail)' };

function dealScoreBracketColor(score) {
  if (score >= 65) return 'var(--pass)';
  if (score >= 35) return 'var(--caution)';
  return 'var(--fail)';
}

function DealScore({ score, size = 'md', label, showVerdict = false, animate = true, max = 95, tone, verdictLabel }) {
  const px = DEAL_SIZE_MAP[size] || DEAL_SIZE_MAP.md;
  const strokeWidth = Math.max(5, Math.round(px * 0.075));
  const R = (px - strokeWidth) / 2;
  const circumference = 2 * Math.PI * R;
  const cx = px / 2;
  const cy = px / 2;
  const clamped = Math.max(0, Math.min(max, Math.round(score)));
  const targetOffset = circumference * (1 - clamped / max);
  const [offset, setOffset] = useStateRc(animate ? circumference : targetOffset);

  useEffectRc(() => {
    if (!animate) { setOffset(targetOffset); return; }
    const id = requestAnimationFrame(() => setOffset(targetOffset));
    return () => cancelAnimationFrame(id);
  }, [targetOffset, animate]);

  const color = tone ? DEAL_TONE_COLOR[tone] : dealScoreBracketColor(clamped);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }} aria-label={`Deal score: ${clamped} out of ${max}`}>
      <div style={{ position: 'relative', width: px, height: px }}>
        <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} role="img" aria-hidden="true">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" strokeWidth={strokeWidth} />
          <circle
            cx={cx} cy={cy} r={R} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: animate ? 'stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)' : 'none' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: strokeWidth + 2 }}>
          <span className="serif tabular" style={{ fontSize: px >= 80 ? px * 0.42 : px * 0.52, lineHeight: 1, fontWeight: 400, color: 'var(--ink)' }}>
            {clamped}
          </span>
          {label && (
            <span className="mono" style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center', marginTop: 6, whiteSpace: 'nowrap' }}>
              {label}
            </span>
          )}
          {showVerdict && verdictLabel && (
            <span style={{ marginTop: 6, fontSize: 11, fontWeight: 500, color, padding: '3px 10px', borderRadius: 999, border: `1px solid ${color}`, background: `color-mix(in oklab, ${color} 8%, transparent)`, whiteSpace: 'nowrap' }}>
              {verdictLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Metric tile (analysis/Metric.tsx) ─────────────────────────────────────────

const METRIC_STATUS_COLOR = { pass: 'var(--pass)', caution: 'var(--caution)', fail: 'var(--fail)', neutral: 'var(--ink)' };

function Metric({ label, value, sub, status = 'neutral' }) {
  return (
    <div className="col" style={{ padding: '18px 20px', borderRadius: 'var(--r)', background: 'var(--surface)', border: '1px solid var(--line)', gap: 6, boxShadow: 'var(--shadow-card)' }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div className="serif tabular" style={{ fontSize: 30, lineHeight: 1, color: METRIC_STATUS_COLOR[status] }}>{value}</div>
      {sub !== undefined && <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}

// ── RiskRow (analysis/RiskRow.tsx) ────────────────────────────────────────────

const RISK_TONE_COLOR = { red: 'var(--fail)', amber: 'var(--caution)', green: 'var(--pass)' };

function RiskRow({ tone = 'red', label, detail, dismissable = false, dismissed = false, onToggleDismiss }) {
  const color = RISK_TONE_COLOR[tone];
  const bg = `color-mix(in oklab, ${color} 6%, transparent)`;
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-card)', opacity: dismissed ? 0.75 : 1 }}>
      <div style={{ width: 4, background: color, flexShrink: 0 }} aria-hidden="true"></div>
      <div style={{ flex: 1, padding: '14px 18px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', textDecoration: dismissed ? 'line-through' : 'none', opacity: dismissed ? 0.55 : 1 }}>{label}</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', flex: 1, textAlign: 'right', textDecoration: dismissed ? 'line-through' : 'none' }}>{detail}</span>
        {dismissable ? (
          <button
            type="button"
            onClick={onToggleDismiss}
            className="mono rp-dismiss"
            style={{ fontSize: 11, padding: '4px 10px', background: 'transparent', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--ink-2)'; }}
          >
            {dismissed ? 'Restore' : 'Dismiss'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── RentalCompsBar (analysis/RentalCompsBar.tsx) ──────────────────────────────

function rcbFmtDollar(n) { return '$' + n.toLocaleString('en-CA'); }

function RentalCompsBar({ low, mid, high, ask, context }) {
  const range = high - low;
  const raw = range === 0 ? 0.5 : (ask - low) / range;
  const fraction = Math.max(0, Math.min(1, raw));

  const verdict =
    ask >= high ? { lbl: 'Above market', tone: 'var(--caution)' }
    : ask > low ? { lbl: 'At market', tone: 'var(--pass)' }
    : { lbl: 'Below market', tone: 'var(--pass)' };

  return (
    <div className="col gap-16" role="region" aria-label={`Rental comps: low ${rcbFmtDollar(low)}, mid ${rcbFmtDollar(mid)}, high ${rcbFmtDollar(high)}, estimate ${rcbFmtDollar(ask)}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="col" style={{ gap: 4 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Asking rent</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="serif tabular" style={{ fontSize: 28, lineHeight: 1, color: 'var(--ink)' }}>{rcbFmtDollar(ask)}</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>/mo</span>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.01em', padding: '5px 10px', borderRadius: 999, color: verdict.tone, border: `1px solid color-mix(in oklab, ${verdict.tone} 35%, transparent)`, background: `color-mix(in oklab, ${verdict.tone} 8%, transparent)` }}>
          ● {verdict.lbl}
        </span>
      </div>

      <div style={{ position: 'relative', height: 28, marginTop: 8 }}>
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: 6, borderRadius: 999, background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent) 18%, var(--bg-elev)), color-mix(in oklab, var(--accent) 55%, transparent), color-mix(in oklab, var(--accent) 18%, var(--bg-elev)))' }}></div>
        {[0, 50, 100].map((p) => (
          <div key={p} style={{ position: 'absolute', left: `${p}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 1.5, height: 14, background: 'var(--ink)', opacity: p === 50 ? 0.4 : 0.18, pointerEvents: 'none' }}></div>
        ))}
        <div className="comp-marker" role="img" aria-label={`Asking rent: ${rcbFmtDollar(ask)}`} style={{ position: 'absolute', left: `${fraction * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <div className="comp-marker-dot" style={{ width: 14, height: 14, background: 'var(--ink)', borderRadius: 3, transform: 'rotate(45deg)', border: '2px solid var(--surface)', boxShadow: 'var(--shadow-card)', transition: 'transform .15s ease, background-color .15s ease' }}></div>
          <div className="comp-marker-tip" style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: 'var(--bg)', padding: '6px 10px', borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', opacity: 0, pointerEvents: 'none', transition: 'opacity .15s ease, transform .15s ease', transformOrigin: 'bottom center', boxShadow: 'var(--shadow-pop)' }}>
            <span className="mono tabular">{rcbFmtDollar(ask)}/mo</span>
            <span style={{ color: 'color-mix(in oklab, var(--bg) 55%, transparent)', marginLeft: 6 }}>· ask</span>
            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--ink)' }}></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {[
          { lbl: 'P25 · low', val: low, align: 'flex-start' },
          { lbl: 'P50 · median', val: mid, align: 'center' },
          { lbl: 'P75 · high', val: high, align: 'flex-end' },
        ].map((t) => (
          <div key={t.lbl} className="col" style={{ alignItems: t.align, gap: 2 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--muted)' }}>{t.lbl}</div>
            <div className="mono tabular" style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{rcbFmtDollar(t.val)}</div>
          </div>
        ))}
      </div>

      {context && (
        <React.Fragment>
          <div className="divider" style={{ marginTop: 8 }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span>12-mo trend</span>
              <span className="tabular" style={{ color: context.trendPct < 0 ? 'var(--caution)' : context.trendPct > 0 ? 'var(--pass)' : 'var(--ink)', fontWeight: 500 }}>
                {context.trendPct < 0 ? '↓' : context.trendPct > 0 ? '↑' : '→'} {Math.abs(context.trendPct).toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span>Median DOM</span>
              <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>{context.medianDom} days</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span>CMHC vacancy</span>
              <span className="tabular" style={{ color: 'var(--pass)', fontWeight: 500 }}>{context.vacancyPct.toFixed(1)}%</span>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

// ── NoCompsInlineState (states/NoCompsInlineState.tsx) ────────────────────────
// Low-confidence comps inset — the honest DEFAULT state inside §03.

function NoCompsInlineState() {
  return (
    <div className="card col" style={{ padding: 28, gap: 14, borderColor: 'color-mix(in oklab, var(--caution) 25%, var(--line))', background: 'color-mix(in oklab, var(--caution) 4%, var(--surface))' }}>
      <div className="row gap-10">
        <span style={{ color: 'var(--caution)', flexShrink: 0 }}><RPIcon name="search" size={20} /></span>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>Low confidence — <em>limited rental comps</em></h3>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--caution)' }}>Confidence: low</span>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 620, lineHeight: 1.55 }}>
        Fewer than 3 comparable rentals were found within 1&nbsp;km. The rental estimate above is directional only.
      </p>
      <div className="row gap-12" style={{ marginTop: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost"><RPIcon name="flag" size={13} /> Report an issue</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  Icon: RPIcon,
  fmtMoney, fmtPct,
  VERDICT_DISPLAY, toDealScoreData,
  computeLTT, computeOSFI, computeMonthlyPayment, computeEquityCurve,
  computeExpenses, enrichMetrics, computeDemoMetrics, maintenanceRate,
  VerdictPill, SectionHead, DealScore, Metric, RiskRow, RentalCompsBar,
  NoCompsInlineState,
});
