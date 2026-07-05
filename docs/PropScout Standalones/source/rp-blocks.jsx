// rp-blocks.jsx — investor building blocks reused across investor + landlord:
// LTTTable, OSFICard, EquityChart, FinancingSliders. Faithful ports of
// apps/web/src/components/investor/*. Loads after rp-core.jsx.

const { useState: useStateRb } = React;

// ── LTTTable (investor/LTTTable.tsx) ──────────────────────────────────────────

const LTT_COLUMN_HEADERS = ['Bracket', 'Rate', 'Amount taxed', 'LTT'];

function LTTTable({ ltt, price, toronto = false }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Land Transfer Tax · Ontario{toronto ? ' + Toronto' : ''}
          </span>
          <h4 className="serif" style={{ fontSize: 22 }}>{fmtMoney(price)} purchase</h4>
        </div>
        <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
          <span className="serif tabular" style={{ fontSize: 28, lineHeight: 1, color: 'var(--accent)' }}>{fmtMoney(ltt.total)}</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{toronto ? 'Provincial + municipal' : 'Provincial only'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 24px', background: 'var(--bg-elev)', borderBottom: '1px solid var(--line)' }}>
        {LTT_COLUMN_HEADERS.map((h, i) => (
          <div key={h} className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: i === 0 ? 'left' : 'right' }}>{h}</div>
        ))}
      </div>

      {ltt.rows.map((row, i) => (
        <div key={row.band} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 24px', borderBottom: i < ltt.rows.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 13 }}>
          <span style={{ color: 'var(--ink)' }}>{row.band}</span>
          <span className="mono tabular" style={{ color: 'var(--ink-2)', textAlign: 'right' }}>{fmtPct(row.rate, 1)}</span>
          <span className="mono tabular" style={{ color: 'var(--ink-2)', textAlign: 'right' }}>{fmtMoney(row.amount)}</span>
          <span className="mono tabular" style={{ color: 'var(--ink)', textAlign: 'right', fontWeight: 500 }}>{fmtMoney(row.ltt)}</span>
        </div>
      ))}

      {toronto && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 24px', borderTop: '1px dashed var(--line-strong)', background: 'color-mix(in oklab, var(--accent) 5%, transparent)', fontSize: 13 }}>
          <span style={{ color: 'var(--ink-2)' }}>Toronto municipal LTT (stacked)</span>
          <span></span>
          <span></span>
          <span className="mono tabular" style={{ color: 'var(--accent)', textAlign: 'right', fontWeight: 600 }}>{fmtMoney(ltt.municipal)}</span>
        </div>
      )}
    </div>
  );
}

// ── OSFICard (investor/OSFICard.tsx) ──────────────────────────────────────────

