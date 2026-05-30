/**
 * HardLimitGate — full-screen fixed overlay shown when a free user
 * reaches their monthly analysis limit.
 * Shows progress bars (used / total), reset date, price block, and two CTAs.
 *
 * Design source: paywall-components.jsx::HardLimitGate
 */

import { ScoutMark } from '../shared/ScoutMark'
import { Icon } from '../shared/Icon'

interface HardLimitGateProps {
  /** Called when the user chooses "Wait it out". */
  onClose: () => void
  /** Total free analyses allowed per month. */
  monthlyLimit: number
  /** How many analyses the user has used this month. */
  used: number
  /** Human-readable time until the quota resets. Default "32 days". */
  resetsIn?: string
}

export function HardLimitGate({
  onClose,
  monthlyLimit,
  used,
  resetsIn = '32 days',
}: HardLimitGateProps): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483640,
        background: 'rgba(10, 13, 20, 0.65)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderRadius: 28,
          padding: 'clamp(36px, 4vw, 56px)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,.6)',
        }}
      >
        {/* ScoutMark watermark */}
        <div
          style={{
            position: 'absolute',
            right: -100,
            top: -60,
            opacity: 0.06,
            color: 'var(--accent)',
          }}
        >
          <ScoutMark size={560} color="var(--accent)" />
        </div>

        <div className="col" style={{ position: 'relative', zIndex: 1, gap: 20 }}>
          {/* Header label */}
          <div className="row gap-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)' }} />
            <span
              className="mono"
              style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}
            >
              Free tier · monthly limit reached
            </span>
          </div>

          {/* Headline */}
          <h2
            className="serif"
            style={{
              color: 'var(--bg)',
              fontSize: 'clamp(32px, 4vw, 48px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            You've used your{' '}
            <span style={{ color: 'var(--accent)' }}>
              {used} of {monthlyLimit}
            </span>{' '}
            free reports this month.
          </h2>

          {/* Body */}
          <p
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.78)',
              lineHeight: 1.55,
              maxWidth: 480,
            }}
          >
            Your free quota resets in{' '}
            <span className="tabular" style={{ color: 'var(--bg)' }}>
              {resetsIn}
            </span>
            . Or unlock unlimited reports, full AI verdicts, financing sliders, and PDF export with
            Investor Pro — for less than your average lunch.
          </p>

          {/* Progress bars */}
          <div className="row gap-8" style={{ marginTop: 4 }}>
            {Array.from({ length: monthlyLimit }).map((_, i) => (
              <div
                key={i}
                data-testid="hard-limit-dot"
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 999,
                  background: i < used ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>

          {/* Reset date row */}
          <div
            className="row"
            style={{
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <span>Started this cycle May 1</span>
            <span className="mono tabular">Resets June 1 · {resetsIn}</span>
          </div>

          <div
            className="divider"
            style={{ background: 'rgba(255,255,255,0.12)', margin: '6px 0' }}
          />

          {/* Price block + CTAs */}
          <div
            className="row"
            style={{
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div className="col" style={{ gap: 2 }}>
              <span className="serif tabular" style={{ fontSize: 36, lineHeight: 1 }}>
                $10
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>/mo</span>
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                or $100/yr · 2 months free
              </span>
            </div>
            <div className="row gap-10">
              <button className="btn btn-accent" style={{ padding: '14px 20px', fontSize: 15 }}>
                Upgrade now <Icon name="arrow" size={14} />
              </button>
              <button
                onClick={onClose}
                className="btn"
                style={{
                  background: 'transparent',
                  color: 'var(--bg)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '14px 20px',
                }}
              >
                Wait it out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
