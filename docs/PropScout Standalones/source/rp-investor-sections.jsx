// rp-investor-sections.jsx — the sections ReportPage.tsx renders for
// investor/landlord mode: PropertyHero, §01 InvestmentMetricsSection,
// §03 RentalCompsSection, §04 CashToCloseSection, §05 OSFISection,
// §06 RiskFlagsSection, §07 EquitySection. Section numbers, question copy and
// verdict logic are verbatim from the live renderer.

const { useState: useStateIv, useEffect: useEffectIv, useMemo: useMemoIv } = React;

// ── PropertyHero (analysis/PropertyHero.tsx) ──────────────────────────────────

function PropertyHero({ listing, score, cashFlowMonthly, capRate, dscr, viewLabel = 'Investor view', mapPins }) {
  const [isMobile, setIsMobile] = useStateIv(window.innerWidth <= 480);

  useEffectIv(() => {
    const handler = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const verdictColor =
    score.tone === 'pass' ? 'var(--pass)' : score.tone === 'caution' ? 'var(--caution)' : 'var(--fail)';

  return (
    <section className="container" style={{ paddingTop: 56, paddingBottom: 48 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 28, color: 'var(--muted)', fontSize: 13, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={() => window.history.back()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, transition: 'color 0.15s ease' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          aria-label="Analyze another listing"
        >
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }} aria-hidden="true"><Icon name="arrow" size={13} /></span>
          Analyze another listing
        </button>
        <span style={{ opacity: 0.4 }}>·</span>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Report · {viewLabel}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }} aria-hidden="true"></span>
          Live recalc · sliders below
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 'clamp(28px, 3.5vw, 52px)', alignItems: 'flex-start' }}>
        {/* LEFT — photos + chips + address */}
        <div className="col" style={{ gap: 28 }}>
          {/* CAPTURE: listing photo grid — exterior hero + living/kitchen/floorplan thumbnails from the scraped listing */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>
            <div className="photo-ph" style={{ borderRadius: 'var(--r-lg)', height: '100%', overflow: 'hidden' }}>
              <span>exterior · {listing.propertyType.toLowerCase()}</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              {['living', 'kitchen', 'floorplan'].map((label, idx) => (
                <div key={label} className="photo-ph" style={{ borderRadius: 'var(--r)', flex: 1, position: 'relative', overflow: 'hidden' }}>
                  <span>{label}</span>
                  {idx === 2 && (
                    <div className="mono" style={{ position: 'absolute', right: 10, bottom: 10, fontSize: 10, letterSpacing: '0.1em', padding: '3px 8px', background: 'color-mix(in oklab, var(--surface) 90%, transparent)', borderRadius: 999, color: 'var(--ink)', backdropFilter: 'blur(4px)' }}>
                      + more
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="col" style={{ gap: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {listing.chips.map((chip, i) => <Chip key={i}>{chip}</Chip>)}
            </div>

            <h1 className="serif" style={{ textWrap: 'balance', letterSpacing: '-0.035em', marginTop: 4 }}>{listing.addressLine1}</h1>
            <div style={{ fontSize: 16, color: 'var(--muted)' }}>{listing.addressLine2}</div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8, fontSize: 14, color: 'var(--ink-2)', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="house" size={14} /> {listing.beds} bed · {listing.baths} bath
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="dot" size={10} /> {listing.sqft.toLocaleString('en-CA')} sqft
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="key" size={14} /> {listing.parking} parking
              </span>
              {listing.yearBuiltKnown !== false && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="chart" size={14} /> Built {listing.yearBuilt}
                </span>
              )}
            </div>
          </div>

          <MiniMap height={180} address={`${listing.addressLine1}, ${listing.addressLine2}`} pins={mapPins} />
        </div>

        {/* RIGHT — sticky score card */}
        <div className="card col" style={{ padding: 32, gap: 24, position: 'sticky', top: 84, order: isMobile ? -1 : 0 }}>
          <div className="col" style={{ alignItems: 'center', gap: 8 }}>
            <DealScore
              score={score.displayTotal}
              max={100}
              tone={score.tone}
              size={isMobile ? 'sm' : 'lg'}
              label="Deal score / 100"
              showVerdict={!isMobile}
              verdictLabel={score.label}
              animate
            />
          </div>

          <div className="col" style={{ textAlign: 'center', alignItems: 'center', gap: 8 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: verdictColor }}>{score.label}</div>
            <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, textWrap: 'balance' }}>{score.tagline}</div>
          </div>

          <div className="divider"></div>

          {/* Score breakdown bars */}
          <div className="col" style={{ gap: 10 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Score breakdown</div>
            {[
              ['Cap rate', score.breakdown.capRate, score.breakdown.componentMaxes.capRate],
              ['Cash flow', score.breakdown.cashFlow, score.breakdown.componentMaxes.cashFlow],
              ['CoC return', score.breakdown.cashOnCash, score.breakdown.componentMaxes.cashOnCash],
              ['DSCR', score.breakdown.dscr, score.breakdown.componentMaxes.dscr],
              ['Demand', score.breakdown.demand, score.breakdown.componentMaxes.demand],
            ].map(([lbl, v, max]) => (
              <div key={lbl} className="col" style={{ gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink-2)' }}>{lbl}</span>
                  <span className="mono tabular" style={{ color: 'var(--muted)' }}>{v} / {max}</span>
                </div>
                <div style={{ height: 3, borderRadius: 999, background: 'var(--line)' }}>
                  <div style={{ width: `${max > 0 ? (v / max) * 100 : 0}%`, height: '100%', borderRadius: 999, background: v / max > 0.6 ? 'var(--pass)' : v / max > 0.2 ? 'var(--caution)' : 'var(--fail)' }}></div>
                </div>
              </div>
            ))}
            {score.deductions > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: 'var(--ink-2)' }}>Risk deductions</span>
                <span className="mono tabular" style={{ color: 'var(--fail)' }}>&minus;{score.deductions}</span>
              </div>
            )}
          </div>

          <div className="divider"></div>

          {/* Key metrics */}
          <div className="col" style={{ gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {listing.price > 0 ? 'Asking' : 'Asking rent'}
              </span>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>
                {listing.price > 0 ? fmtMoney(listing.price) : (
                  <React.Fragment>{fmtMoney(listing.rentEstimate)}<span style={{ fontSize: 16, color: 'var(--muted)' }}>/mo</span></React.Fragment>
                )}
              </span>
            </div>
            {[
              { label: 'Cash flow', value: `${fmtMoney(cashFlowMonthly)}/mo`, color: cashFlowMonthly >= 0 ? 'var(--pass)' : 'var(--fail)' },
              { label: 'Cap rate', value: fmtPct(capRate), color: 'var(--ink)' },
              { label: 'DSCR', value: `${dscr.toFixed(2)}\u00D7`, color: 'var(--ink)' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
                <span>{row.label}</span>
                <span className="mono tabular" style={{ fontWeight: 600, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── §01 InvestmentMetricsSection (investor/InvestmentMetricsSection.tsx) ──────

function InvestmentMetricsSection({ metrics, listing, n = '01' }) {
  const grossYield = metrics.grossRentAnnual / listing.price;

  const tiles = [
    {
      label: 'Cap rate', value: fmtPct(metrics.capRate),
      sub: metrics.capRate >= 0.05 ? 'Above 5% threshold' : metrics.capRate >= 0.03 ? '3–5% range' : 'Below 3% threshold',
      status: metrics.capRate >= 0.05 ? 'pass' : metrics.capRate >= 0.03 ? 'caution' : 'fail',
    },
    {
      label: 'Monthly cash flow', value: fmtMoney(metrics.cashFlowMonthly), sub: 'per month',
      status: metrics.cashFlowMonthly >= 200 ? 'pass' : metrics.cashFlowMonthly >= 0 ? 'caution' : 'fail',
    },
    {
      label: 'Cash-on-cash', value: fmtPct(metrics.cashOnCashReturn), sub: `On ${fmtMoney(metrics.totalCashInvested)} invested`,
      status: metrics.cashOnCashReturn >= 0.05 ? 'pass' : metrics.cashOnCashReturn >= 0.03 ? 'caution' : 'fail',
    },
    {
      label: 'DSCR', value: `${metrics.dscr.toFixed(2)}\u00D7`,
      sub: metrics.dscr >= 1.1 ? 'Investment-grade' : metrics.dscr >= 1.0 ? 'Marginal' : 'Will not qualify',
      status: metrics.dscr >= 1.1 ? 'pass' : metrics.dscr >= 1.0 ? 'caution' : 'fail',
    },
    { label: 'Monthly payment', value: fmtMoney(metrics.mortgagePaymentMonthly), sub: 'mortgage P+I', status: 'neutral' },
    { label: 'NOI', value: fmtMoney(metrics.noi), sub: 'annual', status: 'neutral' },
    { label: 'GRM', value: metrics.grm > 0 ? metrics.grm.toFixed(1) : '—', sub: metrics.grm > 0 ? 'Gross Rent Multiplier' : 'No comps available', status: 'neutral' },
    { label: 'Break-even rent', value: fmtMoney(metrics.breakEvenRent), sub: 'to cover all costs', status: metrics.breakEvenRent <= listing.rentEstimate ? 'pass' : 'fail' },
    { label: 'Gross yield', value: grossYield > 0 ? fmtPct(grossYield) : '—', sub: grossYield > 0 ? 'before expenses' : 'No comps available', status: 'neutral' },
  ];

  const expenseRows = [
    ['Property taxes', metrics.expenses.taxes, 'as listed'],
    ['Insurance (0.35%)', metrics.expenses.insurance, 'of value'],
    ['Maintenance reserve', metrics.expenses.maintenance, `${fmtPct(metrics.expenses.maintenance / listing.price, 2)} of value`],
    ['Vacancy allowance (5%)', metrics.expenses.vacancy, 'of gross rent'],
    ['Condo fee', metrics.expenses.condo, listing.condoFeeMonthly > 0 ? `${fmtMoney(listing.condoFeeMonthly)}/mo` : 'N/A'],
    ['Property management', metrics.expenses.management, metrics.expenses.management > 0 ? '8% of gross rent' : 'not included'],
  ];

  const verdictLabel =
    metrics.dscr >= 1.1 ? 'Passes thresholds' : metrics.dscr >= 1.0 ? '2 below threshold' : '4 below threshold';
  const verdictTone = metrics.dscr >= 1.1 ? 'pass' : metrics.dscr >= 1.0 ? 'caution' : 'fail';

  return (
    <section className="container tr-section" data-section={n}>
      <SectionHead
        n={n}
        topic="Investment metrics"
        question={<React.Fragment>Does the deal <em>pencil</em>?</React.Fragment>}
        verdict={verdictLabel}
        tone={verdictTone}
      />

      <div className="grid-2col-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {tiles.map((tile) => (
          <Metric key={tile.label} label={tile.label} value={tile.value} sub={tile.sub} status={tile.status} />
        ))}
      </div>

      {/* Expense breakdown — hidden for for-rent listings (value-derived rows) */}
      {listing.price > 0 && (
        <div className="card" style={{ marginTop: 22, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Operating expenses · annual</span>
              <h3 className="serif" style={{ fontSize: 22 }}>Where the money goes.</h3>
            </div>
            <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1, color: 'var(--accent)' }}>
              {fmtMoney(metrics.expenses.total)}<span style={{ fontSize: 13, color: 'var(--muted)' }}>/yr</span>
            </span>
          </div>

          <div className="grid-1col-mobile rp-expense-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {expenseRows.map(([label, value, note], i) => (
              <div key={label} style={{ padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--line)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingRight: i % 2 === 0 ? 24 : 0, paddingLeft: i % 2 === 1 ? 24 : 0, borderLeft: i % 2 === 1 ? '1px solid var(--line)' : 'none' }}>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>{label}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{note}</span>
                </div>
                <span className="mono tabular" style={{ fontWeight: 500, color: value > 0 ? 'var(--ink)' : 'var(--muted)' }}>
                  {value > 0 ? fmtMoney(value) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ── §03 RentalCompsSection (ReportPage.tsx) ───────────────────────────────────
// Honest default: when confidence is low, the low-confidence inset renders
// under the comps bar so the estimate reads as directional, not verified.

function RentalCompsSection({ comps, ask }) {
  if (!comps || comps.compCount === 0) return null;
  const { low, mid, high, compCount, confidence } = comps;

  return (
    <section className="container tr-section" data-section="03">
      <SectionHead
        n="03"
        topic="Rental comps"
        question={<React.Fragment>What can it <em>realistically</em> rent for?</React.Fragment>}
        verdict={`${compCount} comparable rentals`}
        tone={confidence === 'high' ? 'pass' : confidence === 'medium' ? 'caution' : 'fail'}
      />

      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Market rent range · {compCount} comparable rentals
          </span>
          <span className="mono" style={{ fontSize: 11, color: confidence === 'high' ? 'var(--pass)' : confidence === 'medium' ? 'var(--caution)' : 'var(--fail)' }}>
            {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
          </span>
        </div>
        <RentalCompsBar low={low} mid={mid} high={high} ask={ask} />
      </div>

      {confidence === 'low' && (
        <div style={{ marginTop: 16 }}>
          <NoCompsInlineState />
        </div>
      )}
    </section>
  );
}

// ── §04 CashToCloseSection (ReportPage.tsx) ───────────────────────────────────

function CashToCloseSection({ metrics, listing, financing }) {
  const lttResult = computeLTT(listing.price, financing.isToronto);
  const total = metrics.downPayment + metrics.lttProvincial + metrics.lttMunicipal + metrics.closingCostsTotal;

  return (
    <section className="container tr-section" data-section="04">
      <SectionHead
        n="04"
        topic="Cash to close"
        question={<React.Fragment>What you need in the <em>bank</em> on closing day.</React.Fragment>}
        verdict={fmtMoney(total)}
        tone="caution"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <LTTTable ltt={lttResult} price={listing.price} toronto={listing.isToronto} />

        <div className="card col" style={{ padding: 24, gap: 16 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Total cash required</div>
          {[
            { label: 'Down payment', value: metrics.downPayment },
            { label: 'Provincial LTT', value: metrics.lttProvincial },
            ...(metrics.lttMunicipal > 0 ? [{ label: 'Toronto municipal LTT', value: metrics.lttMunicipal }] : []),
            { label: 'Closing costs (est.)', value: metrics.closingCostsTotal },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--ink-2)' }}>{row.label}</span>
              <span className="mono tabular" style={{ fontWeight: 500 }}>{fmtMoney(row.value)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span className="mono tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmtMoney(total)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── §05 OSFISection (ReportPage.tsx — live income slider) ─────────────────────

const INCOME_SLIDER = { min: 40000, max: 400000, step: 5000 };

function OSFISection({ financing, listing }) {
  const [income, setIncome] = useStateIv(financing.assumedIncome || 125000);

  const osfi = useMemoIv(
    () => computeOSFI(listing.price, financing.downPaymentPct, financing.mortgageRate, financing.amortizationYears, listing.annualTaxes, listing.condoFeeMonthly, income),
    [listing.price, listing.annualTaxes, listing.condoFeeMonthly, financing.downPaymentPct, financing.mortgageRate, financing.amortizationYears, income]
  );

  return (
    <section className="container tr-section" data-section="05">
      <SectionHead
        n="05"
        topic="OSFI stress test"
        question={<React.Fragment>Will the bank actually <em>fund</em> this?</React.Fragment>}
        verdict={osfi.pass ? `Passes at ${fmtMoney(income)} income` : `Fails at ${fmtMoney(income)} income`}
        tone={osfi.pass ? 'pass' : 'fail'}
      />

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <label htmlFor="osfi-income" className="mono" style={{ display: 'block', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 12 }}>
          Your gross household income
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input
            id="osfi-income"
            type="range"
            min={INCOME_SLIDER.min}
            max={INCOME_SLIDER.max}
            step={INCOME_SLIDER.step}
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            aria-label="Gross household income"
            style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span className="mono tabular" style={{ fontSize: 18, fontWeight: 600, minWidth: 110, textAlign: 'right' }}>{fmtMoney(income)}</span>
        </div>
      </div>

      <OSFICard osfi={osfi} financing={financing} income={income} />
    </section>
  );
}

// ── §06 RiskFlagsSection (ReportPage.tsx) ─────────────────────────────────────

function RiskFlagsSection({ listing }) {
  const [overrides, setOverrides] = useStateIv(new Set());

  const toggle = (id) => {
    setOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const redFlags = listing.riskFlags.filter((f) => f.tone === 'red');
  const amberFlags = listing.riskFlags.filter((f) => f.tone === 'amber');
  // No "−X pts" line: score impact is gate + tier, applied by the calc engine —
  // the score itself (from the backend) is shown in the hero gauge.
  const verdictTone =
    redFlags.length > 1 ? 'fail' : redFlags.length === 1 || amberFlags.length > 0 ? 'caution' : 'pass';
  const verdictLabel =
    redFlags.length > 0
      ? `${redFlags.length} red · ${amberFlags.length} amber`
      : amberFlags.length > 0
        ? `${amberFlags.length} amber flag${amberFlags.length > 1 ? 's' : ''}`
        : 'No red flags';

  return (
    <section className="container tr-section" data-section="06">
      <SectionHead
        n="06"
        topic="Risk flags"
        question={<React.Fragment>What could <em>break</em> this thesis?</React.Fragment>}
        verdict={verdictLabel}
        tone={verdictTone}
      />

      <div className="card col" style={{ padding: 0, overflow: 'hidden', gap: 0, borderRadius: 'var(--r)' }}>
        {listing.riskFlags.length === 0 ? (
          <div style={{ padding: 28, display: 'flex', gap: 12, alignItems: 'center', color: 'var(--pass)' }}>
            <Icon name="check" size={16} />
            <span style={{ fontSize: 14 }}>No risk flags detected in this listing.</span>
          </div>
        ) : (
          listing.riskFlags.map((f) => (
            <RiskRow
              key={f.id}
              tone={f.tone}
              label={f.label}
              detail={f.detail}
              dismissable
              dismissed={overrides.has(f.id)}
              onToggleDismiss={() => toggle(f.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ── §07 EquitySection (ReportPage.tsx) ────────────────────────────────────────

function EquitySection({ metrics }) {
  const finalPoint = metrics.equityCurve[metrics.equityCurve.length - 1];
  const year20Equity = finalPoint ? finalPoint.equity : 0;

  return (
    <section className="container tr-section" data-section="07">
      <SectionHead
        n="07"
        topic="Equity build"
        question={<React.Fragment>What <em>builds</em> over time?</React.Fragment>}
        verdict={`${fmtMoney(year20Equity)} at year 20`}
        tone="pass"
      />
      <EquityChart equityCurve={metrics.equityCurve} totalCashInvested={metrics.totalCashInvested} />
    </section>
  );
}

Object.assign(window, {
  PropertyHero, InvestmentMetricsSection, RentalCompsSection,
  CashToCloseSection, OSFISection, RiskFlagsSection, EquitySection,
});
