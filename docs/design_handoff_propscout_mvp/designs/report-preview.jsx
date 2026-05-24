// report-preview.jsx — the embedded mini-report mock shown in the hero & elsewhere

const { useEffect: useEffect_rp, useState: useState_rp } = React;

// ── Radial deal-score gauge ────────────────────────────────────
// `label`: optional inner label. Omit (or pass null) to auto-default. Pass "" to hide.
// `showVerdict`: optional override. Auto-hidden at sizes below 130.
function DealScore({ score = 78, size = 188, animate = true, label, showVerdict }) {
  // Stroke scales with size so small gauges don't look chunky
  const stroke = Math.max(5, Math.round(size * 0.075));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState_rp(animate ? 0 : score);

  useEffect_rp(() => {
    if (!animate) return;
    const t = setTimeout(() => setDrawn(score), 200);
    return () => clearTimeout(t);
  }, [score, animate]);

  const pct = drawn / 100;
  const off = c * (1 - pct);

  const verdict =
  score >= 80 ? 'Strong deal' :
  score >= 65 ? 'Good deal' :
  score >= 50 ? 'Caution' :
  score >= 35 ? 'Marginal' :
  'Hard pass';
  const color =
  score >= 65 ? 'var(--pass)' :
  score >= 35 ? 'var(--caution)' :
  'var(--fail)';

  // Auto-hide internals when the gauge is small — label / verdict belong
  // outside the ring at compact sizes.
  const labelText = label === '' ? null : label == null ? size >= 150 ? 'Deal score / 100' : null : label;
  const showV = showVerdict != null ? showVerdict : size >= 150;
  const numberSize =
  size >= 170 ? size * 0.42 :
  size >= 120 ? size * 0.42 :
  size >= 80 ? size * 0.46 :
  size * 0.52;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)' }} />
        
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: stroke + 2
      }}>
        <div className="serif tabular" style={{ fontSize: numberSize, lineHeight: 1, fontWeight: 400, color: 'var(--ink)' }}>{score}</div>
        {labelText &&
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 6, textAlign: 'center', whiteSpace: 'nowrap' }}>
            {labelText}
          </div>
        }
        {showV &&
        <div style={{
          marginTop: 6, fontSize: 11, fontWeight: 500,
          color, padding: '3px 10px', borderRadius: 999,
          border: `1px solid ${color}`, background: `color-mix(in oklab, ${color} 8%, transparent)`,
          whiteSpace: 'nowrap'
        }}>{verdict}</div>
        }
      </div>
    </div>);

}

