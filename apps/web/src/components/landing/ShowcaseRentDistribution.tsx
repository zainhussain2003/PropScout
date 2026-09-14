/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

const SHOWCASE_RENT_BUCKETS = [2, 3, 5, 7, 6, 4, 3, 3, 2, 1] as const
const SHOWCASE_BUCKET_LOW = 1800
const SHOWCASE_BUCKET_WIDTH = 50

interface ShowcaseRentDistributionProps {
  /** Market mid — drawn as the reference line. */
  mid: number
  /** This unit's asking rent — the highlighted bucket. */
  ask: number
}
export function ShowcaseRentDistribution({ mid, ask }: ShowcaseRentDistributionProps): JSX.Element {
  const bucketOf = (v: number): number =>
    Math.floor((v - SHOWCASE_BUCKET_LOW) / SHOWCASE_BUCKET_WIDTH)
  const askBucket = bucketOf(ask)
  const midBucket = bucketOf(mid)
  const tallest = Math.max(...SHOWCASE_RENT_BUCKETS)

  return (
    <div className="col gap-8">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SHOWCASE_RENT_BUCKETS.length}, 1fr)`,
          alignItems: 'end',
          gap: 4,
          height: 132,
        }}
      >
        {SHOWCASE_RENT_BUCKETS.map((count, i) => {
          const isAsk = i === askBucket
          const isMid = i === midBucket
          return (
            <div key={i} className="col" style={{ justifyContent: 'flex-end', height: '100%' }}>
              <span
                className="mono tabular"
                style={{
                  fontSize: 10,
                  textAlign: 'center',
                  marginBottom: 4,
                  color: isAsk ? 'var(--caution)' : 'var(--muted)',
                }}
              >
                {count}
              </span>
              <div
                style={{
                  height: `${(count / tallest) * 100}%`,
                  borderRadius: 4,
                  // The asking rent is the point of the panel, so it is the only
                  // bar that carries a verdict colour. The market mid is marked
                  // but not judged.
                  background: isAsk
                    ? 'var(--caution)'
                    : isMid
                      ? 'var(--accent)'
                      : 'color-mix(in oklab, var(--accent) 22%, transparent)',
                }}
              />
            </div>
          )
        })}
      </div>
      {/* Endpoints are deliberately absent: the range bar directly below this
          already prints $1,800 and $2,300, and repeating them read as a bug. */}
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'var(--muted)',
          textAlign: 'center',
        }}
      >
        36 COMPS · 90 DAYS · 1KM RADIUS
      </div>
    </div>
  )
}
