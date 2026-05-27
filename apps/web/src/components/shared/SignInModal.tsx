// SignInModal — bottom-sheet sign-in / sign-up modal.
// Mounted at app root — controlled by global state via open/onClose.
// Two modes: 'signin' (default) and 'signup'. Tab-escaped, scroll-locked while open.
// Google OAuth button + email magic link / account creation.

import { useState, useEffect, useRef } from 'react'
import { Icon } from './Icon'
import { ScoutMark } from './ScoutMark'

interface SignInModalProps {
  open: boolean
  onClose: () => void
}

type ModalMode = 'signin' | 'signup'

// Google G logo inline — matches design file exactly
function GoogleLogo(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function SignInModal({ open, onClose }: SignInModalProps): JSX.Element | null {
  const [mode, setMode] = useState<ModalMode>('signin')
  const [email, setEmail] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)

  // Escape key, scroll lock, and initial focus
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    // Move focus into the modal on open
    const frame = requestAnimationFrame(() => {
      if (!cardRef.current) return
      const focusable = cardRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusable[0]?.focus()
    })
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      cancelAnimationFrame(frame)
    }
  }, [open, onClose])

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'Tab' || !cardRef.current) return
    const focusable = Array.from(
      cardRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  if (!open) return null

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483640,
        background: 'rgba(10, 13, 20, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'signin' ? 'Sign in' : 'Create account'}
    >
      {/* Modal card — stop propagation so clicking inside doesn't close */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleCardKeyDown}
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--surface)',
          color: 'var(--ink)',
          borderRadius: 22,
          border: '1px solid var(--line)',
          padding: 32,
          boxShadow: 'var(--shadow-pop)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          ×
        </button>

        {/* ScoutMark glyph */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <ScoutMark size={36} />
        </div>

        {/* Headline */}
        <h3
          className="serif"
          style={{
            fontSize: 28,
            textAlign: 'center',
            marginTop: 14,
            marginBottom: 8,
          }}
        >
          {mode === 'signin' ? (
            <>
              Sign in to read the <em>full verdict</em>
            </>
          ) : (
            <>Create a free account</>
          )}
        </h3>

        {/* Sub */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--muted)',
            marginBottom: 24,
          }}
        >
          {mode === 'signin'
            ? 'The free verdict you just saw is a snippet — sign in to see all 3 paragraphs, comps map, financing scenarios, and PDF export.'
            : 'Ten free reports every month. No credit card. Cancel anytime.'}
        </p>

        <div className="col gap-12" style={{ marginBottom: 16 }}>
          {/* Google OAuth */}
          <button
            className="btn"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: 14,
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              color: 'var(--ink)',
            }}
          >
            <GoogleLogo />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="row gap-8" style={{ alignItems: 'center', margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              or with email
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          {/* Email input */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              fontSize: 14,
              fontFamily: 'inherit',
              color: 'var(--ink)',
              outline: 'none',
              width: '100%',
            }}
          />

          {/* Submit */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 14 }}
          >
            {mode === 'signin' ? 'Send magic link' : 'Create account'}{' '}
            <Icon name="arrow" size={14} />
          </button>
        </div>

        {/* Mode toggle */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginBottom: 0 }}>
          {mode === 'signin' ? (
            <>
              New to PropScout?{' '}
              <button
                onClick={() => setMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                Create a free account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>

        {/* Legal line */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--muted)',
            marginTop: 18,
            lineHeight: 1.5,
          }}
        >
          By continuing you agree to our{' '}
          <a href="/terms" style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