// ── Metric tile ────────────────────────────────────────────────
function Metric({ label, value, sub, status, big }) {
  const color =
  status === 'pass' ? 'var(--pass)' :
  status === 'caution' ? 'var(--caution)' :
  status === 'fail' ? 'var(--fail)' :
  'var(--ink)';
  return (
    <div className="col gap-8" style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div className="serif tabular" style={{ fontSize: big ? 32 : 26, lineHeight: 1, color }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
    </div>);

}

// ── Rental comps mini-chart: percentile bar + ask marker ───────
function RentalCompsBar({ low = 2700, mid = 2900, high = 3200, ask = 2900 }) {
  const range = high - low;
  const askPos = (ask - low) / range * 100;
  const verdict =
  ask >= high ? { lbl: 'Above market', tone: 'caution' } :
  ask > low ? { lbl: 'At market', tone: 'pass' } :
  { lbl: 'Below market', tone: 'pass' };
  return (
    <div className="col gap-16">
      {/* Top header — clean two-row label/price */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="col" style={{ gap: 4 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', margin: "0px" }}>
            Asking rent
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 4 }}>
            <span className="serif tabular" style={{ fontSize: 28, lineHeight: 1, color: 'var(--ink)' }}>${ask.toLocaleString()}</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>/mo</span>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.01em',
          padding: '5px 10px', borderRadius: 999,
          color: verdict.tone === 'pass' ? 'var(--pass)' : 'var(--caution)',
          border: `1px solid color-mix(in oklab, ${verdict.tone === 'pass' ? 'var(--pass)' : 'var(--caution)'} 35%, transparent)`,
          background: `color-mix(in oklab, ${verdict.tone === 'pass' ? 'var(--pass)' : 'var(--caution)'} 8%, transparent)`
        }}>● {verdict.lbl}</span>
      </div>

      {/* Bar with hover-tooltip diamond */}
      <div style={{ position: 'relative', height: 28, marginTop: 8 }}>
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          left: 0, right: 0, height: 6, borderRadius: 999,
          background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent) 18%, var(--bg-elev)), color-mix(in oklab, var(--accent) 55%, transparent), color-mix(in oklab, var(--accent) 18%, var(--bg-elev)))'
        }} />
        {[0, 50, 100].map((p) =>
        <div key={p} style={{
          position: 'absolute', left: `${p}%`, top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 1.5, height: 14,
          background: 'var(--ink)',
          opacity: p === 50 ? 0.4 : 0.18,
          pointerEvents: 'none'
        }} />
        )}
        {/* ask marker — hover-tooltip diamond */}
        <div className="comp-marker" style={{
          position: 'absolute', left: `${askPos}%`, top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer'
        }}>
          <div className="comp-marker-dot" style={{
            width: 14, height: 14,
            background: 'var(--ink)',
            borderRadius: 3,
            transform: 'rotate(45deg)',
            border: '2px solid var(--surface)',
            boxShadow: '0 2px 6px rgba(14,19,32,0.18)',
            transition: 'transform .15s ease, background-color .15s ease'
          }} />
          <div className="comp-marker-tip" style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--ink)', color: 'var(--bg)',
            padding: '6px 10px', borderRadius: 8,
            fontSize: 11, fontWeight: 500,
            whiteSpace: 'nowrap',
            opacity: 0, pointerEvents: 'none',
            transition: 'opacity .15s ease, transform .15s ease',
            transformOrigin: 'bottom center',
            boxShadow: '0 6px 16px rgba(0,0,0,.18)'
          }}>
            <span className="mono tabular">${ask.toLocaleString()}/mo</span>
            <span style={{ color: 'rgba(255,255,255,.55)', marginLeft: 6 }}>· P50</span>
            <div style={{
              position: 'absolute', top: '100%', left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid var(--ink)'
            }} />
          </div>
        </div>
      </div>

      {/* Percentile labels under the bar — small, tabular, aligned */}
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 2 }}>
        {[
        { lbl: 'P25 · low', val: low, align: 'flex-start' },
        { lbl: 'P50 · median', val: mid, align: 'center' },
        { lbl: 'P75 · high', val: high, align: 'flex-end' }].
        map((t) =>
        <div key={t.lbl} className="col" style={{ alignItems: t.align, gap: 2 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--muted)' }}>{t.lbl}</div>
            <div className="mono tabular" style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>${t.val.toLocaleString()}</div>
          </div>
        )}
      </div>

      <div className="divider" style={{ marginTop: 8 }} />

      <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
        <div className="row gap-8">
          <span>12-mo trend</span>
          <span style={{ color: 'var(--caution)', fontWeight: 500 }} className="tabular">↓ 1.4%</span>
        </div>
        <div className="row gap-8">
          <span>Median DOM</span>
          <span style={{ color: 'var(--ink)', fontWeight: 500 }} className="tabular">18 days</span>
        </div>
        <div className="row gap-8">
          <span>CMHC vacancy</span>
          <span style={{ color: 'var(--pass)', fontWeight: 500 }} className="tabular">1.8%</span>
        </div>
      </div>
    </div>);

}

