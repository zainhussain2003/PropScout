// RentalCompsBar — percentile range bar with a diamond ask-price marker.
//
// Props:
//   low   P25 rent (floor of the bar)
//   mid   P50 rent (median line marker)
//   high  P75 rent (ceiling of the bar)
//   ask   Asking price — diamond marker position + header display

interface RentalCompsBarProps {
  low: number
  mid: number
  high: number
  ask: number
}

type VerdictTone = 'pass' | 'caution'

interface Verdict {
  lbl: string
  tone: VerdictTone
}

function getVerdict(ask: number, low: number, high: number): Verdict {
  if (ask >= high) return { lbl: 'Above market', tone: 'caution' }
  if (ask > low) return { lbl: 'At market', tone: 'pass' }
  return { lbl: 'Below market', tone: 'pass' }
}

export function RentalCompsBar({ low, mid, high, ask }: RentalCompsBarProps): JSX.Element {
  const range = high - low
  const askPos = Math.min(Math.max(((ask - low) / range) * 100, 2), 98)
  const verdict = getVerdict(ask, low, high)

  const verdictColor = verdict.tone === 'pass' ? 'var(--pass)' : 'var(--caution)'

  return (
    <div className="col gap-16">
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
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
          <div className="row" style={{ alignItems: 'baseline', gap: 4 }}>
            <span
              className="serif tabular"
              style={{ fontSize: 28, lineHeight: 1, color: 'var(--ink)' }}
            >
              ${ask.toLocaleString()}
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
            color: verdictColor,
            border: `1px solid color-mix(in oklab, ${verdictColor} 35%, transparent)`,
            background: `color-mix(in oklab, ${verdictColor} 8%, transparent)`,
          }}
        >
          ● {verdict.lbl}
        </span>
      </div>

      {/* Bar with diamond marker */}
      <div style={{ position: 'relative', height: 28, marginTop: 8 }}>
        {/* Gradient track */}
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

        {/* Tick marks at P25 / P50 / P75 */}
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

        {/* Ask diamond marker with hover tooltip */}
        <div
          className="comp-marker"
          style={{
            position: 'absolute',
            left: `${askPos}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label={`Asking price $${ask.toLocaleString()}/mo`}
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
            <span className="mono tabular">${ask.toLocaleString()}/mo</span>
            <span style={{ color: 'rgba(255,255,255,.55)', marginLeft: 6 }}>· asking</span>
            {/* Caret */}
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

      {/* Percentile labels */}
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 2 }}>
        {[
          { lbl: 'P25 · low', val: low, align: 'flex-start' as const },
          { lbl: 'P50 · median', val: mid, align: 'center' as const },
          { lbl: 'P75 · high', val: high, align: 'flex-end' as const },
        ].map((t) => (
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
              ${t.val.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="divider" style={{ marginTop: 8 }} />

      <div
        className="row"
        style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}
      >
        <div className="row gap-8">
          <span>12-mo trend</span>
          <span className="tabular" style={{ color: 'var(--caution)', fontWeight: 500 }}>
            ↓ 1.4%
          </span>
        </div>
        <div className="row gap-8">
          <span>Median DOM</span>
          <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            18 days
          </span>
        </div>
        <div className="row gap-8">
          <span>CMHC vacancy</span>
          <span className="tabular" style={{ color: 'var(--pass)', fontWeight: 500 }}>
            1.8%
          </span>
        </div>
      </div>
    </div>
  )
}
