/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { VerdictPill } from '../shared/VerdictPill'
import { ShowcaseDealScore } from './ShowcaseDealScore'
import { PreviewListingType } from './PreviewListingType'

export function ModePreview({ who, large = false }: { who: string; large?: boolean }): JSX.Element {
  const shell: React.CSSProperties = {
    height: large ? 300 : 194,
    padding: 16,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--line)',
    background: 'var(--bg-elev)',
    overflow: 'hidden',
  }

  if (who === 'Tenant') {
    return (
      <div style={shell} role="img" aria-label="Tenant report preview with a supported rent target">
        <div className="col" style={{ gap: 14, height: '100%' }}>
          <PreviewListingType>For rent · Free forever</PreviewListingType>
          <div>
            <div
              className="mono"
              style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.14em' }}
            >
              YOUR SUPPORTED RANGE
            </div>
            <div className="serif tabular" style={{ fontSize: large ? 42 : 28, lineHeight: 1.1 }}>
              $1,950–$2,000<span style={{ fontSize: 13, color: 'var(--muted)' }}>/mo</span>
            </div>
          </div>
          <div className="divider" />
          {[
            ['Comparable rentals', '36'],
            ['Days on market', '22 days'],
            ['Documented concern', 'Glass-door den'],
          ].map(([label, value]) => (
            <div
              key={label}
              className="row"
              style={{ justifyContent: 'space-between', gap: 12, fontSize: 12 }}
            >
              <span style={{ color: 'var(--ink-2)' }}>{label}</span>
              <span className="mono" style={{ textAlign: 'right' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (who === 'Personal buyer') {
    return (
      <div style={shell} role="img" aria-label="Personal buyer report monthly cost preview">
        <div className="col gap-8">
          <PreviewListingType>For sale</PreviewListingType>
          <div
            className="mono"
            style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.14em' }}
          >
            TRUE MONTHLY COST
          </div>
          {[
            ['Mortgage', '$3,460'],
            ['Property tax', '$357'],
            ['Condo fee', '$0'],
            ['Insurance', '$215'],
          ].map(([label, value]) => (
            <div
              key={label}
              className="row"
              style={{ justifyContent: 'space-between', fontSize: 11 }}
            >
              <span style={{ color: 'var(--ink-2)' }}>{label}</span>
              <span className="mono">{value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (who === 'Investor') {
    return (
      <div
        style={shell}
        role="img"
        aria-label="Investor report clock-style deal score of 8 out of 100"
      >
        <div className="col" style={{ alignItems: 'center', gap: 4 }}>
          <PreviewListingType>For sale</PreviewListingType>
          <ShowcaseDealScore score={8} size={92} label="Deal score / 100" />
          <VerdictPill tone="fail" label="Hard pass" />
        </div>
      </div>
    )
  }

  return (
    <div style={shell} role="img" aria-label="Landlord report rent positioning preview">
      <div className="col gap-12">
        <PreviewListingType>For rent</PreviewListingType>
        <div>
          <div
            className="mono"
            style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.14em' }}
          >
            ASKING RENT
          </div>
          <div className="serif tabular" style={{ fontSize: 28 }}>
            $3,400<span style={{ fontSize: 12, color: 'var(--muted)' }}>/mo</span>
          </div>
        </div>
        <div
          style={{ position: 'relative', height: 6, borderRadius: 999, background: 'var(--line)' }}
        >
          <div
            style={{ width: '68%', height: '100%', borderRadius: 999, background: 'var(--accent)' }}
          />
          <div
            style={{
              position: 'absolute',
              left: '68%',
              top: -4,
              width: 14,
              height: 14,
              borderRadius: 999,
              background: 'var(--ink)',
              transform: 'translateX(-50%)',
            }}
          />
        </div>
        <div
          className="row mono"
          style={{ justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)' }}
        >
          <span>P25 · $2,850</span>
          <span>Median · $3,100</span>
          <span>P75 · $3,350</span>
        </div>
      </div>
    </div>
  )
}