// ── AI verdict snippet ─────────────────────────────────────────
function AIVerdictBlock({ compact, addr, eyebrow, headline, sub }) {
  // Default content (investor — Buttermill condo). Pass `headline`/`sub` to override.
  const defaultHeadline = (
    <>The <span style={{ color: 'var(--accent)' }}>$761/mo condo fee</span> is what ends this deal before it starts. At $9,132 a year it consumes 26% of the gross rent this unit can realistically earn — before the mortgage, taxes, or insurance are touched.</>
  );
  const defaultSub = (
    <>Run the numbers at current rates and you are looking at <span className="tabular">$4,733</span> going out every month against roughly <span className="tabular">$2,900</span> coming in — a <span style={{ color: 'var(--accent)' }}>$1,833</span> shortfall every single month before a single vacancy or repair.</>
  );

  return (
    <div style={{
      background: 'var(--ink)',
      color: 'var(--bg)',
      borderRadius: 18,
      padding: compact ? '20px 22px' : '28px 30px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="row gap-8" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 12 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)' }} className="live-dot" />
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{eyebrow || 'PropScout AI · verdict'}</span>
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>claude · sonnet</span>
      </div>

      <div className="serif" style={{
        fontSize: compact ? 19 : 22, lineHeight: 1.35,
        color: 'var(--bg)',
        letterSpacing: '-0.005em'
      }}>
        {headline || defaultHeadline}
      </div>

      {!compact && (sub !== null) && (
        <div className="serif" style={{ fontSize: 19, lineHeight: 1.4, color: 'rgba(255,255,255,0.78)', marginTop: 14 }}>
          {sub || defaultSub}
        </div>
      )}

      <div className="row" style={{ marginTop: 18, justifyContent: 'space-between', gap: 16, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
        <span>{addr || 'Unit 5702 · 5 Buttermill Ave, Vaughan ON'}</span>
        <button
          onClick={() => window.__propscoutSignIn && window.__propscoutSignIn()}
          className="mono verdict-link-dark"
          style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            color: 'var(--accent)', fontWeight: 500, fontSize: 12,
            letterSpacing: '0.04em'
          }}>read full verdict →</button>
      </div>
    </div>);
}

