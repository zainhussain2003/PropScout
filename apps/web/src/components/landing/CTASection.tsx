/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { Icon } from '../shared/Icon'
import { ScoutMark } from '../shared/ScoutMark'

// ── CTASection ────────────────────────────────────────────────────────

export function CTASection(): JSX.Element {
  return (
    <section
      className="container"
      style={{ paddingTop: 'var(--pad-y)', paddingBottom: 'var(--pad-y)' }}
    >
      <div
        style={{
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(48px, 6vw, 88px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 720,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            className="section-tag"
            style={{ color: 'color-mix(in oklab, var(--bg) 60%, transparent)', marginBottom: 24 }}
          >
            The next listing you save
          </span>
          <h2
            className="serif"
            style={
              { color: 'var(--bg)', textWrap: 'balance', marginBottom: 24 } as React.CSSProperties
            }
          >
            Stop building the spreadsheet again. Paste a link, or type an address.
          </h2>
          <p
            style={{
              color: 'color-mix(in oklab, var(--bg) 70%, transparent)',
              fontSize: 18,
              maxWidth: 540,
              marginBottom: 28,
            }}
          >
            Unlimited reports and every available feature are free during beta. No credit card, demo
            call, or team to talk to. You&apos;ll usually know if the deal is dead inside a minute.
          </p>
          <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
            <a
              href="#hero"
              className="btn btn-accent"
              style={{ padding: '16px 24px', fontSize: 15 }}
            >
              Analyze a listing <Icon name="arrow" size={15} />
            </a>
            <a
              href="#pricing"
              className="btn"
              style={{
                padding: '16px 24px',
                fontSize: 15,
                background: 'transparent',
                color: 'var(--bg)',
                border: '1px solid color-mix(in oklab, var(--bg) 25%, transparent)',
              }}
            >
              Explore free beta
            </a>
          </div>
        </div>

        {/* Decorative ScoutMark watermark */}
        <div
          style={{
            position: 'absolute',
            right: -60,
            top: -30,
            opacity: 0.08,
            color: 'var(--accent)',
          }}
        >
          <ScoutMark size={460} color="var(--accent)" />
        </div>
      </div>
    </section>
  )
}
