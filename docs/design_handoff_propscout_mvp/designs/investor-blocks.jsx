// investor-blocks.jsx — interactive components for the Investor Report.
// FinancingSliders, OSFICard, LTTTable, EquityChart, FinancingScenariosTable.

const { useState: useStateIb, useMemo: useMemoIb } = React;

// ══════════════════════════════════════════════════════════════════
//  Financing slider panel — bound to App state, drives all the math
// ══════════════════════════════════════════════════════════════════
function FinancingSliders({ financing, onChange }) {
  const set = (k, v) => onChange({ ...financing, [k]: v });

  return (
    <div className="card" style={{ padding: 28 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div className="col" style={{ gap: 6 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Financing assumptions
          </span>
          <h3 className="serif" style={{ fontSize: 24 }}>Adjust live — every metric updates.</h3>
        </div>
        <div className="row gap-8">
          <PresetButton onClick={() => onChange({ ...financing, downPct: 0.20, rate: 0.0479, amort: 25 })} label="Base"/>
          <PresetButton onClick={() => onChange({ ...financing, downPct: 0.20, rate: 0.0679, amort: 25 })} label="OSFI"/>
          <PresetButton onClick={() => onChange({ ...financing, downPct: 0.35, rate: 0.0479, amort: 25 })} label="35% down"/>
          <PresetButton onClick={() => onChange({ ...financing, downPct: 0.20, rate: 0.0679, amort: 30 })} label="Conservative"/>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <SliderRow
          label="Down payment"
          unit="of price"
          value={financing.downPct}
          min={0.05} max={0.50} step={0.01}
          display={`${(financing.downPct * 100).toFixed(0)}%`}
          secondary={fmtMoney(financing.downPct * financing.price)}
          ticks={[0.20, 0.35, 0.50]}
          tickLabels={['20%', '35%', '50%']}
          onChange={(v) => set('downPct', v)}
        />
        <SliderRow
          label="Mortgage rate"
          unit="annual"
          value={financing.rate}
          min={0.025} max={0.099} step={0.001}
          display={`${(financing.rate * 100).toFixed(2)}%`}
          secondary={`vs Base ${((financing.rate - 0.0479) * 100).toFixed(2).replace('-', '−')}%`}
          ticks={[0.0479, 0.0679, 0.099]}
          tickLabels={['Base 4.79%', 'OSFI 6.79%', 'Max']}
          onChange={(v) => set('rate', v)}
        />
        <SliderRow
          label="Amortization"
          unit="years"
          value={financing.amort}
          min={15} max={30} step={5}
          display={`${financing.amort} yrs`}
          secondary={financing.amort >= 30 ? 'Longest standard' : financing.amort === 25 ? 'Default' : 'Aggressive'}
          ticks={[15, 20, 25, 30]}
          tickLabels={['15', '20', '25', '30']}
          onChange={(v) => set('amort', v)}
        />
      </div>

      <div className="divider" style={{ margin: '24px 0 18px' }}/>

      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div className="row gap-16" style={{ flexWrap: 'wrap' }}>
          <ToggleRow
            label="Include 8% management fee"
            value={financing.includeManagement}
            onChange={(v) => set('includeManagement', v)}
          />
          <ToggleRow
            label="Toronto LTT stacking"
            value={financing.toronto}
            onChange={(v) => set('toronto', v)}
            hint="Doubles provincial LTT for City of Toronto"
          />
        </div>
        <div className="row gap-12" style={{ alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
          <span>Appreciation:</span>
          <select
            value={financing.appreciation}
            onChange={(e) => set('appreciation', parseFloat(e.target.value))}
            style={{
              background: 'var(--bg-elev)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12,
              fontFamily: 'inherit', color: 'var(--ink)', outline: 'none',
            }}
          >
            <option value={0.00}>0% / yr (flat)</option>
            <option value={0.02}>2% / yr (conservative)</option>
            <option value={0.03}>3% / yr (default)</option>
            <option value={0.05}>5% / yr (optimistic)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function PresetButton({ label, onClick }) {
  return (
    <button onClick={onClick} className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 11 }}>
      {label}
    </button>
  );
}

function SliderRow({ label, unit, value, min, max, step, display, secondary, ticks, tickLabels, onChange }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {label}
        </span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {unit}
        </span>
      </div>
      <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="serif tabular" style={{ fontSize: 28, lineHeight: 1, letterSpacing: '-0.02em' }}>{display}</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{secondary}</span>
      </div>
      <input
        type="range"
        className="scout-slider"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {ticks && (
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
          {tickLabels.map((t, i) => (
            <span key={i} className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, value, onChange, hint }) {
  return (
    <label className="row gap-10" style={{ cursor: 'pointer', fontSize: 13 }}>
      <button
        onClick={(e) => { e.preventDefault(); onChange(!value); }}
        style={{
          width: 36, height: 20, borderRadius: 999,
          background: value ? 'var(--accent)' : 'var(--line-strong)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background-color .15s ease',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          top: 2, left: value ? 18 : 2,
          width: 16, height: 16, borderRadius: 999,
          background: 'var(--surface)',
          transition: 'left .18s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }}/>
      </button>
      <span style={{ color: 'var(--ink)' }}>{label}</span>
      {hint && <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {hint}</span>}
    </label>
  );
}

// ══════════════════════════════════════════════════════════════════
//  OSFI Stress Test card
// ══════════════════════════════════════════════════════════════════
function OSFICard({ osfi, financing }) {
  const passTone = osfi.pass ? 'pass' : 'fail';
  return (
    <div className="card col gap-20" style={{ padding: 26 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>OSFI stress test</span>
          <h4 className="serif" style={{ fontSize: 22 }}>B-20 mortgage qualification</h4>
        </div>
        <span className={`verdict-pill ${passTone}`}>
          {osfi.pass ? 'Qualifies' : 'Fails'}
        </span>
      </div>

      <div className="col" style={{ gap: 12 }}>
        {[
          { k: 'Contract rate', v: fmtPct(financing.rate, 2) },
          { k: 'Stress buffer', v: '+2.00 pts' },
          { k: 'Qualifying rate (higher of)', v: fmtPct(osfi.qualifyingRate, 2), bold: true, accent: true },
          { k: 'Qualifying payment', v: `${fmtMoney(osfi.qualifyingPmt)}/mo` },
          { k: 'GDS ratio', v: fmtPct(osfi.gds, 1), tone: osfi.pass ? 'pass' : 'fail', bold: true },
          { k: 'Threshold', v: fmtPct(osfi.threshold, 0) },
        ].map((r, i, arr) => (
          <div key={r.k} className="row" style={{
            justifyContent: 'space-between',
            paddingBottom: i < arr.length - 1 ? 12 : 0,
            borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
            fontSize: 13,
          }}>
            <span style={{ color: 'var(--ink-2)' }}>{r.k}</span>
            <span className="mono tabular" style={{
              fontWeight: r.bold ? 600 : 500,
              color: r.tone === 'pass' ? 'var(--pass)' : r.tone === 'fail' ? 'var(--fail)' : r.accent ? 'var(--accent)' : 'var(--ink)',
            }}>{r.v}</span>
          </div>
        ))}
      </div>

      <div style={{
        padding: '10px 14px',
        borderRadius: 12,
        background: `color-mix(in oklab, ${osfi.pass ? 'var(--pass)' : 'var(--fail)'} 8%, transparent)`,
        border: `1px solid color-mix(in oklab, ${osfi.pass ? 'var(--pass)' : 'var(--fail)'} 25%, transparent)`,
        fontSize: 12, color: 'var(--ink-2)',
        lineHeight: 1.5,
      }}>
        {osfi.pass
          ? <>Assumed gross household income $125k. At {fmtPct(osfi.qualifyingRate, 2)} qualifying rate, GDS sits comfortably under the 44% federal threshold — most insured-mortgage products available.</>
          : <>Assumed gross household income $125k. Qualifying payment pushes GDS to {fmtPct(osfi.gds, 1)} — above the 44% federal threshold. Standard A-lender financing likely unavailable; alt-lender or higher income required.</>
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Ontario LTT bracket table
// ══════════════════════════════════════════════════════════════════
function LTTTable({ ltt, price, toronto }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="row" style={{
        padding: '16px 24px', borderBottom: '1px solid var(--line)',
        justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12,
      }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Land Transfer Tax · Ontario{toronto ? ' + Toronto' : ''}
          </span>
          <h4 className="serif" style={{ fontSize: 22 }}>{fmtMoney(price)} purchase</h4>
        </div>
        <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
          <span className="serif tabular" style={{ fontSize: 28, lineHeight: 1, color: 'var(--accent)' }}>{fmtMoney(ltt.total)}</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {toronto ? 'Provincial + municipal' : 'Provincial only'}
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
        padding: '12px 24px', background: 'var(--bg-elev)',
        borderBottom: '1px solid var(--line)',
      }}>
        {['Bracket', 'Rate', 'Amount taxed', 'LTT'].map((h, i) => (
          <div key={h} className="mono" style={{
            fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--muted)',
            textAlign: i === 0 ? 'left' : 'right',
          }}>{h}</div>
        ))}
      </div>

      {ltt.rows.map((r, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
          padding: '12px 24px',
          borderBottom: i < ltt.rows.length - 1 ? '1px solid var(--line)' : 'none',
          fontSize: 13,
        }}>
          <span style={{ color: 'var(--ink)' }}>{r.band}</span>
          <span className="mono tabular" style={{ color: 'var(--ink-2)', textAlign: 'right' }}>{fmtPct(r.rate, 1)}</span>
          <span className="mono tabular" style={{ color: 'var(--ink-2)', textAlign: 'right' }}>{fmtMoney(r.amount)}</span>
          <span className="mono tabular" style={{ color: 'var(--ink)', textAlign: 'right', fontWeight: 500 }}>{fmtMoney(r.ltt)}</span>
        </div>
      ))}

      {toronto && (
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
          padding: '12px 24px',
          borderTop: '1px dashed var(--line-strong)',
          background: 'color-mix(in oklab, var(--accent) 5%, transparent)',
          fontSize: 13,
        }}>
          <span style={{ color: 'var(--ink-2)' }}>Toronto municipal LTT (stacked)</span>
          <span/>
          <span/>
          <span className="mono tabular" style={{ color: 'var(--accent)', textAlign: 'right', fontWeight: 600 }}>{fmtMoney(ltt.municipal)}</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Equity build line chart — hover for year-by-year details
// ══════════════════════════════════════════════════════════════════
function EquityChart({ equityCurve, totalCashInvested }) {
  const [hover, setHover] = useStateIb(null);

  const W = 720, H = 280;
  const pad = { l: 60, r: 24, t: 18, b: 40 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const yMax = Math.max(...equityCurve.map((p) => Math.max(p.value, p.equity)));
  const yMin = 0;
  const x = (year) => pad.l + (year / 20) * innerW;
  const y = (val)  => pad.t + (1 - (val - yMin) / (yMax - yMin)) * innerH;

  const valuePath  = equityCurve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.year)} ${y(p.value)}`).join(' ');
  const equityPath = equityCurve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.year)} ${y(p.equity)}`).join(' ');
  const equityArea = `${equityPath} L ${x(20)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  // Y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = yMin + (yMax - yMin) * t;
    return { v, y: y(v) };
  });

  const hoverPoint = hover != null ? equityCurve[hover] : null;
  const milestones = [5, 10, 20].map((yr) => equityCurve[yr]);

  return (
    <div className="card col" style={{ padding: 28, gap: 20 }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Equity build · 20 yr horizon</span>
          <h4 className="serif" style={{ fontSize: 24 }}>Where your money sits over time.</h4>
        </div>
        <div className="row gap-16" style={{ flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
          <span className="row gap-8"><span style={{ width: 14, height: 2, background: 'var(--ink)', display: 'inline-block' }}/> Property value</span>
          <span className="row gap-8"><span style={{ width: 14, height: 6, background: 'color-mix(in oklab, var(--accent) 50%, transparent)', borderRadius: 2, display: 'inline-block' }}/> Your equity</span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Y axis lines & labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={t.y} y2={t.y} stroke="var(--line)" strokeWidth="1"/>
              <text x={pad.l - 10} y={t.y + 4} textAnchor="end" fontSize="10" fontFamily="Geist Mono, monospace" fill="var(--muted)">
                {t.v >= 1e6 ? `$${(t.v / 1e6).toFixed(1)}m` : `$${Math.round(t.v / 1000)}k`}
              </text>
            </g>
          ))}

          {/* X axis ticks (every 5 years) */}
          {[0, 5, 10, 15, 20].map((yr) => (
            <g key={yr}>
              <line x1={x(yr)} x2={x(yr)} y1={H - pad.b} y2={H - pad.b + 5} stroke="var(--line-strong)" strokeWidth="1"/>
              <text x={x(yr)} y={H - pad.b + 20} textAnchor="middle" fontSize="11" fontFamily="Geist Mono, monospace" fill="var(--muted)">
                Yr {yr}
              </text>
            </g>
          ))}

          {/* Equity area fill */}
          <path d={equityArea} fill="color-mix(in oklab, var(--accent) 16%, transparent)"/>
          {/* Equity line */}
          <path d={equityPath} fill="none" stroke="var(--accent)" strokeWidth="2"/>
          {/* Value line (above equity) */}
          <path d={valuePath} fill="none" stroke="var(--ink)" strokeWidth="2" strokeDasharray="0"/>

          {/* Milestone markers */}
          {milestones.map((m) => (
            <g key={m.year}>
              <circle cx={x(m.year)} cy={y(m.equity)} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2"/>
            </g>
          ))}

          {/* Invisible hit area for hover */}
          {equityCurve.map((p, i) => (
            <rect
              key={i}
              x={x(p.year) - 16} y={pad.t} width={32} height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'crosshair' }}
            />
          ))}

          {/* Hover crosshair + tooltip */}
          {hoverPoint && (
            <g>
              <line x1={x(hoverPoint.year)} x2={x(hoverPoint.year)} y1={pad.t} y2={H - pad.b}
                stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 3"/>
              <circle cx={x(hoverPoint.year)} cy={y(hoverPoint.value)}  r="5" fill="var(--ink)" stroke="var(--surface)" strokeWidth="2"/>
              <circle cx={x(hoverPoint.year)} cy={y(hoverPoint.equity)} r="5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2"/>
            </g>
          )}
        </svg>

        {/* HTML tooltip overlay (easier styling than foreignObject) */}
        {hoverPoint && (
          <div style={{
            position: 'absolute',
            left: `${(x(hoverPoint.year) / W) * 100}%`,
            top: 0,
            transform: `translateX(${hoverPoint.year > 15 ? '-110%' : '12px'})`,
            background: 'var(--ink)', color: 'var(--bg)',
            borderRadius: 10, padding: '12px 14px',
            minWidth: 200,
            fontSize: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,.25)',
            pointerEvents: 'none',
          }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>
              Year {hoverPoint.year}
            </div>
            {[
              ['Property value', fmtMoney(hoverPoint.value)],
              ['Mortgage left',  fmtMoney(hoverPoint.remaining)],
              ['Your equity',    fmtMoney(hoverPoint.equity), true],
              ['Vs. cash in',    `${hoverPoint.cashOnCash >= 0 ? '+' : '−'}${(Math.abs(hoverPoint.cashOnCash) * 100).toFixed(0)}%`],
            ].map(([k, v, accent]) => (
              <div key={k} className="row" style={{ justifyContent: 'space-between', gap: 16, padding: '3px 0' }}>
                <span style={{ color: 'rgba(255,255,255,.7)' }}>{k}</span>
                <span className="mono tabular" style={{ color: accent ? 'var(--accent)' : 'var(--bg)', fontWeight: accent ? 600 : 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestone strip below chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {milestones.map((m) => (
          <div key={m.year} className="col" style={{
            padding: '14px 16px',
            borderRadius: 12,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            gap: 4,
          }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Year {m.year}</span>
            <span className="serif tabular" style={{ fontSize: 24, lineHeight: 1 }}>{fmtMoney(m.equity)}</span>
            <span className="mono" style={{ fontSize: 11, color: m.cashOnCash >= 0 ? 'var(--pass)' : 'var(--fail)' }}>
              {m.cashOnCash >= 0 ? '+' : '−'}{(Math.abs(m.cashOnCash) * 100).toFixed(0)}% vs cash in
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { FinancingSliders, OSFICard, LTTTable, EquityChart });