// ── Risk flag pill ─────────────────────────────────────────────
function RiskRow({ tone = 'red', label, detail }) {
  const color =
    tone === 'red'   ? 'var(--fail)' :
    tone === 'amber' ? 'var(--caution)' :
    tone === 'good'  ? 'var(--pass)' :
                       'var(--muted)';
  const right =
    tone === 'red'   ? '−4 pts' :
    tone === 'amber' ? 'soft' :
    tone === 'good'  ? '✓ confirmed' :
                       '';
  return (
    <div className="row gap-12" style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <div style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
      <div className="col grow" style={{ gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{detail}</div>
      </div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>
        {right}
      </div>
    </div>);

}

// ── Mini map mock (Mapbox-style, drawn with SVG) ───────────────
function MiniMap({ height = 240, address, pins: customPins }) {
  // A more realistic street-grid mock with varied block sizes,
  // a small park, water sliver, and clean cartographic colours.
  const buildings = [
  // [x, y, w, h]
  [44, 30, 18, 14], [66, 30, 16, 14], [86, 30, 22, 14], [112, 30, 14, 14], [130, 30, 24, 14],
  [44, 50, 14, 18], [62, 50, 22, 18], [88, 50, 18, 18], [110, 50, 16, 18], [130, 50, 24, 18],
  [180, 22, 18, 12], [202, 22, 14, 12], [220, 22, 22, 12], [246, 22, 16, 12], [266, 22, 20, 12],
  [180, 40, 22, 16], [206, 40, 18, 16], [228, 40, 22, 16], [254, 40, 18, 16], [276, 40, 10, 16],
  [296, 30, 18, 14], [318, 30, 16, 14], [338, 30, 24, 14], [366, 30, 14, 14],
  [296, 50, 18, 18], [318, 50, 22, 18], [344, 50, 16, 18], [364, 50, 18, 18],

  [44, 96, 22, 16], [70, 96, 18, 16], [92, 96, 22, 16], [118, 96, 14, 16], [136, 96, 22, 16],
  [44, 116, 18, 20], [66, 116, 22, 20], [92, 116, 16, 20], [112, 116, 22, 20], [138, 116, 20, 20],

  [310, 96, 22, 14], [336, 96, 18, 14], [358, 96, 16, 14],
  [310, 114, 18, 22], [332, 114, 22, 22], [358, 114, 16, 22],

  [44, 164, 16, 14], [64, 164, 22, 14], [90, 164, 18, 14], [112, 164, 22, 14], [138, 164, 16, 14],
  [44, 182, 22, 18], [70, 182, 18, 18], [92, 182, 22, 18], [118, 182, 16, 18], [138, 182, 20, 18],

  [296, 162, 22, 16], [322, 162, 18, 16], [344, 162, 22, 16],
  [296, 184, 18, 18], [318, 184, 22, 18], [344, 184, 22, 18]];


  const pins = customPins || [
  { x: 14, y: 40, n: '$2,850' }, // far-left (clear of address label)
  { x: 72, y: 22, n: '$3,050' }, // top-right
  { x: 36, y: 64, n: '$2,750' }, // bottom-left
  { x: 75, y: 68, n: '$3,200' }, // bottom-right
  { x: 58, y: 78, n: '$2,900' } // bottom-mid
  ];

  return (
    <div style={{
      position: 'relative', height,
      borderRadius: 14, overflow: 'hidden',
      background: 'var(--bg-elev)',
      border: '1px solid var(--line)'
    }}>
      <svg width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="mapWash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--accent) 5%, var(--bg-elev))" />
            <stop offset="100%" stopColor="var(--bg-elev)" />
          </linearGradient>
          <pattern id="micro" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="transparent" />
            <circle cx="0.5" cy="0.5" r="0.4" fill="currentColor" opacity="0.05" />
          </pattern>
        </defs>

        {/* Land wash */}
        <rect width="400" height="240" fill="url(#mapWash)" />
        <rect width="400" height="240" fill="url(#micro)" style={{ color: 'var(--ink)' }} />

        {/* River sliver across top-right corner */}
        <path d="M 280 -20 Q 320 30 380 50 L 410 60 L 410 -10 Z"
        fill="color-mix(in oklab, var(--accent) 14%, var(--bg-elev))"
        opacity="0.45" />
        <path d="M 280 -20 Q 320 30 380 50"
        fill="none"
        stroke="color-mix(in oklab, var(--accent) 25%, transparent)"
        strokeWidth="0.6" />

        {/* Two parks (rectangles, soft sage) */}
        <rect x="170" y="78" width="118" height="68" rx="3"
        fill="color-mix(in oklab, var(--pass) 20%, transparent)"
        stroke="color-mix(in oklab, var(--pass) 25%, transparent)"
        strokeWidth="0.5" />
        <rect x="172" y="80" width="114" height="64" rx="2"
        fill="none"
        stroke="color-mix(in oklab, var(--pass) 18%, transparent)"
        strokeWidth="0.5" strokeDasharray="2 3" />

        {/* Major roads — wide, light ink, with casing */}
        {/* Horizontal arterials */}
        <g style={{ color: 'var(--line-strong)' }}>
          <line x1="-10" y1="84" x2="410" y2="80" stroke="currentColor" strokeWidth="9" opacity="0.45" />
          <line x1="-10" y1="84" x2="410" y2="80" stroke="var(--bg-elev)" strokeWidth="7" />
          <line x1="-10" y1="84" x2="410" y2="80" stroke="var(--bg)" strokeWidth="5" opacity="0.85" />
          <line x1="-10" y1="84" x2="410" y2="80" stroke="color-mix(in oklab, var(--accent) 40%, transparent)" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.7" />

          <line x1="-10" y1="152" x2="410" y2="155" stroke="currentColor" strokeWidth="9" opacity="0.45" />
          <line x1="-10" y1="152" x2="410" y2="155" stroke="var(--bg-elev)" strokeWidth="7" />
          <line x1="-10" y1="152" x2="410" y2="155" stroke="var(--bg)" strokeWidth="5" opacity="0.85" />
          <line x1="-10" y1="152" x2="410" y2="155" stroke="color-mix(in oklab, var(--accent) 40%, transparent)" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.7" />

          {/* Vertical arterial */}
          <line x1="168" y1="-10" x2="170" y2="250" stroke="currentColor" strokeWidth="9" opacity="0.45" />
          <line x1="168" y1="-10" x2="170" y2="250" stroke="var(--bg-elev)" strokeWidth="7" />
          <line x1="168" y1="-10" x2="170" y2="250" stroke="var(--bg)" strokeWidth="5" opacity="0.85" />

          <line x1="290" y1="-10" x2="288" y2="250" stroke="currentColor" strokeWidth="9" opacity="0.45" />
          <line x1="290" y1="-10" x2="288" y2="250" stroke="var(--bg-elev)" strokeWidth="7" />
          <line x1="290" y1="-10" x2="288" y2="250" stroke="var(--bg)" strokeWidth="5" opacity="0.85" />
        </g>

        {/* Minor roads — thin lines */}
        <g stroke="var(--line)" strokeWidth="2" opacity="0.7">
          <line x1="-10" y1="22" x2="170" y2="22" />
          <line x1="200" y1="22" x2="410" y2="22" />
          <line x1="-10" y1="46" x2="170" y2="46" />
          <line x1="200" y1="46" x2="410" y2="46" />
          <line x1="-10" y1="112" x2="170" y2="112" />
          <line x1="-10" y1="138" x2="170" y2="138" />
          <line x1="290" y1="112" x2="410" y2="112" />
          <line x1="290" y1="138" x2="410" y2="138" />
          <line x1="-10" y1="180" x2="170" y2="180" />
          <line x1="-10" y1="206" x2="170" y2="206" />
          <line x1="290" y1="180" x2="410" y2="180" />
          <line x1="290" y1="206" x2="410" y2="206" />

          <line x1="40" y1="-10" x2="40" y2="250" />
          <line x1="86" y1="-10" x2="86" y2="78" />
          <line x1="86" y1="160" x2="86" y2="250" />
          <line x1="130" y1="-10" x2="130" y2="78" />
          <line x1="130" y1="160" x2="130" y2="250" />
          <line x1="218" y1="-10" x2="218" y2="78" />
          <line x1="218" y1="160" x2="218" y2="250" />
          <line x1="252" y1="-10" x2="252" y2="78" />
          <line x1="252" y1="160" x2="252" y2="250" />
          <line x1="338" y1="-10" x2="338" y2="250" />
          <line x1="380" y1="-10" x2="380" y2="250" />
        </g>

        {/* Buildings — small, varied, low-contrast */}
        <g fill="var(--ink)" opacity="0.07">
          {buildings.map(([x, y, w, h], i) =>
          <rect key={i} x={x} y={y} width={w} height={h} rx="1.5" />
          )}
        </g>

        {/* Faint border to suggest tile edge */}
        <rect x="0.5" y="0.5" width="399" height="239" fill="none" stroke="var(--line)" strokeWidth="0.5" />
      </svg>

      {/* Subject pin (large, accent, with halo) */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: -22,
          borderRadius: 999,
          background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 40%, transparent) 0%, transparent 65%)'
        }} />
        <div style={{
          position: 'relative',
          width: 30, height: 30, borderRadius: 999,
          background: 'var(--accent)', border: '3px solid var(--surface)',
          boxShadow: '0 8px 22px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 12, fontWeight: 600
        }}>★</div>
      </div>

      {/* Comp pins — anchored cleanly, with small dot + price tag */}
      {pins.map((p, i) =>
      <div key={i} style={{
        position: 'absolute',
        left: `${p.x}%`, top: `${p.y}%`,
        transform: 'translate(-50%, -100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 2,
        pointerEvents: 'none'
      }}>
          <div className="mono tabular" style={{
          fontSize: 11,
          padding: '4px 9px',
          borderRadius: 999,
          background: 'var(--surface)',
          color: 'var(--ink)',
          border: '1px solid var(--line-strong)',
          boxShadow: '0 6px 14px -6px rgba(14,19,32,0.25), 0 1px 2px rgba(14,19,32,0.08)',
          whiteSpace: 'nowrap',
          fontWeight: 500,
          letterSpacing: '-0.005em'
        }}>{p.n}</div>
          <div style={{
          width: 6, height: 6, borderRadius: 999,
          background: 'var(--ink)',
          border: '1.5px solid var(--surface)'
        }} />
        </div>
      )}

      {/* Top-left address label */}
      <div className="mono" style={{
        position: 'absolute', top: 12, left: 14,
        padding: '4px 10px', borderRadius: 6,
        background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        border: '1px solid var(--line)',
        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--muted)'
      }}>
        {address || 'Vaughan · L4K · 1km radius'}
      </div>

      {/* Bottom-right map controls (zoom / attribution) */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12,
        display: 'flex', flexDirection: 'column', gap: 4,
        borderRadius: 6, overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(14,19,32,0.08)'
      }}>
        <button aria-label="zoom in" style={mapBtnStyle}>+</button>
        <button aria-label="zoom out" style={{ ...mapBtnStyle, borderTop: '1px solid var(--line)' }}>−</button>
      </div>

      {/* Attribution */}
      <div className="mono" style={{
        position: 'absolute', bottom: 8, left: 14,
        fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--muted)',
        background: 'color-mix(in oklab, var(--surface) 85%, transparent)',
        padding: '2px 6px', borderRadius: 4
      }}>
        © Mapbox · OpenStreetMap
      </div>
    </div>);

}

const mapBtnStyle = {
  width: 26, height: 26,
  border: 'none', background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 14, fontWeight: 500,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

Object.assign(window, { DealScore, Metric, RentalCompsBar, AIVerdictBlock, RiskRow, MiniMap });