function OSFICard({ osfi, financing, income }) {
  const tone = osfi.pass ? 'pass' : 'fail';
  const displayIncome = income != null ? income : financing.assumedIncome;

  const rows = [
    { label: 'Contract rate', value: fmtPct(financing.mortgageRate, 2) },
    { label: 'Stress buffer', value: '+2.00 pts' },
    { label: 'Qualifying rate (higher of)', value: fmtPct(osfi.qualifyingRate, 2), bold: true, colorVar: 'var(--accent)' },
    { label: 'Qualifying payment', value: `${fmtMoney(osfi.qualifyingPmt)}/mo` },
    { label: 'GDS ratio', value: fmtPct(osfi.gds, 1), bold: true, colorVar: osfi.pass ? 'var(--pass)' : 'var(--fail)' },
    { label: 'Threshold', value: fmtPct(osfi.threshold, 0) },
  ];

  return (
    <div className="card col gap-20" style={{ padding: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>OSFI stress test</span>
          <h4 className="serif" style={{ fontSize: 22 }}>B-20 mortgage qualification</h4>
        </div>
        <VerdictPill tone={tone} label={osfi.pass ? 'Qualifies' : 'Fails'} />
      </div>

      <div className="col" style={{ gap: 12 }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: i < rows.length - 1 ? 12 : 0, borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 13, alignItems: 'baseline' }}>
            <span style={{ color: 'var(--ink-2)' }}>{row.label}</span>
            <span className="mono tabular" style={{ fontWeight: row.bold ? 600 : 500, color: row.colorVar || 'var(--ink)' }}>{row.value}</span>
          </div>
        ))}
      </div>

      <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>Higher of: contract rate + 2.00% or 5.25% floor</span>

      <div style={{ padding: '10px 14px', borderRadius: 'var(--r)', background: `color-mix(in oklab, ${osfi.pass ? 'var(--pass)' : 'var(--fail)'} 8%, transparent)`, border: `1px solid color-mix(in oklab, ${osfi.pass ? 'var(--pass)' : 'var(--fail)'} 25%, transparent)`, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        {osfi.pass ? (
          <React.Fragment>
            Gross household income {fmtMoney(displayIncome)}. At {fmtPct(osfi.qualifyingRate, 2)} qualifying rate, GDS sits comfortably under the 44% federal threshold — most insured-mortgage products available.
          </React.Fragment>
        ) : (
          <React.Fragment>
            Gross household income {fmtMoney(displayIncome)}. Qualifying payment pushes GDS to {fmtPct(osfi.gds, 1)} — above the 44% federal threshold. Standard A-lender financing likely unavailable; alt-lender or higher income required.
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

// ── EquityChart (investor/EquityChart.tsx) ────────────────────────────────────

const EQ_W = 720;
const EQ_H = 280;
const EQ_PAD = { l: 60, r: 24, t: 18, b: 40 };
const EQ_INNER_W = EQ_W - EQ_PAD.l - EQ_PAD.r;
const EQ_INNER_H = EQ_H - EQ_PAD.t - EQ_PAD.b;
const EQ_MAX_YEARS = 20;

function EquityChart({ equityCurve, totalCashInvested }) {
  const [hover, setHover] = useStateRb(null);

  if (equityCurve.length < 2) return <div style={{ height: EQ_H }}></div>;

  const yMax = Math.max(...equityCurve.map((p) => Math.max(p.propertyValue, p.equity)), 1);
  const yMin = 0;
  const toX = (year) => EQ_PAD.l + (year / EQ_MAX_YEARS) * EQ_INNER_W;
  const toY = (val) => EQ_PAD.t + (1 - (val - yMin) / (yMax - yMin)) * EQ_INNER_H;

  const valuePath = equityCurve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.year)} ${toY(p.propertyValue)}`).join(' ');
  const equityPath = equityCurve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.year)} ${toY(p.equity)}`).join(' ');
  const lastPoint = equityCurve[equityCurve.length - 1];
  const equityArea = `${equityPath} L ${toX(lastPoint.year)} ${toY(0)} L ${toX(0)} ${toY(0)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ v: yMin + (yMax - yMin) * t, y: toY(yMin + (yMax - yMin) * t) }));
  const milestones = [5, 10, 20].map((yr) => equityCurve.find((p) => p.year === yr)).filter(Boolean);
  const hoverPoint = hover !== null ? equityCurve[hover] || null : null;

  return (
    <div className="card col" style={{ padding: 28, gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Equity build · 20 yr horizon</span>
          <h4 className="serif" style={{ fontSize: 24 }}>Where your money sits over time.</h4>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 2, background: 'var(--ink)', display: 'inline-block' }}></span>
            Property value
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 6, background: 'color-mix(in oklab, var(--accent) 50%, transparent)', borderRadius: 2, display: 'inline-block' }}></span>
            Your equity
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${EQ_W} ${EQ_H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }} aria-label="20-year equity build chart">
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line x1={EQ_PAD.l} x2={EQ_W - EQ_PAD.r} y1={tick.y} y2={tick.y} stroke="var(--line)" strokeWidth={1} />
              <text x={EQ_PAD.l - 10} y={tick.y + 4} textAnchor="end" fontSize={10} fontFamily="Geist Mono, monospace" fill="var(--muted)">
                {tick.v >= 1e6 ? `$${(tick.v / 1e6).toFixed(1)}m` : `$${Math.round(tick.v / 1000)}k`}
              </text>
            </g>
          ))}

          {[0, 5, 10, 15, 20].map((yr) => (
            <g key={yr}>
              <line x1={toX(yr)} x2={toX(yr)} y1={EQ_H - EQ_PAD.b} y2={EQ_H - EQ_PAD.b + 5} stroke="var(--line-strong)" strokeWidth={1} />
              <text x={toX(yr)} y={EQ_H - EQ_PAD.b + 20} textAnchor="middle" fontSize={11} fontFamily="Geist Mono, monospace" fill="var(--muted)">Yr {yr}</text>
            </g>
          ))}

          <path d={equityArea} fill="color-mix(in oklab, var(--accent) 16%, transparent)" />
          <path d={equityPath} fill="none" stroke="var(--accent)" strokeWidth={2} />
          <path d={valuePath} fill="none" stroke="var(--ink)" strokeWidth={2} />

          {milestones.map((m) => (
            <circle key={m.year} cx={toX(m.year)} cy={toY(m.equity)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          ))}

          {equityCurve.map((p, i) => (
            <rect key={i} x={toX(p.year) - 16} y={EQ_PAD.t} width={32} height={EQ_INNER_H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'crosshair' }} />
          ))}

          {hoverPoint && (
            <g>
              <line x1={toX(hoverPoint.year)} x2={toX(hoverPoint.year)} y1={EQ_PAD.t} y2={EQ_H - EQ_PAD.b} stroke="var(--accent)" strokeWidth={1} strokeDasharray="4 3" />
              <circle cx={toX(hoverPoint.year)} cy={toY(hoverPoint.propertyValue)} r={5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />
              <circle cx={toX(hoverPoint.year)} cy={toY(hoverPoint.equity)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
        </svg>

        {hoverPoint && (
          <div style={{ position: 'absolute', left: `${(toX(hoverPoint.year) / EQ_W) * 100}%`, top: 0, transform: hoverPoint.year > 15 ? 'translateX(-110%)' : 'translateX(12px)', background: 'var(--ink)', color: 'var(--bg)', borderRadius: 'var(--r)', padding: '12px 14px', minWidth: 200, fontSize: 12, boxShadow: 'var(--shadow-pop)', pointerEvents: 'none', zIndex: 10 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--bg) 55%, transparent)', marginBottom: 8 }}>
              Year {hoverPoint.year}
            </div>
            {[
              ['Property value', fmtMoney(hoverPoint.propertyValue), false],
              ['Mortgage left', fmtMoney(hoverPoint.remaining), false],
              ['Your equity', fmtMoney(hoverPoint.equity), true],
              ['Vs. cash in', `${hoverPoint.cashOnCash >= 0 ? '+' : '\u2212'}${(Math.abs(hoverPoint.cashOnCash) * 100).toFixed(0)}%`, false],
            ].map(([k, v, accent]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0' }}>
                <span style={{ color: 'color-mix(in oklab, var(--bg) 70%, transparent)' }}>{k}</span>
                <span className="mono tabular" style={{ color: accent ? 'var(--accent)' : 'var(--bg)', fontWeight: accent ? 600 : 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {milestones.map((m) => (
          <div key={m.year} className="col" style={{ padding: '14px 16px', borderRadius: 'var(--r)', background: 'var(--bg-elev)', border: '1px solid var(--line)', gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Year {m.year}</span>
            <span className="serif tabular" style={{ fontSize: 24, lineHeight: 1 }}>{fmtMoney(m.equity)}</span>
            <span className="mono" style={{ fontSize: 11, color: m.cashOnCash >= 0 ? 'var(--pass)' : 'var(--fail)' }}>
              {m.cashOnCash >= 0 ? '+' : '\u2212'}{(Math.abs(m.cashOnCash) * 100).toFixed(0)}% vs cash in
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FinancingSliders (investor/FinancingSliders.tsx) ──────────────────────────

const FIN_PRESETS = [
  { label: 'Base', patch: { downPaymentPct: 0.2, mortgageRate: 0.0479, amortizationYears: 25 } },
  { label: 'OSFI', patch: { downPaymentPct: 0.2, mortgageRate: 0.0679, amortizationYears: 25 } },
  { label: '35% down', patch: { downPaymentPct: 0.35, mortgageRate: 0.0479, amortizationYears: 25 } },
  { label: 'Conservative', patch: { downPaymentPct: 0.2, mortgageRate: 0.0679, amortizationYears: 30 } },
];

function FinSliderRow({ id, label, unit, display, secondary, min, max, step, value, ticks, onChange }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label htmlFor={id} className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</label>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{unit}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="serif tabular" style={{ fontSize: 28, lineHeight: 1, letterSpacing: '-0.02em' }}>{display}</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{secondary}</span>
      </div>
      <input id={id} type="range" className="scout-slider" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ width: '100%' }} aria-label={label} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {ticks.map((t, i) => <span key={i} className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>{t}</span>)}
      </div>
    </div>
  );
}

function FinToggleRow({ label, value, onChange, hint }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
      <button
        type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
        style={{ width: 36, height: 20, borderRadius: 999, background: value ? 'var(--accent)' : 'var(--line-strong)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color .15s ease', flexShrink: 0 }}
      >
        <span style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: 'var(--surface)', transition: 'left .18s ease', boxShadow: 'var(--shadow-card)' }}></span>
      </button>
      <span style={{ color: 'var(--ink)' }}>{label}</span>
      {hint && <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {hint}</span>}
    </label>
  );
}

function FinancingSliders({ financing, price, onChange }) {
  const set = (patch) => onChange({ ...financing, ...patch });

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div className="col" style={{ gap: 6 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Financing assumptions</span>
          <h3 className="serif" style={{ fontSize: 24 }}>Adjust live — every metric updates.</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FIN_PRESETS.map((p) => (
            <button key={p.label} onClick={() => set(p.patch)} className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 11 }}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="grid-1col-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <FinSliderRow
          id="slider-down-payment" label="Down payment" unit="of price"
          display={`${Math.round(financing.downPaymentPct * 100)}%`}
          secondary={fmtMoney(financing.downPaymentPct * price)}
          min={5} max={50} step={5} value={financing.downPaymentPct * 100}
          onChange={(v) => set({ downPaymentPct: v / 100 })}
          ticks={['5%', '20%', '35%', '50%']}
        />
        <FinSliderRow
          id="slider-mortgage-rate" label="Mortgage rate" unit="annual"
          display={`${(financing.mortgageRate * 100).toFixed(2)}%`}
          secondary={`vs Base ${((financing.mortgageRate - 0.0479) * 100 >= 0 ? '+' : '') + ((financing.mortgageRate - 0.0479) * 100).toFixed(2)}%`}
          min={2} max={10} step={0.25} value={financing.mortgageRate * 100}
          onChange={(v) => set({ mortgageRate: v / 100 })}
          ticks={['2%', '4.79%', '6.79%', '10%']}
        />
        <FinSliderRow
          id="slider-amortization" label="Amortization" unit="years"
          display={`${financing.amortizationYears} yrs`}
          secondary={
            financing.amortizationYears >= 30 ? 'Longest standard'
            : financing.amortizationYears === 25 ? 'Default'
            : financing.amortizationYears <= 15 ? 'Aggressive'
            : 'Shorter term'
          }
          min={10} max={30} step={5} value={financing.amortizationYears}
          onChange={(v) => set({ amortizationYears: v })}
          ticks={['10', '15', '20', '25', '30']}
        />
      </div>

      <div style={{ height: 1, background: 'var(--line)', margin: '24px 0 18px' }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <FinToggleRow label="Include 8% management fee" value={financing.includeManagementFee} onChange={(v) => set({ includeManagementFee: v })} />
          <FinToggleRow label="Toronto LTT stacking" value={financing.isToronto} onChange={(v) => set({ isToronto: v })} hint="Doubles provincial LTT for City of Toronto" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
          <span>Appreciation:</span>
          <select
            value={financing.appreciationRate}
            onChange={(e) => set({ appreciationRate: parseFloat(e.target.value) })}
            aria-label="Annual appreciation rate"
            style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none', cursor: 'pointer' }}
          >
            <option value={0.0}>0% / yr (flat)</option>
            <option value={0.02}>2% / yr (conservative)</option>
            <option value={0.03}>3% / yr (default)</option>
            <option value={0.05}>5% / yr (optimistic)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LTTTable, OSFICard, EquityChart, FinancingSliders });
