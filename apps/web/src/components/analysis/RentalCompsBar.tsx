/**
 * RentalCompsBar — rental comps percentile bar, ported from
 * report-preview.jsx::RentalCompsBar (the design source of truth).
 *
 * Composition (top to bottom):
 *   1. Header — "Asking rent" eyebrow + serif price + market-position pill
 *   2. Accent-tinted gradient bar with P25/P50/P75 tick marks and a diamond
 *      ask marker (CSS hover: scales 1.18× + turns --accent, tooltip fades in)
 *   3. Percentile labels (P25 · low / P50 · median / P75 · high) with values
 *   4. Optional market-context strip (12-mo trend · median DOM · CMHC vacancy)
 *      — renders only when the caller has data for it.
 *
 * Market-position pill: ask ≥ high → "Above market" (caution),
 * ask > low → "At market" (pass), else "Below market" (pass).
 */

interface MarketContext {
  /** 12-month rent trend in percent, e.g. -1.4 renders "↓ 1.4%". */
  trendPct: number
  /** Median days-on-market for comps in this area. */
  medianDom: number
  /** CMHC vacancy rate in percent, e.g. 1.8 renders "1.8%". */
  vacancyPct: number
}

interface RentalCompsBarProps {
  low: number
  mid: number
  high: number
  ask: number
  /** Optional 12-mo trend / DOM / vacancy strip below the bar. */
  context?: MarketContext
}

function fmtDollar(n: number): string {
  return '$' + n.toLocaleString('en-CA')
}

export function RentalCompsBar({ low, mid, high, ask, context }: RentalCompsBarProps): JSX.Element {
  // Position ask as a fraction of the bar width [0, 1], clamped
  const range = high - low
  const raw = range === 0 ? 0.5 : (ask - low) / range
  const fraction = Math.max(0, Math.min(1, raw))

  const verdict =
    ask >= high
      ? { lbl: 'Above market', tone: 'var(--caution)' }
      : ask > low
        ? { lbl: 'At market', tone: 'var(--pass)' }
        : { lbl: 'Below market', tone: 'var(--pass)' }

  return (
    <div
      data-testid="rental-comps-bar"
      className="col gap-16"
      role="region"
      aria-label={`Rental comps: low ${fmtDollar(low)}, mid ${fmtDollar(mid)}, high ${fmtDollar(high)}, estimate ${fmtDollar(ask)}`}
    >
      {/* Header — asking rent + market-position pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="col" style={{ gap: 4 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Asking rent
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span
              className="serif tabular"
              style={{ fontSize: 28, lineHeight: 1, color: 'var(--ink)' }}
            >
              {fmtDollar(ask)}
            </span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
              /mo
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.01em',
            padding: '5px 10px',
            borderRadius: 999,
            color: verdict.tone,
            border: `1px solid color-mix(in oklab, ${verdict.tone} 35%, transparent)`,
            background: `color-mix(in oklab, ${verdict.tone} 8%, transparent)`,
          }}
        >
          ● {verdict.lbl}
        </span>
      </div>

      {/* Bar with tick marks + hover-tooltip diamond */}
      <div style={{ position: 'relative', height: 28, marginTop: 8 }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left: 0,
            right: 0,
            height: 6,
            borderRadius: 999,
            background:
              'linear-gradient(90deg, color-mix(in oklab, var(--accent) 18%, var(--bg-elev)), color-mix(in oklab, var(--accent) 55%, transparent), color-mix(in oklab, var(--accent) 18%, var(--bg-elev)))',
          }}
        />
        {[0, 50, 100].map((p) => (
          <div
            key={p}
            style={{
              position: 'absolute',
              left: `${p}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 1.5,
              height: 14,
              background: 'var(--ink)',
              opacity: p === 50 ? 0.4 : 0.18,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Ask marker — hover-tooltip diamond (CSS hover via comp-marker classes) */}
        <div
          className="comp-marker"
          role="img"
          aria-label={`Estimated rent: ${fmtDollar(ask)}`}
          style={{
            position: 'absolute',
            left: `${fraction * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            className="comp-marker-dot"
            style={{
              width: 14,
              height: 14,
              background: 'var(--ink)',
              borderRadius: 3,
              transform: 'rotate(45deg)',
              border: '2px solid var(--surface)',
              boxShadow: '0 2px 6px rgba(14,19,32,0.18)',
              transition: 'transform .15s ease, background-color .15s ease',
            }}
          />
          <div
            className="comp-marker-tip"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--ink)',
              color: 'var(--bg)',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity .15s ease, transform .15s ease',
              transformOrigin: 'bottom center',
              boxShadow: '0 6px 16px rgba(0,0,0,.18)',
            }}
          >
            <span className="mono tabular">{fmtDollar(ask)}/mo</span>
            <span
              style={{ color: 'color-mix(in oklab, var(--bg) 55%, transparent)', marginLeft: 6 }}
            >
              · ask
            </span>
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid var(--ink)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Percentile labels under the bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {(
          [
            { lbl: 'P25 · low', val: low, align: 'flex-start' },
            { lbl: 'P50 · median', val: mid, align: 'center' },
            { lbl: 'P75 · high', val: high, align: 'flex-end' },
          ] as const
        ).map((t) => (
          <div key={t.lbl} className="col" style={{ alignItems: t.align, gap: 2 }}>
            <div
              className="mono"
              style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--muted)' }}
            >
              {t.lbl}
            </div>
            <div
              className="mono tabular"
              style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}
            >
              {fmtDollar(t.val)}
            </div>
          </div>
        ))}
      </div>

      {/* Market context strip — only when the caller has real values */}
      {context && (
        <>
          <div className="divider" style={{ marginTop: 8, borderTop: '1px solid var(--line)' }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--muted)',
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <span>12-mo trend</span>
              <span
                className="tabular"
                style={{
                  color:
                    context.trendPct < 0
                      ? 'var(--caution)'
                      : context.trendPct > 0
                        ? 'var(--pass)'
                        : 'var(--ink)',
                  fontWeight: 500,
                }}
              >
                {context.trendPct < 0 ? '↓' : context.trendPct > 0 ? '↑' : '→'}{' '}
                {Math.abs(context.trendPct).toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span>Median DOM</span>
              <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {context.medianDom} days
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span>CMHC vacancy</span>
              <span className="tabular" style={{ color: 'var(--pass)', fontWeight: 500 }}>
                {context.vacancyPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
