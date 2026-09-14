/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

interface ShowcaseRentalCompsBarProps {
  low: number
  mid: number
  high: number
  ask: number
}
export function ShowcaseRentalCompsBar({
  low,
  mid,
  high,
  ask,
}: ShowcaseRentalCompsBarProps): JSX.Element {
  const pct = (v: number): string => `${(((v - low) / (high - low)) * 100).toFixed(1)}%`
  const askPct = ((ask - low) / (high - low)) * 100
  const askColor = ask <= mid ? 'var(--pass)' : ask <= high ? 'var(--caution)' : 'var(--fail)'
  return (
    <div className="col gap-12" style={{ width: '100%' }}>
      <div style={{ position: 'relative', height: 8, borderRadius: 999 }}>
        <div
          style={{
            position: 'absolute',
            left: pct(low),
            right: `${100 - parseFloat(pct(high))}%`,
            height: '100%',
            background: 'var(--line)',
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(askPct, 96)}%`,
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: askColor,
            top: -2,
            border: '2px solid var(--surface)',
          }}
        />
      </div>
      <div
        className="row"
        style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}
      >
        <span className="mono tabular">${low.toLocaleString()}</span>
        <span className="mono tabular" style={{ color: 'var(--ink)' }}>
          Market mid ${mid.toLocaleString()}
        </span>
        <span className="mono tabular">${high.toLocaleString()}</span>
      </div>
    </div>
  )
}

/**
 * The 36 comps behind the rent range, as a distribution.
 *
 * This slot used to be a 200px empty grey box captioned "Toronto · M4Y · 1km
 * radius" — a placeholder for a map. It sat in the largest panel of the landing
 * page's one piece of product proof, so the first real thing a visitor studied
 * was a rectangle with nothing in it. A map was also the wrong answer twice
 * over: the showcase already renders a real comps map in the column beside
 * this, and a map answers "where", while the panel is titled "Rent positioning"
 * and is asking "how much".
 *
 * A distribution answers it. It shows the shape of the market — that most of
 * the building sits in the low $1,900s and the ask is out in a thin tail — which
 * is the argument for negotiating, and the thing a listing site never shows you.
 *
 * Figures are fixed sample data for the showcase, consistent with the 14
 * building + 22 nearby comps quoted above the panel.
 */
