/**
 * ProvinceGate — shown when a user pastes a non-Ontario listing URL.
 * Two states:
 *   submitted=false → email capture form with waitlist CTA
 *   submitted=true  → confirmation with check icon
 *
 * Design source: error-states.jsx::ProvinceGateState
 */

import { useState } from 'react'
import { Icon } from '../shared/Icon'

interface ProvinceGateProps {
  /** Whether the user has already submitted their email. Default false. */
  submitted?: boolean
  /** Called with the email string when the user submits the waitlist form. */
  onSubmit?: (email: string) => void
}

export function ProvinceGate({ submitted = false, onSubmit }: ProvinceGateProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(submitted)

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (onSubmit) onSubmit(email)
    setIsSubmitted(true)
  }

  // ── Confirmed state ──────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--gutter)',
        }}
      >
        <div
          className="card col"
          style={{
            padding: 'clamp(40px, 5vw, 64px)',
            alignItems: 'center',
            textAlign: 'center',
            gap: 18,
            maxWidth: 720,
            width: '100%',
          }}
        >
          <div className="icon-halo" style={{ color: 'var(--pass)' }}>
            <Icon name="check" size={40} />
          </div>

          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--pass)',
            }}
          >
            You're on the list
          </span>

          <h2 className="serif" style={{ maxWidth: 540 }}>
            You're on the list.
          </h2>

          <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 480, lineHeight: 1.55 }}>
            We'll email you when your province goes live.
          </p>
        </div>
      </div>
    )
  }

  // ── Email capture state ──────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--gutter)',
      }}
    >
      <div
        className="card col"
        style={{
          padding: 'clamp(40px, 5vw, 64px)',
          alignItems: 'center',
          textAlign: 'center',
          gap: 18,
          maxWidth: 720,
          width: '100%',
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Province not yet supported
        </span>

        <h2 className="serif" style={{ maxWidth: 540 }}>
          We're not in your market yet.
        </h2>

        <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 480, lineHeight: 1.55 }}>
          Enter your email and we'll let you know when PropScout launches in your province.
        </p>

        <form
          onSubmit={handleSubmit}
          className="row gap-8"
          style={{
            marginTop: 6,
            padding: 4,
            borderRadius: 999,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            maxWidth: 460,
            width: '100%',
          }}
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            className="pr-input"
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              borderRadius: 0,
              width: 'auto',
              minWidth: 0,
            }}
          />
          <button className="btn btn-accent" type="submit">
            Join the waitlist
          </button>
        </form>

        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Free · one email when your province launches · no marketing
        </span>
      </div>
    </div>
  )
}
